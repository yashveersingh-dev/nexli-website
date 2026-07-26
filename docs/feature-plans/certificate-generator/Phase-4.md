# Certificate Generator — Phase 4 (Smart Recipient Sourcing, Delivery, Portal Wallet, Module Integrations)

> Phase 4 removes the manual list-building and the manual handing-out: **auto-pull recipients** from gradebook/attendance/events, **deliver** by email/portal/WhatsApp, and surface certs in the **parent/student wallet**. No AI (that's Phase 6); WhatsApp/SMS need provider creds (flagged).

---

## A. Smart recipient sourcing (auto-build the "who gets a cert" list)
- **Toppers / merit**: pull from `features/gradebook` + `examinations` results → "Issue Rank 1–3 merit certs for Class X, Term 1" auto-fills recipients + rank/percentage merge fields.
- **100% / 90%+ attendance**: pull from `features/attendance` for a period → bulk attendance certificates.
- **Event/sports winners & participants**: pull from `features/events` (`ParticipantSheet`, registrations) → participation + winner certs in one action.
- **Subject toppers, perfect discipline, house champions**: same pattern from the relevant module.
- Each source returns a recipient list with pre-mapped merge fields; teacher reviews/edits before generating (human confirm, no surprises).

## B. Delivery & sharing
- **Email**: send the certificate PDF/link to the parent/student via `features/communication` (free path).
- **Portal wallet**: issued certs appear in the **parent/student document wallet** (reuse `compliance/VaultTab` + portal patterns) for self-download — cuts office re-print requests.
- **WhatsApp / SMS**: ⚠️ needs a messaging provider (Gupshup/Twilio/MSG91) with credentials + likely a paid plan + Blaze for the server call. Build behind a feature flag; if unconfigured, show "configure provider" — never fake a send.
- **Bulk distribute**: email/notify a whole batch in one action.
- **Public share link** (reuses the Phase-2 verification URL) + optional "download all" ZIP (needs a zip lib — small, offline; flagged as a minor new dep).

## C. Deeper module integrations
- **TC rendering**: the existing `features/students/tc` TC becomes printable via a certificate layout (the generator renders it; the TC workflow stays where it is — no duplication).
- **Fee-paid certificate** from `features/fees` payment history.
- **Sports/house** certs from `features/events`/house points.
- A **"Issue certificate" action** added contextually on student profile, event detail, exam results, and attendance reports (one click from where the achievement lives).

## D. Scheduling & automation (no AI)
- **Event-triggered suggestions**: when an exam is published or an event completes, suggest "Generate certificates?" with the pre-built list.
- **Year-end batch**: promotion/completion certificates for a graduating class in one run.

## Build order
1. Recipient-source adapters (`recipientSources.ts`): gradebook toppers, attendance%, event winners → list + merge map.
2. Email/portal delivery (reuse communication + vault); bulk distribute.
3. WhatsApp/SMS behind provider config + flag (graceful "not configured").
4. Contextual "Issue certificate" actions on profile/event/results/attendance.
5. TC + fee-paid render layouts; year-end batch.

## Dependencies / flags
- **No AI, no extra paid plan for the core** (email + portal are free).
- **WhatsApp/SMS** → provider credentials + paid plan + Blaze (flagged; graceful fallback).
- **ZIP download** → small offline lib (optional, minor new dep).
- Auto-sourcing requires the **source modules to hold the data** (results/attendance/events); if absent, the source picker shows "no data yet" rather than fabricating.

## Definition of done
- One click pulls toppers / 100%-attendance / event winners and generates the batch.
- Issued certs deliver to the parent/student portal wallet and by email.
- Contextual "Issue certificate" buttons exist on profile/event/results.
- WhatsApp/SMS works only when a provider is configured; otherwise a clear prompt.
