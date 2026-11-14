"""Duet RepRapFirmware integration."""
from datetime import timedelta
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed
from homeassistant.helpers import entity_registry as er
from .api import DuetClient, DuetError
from .const import *

PLATFORMS = ['sensor', 'binary_sensor', 'button']

async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    cfg = {**entry.data, **entry.options}
    client = DuetClient(async_get_clientsession(hass), cfg[CONF_HOST], cfg.get(CONF_PORT, 80),
                        cfg.get(CONF_PASSWORD, ''), cfg.get(CONF_SSL, False))
    await client.connect()
    async def update():
        try:
            return await client.snapshot()
        except DuetError as exc:
            raise UpdateFailed(str(exc)) from exc
    coordinator = DataUpdateCoordinator(hass, __import__('logging').getLogger(__name__),
        name=f'Duet {cfg[CONF_HOST]}', update_method=update,
        update_interval=timedelta(seconds=cfg.get(CONF_SCAN, DEFAULT_SCAN)))
    await coordinator.async_config_entry_first_refresh()
    entry.runtime_data = {'client': client, 'coordinator': coordinator, 'control': cfg.get(CONF_CONTROL, False)}
    # Retire only legacy 0.1.x entities with known unique IDs.
    # New dynamic heater entities are not touched.
    registry = er.async_get(hass)
    legacy_keys = ('bed_actual', 'bed_target', 'nozzle_actual', 'nozzle_target', 'plate_offset')
    for key in legacy_keys:
        entity_id = registry.async_get_entity_id('sensor', DOMAIN, f'{entry.entry_id}_{key}')
        if entity_id:
            registry.async_remove(entity_id)
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(async_update_options))
    return True

async def async_update_options(hass, entry):
    await hass.config_entries.async_reload(entry.entry_id)

async def async_unload_entry(hass, entry):
    ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if ok:
        entry.async_unload()
    return ok
