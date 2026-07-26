# Skills Passport / E-Portfolio — Phase 2 (sharing, micro-credentials, evidence)

> Builds on Phase 1's verified achievement record. Adds the public shareable
> portfolio, school-issued verifiable micro-credentials (Open-Badge-shaped),
> richer evidence handling, and the curated "showcase" presentation that makes it a
> true CV-for-college.

## New / extended capabilities

### 1. Public, token-gated shareable portfolio
- New `portfolio_shares` collection:
  ```
  { id, studentId, token, scope: 'featured'|'verified'|'all',
    expiresAt?, revoked, viewCount, createdBy, createdAt }
  ```
- A public, read-only route (`/p/:token`) renders only allowed entries (respects
  `visibility` + `requireVerificationToShow`), redacting private data.
- `firestore.rules`: a dedicated read path keyed by an unguessable token (the only
  place anonymous read is permitted, and only for the share-scoped projection).
- Student/parent can **revoke** or **regenerate** the link; view count shown.

### 2. School-issued verifiable micro-credentials
- Coordinators define **credential templates** (`credential_defs`): criteria,
  issuer, skills, NEP competencies, validity — Open-Badge-style metadata.
- Issuing a credential writes a `student_badges`-linked verified `portfolio_entries`
  entry with `evidenceHash` and a verifiable record (issuer, criteria, date).
- A **public verification page** (`/verify/:credentialId`) lets a college/employer
  confirm a credential is genuine (reads the immutable issue record).

### 3. Evidence handling (when Storage/Blaze available)
- Full file uploads (images/PDFs) for evidence via Firebase Storage, with size
  limits; thumbnails + lightbox. Until Storage is enabled, keep P1 link/inline-image
  evidence (no faked uploads).
- `evidenceHash` (client-computed SHA-256 of the file/link) recorded at verification
  for tamper-evidence.

### 4. Curated showcase / portfolio presentation
- A polished, theme-able portfolio layout (hero, featured highlight reel, skills
  radar, verified-credentials wall, timeline) — the "world-best presentation" layer.
- **Resume/CV export** variant (single page, ATS-friendly text) alongside the
  visual passport PDF.

### 5. Richer skills profile
- Evidence-weighted skills (national-level achievement weighs more than school-level)
  → a more credible strength map; feeds HPC and the gamification competency radar.
- Gap hints ("no leadership evidence yet") — templated, not AI.

## Data model additions
- `portfolio_shares` (above).
- `credential_defs` `{ id, title, criteria, issuer, skills, nepCompetencies, validityMonths?, active }`.
- Extend `portfolio_entries.verification` with `evidenceHash`, `credentialDefId?`.

## Screens
- `PublicPortfolioPage` (`/p/:token`) and `CredentialVerifyPage` (`/verify/:id`) — both
  unauthenticated, read-only, minimal layout.
- `ShareManagerSheet` (create/revoke link).
- `CredentialIssuerPage` (coordinator issues credentials from templates).
- `PortfolioShowcase` themed layout + CV export.

## Role gating
- Share link create/revoke: student/parent (own) + staff.
- Credential templates + issuing: coordinator/HOD/VP-Academic/principal.
- Public pages: anonymous read, token/credential-id scoped only.

## Acceptance
- A student generates a share link that shows only allowed, verified entries to a
  logged-out viewer; revoking it kills access immediately.
- A school issues a micro-credential that an external party can independently verify
  via the public verify page.
- Evidence files (when Storage available) upload with tamper-evident hashes; until
  then link/inline evidence works and nothing is faked.
