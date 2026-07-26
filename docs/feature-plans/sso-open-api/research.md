# SSO + Open API + Interoperability — Research

> Pooled "world-best" feature set for identity, rostering, and platform interoperability for a school ERP. Benchmarks: Google for Education + Classroom roster sync, Microsoft Entra ID / Education, Clever, ClassLink, Edlink, 1EdTech (OneRoster 1.2, LTI 1.3, Caliper), Stripe-grade public API + webhooks, integration marketplaces (Zapier/HubSpot app directory).

## 1. Single Sign-On (SSO)
- **Google Sign-In (OIDC/OAuth 2.0)** + **Microsoft Entra ID (OIDC)** for staff/students/parents; "Sign in with Google/Microsoft" buttons.
- SAML 2.0 for enterprise/board IdPs; generic OIDC connector.
- Just-in-time (JIT) provisioning, domain-restricted login (school's Workspace/365 tenant), role mapping from IdP groups/claims.
- Multi-tenant: each school maps its own IdP/domain; account linking (merge SSO with existing local account); MFA passthrough.
- Session management, token refresh, sign-out propagation.

## 2. Roster / directory sync
- **OneRoster 1.2** (REST + CSV) — orgs, users, courses, classes, enrollments, demographics; **OAuth 2.0 client-credentials** (1.2 drops OAuth 1.0).
- **Google Classroom** + **Microsoft School Data Sync (SDS)** roster import.
- **Clever / ClassLink** style auto-roster (where present); delta sync, conflict resolution, dry-run preview, mapping rules (their grade/section ↔ ours).
- Scheduled + on-demand sync; sync run logs + error reports; deactivate-on-leave.

## 3. LTI 1.3 (tool interoperability)
- Act as an **LTI 1.3 Platform** (launch external tools from Nexli) and/or **Tool** (Nexli launched from an LMS).
- OIDC third-party-initiated login, JWT/JWKS signing, deep linking, **Names & Roles Provisioning Service (NRPS)**, **Assignment & Grade Services (AGS)** for grade passback.
- Tool registry, per-tool key/deployment management.

## 4. Public REST API + webhooks
- Versioned REST API (`/v1`), resource coverage (students, staff, classes, attendance, exams, fees, etc.), pagination, filtering, idempotency keys, rate limits.
- **OAuth 2.0** (client-credentials for server apps; auth-code for user apps) + scoped API keys; per-scope permissions.
- **Webhooks**: subscribe to events (student.created, attendance.marked, fee.paid, result.published…), signed payloads (HMAC), retries with backoff, delivery logs, replay.
- OpenAPI 3 spec, interactive docs, sandbox/test mode, SDK stubs.
- Caliper/xAPI analytics event emission (optional).

## 5. Developer portal & integration marketplace
- Self-serve app registration, credentials, scope selection, usage dashboards, logs.
- Curated marketplace of integrations (LMS, payment, comms, library, AI tutors); install/configure/uninstall; per-integration config + status.
- Partner onboarding, review/approval, sandbox keys.

## 6. Security & governance
- Least-privilege scopes, key rotation, audit logs of every API call + token issuance.
- Tenant isolation (every token bound to a `schoolId`); consent screens for third-party apps; revoke access.
- Rate limiting & quotas (especially relevant on Firebase Spark).

## 7. UX principles
- One-click "Sign in with Google/Microsoft" reduces password support load (huge in Indian schools).
- Admin sees one Integrations page: connected IdPs, roster syncs (last run + errors), installed apps, API keys.
- Developers self-serve in a clean portal; clear errors; copy-paste examples.

## 8. India-specific notes
- Many schools already on **Google Workspace for Education** (free) → Google SSO + Classroom sync is the highest-value first integration.
- DPDP Act 2023: third-party data sharing needs consent + purpose limitation; roster export of minor data must be controlled + logged.
- DigiLocker / APAAR (national education ID) and government SDMS feeds are India-specific interoperability targets worth roadmapping.
- Free Firebase Spark: hosting a high-throughput public API + webhook dispatch needs Blaze; design API thin and quota-aware.

## Sources
- [Rostering, Resources & Gradebook Standards — 1EdTech](https://www.1edtech.org/blog/rostering-resources-and-gradebook-standards)
- [OneRoster — 1EdTech](https://www.1edtech.org/standards/oneroster)
- [Everything You Need to Know about OneRoster 1.2 — Edlink](https://ed.link/community/everything-you-need-to-know-about-oneroster-1-2/)
- [Accelerate LTI 1.3 & OneRoster 1.2 — Magic EdTech](https://www.magicedtech.com/blogs/tackling-integration-debt-in-uk-edtech-how-to-accelerate-lti-1-3-and-oneroster-1-2-readiness/)
