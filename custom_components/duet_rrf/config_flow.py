"""UI setup and options for Duet."""
import voluptuous as vol
from homeassistant import config_entries
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from .api import DuetClient, DuetError
from .const import *

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
        schema = vol.Schema({vol.Required(CONF_HOST): str,
            vol.Required(CONF_PORT, default=80): vol.All(vol.Coerce(int), vol.Range(min=1,max=65535)),
            vol.Optional(CONF_PASSWORD, default=''): str,
            vol.Required(CONF_SSL, default=False): bool,
            vol.Required(CONF_SCAN, default=DEFAULT_SCAN): vol.All(vol.Coerce(int), vol.Range(min=5,max=300)),
            vol.Required(CONF_CONTROL, default=False): bool})
        return self.async_show_form(step_id='user', data_schema=schema, errors=errors)
    @staticmethod
    def async_get_options_flow(config_entry):
        return DuetOptionsFlow()

class DuetOptionsFlow(config_entries.OptionsFlow):
    async def async_step_init(self, user_input=None):
        if user_input is not None:
            return self.async_create_entry(title='', data=user_input)
        cfg = {**self.config_entry.data, **self.config_entry.options}
        return self.async_show_form(step_id='init', data_schema=vol.Schema({
            vol.Required(CONF_SCAN, default=cfg.get(CONF_SCAN, DEFAULT_SCAN)): vol.All(vol.Coerce(int), vol.Range(min=5,max=300)),
            vol.Required(CONF_CONTROL, default=cfg.get(CONF_CONTROL, False)): bool}))
