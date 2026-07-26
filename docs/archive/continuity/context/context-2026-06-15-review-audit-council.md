# NEXLI — Checkpoint 2026-06-15 · Review Rounds 1–5 + Deep Audit + LLM Council

_Rolling-history snapshot. Canonical: `context/LATEST_CONTEXT.md`. Trackers: `docs/REVIEW_FINDINGS.md`, `docs/ROLE_AUDIT.md`, `docs/DEEP_AUDIT.md`, `docs/TESTING_GUIDE.md`. Council: `council-report-20260614.html` + `council-transcript-20260614.md`._

## State
**P0–P8 + Platform Completeness complete; Review Rounds 1–5 + Deep Audit (Phase 1) + LLM Council (Phase 2) done. Build green @603 modules, tsc clean, dev clean.** Owner is **mid role-by-role manual testing** with seeded demo school `nexli-demo`.

## What happened this period
1. **Operational-realism model** — `lib/ownership.ts` (`MODULE_OWNERSHIP`) + `useOwnership(key)` + `<ReviewModeNote>`. Owners operate / leadership reviews / approvers sign off. Grounded by `docs/ROLE_AUDIT.md` (sourced CBSE/ICSE/state, day/boarding role matrix).
2. **Multi-role engine** — `can()` + `useOwnership` union permissions/ownership across `role` + `member.secondaryRoleId`. Leadership "Access" tab (`hr/StaffProfilePage`) assigns/clears a secondary role; gated by the **permission-based `user.manage`** (Principal/VP/HR/IT/Senior-Coordinator). `setMemberSecondaryRole` uses `deleteField()`. Owner architecture call: user management is a permission, not a role.
3. **Owner-decision features implemented (Spark-native + Blaze seams):** staff-attendance module (3 kiosk workflows on one `recordStaffCheckIn` seam + schedule config via `schedule.configure`); configurable expense approval (4 actions + per-school rules); events approval + student self-registration + Excel(CSV)/PDF(print) export + participant mgmt; temporary **delegation** (`/delegation`, `delegation.manage`, audited); homework attachments (URL refs, all file types); finance UX clarity; attendance section-scoping; **payroll split** (HR structure → Accounts disburse → Principal/VP approve run); transport driver-absent SOP; hostel/boarding expansion (gate-pass/leave/roll-call/mess); communication escalation hierarchy (manual); student portal (7 screens); IT Administration (`/it-admin`); coordinator powers.
4. **New modules registered:** staff `staff_attendance`/`delegation`/`it_admin`; student `events` + `profile`/`timetable`/`academics`/`calendar`/`achievements`/`wellness`/`support`.
5. **Deep adversarial audit (Phase 1)** — 5 critical-audit teams, **~21 objectively-wrong fixes**:
   - CRITICAL cross-class data leak (scoped teachers saw ALL sections' students/marks/homework) → `academics/shared.ts` `useScopedSectionIds` + deep-link guards.
   - CRITICAL payment reviving a cancelled invoice → guarded.
   - CRITICAL messaging escalation queue leaking confidential threads to back-office staff → `tierForRole`→null + `handlesEscalations`.
   - HIGH: library txn, ESI round-up (Math.ceil), manual-attendance clobber, requisition self-approval (`!isRaiser`), hostel block-scope (id-based `member.blockId`), SMC 75% (RTE §21b), consent timestamp, POCSO/IEP detail read-gates, platform reactivation/MRR fixes.
   - **11 business decisions B1–B11 documented (`DEEP_AUDIT §B`) — await owner.**
6. **LLM Council (Phase 2, `llm-council.md` method)** — 5 advisors → anonymized peer review → chairman. Verdict: the **security boundary** is the #1 gap. **Verified `firestore.rules` EXISTS** (deny-by-default, tenant-isolated, strict allowlists on medical/counseling/POCSO/grievances/members/settings/audit) — so "no security" was overstated. BUT the coarse **default rule** (`isActiveMember` read / `isStaff` write) exposes everything not in `isRestrictedCollection` — **fees, payroll, salary_structures, assessment_results, students(Aadhaar), staff(PAN), iep_plans, therapy_logs, consent_records, attendance** — to any active member (incl. parents/students). Fix = additive rules, no migration (docs carry schoolId/studentId/sectionId).

## Next (Phase 3 — QUEUED, `DEEP_AUDIT §F`) — HELD by owner until testing done
1. Tighten `firestore.rules` — per-collection role allowlists + **strict own-record** parent/student scoping (owner chose this). Owner runs `firebase deploy --only firestore:rules` + emulator-test (teacher-cross-section / parent / accountant / driver).
2. Per-student doc leaks (`assessment_results` embeds peers' marks; `event_registrations` names) → split/mask.
3. Parent/student **Messages entry point** (recipient policy already exists; spec §7 #1 promise).
4. Nav relabel (Communication→Notices/Circulars + Messages tab; clarify Class-Assessments/Examinations/HPC).
5. Spec reconciliation (annotate §10 Blaze-only items: CF account suspension, MFA, SMS).
- Logged-not-queued (feature-ish, per "no feature expansion"): split AI panels computed-now vs provider-later (Expansionist council finding).

## On resume — CONFIRM FIRST
Ask owner: still testing (keep trackers current, fix reported bugs, **do NOT touch firestore.rules**) OR done testing (execute Phase 3 starting with rules → owner deploys + emulator-tests). Preserve the Spark-native + multi-role decisions. Keep `npm run build` green; checkpoint after each chunk.

## Demo/testing env (don't re-seed without need)
`scripts/seed-demo.mjs` → school `nexli-demo` (Super Admin + 13 staff roles + parent + student + 100 students). Super Admin `yashveersr4@gmail.com` (password held by owner, NOT in repo); demo staff/student password `NexliDemo@2026`; demo parent `+91 99999 00001` (needs a Firebase Phone test number). Full credentials + role test plans in `docs/TESTING_GUIDE.md`.
