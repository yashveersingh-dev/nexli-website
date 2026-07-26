# IoT Campus Safety — Phase 1: Dashboard + Device Registry + Ingestion Seam (Offline-Buildable)

## BLOCKED vs BUILDABLE-NOW

### Exact external dependency (BLOCKED for live use)
- **IoT hardware** — RFID/face access terminals (e.g. ZKTeco/Hikvision), bus RFID readers + GPS trackers, physical panic buttons, AQ/PM2.5/CO2 sensors, vape/smoke detectors (e.g. HALO/Verkada-class), and CCTV cameras with analytics (Hikvision/CP-Plus/Verkada). None of this exists until purchased + installed.
- **A device gateway / message broker** — an **MQTT broker** (e.g. Mosquitto/HiveMQ/EMQX) or vendor cloud (Samsara, ZKTeco BioTime, ONVIF/NVR) that collects telemetry from hardware and forwards normalised events to us via HTTP webhook / MQTT-over-WebSocket. Requires hosting + credentials. **Firebase Spark cannot host an MQTT broker** and Cloud Functions/scheduled ingest are Blaze-tier — so live ingestion at scale is blocked until a gateway + (likely) Blaze exist.
- **CCTV analytics** runs on the camera/NVR edge or a vendor cloud; we ingest only event metadata + clip references, never raw video (would break Spark).

### Why it is blocked
No genuine telemetry exists without hardware + a gateway. We will **never fabricate a fake live device link.** Until then everything runs against a **`MockTelemetrySource`** that replays realistic sample feeds.

### Buildable NOW, fully offline with sample feeds
- Device registry + campus map + zone model.
- The **entire unified safety dashboard** (map, live status tiles, alert feed, occupancy, bus fleet, sensor charts) driven by `MockTelemetrySource`.
- Alert rules engine + alert lifecycle (ack/resolve/assign) — pure logic, offline-testable.
- Access-event → attendance reconciliation logic.
- Bus boarding/headcount reconciliation logic + parent-notification *composition* (sent via existing comms module, which itself may be mock).
- Ingestion abstraction so swapping `MockTelemetrySource` → real gateway is a provider change only.

---

## Phase 1 scope: registry + dashboard + ingestion abstraction

### Data model (Firestore, under `schools/{schoolId}/`)
```
schools/{schoolId}/iotDevices/{deviceId}
  type        // 'access'|'busReader'|'gps'|'panic'|'aq'|'vape'|'camera'
  vendor, model, zoneId, location{lat,lng}|mapPos{x,y}
  status      // 'online'|'offline'|'tamper'|'unknown'
  lastSeenAt, firmware, configJson

schools/{schoolId}/zones/{zoneId}
  name, type ('gate'|'classroom'|'lab'|'hostel'|'washroom'|'ground'|'busbay')
  mapPolygon[], capacity, accessPolicyId, currentOccupancy

schools/{schoolId}/iotEvents/{eventId}        // normalised, downsampled
  deviceId, zoneId, type, subtype, value, severity, ts
  raw (small), source:'mock'|'gateway'        // NO raw video/audio blobs
  // high-frequency AQ telemetry is rolled up:
schools/{schoolId}/iotRollups/{deviceId}/{yyyymmdd}
  metric, min, max, avg, samples, buckets[]   // keeps Firestore small

schools/{schoolId}/alerts/{alertId}
  ruleId, deviceId, zoneId, type, severity     // 'info'|'warn'|'critical'
  status      // 'new'|'ack'|'resolved'
  assignedTo, ackBy, ackAt, resolvedAt, notes[]
  channelsSent[], evidenceRefs[]               // clip/thumb URLs by reference

schools/{schoolId}/alertRules/{ruleId}
  name, conditionJson, severity, scheduleScope, channels[], enabled
```

### Screens
1. **Safety Command Centre** — campus map with device/zone status, live alert feed, occupancy counters, bus fleet strip, sensor charts (from rollups/mock).
2. **Device Registry** — add/configure devices, zones, map placement, health/last-seen.
3. **Alert Rules** — visual rule builder (condition → severity → channels → schedule scope).
4. **Alert detail** — lifecycle (ack/resolve/assign), notes, evidence references.

### Integration seam
- `iot/TelemetrySource.ts` interface: `subscribe(cb) | getDeviceState() | health()`. Phase 1 ships `MockTelemetrySource` replaying sample feeds. Real gateway = a `GatewayTelemetrySource` (MQTT-over-WS / webhook ingest) added in Phase 4 with **no dashboard changes**.
- `iot/rules/evaluate.ts` — pure rules engine consuming the normalised event stream → emits alerts. Same for mock and real.
- Ingestion writes normalised + rolled-up data only; raw video/audio stay at the edge/vendor.

### Role gating (data-driven roles)
- `safety.dashboard.view` — security/admin/principal.
- `safety.devices.manage`, `safety.rules.manage` — admin.
- `safety.alerts.respond` — security/duty staff (ack/resolve/assign).
- Parents/teachers get only their relevant push/notifications (no raw dashboard).
- All scoped by `schoolId` in security rules.

### Phase 1 acceptance
Admin registers sample devices on a campus map, defines a rule ("PM2.5 > 150 during sports period → critical"), and from the mock feed the dashboard shows live tiles, fires an alert, security acknowledges and resolves it with a note — entirely offline.
