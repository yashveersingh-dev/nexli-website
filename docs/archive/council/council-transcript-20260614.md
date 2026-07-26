# LLM Council Transcript — NEXLI Implementation vs Master Specification
_2026-06-14 · method per `llm-council.md` (5 advisors → anonymized peer review → chairman). Build green @603._

## Original question
"Review the entire platform against `NEXLI_MASTER_SPECIFICATION.md` + operational realism, role/workflow ownership, permission architecture, product vision. Provide: missing / incorrect / partial / spec deviations / recommended corrections."

## Framed question (given to all advisors)
Audit NEXLI's current implementation (multi-tenant School OS for Indian K-12 schools; Firebase Spark free tier — no Cloud Functions/SMS/Storage; ~40 modules, ~50 roles; multi-role + ownership/review model; UI-level permission enforcement; build green @603) against the Master Specification (§1 Vision … §5 role directory, §6 module catalogue, §7 communication matrix + escalation, §8 AI, §9 UX, §10 security/data governance, §11 differentiation), operational realism, role/workflow ownership, permission architecture, and product vision. Where is it missing / incorrect / partial / deviating, and what corrections are justified? Goal: architectural correctness + operational realism + vision alignment before testing — NOT feature expansion.

## Anonymization mapping (revealed)
- Response A = First Principles Thinker
- Response B = The Outsider
- Response C = The Contrarian
- Response D = The Executor
- Response E = The Expansionist

## Advisor responses

### The Contrarian
The central security claim is false and the docs hide it. Spec §10 promises "no bug can expose cross-school data" + per-role allowlists at the rules layer. The 50-role engine and scoped grants are UI theatre (rbac.ts admits "the AUTHORITATIVE boundary is Firestore rules"). Concrete leaks the UI can't patch: `assessment_results` ship every classmate's marks; `event_registrations` expose all names — a live DPDP/§7.4 violation. Second fatal gap: §7 communication spec is unbuilt — the matrix, banned patterns (no teacher→student private chat = POCSO), SLA, escalation; nav has communication/messages with no permission gate. Third: the spec bakes in Spark-impossible capabilities (Cloud-Function account suspension, enforced MFA, SMS fan-out). Priority: rules-as-boundary before any testing; then the §7 engine; then reconcile spec to Spark.

### The First Principles Thinker
The spec's mission (§1.2/§1.6) is to replace WhatsApp-and-registers with something trustworthy — trust is an enforced boundary ("least privilege is the foundation… non-negotiable"). But the foundation rests on the wrong load-bearing assumption: that the client can be trusted to scope itself. On Spark with no Cloud Functions, the only real boundary is Firestore rules; today the trust model is a `.includes()` running on the attacker's machine — the inverse of the vision. The team is optimizing the wrong thing: 40 modules / 50 roles / unions / delegation above a tier where correctness can't be enforced. The next unit of work is `firestore.rules`, not module #41. Until tenant+section+role read-scoping is enforced server-side and per-student result/registration docs are restructured, every "fixed" leak is cosmetic and every further audit is premature.

### The Expansionist
The spec promises five layers (§11.2); four shipped. The Intelligence Layer is a painted backdrop — every AI surface (Smart Briefing, Predictions, Assistants) is hardcoded mock data under a blur veil. Yet half the §8 AI catalogue needs no LLM: at-risk flags (attendance <75% + grade drop), fee-defaulter prediction, pacing alerts, leave anomalies, the morning briefing's three numbers — deterministic queries over data NEXLI already has, sitting as static panels. §8.3 pre-sorted them ("Fully Automatable"). Correction: split AI into "computed-now" vs "provider-later"; wire rule-based signals to live data today; keep the blur only on generative tasks. The §11.1 differentiators that sell — Counselor Referral Pipeline, Hardship Workflow, Exam-Stress Calendar, Night Emergency SOS — are workflow/trigger features, not AI, yet they're the moat. NEXLI built the ERP and stubbed the operating system.

### The Outsider
Clicked the nav as four users. The parent can't message anyone — yet the spec's #1 promise is "message your class teacher first." Parent nav has "Communication" = a read-only announcements list. The two-way Messages engine (escalation ladder, recipient policy — genuinely good) exists only for staff. A parent asking "why was my daughter marked absent?" finds no reply button — they'll distrust the system and return to WhatsApp. "Communication" vs "Messages" is insider jargon (label "Notices/Circulars" and "Messages (Chat)"). Student support says "Message a teacher in Communications" — but that's read-only, a dead end. Staff nav is a 35-item wall; doesn't feel role-shaped despite the spec promising role-specific exception-based dashboards. "Class Assessments" vs "Holistic Progress Card" vs "Examinations" — three marks tabs; a teacher won't know where today's marks go. Fix parent/student messaging first — it's the trust-breaker.

### The Executor
Section C of the audit is right; everything else is noise until handled. Any authenticated user can DevTools→Firestore→POCSO/payroll/Aadhaar/every classmate's marks. The only true blocker. Monday: (1) deploy `firestore.rules` today — per-tenant schoolId match + lock the confidential collections the comments already claim are locked. Free on Spark — the "P9" framing makes it sound future-tense; it's not. (2) Fix the two leaks rules alone can't catch — `assessment_results` peers' marks, `event_registrations` names — split into per-student docs (half a day). (3) Emulator-test rules vs teacher/parent/accountant before any human logs in. THEN start role testing. Defer to Blaze: B1–B11, doc-numbering, pagination. A 1–3 day blocker, not a re-architecture.

## Peer reviews (5, anonymized inputs)
- **Strongest:** D (Executor) ×4, C (Contrarian) ×1 — converges on the security boundary, most actionable, debunks the "P9/future" framing.
- **Biggest blind spot:** E (Expansionist) ×3, B (Outsider) ×2 — audits the cosmetic/AI/UX layer while the data layer is open; "optimizing layer 5 while layer 1 is breached."
- **What all five missed:** (a) whether the data model can even be scoped by rules (do docs carry `schoolId`/`sectionId`? → migration risk); (b) custom-claims/tenant provisioning may need Admin SDK; (c) the SPEC itself mandates Spark-impossible features and should be formally reconciled; (d) nobody verified the rules actually deploy; (e) Spark viability/Blaze cost ceiling for a DPDP-regulated multi-tenant OS.

## Chairman verdict
See `council-report-20260614.html`. Key correction by the chairman (post-verification of `firestore.rules`): rules **do** exist and enforce tenancy + top-tier sensitive collections — but the **coarse default rule** exposes fees/payroll/salary/marks/Aadhaar/IEP/consent/therapy to any active member (incl. parents/students). The data model **does** carry `schoolId`/`studentId`/`sectionId`, so the fix is **additive per-collection rules, not a data migration**. Recommendation: tighten the default rule (restricted matches + role/own-record scoping for sensitive collections), verify deployment, emulator-test, then resume role testing. The parent/student messaging entry point and the "computed-now" analytics split are real but **sequential** to the security fix.
