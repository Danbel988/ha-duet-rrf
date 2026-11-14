# Duet RepRapFirmware for Home Assistant — v0.2.2 (pre-release)

A printer-model-independent, read-only Home Assistant integration for
RepRapFirmware 3 in standalone HTTP mode. This is a community project,
not affiliated with Duet3D.

## Dynamic discovery
The integration discovers available RRF axes, heaters, temperature sensors,
fans and tools from the firmware object model. It does not assume a specific
printer brand, fixed hotend count or fixed bed/heater index.

Newly discovered hardware is added on subsequent coordinator updates.
Entity identifiers are based on RRF array indices, so reordering firmware
hardware may require checking dashboard entity references.

## v0.2.2 changes
- Retires legacy fixed Bed/Nozzle and custom build-plate-offset entities
  from the Home Assistant entity registry during integration setup.
  Existing dashboards referring to those entities may need to be updated.
- Negative RPM values (RRF's unavailable tachometer reading) now return
  `unknown` rather than showing `-1 rpm`.
- Preserves dynamic heater, sensor, axis, tool and fan discovery from v0.2.0.
- Updates the manifest version to 0.2.1.

## Install/update
Install this repository as a custom HACS/Marketplace integration.
After updating, restart Home Assistant. Existing config entries are retained.

## Known limitations
- Supports RRF 3 standalone `/rr_connect` and `/rr_model`; SBC mode is
  not implemented.
- Some object-model fields differ between RRF versions and devices.
- Multi-material systems are represented only where their tools and
  associated data are exposed by RRF; specialized material changer
  workflows are not implemented.
- No active movement or heating controls are provided.
- Extra tachometer sensors may be `unknown` when not physically connected.
- Untested against multiple physical printer configurations.
- Do not expose printer HTTP endpoints to the public internet.

## Source
https://github.com/Danbel988/ha-duet-rrf

## v0.2.2 additional fixes
- Migrate legacy X/Y/Z entities to dynamic axis sensors, preserving original entity IDs where possible.
- Publish a normal GitHub release (not pre-release) so Marketplace can prefer semantic version tags.
- Retain existing v0.2.1 sensor and tachometer fixes.
