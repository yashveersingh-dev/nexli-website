# Certificate Generator — Phase 2 (QR Verification, Registry Ledger, Approval, Anti-Forgery)

> Phase 2 adds the trust layer that makes certificates believable to banks/colleges: **QR verification, a public verification page, approval for sensitive docs, revoke/reissue with anti-forgery stamps, and a full ledger**. One small offline QR library is the only new dependency.

---

## A. QR-code verification (new offline dependency)
- Add a tiny **QR-generation library** (e.g. `qrcode` — offline, free, no API key). ⚠️ New dep, but no paid plan and no network.
- Each issued certificate gets a stable `verificationCode` (Phase 1) and a QR encoding a **public verification URL**: `/verify/{schoolId}/{certNo}` (or a short code).
- `CertificateDoc` renders the QR in a corner/footer.

## B. Public verification page (data-minimised)
- A **public, unauthenticated route** `VerifyCertificatePage.tsx` that reads a single cert by code and shows only: school name, cert no, recipient name, type, issue date, **Valid / Revoked** status — **no Aadhaar, no address, no marks**.
- `firestore.rules`: a narrow **public read** rule for a *verification projection* — either (a) a separate `certificateVerifications/{code}` doc holding only the safe fields (recommended: keeps the full cert private), or (b) field-limited read. Prefer the projection doc, written atomically on issue.
- "Revoked" certs show a clear revoked banner + reason category (not free text).

## C. Approval workflow for sensitive certificates
- Reuse `features/hpc/hpcWorkflow.ts` shape: `draft → submitted → issued`, with `return(note)`. Templates with `approvalRequired:true` (bonafide, character, study, fee-paid) **cannot be issued without Principal/authorised approval**.
- Reuse a `canApproveCertificate(role, can)` helper (mirror `canApproveHpc`).
- A **pending-approval queue** screen for approvers (copy `HpcHub` review list); approve/return with audit.

## D. Revoke, reissue & anti-forgery
- **Revoke** with a reason category → verification page + registry reflect it; cert marked immutable-revoked.
- **Reissue** (duplicate/replacement) → new cert linked to original, stamped **"DUPLICATE"**; original stays in ledger. Audit both.
- **Anti-forgery on the doc**: subtle background watermark/guilloché pattern (CSS), "ORIGINAL"/"DUPLICATE" stamp, issue place/date, signatory block, and the QR — together making casual forgery hard.

## E. Registry as an audit-ready ledger
- Registry export to CSV (reuse the events `exportRegistrations` pattern).
- Filters: type, status, date range, class, issued-by, batch.
- Per-type counters dashboard ("142 bonafide issued this year").
- Tie every issue/revoke/reissue/approve to `lib/audit.ts` and the tenant audit log.

## Build order
1. Add `qrcode` lib; render QR in `CertificateDoc`.
2. Write the `certificateVerifications` projection doc on issue; public verify route + page; narrow public read rule.
3. `certificateWorkflow.ts` + approval queue; gate issue on approval for `approvalRequired` templates.
4. Revoke/reissue with stamps + linkage + audit.
5. Registry CSV export, filters, counters dashboard.

## Dependencies / flags
- **`qrcode` lib** — new front-end dep, offline, free.
- **Public Firestore read** for the verification projection only (no private fields exposed).
- No AI, no paid plan.

## Definition of done
- Every issued cert has a working QR → public verify page showing valid/revoked with minimal data.
- Sensitive certs require approval before issue; queue + audit work.
- Revoke/reissue reflect on verification and registry; duplicate stamping works.
- Registry exports and tallies are audit-ready.
