# IoT Campus Safety — Phase 2: Access Control, Attendance & Panic (Mock-Driven, Offline-Buildable)

Buildable offline against `MockTelemetrySource`. Goes live only when the corresponding hardware + gateway (Phase 4) exist.

## Scope
1. **Access control model** — credentials (RFID/face/QR/BLE) linked to people; zone access policies with schedules; anti-passback/tailgating flags; visitor time-bound QR passes; first-in/last-out logs; evacuation muster roll-call.
2. **Access-driven attendance** — gate/classroom tap events auto-mark attendance, reconcile with manual register, late-arrival flags; feeds the at-risk/attendance module as ground truth.
3. **Entry/exit parent notifications** — composed here, delivered via existing comms module (which may be mock).
4. **Panic / emergency** — soft panic (staff app) + model for physical buttons; tiered alerts (silent → security; loud → lockdown/PA); geo-located to room/zone; escalation tree; lockdown mode (broadcast + optional door-lock command stub); ties into safeguarding module.

## Data model additions
```
schools/{schoolId}/credentials/{credentialId}
  personId, personType('student'|'staff'|'visitor'), kind('rfid'|'face'|'qr'|'ble')
  token, active, validFrom, validTo
schools/{schoolId}/accessPolicies/{policyId}
  zoneIds[], allowedRoles[], schedule, antiPassback:bool
schools/{schoolId}/accessLogs/{logId}
  credentialId, personId, zoneId, direction('in'|'out'), result('granted'|'denied'|'tailgate'), ts
schools/{schoolId}/panicEvents/{eventId}
  source('button'|'app'), triggeredBy, zoneId, location, mode('silent'|'loud')
  status('active'|'ack'|'resolved'), escalationStep, responders[]
schools/{schoolId}/visitorPasses/{passId}
  name, phone, hostId, qrToken, validFrom, validTo, zonesAllowed[], used
```

## Screens
- **Access Logs & Credentials** (admin), **Access Policy** editor, **Evacuation Muster** roll-call view, **Visitor Pass** issue/scan, **Panic/Lockdown Console** (security) with escalation tracking.

## Integration seam
- Access/panic events arrive via the same `TelemetrySource` (mock now, gateway later).
- Attendance reconciliation writes into existing attendance collections via a thin adapter; lockdown can emit a door-command intent (no-op stub until hardware).
- Panic events cross-link to safeguarding module records.

## Role gating
- `safety.access.manage`, `safety.credentials.issue`, `safety.visitors.manage` — admin/front-desk.
- `safety.panic.respond` / `safety.lockdown.trigger` — security/principal only.
- Attendance auto-marks visible to class teacher; parents notified for own child only.

## Acceptance
From mock tap events, students auto-mark attendance with late flags and parents get entry alerts; a soft panic from a teacher geo-locates to a room, escalates through the tree, and lockdown broadcasts to staff — all offline.
