from homeassistant.components.binary_sensor import BinarySensorEntity
from .entity import DuetEntity

async def async_setup_entry(hass, entry, async_add_entities):
    async_add_entities([DuetPrinting(entry)])

class DuetPrinting(DuetEntity, BinarySensorEntity):
    _attr_name = 'Printing'
    def __init__(self, entry):
        super().__init__(entry, 'printing')
    @property
    def is_on(self):
        return (self.coordinator.data or {}).get('state', {}).get('status') in ('processing', 'printing', 'simulating')
