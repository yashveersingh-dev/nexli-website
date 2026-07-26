# Phase 2 — Parent Consent Portal, Issued-Document Mirror & APAAR-on-TC (buildable now, offline)

> Still fully offline. Builds the parent-facing consent flow and the document-mirror structure that the real DigiLocker Issuer API will later read from unchanged.

---

## Recap of blocking
Nothing in Phase 2 is live-connected. Two things here are **shaped for** a future blocked integration but run offline now:
- The **issued-document mirror** is structured to match **DigiLocker Issuer API v1.13** (docType, issuer org id, URI, hash) — but exposes no public endpoint. ⛔ Live Issuer endpoint = blocked until API Setu registration + production keys.
- "Push to DigiLocker" / "Verify from DigiLocker" buttons exist as **Preview-only** panels. No fake transport.

## Part A — Parent/student consent in the family portal
**Audience: `parent`, `student`.**

- Parent portal gets an **"APAAR consent"** card (reuse `features/family` + `features/consent`). Shows the official consent text (versioned from `settings/apaar`), the child's current APAAR status, and a **two-tap "I consent"** action.
- Records to `schools/{id}/apaar_consents/{studentId}` with `channel:'digital'`, `guardianMemberId` = the signed-in parent's member id, `consentVersion`, `acknowledgedAt`.
- **Withdraw consent** action (DPDP requirement) — sets `withdrawnAt`, flips student `status` back to `consent_pending`, logs to audit.
- Adult students (≥18) see the consent on their own portal instead of the guardian.
- Offline-printed path: staff "upload signed form" attaches a PDF/scan as `evidenceDocId` (stored in the Phase-3 document store), `channel:'printed_upload'`.

## Part B — Issued-document mirror (Issuer-API-shaped, offline)
Every certificate/marksheet Nexli already generates (TC from `features/students/tc`, report cards from `features/hpc`, exam marksheets from `features/examinations`) gets mirrored into a structured, verifiable store:

`schools/{id}/issued_documents/{docId}`:
```
{
  studentId, apaarId | null,
  docType: string,            // maps to the 5-char DigiLocker docType once allotted (e.g. 'TRNSC','MARKS')
  docCategory: 'tc'|'report_card'|'marksheet'|'certificate',
  academicYear, title,
  uri: string,                // stable internal URI (Phase-3 doc store)
  sha256: string,             // content hash — same hash the Issuer API needs
  issuedAt, issuedBy,
  digilockerState: 'not_pushed'|'preview'|'pushed',   // stays 'not_pushed'/'preview' until live
  digilockerPushedAt: null
}
```
- A **"Preview DigiLocker payload"** action renders the exact Issuer-API search/fetch response that *would* be returned (docType, issuer id placeholder, parameters, URI, hash) — clearly labelled **"PREVIEW — not connected to DigiLocker."**
- Building the hash + URI now means going live later is wiring a provider, not re-modelling data.

## Part C — APAAR travels with the student (TC integration)
- Extend the Transfer Certificate (`features/students/tc`) to print the student's **APAAR ID** so the receiving school does not re-mint. This is offline and immediately useful.
- Admission flow (`features/admissions`) gains an **"APAAR ID (if any)"** field so an incoming student's existing APAAR is captured rather than duplicated.

## Role gating
- Parent/student consent surfaces are gated by audience (only the child's own guardian sees the card — reuse the family scoping already used by `features/family`).
- `issued_documents` write = roles that issue the underlying doc (exam controller, principal, office); read of a student's own docs = that student/parent.
- "Preview DigiLocker payload" gated behind `apaar.manage`.

## Definition of done (Phase 2)
- Parents/students can give and withdraw APAAR consent from their portal; withdrawal correctly resets status.
- Every TC/report-card/marksheet auto-creates an `issued_documents` record with a real SHA-256 hash.
- TC and admission screens show/capture APAAR ID.
- "Preview DigiLocker payload" shows a faithful, clearly-labelled offline preview — no live call.
