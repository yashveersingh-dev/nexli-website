# Document Management + Legally-Valid e-Sign (IT Act 2000 / Aadhaar eSign) — Research

_Module folder: `esign-document-management/`. Status: ⛔ **Blocked** for *legally-valid e-sign* (needs an empanelled ESP/ASP agreement + Aadhaar eSign access) — but a **complete document-management system** (versioned store, expiry tracking, templates, approval routing, a fully-functional signing-workflow shell) is buildable now, offline, with mock signing. See `Phase-1.md` for the split._

---

## 1. Two things, one module

1. **DMS (Document Management System)** — a versioned, permissioned, searchable store of every school document (policies, circulars, contracts, certificates, staff/student records, vendor agreements) with **version history**, **expiry/renewal tracking**, retention, and audit. This is **100% buildable now** and is independently valuable.
2. **Legally-valid e-Sign** — capturing signatures on those documents in a way that is **enforceable under the IT Act, 2000**. This is the **blocked** part: legal validity requires a real **eSign Service Provider**.

A world-class product makes signing feel like one button inside the DMS — the legal machinery is invisible to the user.

## 2. What makes an e-signature legally valid in India (the standards that constrain us)

- **IT Act, 2000** — the governing law. **Section 5** gives a valid electronic signature the **same legal status as a handwritten signature**. Electronic signatures are valid when they satisfy: **authenticity** of the signer, **signer control**, and **integrity** of the signed document (tamper-evidence).
- **Two legally-recognised forms:**
  - **Aadhaar eSign** — an **online electronic signature** where the signer authenticates via **Aadhaar OTP or biometric**; an **Electronic Signature Certificate** is issued on the fly. Cheap, instant, no token. **Best fit for schools** (parents/staff sign from a phone).
  - **DSC (Digital Signature Certificate)** — a physical USB-token certificate; needs install + software. Used by the school's authorised signatory for high-value/official documents.
- **The provider chain (this is the blocker):**
  - **CCA (Controller of Certifying Authorities)** sits at the top and publishes the **eSign API specification** (current line: **v3.x — v3.3, Dec 2020**; older v2.0/v1.x exist).
  - **ESP (eSign Service Provider)** — must be **owned/operated by a licensed Certifying Authority**. Empanelled ESPs (2026): **eMudhra**, **C-DAC**, **Protean eGov (formerly NSDL e-Gov)**.
  - Only **NSDL/Protean and C-DAC** are the authorities permitted to issue the online Aadhaar eSign certificates (via the ESP layer).
  - **ASP (Application Service Provider)** — the front-end that lets a signer sign. **Nexli would be an ASP**, and **must sign an empanelment agreement with an ESP** to operate. Commercial aggregators (**Leegality, Signzy, Setu, Digio, Zoop, SignDesk**) wrap an ESP and give an easier API — but you still need a **paid commercial agreement + KYC + API keys**.
- **The eSign API flow (shapes our data model):**
  1. ASP creates the **document hash** (the hash, not the document, leaves the building).
  2. ASP sends an **XML request** (Base64, with ASP id) to the ESP's OTP/sign service.
  3. Signer authenticates (Aadhaar OTP / biometric) with the ESP↔UIDAI.
  4. ESP returns a **signature** — response type is **`rawrsa` / `PKCS7` / `PKCS7pdf`** (PKCS7pdf embeds the full cert chain + CRL/OCSP for a self-verifiable PDF).
  5. ASP embeds the PKCS7 signature into the PDF and keeps the **audit trail** of the Aadhaar authentication.
- **A complete legal package = the signed PDF + the audit trail** (who, when, IP, auth method, document hash, certificate). A great product produces a downloadable **"signature certificate / audit trail"** page automatically.

## 3. Pooled "world's-best" feature list (DMS + e-Sign, the bar to beat: DocuSign / Leegality / Digio / SignDesk)

**Document management**
1. **Versioned store** — every edit is a new version; full history; diff/rollback; "current" pointer.
2. **Expiry & renewal tracking** — affiliation certificates, fire-safety NOCs, vendor contracts, staff documents (PAN, qualification, police verification, medical) each have an expiry; dashboard of "expiring in 30/60/90 days" + auto-reminders. **(Huge for Indian school compliance — CBSE/state affiliation, RTE, fire NOC, building safety.)**
3. **Folders + tags + powerful search** (by type, owner, student/staff link, expiry, status).
4. **Templates + mail-merge** — generate offer letters, fee-concession letters, TCs, consent forms, vendor POs from school data (ties into existing modules).
5. **Retention & legal hold** — auto-archive/delete per a retention policy; DPDP-aligned.
6. **Linked entities** — a doc attaches to a student/staff/vendor/class so it surfaces on their profile.

