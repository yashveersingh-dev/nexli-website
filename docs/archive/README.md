# Archive — frozen historical docs

This folder holds **superseded** planning docs, audit/review reports, build-phase process
docs, continuity checkpoints, and early prototypes. Nothing here is current. It is kept for
traceability and disaster recovery — **do not treat any file here as the live source of truth.**

For current project state, see (at the repo root): `README.md`, `BUILD_PROGRESS.md`,
`resume/RESUME.md`, `context/CONTEXT.md`, and `docs/LAUNCH_RUNBOOK.md`.

## What's here

| Folder | Contents | Superseded by |
|---|---|---|
| `reports/` | `AUDIT_REPORT.md`, `BILLING_REVIEW.md`, `TEST_RESULTS.md`, `RETEST_PLAN.md` | `BUILD_PROGRESS.md` |
| `planning/` | `NEXLI_BUILD_PLAN.md`, `PHASE_A_PLAN.md` (original master build plan + early phase plan) | `NEXLI_MASTER_SPECIFICATION.md`, `BUILD_PROGRESS.md` |
| `audits/` | `phase3-audit-1.md`, `phase3-audit-2.md` (the two pre-launch audits, formerly `Web/Phase 3/1.md` & `2.md`), `DEEP_AUDIT.md`, `REVIEW_FINDINGS.md`, `ROLE_AUDIT.md` | remediation captured in `BUILD_PROGRESS.md` |
| `council/` | `llm-council.md` (method), `council-report-20260614.html`, `council-transcript-20260614.md` | — historical review exercise |
| `process/` | `QUALITY_REVIEW.md` (build-phase module completion gate) | `Web/docs/CONVENTIONS.md` |
| `continuity/context/` | rolling session context snapshots (`context-2026-*.md`), `LATEST_CONTEXT.md`, `MODULE_STATUS.md`, `full-convo-of-8th-june-2026.md` | `context/CONTEXT.md`, `resume/RESUME.md` |
| `continuity/resume/` | rolling resume prompts (`resume-prompt-2026-*.md`), `LATEST_RESUME_PROMPT.md` | `resume/RESUME.md` |
| `html-prototypes/` | early static HTML mockups (`parent/principal/student/super-admin.html` + `script.js`, `styles.css`), formerly `reference/` | the live React app in `Web/src/` (design ported to `Web/src/styles/nexli.css`) |
