# v0.3.3 — Dashboard preset and review

## New default dashboard card
- Preconfigured responsive cockpit: camera, power, power draw, status, progress, file, layers, remaining time, duration, filament, heater actual/target, XYZ and fans.
- Automatic entity matching for typical Duet and printer names, with explicit assignment in the editor; check assignments if multiple printers exist.
- When the assigned power switch is off, hide printer-dependent readings and show a large 'Drucker ausgeschaltet' message. Camera, switch and power draw remain visible.
- Print-job details hide outside active printing. Per-device block ordering and dimensions remain editable.

## Review and small fixes
- Fixed generic toggle action with auto-assigned entities (resolved entity ID now used).
- Refuse power actions when entity is not a switch/input_boolean.
- Unknown/unavailable temperature values no longer risk being parsed as numbers.
- Show 'ausgeschaltet' in the status header when the power switch is off.
- Retained v0.3.1 unload regression fix.

## Known limitations / safety
- Offline smoke tests and JavaScript syntax validation passed, but **the card has not been browser-tested against a live HA instance**.
- Automatic matching is heuristic, especially for multiple Duet integrations. Assign explicit entities in the card editor.
- The power-off guard is a **frontend safeguard only**. It is not a hardware or backend safety interlock; do not rely on it for safe hotend cooldown. The HA switch may be controlled elsewhere.
- G-code, macros and printer controls are opt-in and must be explicitly enabled in integration options. Generic G-code can command dangerous movement/heating; review before use.
- No actual historical temperature graph in the custom card (the native dashboard uses HA history-graph).
- RRF model/command integration tests and real camera rendering remain unverified.

## Upgrade
Existing Lovelace dashboards are not overwritten.
