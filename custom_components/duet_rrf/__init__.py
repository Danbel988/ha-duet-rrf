"""Duet RRF 3 standalone integration."""
import logging
import re
from pathlib import Path
from datetime import timedelta
import voluptuous as vol
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, SupportsResponse
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed
from homeassistant.helpers import entity_registry as er
from homeassistant.exceptions import HomeAssistantError
from .api import DuetClient, DuetError
from .config_flow import parse_led_fans
from .const import *

_LOGGER = logging.getLogger(__name__)
PLATFORMS = ['sensor','binary_sensor','button','light']
CARD_URL = '/duet_rrf/duet-rrf-card.js'

async def _setup_card(hass):
    """Serve card and register it in Lovelace storage mode when supported."""
    from homeassistant.components.http import StaticPathConfig
    await hass.http.async_register_static_paths([
        StaticPathConfig(CARD_URL, str(Path(__file__).parent / 'www' / 'duet-rrf-card.js'), False)
    ])
    lovelace = hass.data.get('lovelace')
    resources = getattr(lovelace, 'resources', None)
    if resources is None:
        _LOGGER.info('Lovelace resource auto-registration unavailable; add %s as module manually', CARD_URL)
        return
    try:
        await resources.async_load()
        if not any(str(item.get('url', '')).split('?')[0] == CARD_URL for item in resources.async_items()):
            await resources.async_create_item({'res_type': 'module', 'url': CARD_URL})
    except Exception as exc:  # Lovelace resource APIs vary across HA versions.
        _LOGGER.warning('Could not auto-register Duet dashboard resource: %s', exc)


async def async_setup(hass, config):
    await _setup_card(hass)
    async def command_service(call):
        entry_id = call.data['entry_id']
        entry = hass.config_entries.async_get_entry(entry_id)
        if not entry or entry.domain != DOMAIN or not hasattr(entry,'runtime_data'):
            raise HomeAssistantError('Duet entry not found')
        runtime = entry.runtime_data
        if not runtime['gcode']:
            raise HomeAssistantError('G-code console is disabled in integration options')
        command = call.data['gcode'].strip()
        if not command or len(command) > 200 or '\n' in command or '\r' in command:
            raise HomeAssistantError('Only one G-code line, up to 200 characters, is permitted')
        try:
            reply = await runtime['client'].command(command)
        except DuetError as exc:
            raise HomeAssistantError(str(exc)) from exc
        return {'reply': reply[:2000]}

    async def control_service(call):
        entry = hass.config_entries.async_get_entry(call.data['entry_id'])
        if not entry or entry.domain != DOMAIN or not hasattr(entry,'runtime_data'):
            raise HomeAssistantError('Duet entry not found')
        runtime = entry.runtime_data
        if not runtime['control']:
            raise HomeAssistantError('Printer control disabled in options')
        action = call.data['action']
        # RRF pause/resume/stop. Never trigger motion from a generic control action.
        commands = {'pause':'M25','resume':'M24','cancel':'M0'}
        if action not in commands:
            raise HomeAssistantError('Unsupported action')
        if not runtime['coordinator'].last_update_success:
            raise HomeAssistantError('Printer status is unavailable')
        try:
            await runtime['client'].command(commands[action])
        except DuetError as exc:
            raise HomeAssistantError(str(exc)) from exc

    async def macro_service(call):
        entry = hass.config_entries.async_get_entry(call.data['entry_id'])
        if not entry or entry.domain != DOMAIN or not hasattr(entry,'runtime_data'):
            raise HomeAssistantError('Duet entry not found')
        runtime = entry.runtime_data
        if not runtime['control']:
            raise HomeAssistantError('Printer control disabled in options')
        name = call.data['name']
        if not re.fullmatch(r'[\w .()\-]+\.g',name,re.ASCII):
            raise HomeAssistantError('Invalid macro filename')
        try:
            allowed = await runtime['client'].list_macros()
            if name not in allowed:
                raise HomeAssistantError('Macro not found in 0:/macros')
            await runtime['client'].command(f'M98 P"0:/macros/{name}"')
        except DuetError as exc:
            raise HomeAssistantError(str(exc)) from exc

    async def list_macros_service(call):
        entry = hass.config_entries.async_get_entry(call.data['entry_id'])
        if not entry or entry.domain != DOMAIN or not hasattr(entry,'runtime_data'):
            raise HomeAssistantError('Duet entry not found')
        try:
            return {'macros': await entry.runtime_data['client'].list_macros()}
        except DuetError as exc:
            raise HomeAssistantError(str(exc)) from exc

    hass.services.async_register(DOMAIN,'send_gcode',command_service,
        schema=vol.Schema({vol.Required('entry_id'):str,vol.Required('gcode'):str}),supports_response=SupportsResponse.ONLY)
    hass.services.async_register(DOMAIN,'printer_control',control_service,
        schema=vol.Schema({vol.Required('entry_id'):str,vol.Required('action'):vol.In(['pause','resume','cancel'])}))
    hass.services.async_register(DOMAIN,'run_macro',macro_service,
        schema=vol.Schema({vol.Required('entry_id'):str,vol.Required('name'):str}))
    hass.services.async_register(DOMAIN,'list_macros',list_macros_service,
        schema=vol.Schema({vol.Required('entry_id'):str}),supports_response=SupportsResponse.ONLY)
    return True

