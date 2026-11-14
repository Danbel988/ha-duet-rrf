"""Read-only printer telemetry."""
from homeassistant.components.sensor import SensorEntity, SensorDeviceClass, SensorStateClass
from .entity import DuetEntity

def at(data, *path):
    try:
        for part in path:
            data = data[part]
        return data
    except (KeyError, IndexError, TypeError):
        return None

# The actual machine coordinates are move.axes[].machinePosition or userPosition.
SPECS = [
    ('status', 'Status', ('state','status'), None, None),
    ('x', 'X position', ('move','axes',0,'userPosition'), 'mm', None),
    ('y', 'Y position', ('move','axes',1,'userPosition'), 'mm', None),
    ('z', 'Z position', ('move','axes',2,'userPosition'), 'mm', None),
    ('bed_actual', 'Bed temperature', ('heat','heaters',0,'current'), '°C', SensorDeviceClass.TEMPERATURE),
    ('bed_target', 'Bed target', ('heat','heaters',0,'active'), '°C', SensorDeviceClass.TEMPERATURE),
    ('nozzle_actual', 'Nozzle temperature', ('heat','heaters',1,'current'), '°C', SensorDeviceClass.TEMPERATURE),
    ('nozzle_target', 'Nozzle target', ('heat','heaters',1,'active'), '°C', SensorDeviceClass.TEMPERATURE),
    ('file', 'Print file', ('job','file','fileName'), None, None),
    ('duration', 'Print duration', ('job','duration'), 's', None),
    ('progress', 'Print progress', ('job','file','fractionPrinted'), '%', None),
    ('plate_offset', 'Build plate offset', ('global','plattenOffset'), 'mm', None),
    ('plate_offset', 'Build plate offset', ('global','plattenOffset'), 'mm', None),
]

async def async_setup_entry(hass, entry, async_add_entities):
    async_add_entities(DuetSensor(entry, *spec) for spec in SPECS)

class DuetSensor(DuetEntity, SensorEntity):
    def __init__(self, entry, key, name, path, unit, device_class):
        super().__init__(entry, key)
        self._attr_name = name
        self.path = path
        self._attr_native_unit_of_measurement = unit
        self._attr_device_class = device_class
        if key in ('bed_actual','nozzle_actual','x','y','z','progress','plate_offset'):
            self._attr_state_class = SensorStateClass.MEASUREMENT
        self.key = key
    @property
    def native_value(self):
        value = at(self.coordinator.data, *self.path)
        if self.key == 'progress' and isinstance(value, (float,int)):
            return round(value*100, 1)
        return value
