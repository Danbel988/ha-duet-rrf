from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.helpers.entity import DeviceInfo
from .const import DOMAIN

class DuetEntity(CoordinatorEntity):
    _attr_has_entity_name = True
    def __init__(self, entry, key):
        super().__init__(entry.runtime_data['coordinator'])
        self._attr_unique_id = f'{entry.entry_id}_{key}'
        self._attr_device_info = DeviceInfo(identifiers={(DOMAIN, entry.entry_id)},
            name=entry.title, manufacturer='Duet3D', model='RepRapFirmware')
