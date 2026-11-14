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
    # Migrate obsolete fixed sensors without touching dynamic heater entities.
    registry = er.async_get(hass)
    for key in ('bed_actual', 'bed_target', 'nozzle_actual', 'nozzle_target', 'plate_offset'):
        entity_id = registry.async_get_entity_id('sensor', DOMAIN, f'{entry.entry_id}_{key}')
        if entity_id:
            registry.async_remove(entity_id)

    # Preserve original X/Y/Z entity IDs for existing dashboards where possible.
    # First move the old unique ID to the new dynamic axis unique ID. If the
    # dynamic entity already exists, remove only the stale legacy entity and
    # assign its old entity_id to the dynamic one.
    axes = (coordinator.data or {}).get('move', {}).get('axes') or []
    for index, axis in enumerate(axes):
        if not isinstance(axis, dict):
            continue
        letter = str(axis.get('letter') or '').lower()
        if letter not in ('x', 'y', 'z'):
            continue
        legacy_id = registry.async_get_entity_id('sensor', DOMAIN, f'{entry.entry_id}_{letter}')
        if not legacy_id:
            continue
        dynamic_id = registry.async_get_entity_id('sensor', DOMAIN, f'{entry.entry_id}_axis_{index}')
        if dynamic_id:
            registry.async_remove(legacy_id)
            # A dashboard might already use the new *_2 ID. Only rename if
            # the old entity ID is available; no unrelated entity is touched.
            if registry.async_get(legacy_id) is None:
                registry.async_update_entity(dynamic_id, new_entity_id=legacy_id)
        else:
            # Reuse the old registry entry; the dynamic entity will bind to it.
            registry.async_update_entity(legacy_id, new_unique_id=f'{entry.entry_id}_axis_{index}')
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
