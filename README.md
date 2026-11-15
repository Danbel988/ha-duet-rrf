# Duet RRF v0.3.2

**Dark Cockpit UI release.** This update redesigns the custom Lovelace card with a dark anthracite theme, status header, progress bars, temperature gauges, compact axes/fans, live camera, controls, macros, G-code console and printer power. It retains the responsive block editor (per-device layout, reorder, dimensions, entity selection) and the v0.3.1 unload fix.



**Note:** temperature bars are instantaneous relative scales, not historical graphs. Control and G-code services require the relevant integration options. Printer power-off is blocked unless printer status is `idle`, heater temperature entities are available and below 50 °C, and user confirms. The UI has not been verified in the user’s browser.

# Duet RepRapFirmware for Home Assistant — v0.3.1 (bugfix; hardware test pending)

**Standalone RepRapFirmware 3 only.** SBC/DSF is intentionally out of scope.

## v0.3.1 bugfix
- Fix Home Assistant options reload failure: pass `hass` to `ConfigEntry.async_unload(hass)`.
- Prevent `FAILED_UNLOAD` when changing integration options (e.g. enabling G-code).
- Home Assistant restart is required to recover an entry already stuck in `FAILED_UNLOAD`.

## New in 0.3.0

- Additional print-job sensors: current layer, total layers, layers remaining, remaining time and raw extruded filament where available.
- Independent opt-in switches for printer control, G-code console and LED lights in **Settings → Devices & services → Duet RepRapFirmware → Configure**.
- LED lights use selected **logical RRF fan numbers**, not physical FAN connector labels. Configure e.g. `3,4` for two lights. The matching fans must already be configured in RRF (`M950`) and dedicated to lighting. **Do not use hotend or part-cooling fans as LEDs.** The integration never edits `config.g`.
- HA actions: `duet_rrf.send_gcode`, `duet_rrf.printer_control`, `duet_rrf.list_macros`, `duet_rrf.run_macro`. Macro listing is top-level `0:/macros` only. Responses to G-code are best-effort and may be empty.
- `duet-rrf-card` custom Lovelace card with grid-based layout, draggable block order in the editor, configurable width/height, HA entity values, cameras, smart plugs, macro buttons, G-code and control buttons.

## Install / upgrade

1. Back up Home Assistant. Install the repository as a custom HACS integration or copy `custom_components/duet_rrf` into HA `/config/custom_components/`.
2. Restart HA. Existing config entries and dynamic entity IDs are preserved as far as possible.
3. The integration serves `/duet_rrf/duet-rrf-card.js` and attempts to register it automatically as a Lovelace JavaScript module in storage mode. If your dashboard uses YAML resources or automatic registration fails, add this URL manually under dashboard resources.
4. Add a manual card:

```yaml
type: custom:duet-rrf-card
title: Voron
entry_id: YOUR_DUET_CONFIG_ENTRY_ID
status_entity: sensor.duet_status
heater_entities:
  - sensor.duet_heater_0_temperature
  - sensor.duet_heater_1_temperature
columns:
  mobile: 2
  tablet: 4
  desktop: 6
blocks:
  - id: status
    kind: entity
    label: Printer status
    entity: sensor.duet_status
    w: 2
    h: 1
  - id: webcam
    kind: camera
    label: Camera
    entity: camera.your_camera
    w: 3
    h: 3
  - id: power
    kind: power
    label: Printer power
    entity: switch.your_printer_plug
    w: 2
    h: 1
```

**Resource installation:** The bundled JavaScript is served directly from the integration at `/duet_rrf/duet-rrf-card.js`. The integration attempts automatic Lovelace storage-mode registration. In YAML-managed dashboards, add the URL manually as a JavaScript module.

**Editor:** Choose the card in the Lovelace card picker, add/remove blocks, select HA entities, drag to reorder blocks, and select mobile/tablet/desktop to configure independent block order and dimensions. Customize each block background, text color, padding and radius. Width and height are grid units, not absolute pixels.

## Safety / limitations

- **Experimental preview, not production-tested** on physical printers or multiple HA versions.
- `M0` for cancel may behave differently depending on printer macros and firmware; test without a live print first.
- Power-off is blocked **in the custom card** unless the configured status sensor is `idle`, at least one heater sensor is configured, and **all** configured heaters read below 50°C. This is a UI safeguard only; Home Assistant can still switch the plug elsewhere. Never rely on this as a hardware safety interlock.
- G-code and macros can be dangerous. Their use requires opt-in; do not expose HA or the printer HTTP API publicly.
- Dashboard blocks can be reordered and resized independently for mobile, tablet and desktop. Pixel-perfect free placement, icon picker, macro selection caching, and advanced camera handling are **not yet implemented**. Automatic resource registration is best-effort; YAML-managed resources require manual setup.
- The card may need manual entity IDs and the config-entry ID. Some object-model fields may be absent on older RRF versions; unavailable values show unknown.
- No SBC/DSF support.

Source: https://github.com/Danbel988/ha-duet-rrf
