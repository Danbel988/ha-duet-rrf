"""UI configuration and post-install options."""
import voluptuous as vol
from homeassistant import config_entries
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from .api import DuetClient, DuetError
from .const import *

def options_schema(cfg):
    return vol.Schema({
        vol.Required(CONF_SCAN, default=cfg.get(CONF_SCAN, DEFAULT_SCAN)): vol.All(vol.Coerce(int), vol.Range(min=5, max=300)),
        vol.Required(CONF_CONTROL, default=cfg.get(CONF_CONTROL, False)): bool,
        vol.Required(CONF_GCODE, default=cfg.get(CONF_GCODE, False)): bool,
        vol.Required(CONF_LED, default=cfg.get(CONF_LED, False)): bool,
        vol.Optional(CONF_LED_FANS, default=cfg.get(CONF_LED_FANS, '')): str,
    })

class DuetConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    VERSION = 1
    async def async_step_user(self, user_input=None):
        errors = {}
        if user_input is not None:
            try:
                client = DuetClient(async_get_clientsession(self.hass), user_input[CONF_HOST],
                    user_input[CONF_PORT], user_input[CONF_PASSWORD], user_input[CONF_SSL])
                await client.connect()
                await client.model('state')
            except DuetError:
                errors['base'] = 'cannot_connect'
            else:
                await self.async_set_unique_id(f"{user_input[CONF_HOST]}:{user_input[CONF_PORT]}")
                self._abort_if_unique_id_configured()
                return self.async_create_entry(title=f"Duet {user_input[CONF_HOST]}", data=user_input)
        schema = vol.Schema({
            vol.Required(CONF_HOST): str,
            vol.Required(CONF_PORT, default=80): vol.All(vol.Coerce(int), vol.Range(min=1,max=65535)),
            vol.Optional(CONF_PASSWORD, default=''): str,
            vol.Required(CONF_SSL, default=False): bool,
            vol.Required(CONF_SCAN, default=DEFAULT_SCAN): vol.All(vol.Coerce(int), vol.Range(min=5,max=300)),
            vol.Required(CONF_CONTROL, default=False): bool,
        })
        return self.async_show_form(step_id='user', data_schema=schema, errors=errors)

    @staticmethod
    def async_get_options_flow(config_entry):
        return DuetOptionsFlow()

class DuetOptionsFlow(config_entries.OptionsFlow):
    async def async_step_init(self, user_input=None):
        cfg = {**self.config_entry.data, **self.config_entry.options}
        errors = {}
        if user_input is not None:
            try:
                parse_led_fans(user_input.get(CONF_LED_FANS, ''))
            except ValueError:
                errors[CONF_LED_FANS] = 'invalid_led_fans'
            if not errors:
                return self.async_create_entry(title='', data=user_input)
        return self.async_show_form(step_id='init', data_schema=options_schema(user_input or cfg), errors=errors)

def parse_led_fans(value):
    """Comma-separated RRF logical fan numbers, not physical connector labels."""
    if not value.strip():
        return []
    parts = [p.strip() for p in value.split(',')]
    if any(not p.isdecimal() for p in parts):
        raise ValueError('Fan numbers must be nonnegative integers')
    numbers = [int(p) for p in parts]
    if len(numbers) != len(set(numbers)) or len(numbers) > 12 or any(n > 99 for n in numbers):
        raise ValueError('Invalid or duplicate fan numbers')
    return numbers
