# Phase 2 — Signing-Workflow Engine + Wet-Signature & Demo-Sign paths (buildable now, offline)

> Builds the full signing *workflow* (routing, placeholders, status, reminders, bulk send) on top of the Phase-1 DMS. The legally-valid Aadhaar/DSC signature stays ⛔ blocked; this phase ships the **wet-signature** path (legally usable today) and a clearly-labelled **demo-sign** path so the workflow is fully exercised.

---

## Recap of blocking
- The **legal cryptographic signature** (Aadhaar eSign PKCS7 / DSC) is ⛔ blocked (ESP/ASP agreement + keys + server). See Phase 1 table.
- This phase builds everything *around* the signature: who signs, in what order, with what fields, with what reminders, and how the completed package is assembled. That engine is identical whether the final signature is wet, demo, or (later) legally-valid eSign.

## Part A — Signing workflow engine (offline-real)
`schools/{id}/sign_requests/{requestId}`:
```
{
  docId, versionId,
  mode: 'single'|'sequential'|'parallel',
  signers: [{
     order, party:'staff'|'parent'|'student'|'vendor',
     memberId|externalContact, role:'principal'|'chairman'|'guardian'|'vendor'|…,
     fields:[{ type:'signature'|'date'|'text', page, x, y }],
     status:'pending'|'notified'|'signed'|'declined',
     method:'wet'|'demo'|'aadhaar_esign'|'dsc',     // aadhaar_esign/dsc => LIVE-ONLY
     signedAt|null, evidenceVersionId|null
  }],
  status:'draft'|'out_for_signature'|'partially_signed'|'completed'|'declined'|'expired',
  reminders:[{ at, channel }],
  createdBy, createdAt, completedAt|null
}
```

- **Routing**: single / sequential (advance to next signer only when prior signs) / parallel (all at once).
- **Placeholders**: drop signature/date/text fields on pages (stored as coordinates; rendered for wet-print and later for eSign).
- **Status + reminders**: auto-nudges to pending signers via `features/communication` (offline-real in-app).
- **Bulk send**: one template → N parents, each its own `sign_request`, individually tracked (e.g. annual consent form to a whole class).

## Part B — Wet-signature path (legally usable TODAY, no API)
- "Print for signature" → generates the doc with placeholder boxes → school collects wet signatures → "upload signed copy" attaches a new version with `method:'wet'`, flips signer to `signed`, advances the workflow.
- This is a **real, defensible** completion path that needs zero external integration — the recommended go-live-now option for high-stakes docs.

## Part C — Demo-sign path (clearly NOT legal)
- "Sign in demo mode" records an acknowledgement: signer identity (logged-in member), timestamp, IP, document hash — and stamps the output **"DEMO signature — NOT legally valid under the IT Act, 2000."**
- Purpose: let staff/parents exercise the full flow before the ESP is connected. Never presented as legally binding.

## Part D — Parent/student signing surface (`parent`,`student` audiences)
- A "To sign" inbox in the parent/student portal: pending requests for their child / themselves, with the wet or demo path (and, when live, Aadhaar eSign).
- Guardian scoping reuses `features/family`; a parent only sees their own child's requests.

## Part E — Audit trail / signature certificate
- Every request auto-builds an **audit page**: each signer, method, timestamp, IP, document SHA-256, version signed. Attached to the completed document. (When live, this is where the Aadhaar auth reference + certificate serial are recorded.)

## Role gating
- Initiating a sign request = `documents.create` (+ `approve` for contracts/legal).
- Declining/cancelling = initiator or `documents.manage`.
- Parent/student see only their own requests.
- Demo-sign explicitly marked non-legal in UI and in the stored record.

## Definition of done (Phase 2)
- A sequential 2-signer workflow (principal → chairman) advances correctly and completes via the wet path.
- A bulk send to a demo class creates per-parent requests, each independently tracked.
- The parent portal "To sign" inbox shows and completes a request (wet or demo).
- Every completed doc has an audit page; demo signatures are unambiguously labelled non-legal.
- No live Aadhaar/DSC call; those methods disabled.
