# Phase 1 — Academic-Identity Registry & Data-Readiness (buildable now, fully offline)

> Build inside Nexli `Web/`, tenant-scoped under `schools/{schoolId}/…`. No code is written by this plan — this is the spec.

---

## ⛔ BLOCKED vs ✅ BUILDABLE-NOW (read first)

### ⛔ BLOCKED — needs external approval / account / key (do NOT fake a live link)
| Capability | Exact dependency that blocks it |
|---|---|
| **Minting an APAAR ID** | Authorised **UDISE+ portal login** for the school + the government **APAAR module**. Generation happens on UDISE+, not via any private API. Nexli can prepare and track, never mint. |
| **Aadhaar eKYC of the student** | **UIDAI eKYC** access, available only through UDISE+/MoE. No school app calls UIDAI directly. |
| **Pushing Nexli certificates into DigiLocker** | Registration as a **DigiLocker Issuer** on **API Setu**, an allotted **issuer org id + 5-char docType**, and **production keys** (Issuer API v1.13). |
| **Pulling a student's docs from DigiLocker** (admission verification) | **Authorized Partner API v2.0** keys + **MeriPehchaan SSO** client registration + the user's consent grant. |
| **Live ABC / NAD credit push** | UGC/NAD onboarding (NSDL/CDSL). Out of scope until APAAR + Issuer are live. |

**Rule:** every blocked action ships as a disabled button or a "Preview only — not connected" panel that shows exactly what *would* be sent. **No mock endpoint is ever dressed up as a real one.**

### ✅ BUILDABLE NOW — fully offline, real value, with mock/sample data
1. **Academic-identity data model** on the student record (APAAR / ABC / PEN / Aadhaar-verified / DigiLocker-linked + lifecycle status).
2. **APAAR-readiness engine** — pure client logic that computes, per student, "ready / blocked + reason" from on-file data. No external call.
3. **Readiness dashboard** + per-class drill-down.
4. **Aadhaar-match pre-flight** — name/DOB mismatch detector against the on-file `aadhaarName`/`aadhaarDob` fields (data the school already holds). Pure string/date comparison.
5. **Digital + printable parental-consent capture** and a **consent register** (reusing `features/consent`).
6. **Bulk CSV import/reconcile** — ingest a real UDISE+/APAAR status export to update each student's status (this is a file the school downloads themselves — not an API).
7. **Issued-document mirror** — store every Nexli-issued certificate with a stable internal URI + SHA-256 hash, structured exactly as the Issuer API will need (so going live later is a config flip, not a rebuild).
8. **Coverage analytics & audit trail.**

The integration seam (Phase 3) is built as a **provider interface with a `MockApaarProvider` / `MockDigiLockerProvider`** so the real provider drops in later without touching screens.

---

## Goal of Phase 1
Give every student a first-class **academic identity record** and a **readiness engine** that tells staff exactly what to fix — the offline foundation everything else builds on.

## Data model (under `schools/{schoolId}/…`)

Extend the existing student doc (`schools/{id}/students/{studentId}`) with a nested `academicIdentity` object rather than a parallel collection:

```
students/{studentId}.academicIdentity = {
  pen: string | null,                 // UDISE+ Permanent Enrolment Number
  apaarId: string | null,             // 12-digit, once generated on UDISE+
  abcId: string | null,
  aadhaarName: string | null,         // name AS PER AADHAAR (restricted field)
  aadhaarDob: 'YYYY-MM-DD' | null,
  aadhaarOnFile: boolean,             // we hold a (masked) Aadhaar ref — never the raw number in plaintext to staff
  motherName: string | null,
  fatherName: string | null,
  status: 'not_started'|'consent_pending'|'ready'|'submitted'|'generated'|'linked'|'error',
  blockers: string[],                 // computed: ['no_pen','name_mismatch','dob_mismatch','no_consent','no_mobile']
  digilockerLinked: boolean,
  lastReconciledAt: Timestamp | null,
  updatedAt, updatedBy
}
```

Supporting tenant collections:
- `schools/{id}/apaar_consents/{studentId}` — `{ studentId, guardianMemberId, guardianName, relation, consentVersion, channel:'digital'|'printed_upload', acknowledgedAt, withdrawnAt|null, evidenceDocId|null }`
- `schools/{id}/apaar_imports/{importId}` — batch reconcile runs `{ fileName, rows, matched, updated, errors[], runBy, runAt }`
- `schools/{id}/settings/apaar` — `{ consentVersion, consentFormText, defaultAcademicYear }`

## Screens (staff audience)
- **APAAR Readiness Hub** (`features/apaar`) — tabbed like `FeesHub`/`ExpenseHub`:
  - **Overview tab** — coverage donut (generated / ready / blocked / not started), counts by grade.
  - **Students tab** — table: name, class, PEN, APAAR, status pill, blocker chips; filter by blocker; row → student academic-identity panel.
  - **Consent tab** — consent register; "send consent request to parent" (in-app notification, offline) + "upload signed form".
  - **Import / Reconcile tab** — drag a UDISE+ status CSV → preview diff → apply.
  - **Settings tab** — consent version/text, default academic year.
- **Student profile panel** — add an **"Academic Identity"** card to `StudentProfilePanels.tsx` showing APAAR/ABC/PEN/verified flags (read-only for most roles).

## Readiness engine (pure, offline)
A `apaarReadiness.ts` (mirrors `feeSchema.ts` style — pure functions, Zod for the import row):
- `computeBlockers(student): string[]` — no PEN, missing Aadhaar name, name mismatch (normalised compare vs `aadhaarName`), DOB mismatch, no mobile, no active consent.
- `deriveStatus(student, consent): status`.
- `matchScore(schoolName, aadhaarName): number` — fuzzy compare to surface "likely the same person, fix spelling" vs "different person".

## Role gating
- New app-module key **`apaar`** (label "APAAR / Academic Identity"), added to `lib/roles/modules.ts`, `legacy: 'apaar'`. Defaults: UDISE Coordinator / Exam Controller / Principal get `manage`; class teachers get `view`+`edit` for their class; office gets `view`.
- **Aadhaar fields** (`aadhaarName`, `aadhaarDob`, `aadhaarOnFile`) are write-gated and **never** included in any export — enforce in `firestore.rules` the same way medical/POCSO fields are locked.
- Register module: `registerModule('staff', 'apaar', lazy(() => import('@/features/apaar/routes')))`.

## Definition of done (Phase 1)
- Every demo student shows an academic-identity card with a correct status + blocker list.
- A teacher can open the readiness hub and see "X ready, Y blocked because Z".
- Consent can be captured digitally and via uploaded form; consent register is complete and auditable.
- A sample UDISE+ CSV reconciles cleanly and updates statuses.
- Zero live government calls anywhere; all blocked actions visibly disabled.
