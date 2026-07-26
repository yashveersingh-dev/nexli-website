# APAAR ID / ABC / DigiLocker / NAD — Research

_Module folder: `apaar-abc-digilocker/`. Status: ⛔ **Blocked** (government onboarding) — but a large offline shell (consent capture, the APAAR registry, document mirror, reconciliation against UDISE+) is buildable now with mock/sample data. See `Phase-1.md` for the exact BLOCKED-vs-buildable split._

---

## 1. What these four things actually are (so we model them correctly)

| Term | Full name | What it is | Who owns it |
|---|---|---|---|
| **APAAR ID** | Automated Permanent Academic Account Registry | A 12-digit **permanent** academic ID for every student from Grade 1 onward. The lifelong "academic Aadhaar". | Ministry of Education (MoE), generated via **UDISE+** |
| **PEN** | Permanent Enrolment Number | The UDISE+ student identifier. **APAAR is generated against the PEN** — PEN is the prerequisite. | UDISE+ |
| **ABC** | Academic Bank of Credits | A credit-ledger that stores academic credits keyed to the APAAR/ABC ID. Mostly higher-ed today; schools feed into it under NEP/NCrF. | UGC / MoE |
| **DigiLocker** | — | Government document wallet. The issued APAAR card and (eventually) marksheets/certificates land in the student's **"Issued Documents"**. | MeitY (DigiLocker / API Setu) |
| **NAD** | National Academic Depository | Depository of academic awards (marksheets, certificates, degrees). Runs on **NSDL Database Management Ltd** and **CDSL Ventures Ltd**. DigiLocker is the front door for school-level NAD. | MoE / NSDL+CDSL |

**Key fact that shapes the whole build:** A school does **not** mint an APAAR ID via a private REST API. The official path is: the school's **UDISE+ coordinator / class teacher** logs into the **UDISE+ portal → APAAR module**, the system does **Aadhaar eKYC** of the student (UIDAI returns a Yes/No + eKYC), and **UDISE+ generates the APAAR against the PEN**. The card then auto-lands in the student's DigiLocker. So for Nexli, APAAR generation is a **government-portal workflow we orchestrate around** (consent, data hygiene, status tracking) — **not** an API we call to mint IDs. DigiLocker is the part with a real partner API (Issuer + Pull + MeriPehchaan SSO).

---

## 2. Mandatory data to generate an APAAR ID (drives our data model)

Per the APAAR/UDISE+ process, these fields must exist and **must match Aadhaar exactly** before generation:

- **PEN** (UDISE+ Permanent Enrolment Number) — mandatory prerequisite
- **Student name as per Aadhaar** (must match UDISE+ record)
- **Date of birth** (must match Aadhaar)
- **Gender**
- **Mobile number**
- **Mother's name**, **Father's name**
- **Aadhaar number** (used for eKYC; UIDAI returns eKYC/Yes-No to MoE)
- **Signed parental/guardian consent** (mandatory for minors — there is an official consent form PDF)

**The #1 real-world failure** is a name/DOB mismatch between school records and Aadhaar. A world-class product makes this a **pre-flight data-quality gate** so schools fix mismatches *before* they ever touch the government portal. That gate is 100% buildable offline and is the single biggest value-add.

---

## 3. The real APIs / standards (named, with versions)

- **DigiLocker Issuer API** (API Setu) — current spec **v1.13 (May 2024)**. An issuer (school/board) implements **2 endpoints** that DigiLocker calls: a **document-search/Pull URI** and a **document-fetch URI**. Documents are keyed by a **5-char `docType`** assigned by DigiLocker, plus issuer-defined parameters. Used to make Nexli-issued certificates **pullable** into a student's DigiLocker.
- **DigiLocker Pull API** — **v1.3**. Lets a partner app pull a citizen's documents (with consent) from issuer repositories.
- **DigiLocker Authorized Partner API** — **v2.0 (Feb 2021)** / v1.11. OAuth2-style partner access to a user's DigiLocker.
- **MeriPehchaan SSO** — National Single Sign-On; the OAuth2/OIDC front door for DigiLocker login + consent. A parent/student logs in with MeriPehchaan and grants consent.
- **UDISE+ / APAAR module** — government portal workflow (no public partner REST for minting). Consumes UIDAI **Aadhaar eKYC** under the hood.
- **NAD via NSDL/CDSL** — academic-award depository; for schools, the practical surface is DigiLocker Issuer (push results as issued docs).
- **Consent indicator** — every Pull request carries a consent flag that must be `"Y"`; without explicit captured consent the request is rejected. This maps cleanly onto Nexli's existing `consent` module.

**Onboarding reality (the BLOCKER):** to go live you need (a) registration/MoU as a **DigiLocker Issuer** on API Setu / Partner Portal, (b) allotted **issuer org id + docType(s)**, (c) production keys, and (d) for APAAR, an authorised **UDISE+ login** for the school. None of this is self-serve; it is government onboarding + approval. Until then we build the offline shell.

---

## 4. Pooled "world's-best" feature list (the bar)

