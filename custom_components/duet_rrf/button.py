"""Optional constrained jog buttons; never enable by default."""
from homeassistant.components.button import ButtonEntity
from homeassistant.exceptions import HomeAssistantError
from .entity import DuetEntity

MOVES = [('x_plus','X +1 mm','X',1),('x_minus','X -1 mm','X',-1),
         ('y_plus','Y +1 mm','Y',1),('y_minus','Y -1 mm','Y',-1),
         ('z_plus','Z +0.1 mm','Z',0.1),('z_minus','Z -0.1 mm','Z',-0.1)]

async def async_setup_entry(hass, entry, async_add_entities):
    if entry.runtime_data['control']:
        async_add_entities(DuetJog(entry, *move) for move in MOVES)

class DuetJog(DuetEntity, ButtonEntity):
    def __init__(self, entry, key, name, axis, distance):
        super().__init__(entry, key)
        self._attr_name = name
        self.axis = axis
        self.distance = distance
        self.client = entry.runtime_data['client']
    async def async_press(self):
        data = self.coordinator.data
        if data.get('state',{}).get('status') != 'idle':
            raise HomeAssistantError('Jogging requires idle printer')
        axes = data.get('move',{}).get('axes',[])
        idx = 'XYZ'.index(self.axis)
        if len(axes) <= idx or not axes[idx].get('homed', False):
            raise HomeAssistantError('Axis must be homed before jogging')
        # Commands share one HTTP channel; G91/G90 sequence is not atomic.
        # Disabled until a safe atomic RRF macro implementation is verified.
        raise HomeAssistantError('Jogging is not enabled in this preview: safe movement sequence pending validation')
