"""Optional logical-fan-based LED controls. Does not edit config.g."""
from homeassistant.components.light import LightEntity, ColorMode
from homeassistant.exceptions import HomeAssistantError
from .entity import DuetEntity
from .api import DuetError

async def async_setup_entry(hass,entry,async_add_entities):
    runtime = entry.runtime_data
    if runtime['led']:
        fans = (runtime['coordinator'].data or {}).get('fans') or []
        async_add_entities(DuetFanLight(entry,i) for i in runtime['led_fans'] if i < len(fans) and isinstance(fans[i],dict))

class DuetFanLight(DuetEntity,LightEntity):
    _attr_supported_color_modes = {ColorMode.BRIGHTNESS}
    _attr_color_mode = ColorMode.BRIGHTNESS
    def __init__(self,entry,index):
        super().__init__(entry,f'led_fan_{index}')
        self.index = index
        self._attr_name = f'LED Fan {index}'
        self.client = entry.runtime_data['client']
    @property
    def available(self):
        return super().available and self.index < len((self.coordinator.data or {}).get('fans') or [])
    def _fraction(self):
        fans = (self.coordinator.data or {}).get('fans') or []
        if self.index >= len(fans):
            return None
        fan = fans[self.index]
        return fan.get('actualValue') if isinstance(fan,dict) else None
    @property
    def is_on(self):
        fraction = self._fraction()
        return fraction > 0 if isinstance(fraction,(float,int)) else None
    @property
    def brightness(self):
        fraction = self._fraction()
        return round(max(0,min(1,fraction))*255) if isinstance(fraction,(float,int)) else None
    async def async_turn_on(self,**kwargs):
        brightness = kwargs.get('brightness',255)
        await self._send(brightness/255)
    async def async_turn_off(self,**kwargs):
        await self._send(0)
    async def _send(self,value):
        try:
            await self.client.command(f'M106 P{self.index} S{value:.3f}')
            await self.coordinator.async_request_refresh()
        except DuetError as exc:
            raise HomeAssistantError(str(exc)) from exc
