"""Dynamic, read-only RepRapFirmware object-model sensors."""
from homeassistant.components.sensor import SensorEntity, SensorDeviceClass, SensorStateClass
from .entity import DuetEntity


def at(data, *path):
    try:
        for part in path:
            data = data[part]
        return data
    except (KeyError, IndexError, TypeError):
        return None


BASE = [
    ('status', 'Status', ('state', 'status'), None, None),
    ('file', 'Print file', ('job', 'file', 'fileName'), None, None),
    ('duration', 'Print duration', ('job', 'duration'), 's', None),
    ('progress', 'Print progress', ('job', 'file', 'fractionPrinted'), '%', None),
]


def discover(data):
    specs = list(BASE)
    move = data.get('move') or {}
    for i, axis in enumerate(move.get('axes') or []):
        if isinstance(axis, dict):
            letter = axis.get('letter') or f'Axis {i}'
            specs.append((f'axis_{i}', f'{letter} position', ('move', 'axes', i, 'userPosition'), 'mm', None))
    heat = data.get('heat') or {}
    for i, heater in enumerate(heat.get('heaters') or []):
        if isinstance(heater, dict):
            for suffix, label, field in [('actual', 'temperature', 'current'), ('target', 'target', 'active')]:
                specs.append((f'heater_{i}_{suffix}', f'Heater {i} {label}', ('heat', 'heaters', i, field), '°C', SensorDeviceClass.TEMPERATURE))
    for i, sensor in enumerate(heat.get('sensors') or []):
        if isinstance(sensor, dict):
            name = sensor.get('name') or f'Temperature sensor {i}'
            specs.append((f'temp_sensor_{i}', str(name), ('heat', 'sensors', i, 'lastReading'), '°C', SensorDeviceClass.TEMPERATURE))
    for i, fan in enumerate(data.get('fans') or []):
        if isinstance(fan, dict):
            specs.append((f'fan_{i}_speed', f'Fan {i} speed', ('fans', i, 'actualValue'), '%', None))
            if 'rpm' in fan:
                specs.append((f'fan_{i}_rpm', f'Fan {i} RPM', ('fans', i, 'rpm'), 'rpm', None))
    for i, tool in enumerate(data.get('tools') or []):
        if isinstance(tool, dict):
            name = tool.get('name') or f'Tool {tool.get("number", i)}'
            specs.append((f'tool_{i}_state', f'{name} state', ('tools', i, 'state'), None, None))
    return specs


async def async_setup_entry(hass, entry, async_add_entities):
    coordinator = entry.runtime_data['coordinator']
    seen = set()
    def update_entities():
        new = []
        for spec in discover(coordinator.data or {}):
            if spec[0] not in seen:
                seen.add(spec[0])
                new.append(DuetSensor(entry, *spec))
        if new:
            async_add_entities(new)
    update_entities()
    entry.async_on_unload(coordinator.async_add_listener(update_entities))


class DuetSensor(DuetEntity, SensorEntity):
    def __init__(self, entry, key, name, path, unit, device_class):
        super().__init__(entry, key)
        self._attr_name = name
        self.path = path
        self._attr_native_unit_of_measurement = unit
        self._attr_device_class = device_class
        if unit in ('°C', 'mm', 'rpm', '%'):
            self._attr_state_class = SensorStateClass.MEASUREMENT
        self.key = key

    @property
    def native_value(self):
        value = at(self.coordinator.data or {}, *self.path)
        if self.key.endswith('_rpm') and isinstance(value, (int, float)) and value < 0:
            return None  # RRF uses negative RPM when no tachometer reading is available.
        if self.key == 'progress' and isinstance(value, (float, int)):
            return round(value * 100, 1)
        if self.key.startswith('fan_') and self.key.endswith('_speed') and isinstance(value, (float, int)):
            return round(value * 100, 1)
        return value
