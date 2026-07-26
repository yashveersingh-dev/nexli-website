# IoT Campus Safety — Phase 3: Bus Safety, Environment & CCTV Events (Mock-Driven)

Buildable offline against sample feeds; goes live with hardware + gateway (Phase 4).

## Scope
1. **Bus boarding & tracking** — RFID/face board/alight events, GPS live track, geofenced stops; headcount reconciliation (board == alight); parent alerts (boarded, alighted, approaching-stop ETA, missed/wrong-bus, off-route, over-speed, harsh-braking); driver panic; alcohol-interlock + cabin-camera *event* model (metadata only).
2. **Environment & vape/AQ** — AQ rollups (PM2.5/PM10/CO2/temp/humidity) with classroom-comfort + outdoor-AQI advisories (North-India smog → indoor-PE rule); vape/smoke detection events (no camera, privacy-safe) → discreet staff alert + trend logs; gas-leak/fire integration.
3. **CCTV analytics events** — ingest line-crossing/intrusion/loitering/crowd-density/fall/aggression **event metadata + clip/thumb references only**; camera-health + tamper alerts; privacy zones documented; search/export by time/event.

## Data model additions
```
schools/{schoolId}/buses/{busId}
  route[], stops[], driverId, capacity, liveGps{lat,lng,speed,ts}, status
schools/{schoolId}/buses/{busId}/trips/{tripId}
  date, direction, boardEvents[], alightEvents[], headcountOk:bool, alerts[]
schools/{schoolId}/iotEvents/{eventId}    // reused: subtype 'vape'|'aqi'|'lineCross'|'fall'|'crowd'...
  evidenceRef                              // clip/thumbnail URL by reference, NO raw video
schools/{schoolId}/iotRollups/...          // AQ time-series rollups (reused)
```

## Screens
- **Fleet / Bus Live** map + trip headcount reconciliation, **Environment** dashboard (AQ trends + advisories), **Vape/Sensor** alert log, **CCTV Events** feed with clip references + camera health.

## Integration seam
- All via `TelemetrySource` (mock now). CCTV/AQ vendors push events to the future gateway; we store metadata + references; raw video/audio never enters Firestore/Storage.
- Advisory rules use the Phase-1 rules engine; bus/parent alerts use the comms module.

## Role gating
- `safety.transport.view` (transport staff/admin), parents see own child's bus only.
- `safety.environment.view`, `safety.cctv.view` (security/admin) — washroom areas use sensors not cameras (privacy).

## Acceptance
Mock bus trip shows live GPS, flags a headcount mismatch + off-route alert with parent notifications; AQ trend triggers an indoor-PE advisory; a vape sensor event and a CCTV intrusion event appear with clip references — offline.
