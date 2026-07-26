# IoT Campus Safety — Phase 4: Real Gateway + Hardware Wiring (BLOCKED — needs hardware + broker)

## Gate
Requires the **physical hardware** (access terminals, bus readers + GPS, panic buttons, AQ/vape sensors, CCTV with analytics) **and a hosted device gateway / MQTT broker** (Mosquitto/EMQX/HiveMQ or vendor cloud: ZKTeco BioTime, Samsara, ONVIF/NVR). Likely also **Firebase Blaze** for webhook/ingest Cloud Functions. **Do not build the live path until these exist.** `MockTelemetrySource` stands in until then.

## Scope
1. Implement `GatewayTelemetrySource` behind the Phase 1 `TelemetrySource` interface — connect via MQTT-over-WebSocket and/or an HTTP webhook ingest endpoint; map each vendor's payloads into our normalised `iotEvents` / rollup shape.
2. Per-vendor adapters (ZKTeco access/BioTime, Hikvision/CP-Plus/ONVIF cameras, GPS telematics, AQ/vape MQTT). Edge analytics stay on device; we ingest metadata + clip references only.
3. Reliability: device heartbeat/last-seen, offline detection, store-and-forward, dedupe, downsample/rollup before write (protect Firestore quota/cost).
4. Outbound commands (door-lock on lockdown, siren/PA) routed back through the gateway (capability-permitting).
5. Cost/quota guardrails: write throttling, rollup-only persistence, evidence by reference.

## Data model additions
```
schools/{schoolId}/iotGatewayConfig (singleton)
  brokerUrl, authRef, vendorAdapters[], ingestSecretRef, region
schools/{schoolId}/iotDevices/{deviceId}
  heartbeatIntervalSec, lastHeartbeatAt, bufferState
```

## Integration seam
- Pure provider swap — dashboard, rules engine, access/attendance, bus, alerts (Phases 1–3) consume the same normalised stream; no UI rewrites.
- Secrets in server/secret config; ingest endpoint authenticated; tenant (`schoolId`) resolved per device.

## Role gating
- `safety.gateway.configure` — admin/integrator only.

## Acceptance
With hardware + broker live, real taps/GPS/sensor/CCTV events flow through `GatewayTelemetrySource` into the exact dashboards, rules, and alerts built in Phases 1–3; offline devices flag; no raw video enters Firestore; quota stays within budget.