Researched as if APAAR/DigiLocker compliance were a standalone product (e.g. EdPayU / Teachmint / Eupheus-style APAAR tooling). Nexli should aim to beat all of these:

**A. Data-readiness & matching (the moat)**
1. **APAAR-readiness dashboard** — per class: how many students are "ready to generate" vs blocked, with the exact blocker (no PEN, no Aadhaar on file, name mismatch, DOB mismatch, missing parent consent, missing mobile).
2. **Aadhaar-match pre-flight** — flag name/DOB mismatches against the on-file Aadhaar-name field *before* the portal rejects them. Suggest the corrected canonical spelling.
3. **PEN coverage tracker** — which students lack a PEN; bulk-import PEN from a UDISE+ export.
4. **Bulk CSV reconcile** — import the UDISE+/APAAR status export and auto-update each student's `apaarStatus`.

**B. Consent done right (POCSO/DPDP-grade)**
5. **Digital parental-consent capture** — the official APAAR consent form rendered in-app, with parent acknowledgement (and an offline printable PDF for wet signatures), versioned and timestamped, withdrawable.
6. **Consent register** — who consented, when, from which guardian, consent version, withdrawal log. Survives audit.
7. **Minor-aware** — distinct flows for <18 (guardian consent mandatory) vs adult students.

**C. The academic identity record**
8. **Unified student academic-identity card** in the profile: APAAR ID, ABC ID, PEN, Aadhaar-verified flag, DigiLocker-linked flag — one glanceable panel.
9. **Lifecycle status** per ID: `not_started → consent_pending → ready → submitted → generated → linked → error`.
10. **APAAR on the TC / transfer** — when a student leaves, the APAAR travels with them (no re-minting at the next school). Show APAAR on Transfer Certificate.

**D. Documents → DigiLocker / NAD**
11. **Issued-document mirror** — every certificate/marksheet Nexli issues is stored with a stable URI + hash, ready to expose via the Issuer API once approved.
12. **"Push to DigiLocker" action** (live = blocked) with a clear offline "would push" preview.
13. **Verify-from-DigiLocker** — at admission, pull a child's previous records (TC, marksheet) from DigiLocker with consent (live = blocked).

**E. Trust & analytics**
14. **Coverage analytics** — % APAAR generated by class/grade/section; trend; export for management & UDISE compliance.
15. **Full audit trail** — every consent, submission, status change logged to the tenant audit log.

**What makes it easy for users (the UX promises):**
- A teacher sees a single **"APAAR readiness"** list and is told *exactly* what to fix per student — never a cryptic portal error.
- Parents consent in **two taps** in the parent portal (or sign a printed form the school uploads).
- Nothing about Aadhaar numbers is shown to staff who lack permission; Aadhaar is **write-restricted and never exported**.
- The school's existing UDISE+ portal stays the source of truth — Nexli **prepares and reconciles**, it doesn't pretend to be the government.

---

## 5. How this maps onto existing Nexli

- **Multi-tenant:** everything under `schools/{schoolId}/…` via `tenantCol`/`tenantDoc` (see `Web/src/lib/db.ts`).
- **Students:** reuse `features/students` (`studentSchema.ts`) — add academic-identity fields rather than a parallel student store.
- **Consent:** reuse `features/consent` (the privacy/consent module) for the consent register and DPDP alignment.
- **Compliance/UDISE:** sits beside `features/udise` and `features/compliance` (UDISE+ is already a first-class concept).
- **RBAC:** new actions on a `compliance`/`students` module key; gate with the existing 7 actions (view/create/edit/approve/export/delete/manage). Aadhaar field locked in `firestore.rules` like medical/POCSO data.
- **Audiences:** `staff` (UDISE coordinator, class teacher, principal), `parent` (consent), `student` (view own academic-identity card).

---

## 6. Sources
- [APAAR official FAQs](https://apaar.education.gov.in/faqs) and [APAAR portal](https://apaar.education.gov.in/)
- [Official parental consent form (PDF)](https://cdnbbsr.s3waas.gov.in/s3kv052ffce46d93d998e9a58d782a2997/uploads/2025/03/2025032630.pdf)
- [DigiLocker Issuer API Specification v1.13 (May 2024)](https://cf-media.api-setu.in/resources/DigiLocker-Issuer-APISpecification-v1-13.pdf)
- [DigiLocker Pull API Specification v1.3](https://img1.digitallocker.gov.in/assets/img/digital_locker_pull_API_specification_v1_3.pdf)
- [DigiLocker Authorized Partner API v2.0](https://meripehchaan.gov.in/assets/img/chose/Digital%20Locker%20Authorized%20Partner%20API%20Specification%20v2.0.pdf)
- [MeriPehchaan SSO integration notes (Sunbird RC)](https://docs.sunbirdrc.dev/use/integrations/digilocker-meripehchaan-sso)
- [ABC / APAAR / NAD explainer (QverLabs)](https://qverlabs.com/blog/abc-id-apaar-nad-india-academic-identity-explained)
- [APAAR for school students — principals' guide (EdPayU)](https://edpayu.com/blog/apaar-id-abc-id-school-students-guide/)
- [DigiLocker](https://www.digilocker.gov.in/)
