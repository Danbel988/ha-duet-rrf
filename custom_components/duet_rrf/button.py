"""Macro buttons are intentionally not automatically exposed: arbitrary macros may be unsafe."""
async def async_setup_entry(hass, entry, async_add_entities):
    return
