# IoT Smart-Campus Safety — Research

> Pooled "world-best" feature set for an IoT campus-safety platform: RFID/face access control, bus boarding alerts, panic buttons, air-quality/vape sensors, and CCTV analytics — tailored to Indian schools. Benchmarks: Verkada, Avigilon/Motorola, HID Global access control, school-bus telematics (Samsara, ITtriangle/India), HALO/Verkada vape sensors, ZKTeco (common in India), Hikvision/CP Plus analytics.

## 1. Access control (gates, doors, labs, hostels)
- Credentials: RFID/NFC cards, key-fobs, QR badges, BLE phone, and **face recognition** terminals (ZKTeco/Hikvision common & affordable in India).
- Multi-zone access policies: who may enter which zone, on which schedule (e.g. lab only during practical period; hostel curfew).
- Anti-passback, tailgating detection (with camera), visitor passes (time-bound QR), contractor/staff vs student credentials.
- First-in/last-out logs, occupancy counts per zone, mustering for evacuation roll-call.
- Real-time entry/exit → instant parent notification ("Riya entered campus 8:02 AM").

## 2. Smart attendance via access events
- Auto-mark attendance from gate/classroom RFID/face tap; reconcile with manual register.
- Late-arrival flags, partial-day, ground-truth for the at-risk/attendance module.

## 3. School-bus boarding & tracking
- RFID/face tap on boarding & alighting each bus; GPS live track; geofenced stops.
- Parent alerts: boarded, alighted, approaching stop (ETA), missed bus, wrong-bus, off-route, over-speed, harsh-braking.
- Driver panic button; cabin camera; alcohol-sensor interlock (driver); student panic on bus.
- Route optimisation, attendance-on-bus, headcount reconciliation (board count == alight count).

## 4. Panic / emergency buttons
- Physical wall/wearable panic buttons + in-app soft panic (teacher/staff phone).
- Tiered alerts: silent (to security/admin) vs loud (lockdown siren/PA).
- Incident escalation tree, geo-located alert (which room), integration with safeguarding module.
- Lockdown mode: trigger door locks, broadcast to all staff, notify local authorities (manual confirm).

## 5. Environmental & vape/AQ sensors
- Air quality: PM2.5/PM10, CO2, temperature, humidity (indoor classroom comfort + outdoor AQI; relevant for North India winter smog → outdoor-activity advisories).
- **Vape/smoke/THC sensors** in washrooms/blind spots (privacy-safe, no camera): detect vaping/smoking → discreet alert to staff + log; trend reporting.
- Noise/sound-anomaly (aggression/shouting/glass-break) detection where supported.
- Water-tank level, gas-leak (kitchen/lab), fire/smoke integration.

## 6. CCTV video analytics
- Live + recorded; line-crossing/intrusion after-hours, loitering, crowd-density/stampede risk at gates & assembly, fall detection, PPE/uniform checks (optional), fight/aggression detection.
- Camera health monitoring (offline/tamper), privacy zones (mask sensitive areas), retention policy.
- Search by event/time; clip export for incident records.
- **Edge analytics preferred** (on the NVR/camera) — raw video never enters our app; we ingest only event metadata + thumbnail/clip references.

## 7. Unified safety dashboard / command centre
- Single pane: campus map with live device/zone status, active alerts feed, occupancy, bus fleet, sensor readings.
- Alert lifecycle: new → acknowledged → resolved, with assignee + SLA + notes.
- Drill-down per device, per zone, per bus; historical trends; heatmaps.
- Mobile command view for security/principal; quiet-hours & severity routing.

## 8. Alerting & integration
- Multi-channel: push, SMS, WhatsApp (ties to comms module), siren/PA, email.
- Rules engine: "if PM2.5 > X for Y min during sports period → advise indoor PE"; "if bus off-route > 500m → alert ops + parents".
- Integrates with existing Nexli safeguarding, transport, and communication modules.

## 9. Reliability & data design
- Devices are unreliable: heartbeat/last-seen, offline detection, store-and-forward, dedupe.
- Time-series sensor data is high-volume → must NOT bloat Firestore; downsample/rollup, retain raw briefly.
- All telemetry arrives via a **gateway/broker** (MQTT/HTTP) — the app subscribes to normalised events, never talks to hardware directly.

## 10. UX principles
- "Calm by default" dashboard — green/normal is quiet; alerts are loud and unambiguous.
- One-tap acknowledge; clear who is responding; no alert fatigue (smart grouping, snooze, severity).
- Parent-facing alerts are reassuring and specific, not alarming.

## 11. India-specific notes
- ZKTeco/Hikvision/CP-Plus dominate Indian access & CCTV (affordable); plan for their SDKs/ONVIF.
- Power cuts & flaky internet → edge buffering + local siren that works offline.
- DPDP Act 2023 + privacy: face recognition of minors is sensitive — consent, retention limits, no washroom cameras (use chemical vape sensors instead), privacy zones mandatory.
- Cost: continuous video + high-frequency telemetry breaks Firebase Spark — keep heavy data at the gateway/NVR, ingest metadata only.

## Sources
- [IoT-based School Bus Monitoring System — IJRASET](https://www.ijraset.com/best-journal/iot-based-school-bus-monitoring-system)
- [IoT Enabled School Bus Tracking & Student Monitoring — IJARCCE](https://ijarcce.com/wp-content/uploads/2025/05/IJARCCE.2025.14509.pdf)
- [Methods and systems of smart campus security shield (USPTO 11087614)](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/11087614)
- [Modelling Resource Usage in an IoT-Enabled Smart Campus (arXiv 2111.04085)](https://arxiv.org/pdf/2111.04085)