async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    cfg = {**entry.data,**entry.options}
    client = DuetClient(async_get_clientsession(hass),cfg[CONF_HOST],cfg.get(CONF_PORT,80),
                        cfg.get(CONF_PASSWORD,''),cfg.get(CONF_SSL,False))
    await client.connect()
    async def update():
        try:
            return await client.snapshot()
        except DuetError as exc:
            raise UpdateFailed(str(exc)) from exc
    coordinator = DataUpdateCoordinator(hass,_LOGGER,name=f'Duet {cfg[CONF_HOST]}',
        update_method=update,update_interval=timedelta(seconds=cfg.get(CONF_SCAN,DEFAULT_SCAN)))
    await coordinator.async_config_entry_first_refresh()
    entry.runtime_data = {'client':client,'coordinator':coordinator,
        'control':cfg.get(CONF_CONTROL,False),'gcode':cfg.get(CONF_GCODE,False),
        'led':cfg.get(CONF_LED,False),'led_fans':parse_led_fans(cfg.get(CONF_LED_FANS,''))}
    registry = er.async_get(hass)
    for key in ('bed_actual','bed_target','nozzle_actual','nozzle_target','plate_offset'):
        entity_id = registry.async_get_entity_id('sensor',DOMAIN,f'{entry.entry_id}_{key}')
        if entity_id:
            registry.async_remove(entity_id)
    axes = (coordinator.data or {}).get('move',{}).get('axes') or []
    for index,axis in enumerate(axes):
        if not isinstance(axis,dict):
            continue
        letter = str(axis.get('letter') or '').lower()
        if letter not in ('x','y','z'):
            continue
        legacy_id = registry.async_get_entity_id('sensor',DOMAIN,f'{entry.entry_id}_{letter}')
        if not legacy_id:
            continue
        dynamic_id = registry.async_get_entity_id('sensor',DOMAIN,f'{entry.entry_id}_axis_{index}')
        if dynamic_id:
            registry.async_remove(legacy_id)
            if registry.async_get(legacy_id) is None:
                registry.async_update_entity(dynamic_id,new_entity_id=legacy_id)
        else:
            registry.async_update_entity(legacy_id,new_unique_id=f'{entry.entry_id}_axis_{index}')
    await hass.config_entries.async_forward_entry_setups(entry,PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(async_update_options))
    return True

async def async_update_options(hass,entry):
    await hass.config_entries.async_reload(entry.entry_id)

async def async_unload_entry(hass,entry):
    ok = await hass.config_entries.async_unload_platforms(entry,PLATFORMS)
    if ok:
        entry.async_unload(hass)
    return ok