**e-Sign workflow**
7. **Signing workflows** — single signer, **sequential** (principal → chairman), **parallel** (both parents), with placeholders/fields and signing order.
8. **Multi-party + roles** — internal (staff with DSC) and external (parents/vendors via Aadhaar eSign OTP).
9. **Templated send** — "send the fee-concession letter to this parent to sign" in two clicks.
10. **Status tracking** — draft → out-for-signature → partially-signed → completed → declined/expired, with reminders.
11. **Tamper-evident audit trail / signature certificate** — auto-generated, attached to every completed doc.
12. **Bulk send** — same consent form to 200 parents, each individually signed and tracked.
13. **In-person / offline fallback** — print, wet-sign, scan, and attach (so the workflow still completes without connectivity).

**What makes it easy for users:**
- Parents sign on their **phone in under a minute** (Aadhaar OTP), no app install.
- Staff hit **"Send for signature"** from inside any document — placeholders are pre-filled from Nexli data.
- The school always has a **single source of truth** with a defensible audit trail, and gets **pinged before anything expires**.

## 4. The blocker, named precisely

**Legally-valid signing is blocked until:**
- An **empanelment / commercial agreement with an ESP** (eMudhra / C-DAC / Protean) **or** a paid aggregator (Leegality / Signzy / Setu / Digio / SignDesk), **plus**
- **Production API keys** and an **ASP id**, **plus**
- A **server component** to build the document hash and exchange the signed PKCS7 (the keys + Aadhaar-adjacent flow must not live in the React PWA; needs Cloud Functions on **paid Blaze**, not Spark).

Per-signature transactions are also **paid** (per-eSign pricing). **DSC** additionally needs a physical token for the authorised signatory. None of this is self-serve.

**Buildable offline now (no legal weight, clearly labelled):** the entire DMS, the full signing-*workflow* engine (routing, placeholders, status, reminders, bulk send), and a **`MockSignProvider`** that records an acknowledgement-style "signed (DEMO — not legally valid)" so the workflow is exercised end-to-end. Plus the **wet-signature print/scan/upload** path, which is genuinely legally usable today and needs no API.

## 5. How this maps onto existing Nexli
- Tenant-scoped under `schools/{schoolId}/…` (`tenantCol`/`tenantDoc`).
- **Reuses the issued-document mirror** from the APAAR module's Phase 2 (same `issued_documents` shape: URI + SHA-256 hash) — DMS is the superset store.
- Links to `features/students`, `features/hr` (staff docs), `features/expense` (vendor contracts), `features/consent` (consent forms), `features/admissions`.
- RBAC: new **`documents`** module key + the 7 actions; sensitive docs locked in `firestore.rules` like medical/POCSO.
- Audiences: `staff` (operate), `parent`/`student` (sign + view their own).
- Feature flag mock vs live via `schoolFlagsRef` + `lib/featureFlags.ts`.

## 6. Sources
- [Aadhaar eSign legality under IT Act 2000 (Leegality)](https://www.leegality.com/blog/law-around-aadhaar-esign)
- [eSign API Specifications v3.3 (CCA, Dec 2020)](https://cca.gov.in/sites/files/pdf/esign/eSign-APIv3.3.pdf)
- [eSign API Specifications v2.0 (CCA)](https://cca.gov.in/sites/files/pdf/ACT/eSign-APIv2.0.pdf)
- [Aadhaar eSign — how it works, cost, legal validity 2026 (Signyu)](https://signyu.com/guides/aadhaar-esign)
- [Aadhaar eSign API provider (Setu)](https://setu.co/data/esign/)
- [Aadhaar-based eSigning explained (AuthBridge)](https://authbridge.com/blog/aadhaar-based-esigning/)
- [NSDL/Aadhaar eSign API (IDcentral)](https://www.idcentral.io/api-platform/nsdl-esign-aadhaar-esign-api/)
