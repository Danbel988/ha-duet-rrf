# Duet RepRapFirmware – Home Assistant (technical preview 0.1.0)

Community prototype for **RepRapFirmware 3 standalone HTTP mode** (Duet WiFi / Ethernet). Not affiliated with Duet3D. **Not yet validated on hardware or approved for marketplace publication.**

## Installation
Copy `custom_components/duet_rrf` into the Home Assistant `/config/custom_components/` directory. Restart Home Assistant. Add integration **Duet RepRapFirmware** from Settings → Devices & services → Add integration. Enter IP/hostname, port, password, optional HTTPS, poll interval (5–300 s). Multiple Duets supported.

## Telemetry
Status, persistent build-plate offset (if global.plattenOffset exists), X/Y/Z user positions, bed/nozzle current and target temperatures, print filename, elapsed print time, progress, printing state. Uses `/rr_connect` and `/rr_model`. No arbitrary G-code or filesystem services. Default mode is read-only.

## Limitations and safety
- **Preview only.** The movement-control option creates buttons but presses deliberately raise a safety error: actual jog commands are **not implemented**. Do not enable it for production.
- Sensors assume heater index 0 is bed and heater index 1 is nozzle. This is common but not universal; dynamic heater mapping is planned.
- Print-progress fields vary between firmware versions; missing values show unavailable.
- RepRapFirmware SBC mode `/machine/*` is not supported in this preview.
- HTTP authentication is not encryption. Use a trusted local network; HTTPS only if your Duet endpoint genuinely supports it. Never expose the device to the internet.
- No commands that heat, home, move, pause, cancel, or edit files are sent by this version.
- The existing user's HA shell-command bridge remains independent and unchanged.

## Developer validation
Run `python -m compileall custom_components/duet_rrf` and test in a dedicated Home Assistant environment. Follow with real-device read-only validation, Home Assistant integration tests, hassfest, HACS validation, and security review before publishing.

## Official API references
https://github.com/Duet3D/RepRapFirmware/wiki/HTTP-requests
https://duet3d.github.io/DuetSoftwareFramework/articles/rest-api.html

## Repository
https://github.com/Danbel988/ha-duet-rrf

## Repository
https://github.com/Danbel988/ha-duet-rrf
