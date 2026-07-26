# Certificate Generator — Phase 5 (Digital Signatures, AI Wording, Advanced Trust)

> The premium/trust tier: cryptographic **e-signatures** for legal documents, optional **blockchain-style tamper proofs**, and an **AI wording assistant**. Each capability is independently gated and degrades gracefully when its dependency is absent.

---

## A. Digital / cryptographic e-signatures (optional, dependency-gated)
- For legally weighty certs (bonafide, character, TC), produce a **digitally signed PDF**.
- ⚠️ **Dependency:** requires a true PDF-generation path (a PDF lib, e.g. `pdf-lib`) **plus** a signing key/credential or an e-sign provider (DSC / eMudhra / DigiLocker-style). This is the first place a real PDF binary (not print-to-PDF) is needed, because you can only cryptographically sign a generated PDF file, not a browser print. Needs **Blaze** (server-side signing so the key is never client-side).
- If signing isn't configured, fall back to the Phase-1 print-to-PDF + image signature + QR (still trustworthy via the verification page) — **no fake signature**.
- **DigiLocker push** (aspirational): issue certificates to a student's DigiLocker — requires official DigiLocker partner integration + credentials; documented as a future, credential-gated integration, not assumed.

## B. Advanced tamper-evidence
- Per-cert **content hash** stored on the verification projection; verification page recomputes/compares.
- Optional **append-only ledger** of issue/revoke events (audit-grade); export for inspection.
- Short human-readable **verification code** + QR (both already from Phase 2) hardened.

## C. AI wording assistant (gated behind `ai` flag — see Phase 6 of QP module for the dependency rule)
- ⚠️ **Dependency:** AI key + **Blaze** + school `ai` flag ON; else show the existing **`AILockedOverlay`**.
- "Draft certificate text" from a few inputs (achievement, dates, tone) → editable suggestion (never auto-issued).
- **Bilingual draft** (English + Hindi/regional) in one go.
- **Tone/grammar polish** of an existing body text.
- All AI output is a *draft for review* — issuance still goes through the normal (approval) flow.

## Build order
1. Add `pdf-lib` (true PDF gen) for the signing path; server-side sign via callable Function (Blaze).
2. e-sign provider adapter (pluggable) + graceful fallback to print-to-PDF.
3. Content-hash + append-only event ledger; verification page hash check.
4. AI wording assistant behind `AILockedOverlay`.
5. (Future) DigiLocker partner integration — documented, credential-gated.

## Dependencies / flags (state plainly)
- **Cryptographic e-sign** → PDF lib + signing credential/provider + **Blaze**. Optional; falls back to print-to-PDF + QR.
- **AI wording** → AI key + **Blaze** + `ai` flag; else locked overlay.
- **DigiLocker** → official partner credentials; not assumed, future.

## Definition of done
- When signing is configured, sensitive certs export as digitally signed PDFs; otherwise the trusted print-to-PDF + QR path is used (clearly, not faked).
- Verification page can validate a content hash.
- With AI enabled, staff get reviewable bilingual wording drafts; with it off, the standard locked overlay.
