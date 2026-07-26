# NEXLI — Review Findings (owner testing, pre-P9)

Living tracker of the owner's review findings. We address these **before** P9 hardening.
Status: ⬜ open · 🟡 in progress · ✅ done · 🔵 needs decision · 🕓 future (owner-deferred)
Type: **Bug** · **UX** (clarity/layout) · **Perm** (role workflow) · **Feat** (new feature) · **Future**

_Last updated: 2026-06-14 — Round 2: owner decisions D1–D5 implemented (staff attendance, expense approval, events approval, temporary delegation)._

## Super Admin
- ✅ No issues found in this round.

## ⏩ Round 1 — implementation progress (2026-06-14, build green @540 modules)
**Done:**
- ✅ P-01 Students scroll (root cause: AppShell drawer fought the ref-counted `useLockBodyScroll`; unified — fixes it app-wide).
- ✅ P-02 Examinations datesheet reframed ("Create datesheet" / "Add subject paper" + context + clearer modal).
- ✅ P-03 Reports spacing (`.an-tab` rhythm) + AI veil containment (`overflow/isolation` on `.ai-lock`).
- ✅ P-04 Safeguarding spacing (`.sg-tab` rhythm).
- ✅ P-06 Gradebook → **"Class Assessments"** + clarifying subtitles on both it and Examinations.
- ✅ P-19 **Principal dashboard command center** — KPI band + attendance/fee donuts + enrolment bars + ranked attendance-by-grade + trend indicators + gold/green/red/blue semantics (telemetry + teacher branch preserved).
- ✅ P-20/21/22 **Timetable suite** — per-school **configurable bell schedule** (settings/bell_schedule, falls back to DEFAULT_PERIODS) + editor; **clash detection** (teacher/room/section) with a premium mobile "Conflict Detected" modal + live indicators; **intelligent substitution** (mark-absent → auto-detect affected slots → ranked free-teacher suggestions → one-click assign).
- ✅ P-23 **Examinations** — new **Planning** (readiness checklist + timeline + KPIs) and **Analytics** (pass %, distributions, subject averages, top/bottom, section comparison) tabs.
- ✅ P-24/25 **HPC approval workflow** — author (draft) → submit → Principal/VP approve (publishes) or return-with-note; parents/students see only approved. + **PDF/print export + bulk generation + bulk print**.
- ✅ P-26 **Direct messaging** — new `/messages` module (1:1 staff threads, real-time, unread badges, two-pane/mobile). nav + registered.

**Operational-realism refit — DONE (build green @542):**
- ✅ Foundation: `lib/ownership.ts` (MODULE_OWNERSHIP: owners/secondary/reviewers/approvers per module) + `useOwnership(key)` hook + `<ReviewModeNote>` banner. Operate affordances now gate on `canOperate` (role-ownership) not just `*` permission; leadership sees a "review mode — operated by [owner]" note + keeps full read/overview.
- ✅ P-07 Payroll review-landing (leadership lands on Runs overview; structures/runs operate-gated).
- ✅ P-08/09 Attendance — marking owned by Class/Subject teachers; Principal/VP/Coordinators review (Overview open to all).
- ✅ P-10 Homework — assign owned by teachers; leadership reviews (subject/class/completion monitoring).
- ✅ P-11 Library, P-14 Medical, P-15 Visitor, P-16 Canteen — operations owned by Librarian/Nurse/Security·Reception/Canteen; Principal/VP review.
- ✅ P-12 Expense — **teacher (any staff) raises a requisition** → Accounts handle POs/expenses/vendors → VP/Principal approve. (Realism fix: requisitions no longer accounts-only.)
- ✅ P-13 Payroll, P-17 Assets/Facility (maintenance requests raisable by any staff; asset/facility management owner-gated), P-18 Events (coordinators manage; leadership approves) — all refit.
- ✅ Gradebook, Transport, Hostel — same ownership refit.
**Remaining:**
- ⬜ P-05 broad "every page explains its purpose" pass (academics partially done via the bell-schedule + timetable context).
- 🕓 P-27 visitor self-registration (future).

## ⏩ Round 2 — owner decisions D1–D5 implemented (2026-06-14, build green @560 modules)
The owner ruled on the 5 open workflow decisions; all implemented UI-level (DB enforcement → P9 per D5).
- ✅ **D1 Staff Attendance** — NEW module `features/staffattendance` (`/staff-attendance`, owner = HR/Reception via `useOwnership('staff_attendance')`). All **three workflows on ONE seam** `recordStaffCheckIn()` (idempotent day doc `${staffId}_${date}`): (1) **Manual** HR/reception roster; (2) **Device kiosk** self-check-in under the operator session; (3) **Mobile OTP kiosk** on a **secondary Firebase app** (`kioskAuth.ts`) so the reception session is never replaced → phone verified → matched to staff by E.164 → recorded. **Biometric** is a documented future webhook → same seam (`BiometricCheckInPayload`, no hardware dependency). Architecture sanity-reviewed (see below).
- ✅ **D2 Expense approval** — 4 approver actions (Approve / Reject / Request clarification / Return for modification) + **per-school configurable approval rules** (`expense_settings`, amount-band routing, nothing hardcoded; empty config = single-step). Requisitions still raisable by any staff.
- ✅ **D3 Events approval** — two creation paths both ending in Principal/VP sign-off: owners create → `requested` → approved/published; **teachers** get a lighter "Request an event" path. `published = approvalStatus==='approved'` enforced in listings.
- ✅ **D4 Leadership temporary delegation** — NEW `features/delegation` (`/delegation`, gated `delegation.manage` = VPs/HR/IT + leadership/super-admin via `*`). Grant a substitute temporary operate access to a module with **Reason + window + audit** (`delegation.granted`/`delegation.revoked`). Wired through `useOwnership().canOperate` (+ `isDelegated`), `filterNav`, and the route `Guarded` so the delegate actually sees & reaches the module. Live via `subscribeActiveDelegations` in `SessionProvider` (`delegatedModules`). Auto-expires by `untilAt`; revocable early (kept for audit).
- 🔵→✅ **D5 Firestore enforcement** — confirmed **deferred to P9** (ownership/delegation stays UI-level during review).

### Staff-attendance architecture sanity review (owner-requested) — PASS
- **Single seam:** all 4 sources (manual `setStaffDayStatus`, device, otp, future biometric) write the same `${staffId}_${date}` doc; first check-in wins, check-out never downgrades status, present/late derived from `settings/staff_attendance_settings`. Idempotent + audited.
- **Identity space:** all workflows key on the **HR `staff` doc id** (not login `members`) — correct, since attendance tracks staff who may have no login. OTP matches by `staff.phone` → E.164.
- **Session safety:** OTP uses a throwaway secondary app + invisible reCAPTCHA, disposed on success/failure/cancel/unmount → primary (reception) session preserved; `db` writes happen on the primary under the operator's identity. Primary `onAuthStateChanged` is unaffected.
- **Notes:** Real SMS needs the Firebase **Phone provider** (owner has now enabled it). Manual save writes one doc per active staff (fine for school volumes on Spark).

### D1b — Schedule & attendance-timing configuration (owner adjustment, 2026-06-14, build green @561)
Owner ruling: attendance timing settings are **not HR-only** — Principal, Vice Principals and HR all configure the school's operational schedule.
- ✅ New **`schedule.configure`** permission (vp_academic, vp_admin, hr_manager; Principal/Directors via `*`) — a documented **exception to review-first** (configuration, not daily operation) recorded in `lib/ownership.ts` (`SCHEDULE_CONFIG_NOTE`).
- ✅ New page `/staff-attendance/settings` (`StaffAttendanceSettingsPage`) — configure **school start/end, late cutoff, half-day cutoff, grace minutes, lunch window, multiple breaks, and free-form timing rules**. Launcher on the hub shows to schedule-configurers (incl. leadership who don't operate). Gated to `schedule.configure`.
- ✅ Expanded `StaffAttendanceSettings` schema + `saveStaffAttendanceSettings` (audited `settings.changed`). `recordStaffCheckIn` now derives **present / late / half_day** from these timings + grace (was present/late only; closes the earlier "no timing UI" gap). `workStart` kept as a read fallback.
- Note: breaks/lunch here are attendance-schedule timings; the timetable's **bell schedule** (`settings/bell_schedule`) remains the source for period structure — related but separate concerns.

---

## ⏩ Round 3 — pre-testing self-review (2026-06-14, build green @561, tsc clean)
4 parallel review-and-fix subagents (platform / SIS+academics / finance+ops / compliance+engagement) + cross-cutting fixes by the integrator. **20 issues fixed.**
**Fixed (subagents, in-folder):** subscription toast grammar; feature-flag override copy; Subscriptions overview using effective status (filter/counts/MRR/badge); admissions advance-stage bypass (couldn't reach `admitted` without creating a student); gradebook+homework `z.coerce`→string schemas; attendance **half-day** marking + CSS (320px); attendance calendar half_day/leave cells; students empty-state (section filter); HR leave "To" min-date; **canteen nested-undefined calories write failure**; **medical edit overwriting `schoolId` to ''** (tenant corruption); fees ledger showing annualised vs actual invoice; alumni read→write escalation; emergency circulars now sort to top; RTE phantom lottery-rank on reopen.
**Fixed (integrator, shared files):** `lib/firebase.ts` **`ignoreUndefinedProperties: true`** (kills the nested-undefined write-throw class app-wide; two subagents hit it; matches the seed); alumni → `useOwnership('alumni')` + ReviewModeNote (correct owner gating, not a raw perm); `platform/plans/planSchema.ts` `z.coerce`→string (blank fields were saving as `0` not unset); **Expense requisition EDIT route + form mode + Edit button** (D2 "Return for modification" was incomplete — no way to actually edit before resubmit).
**Remaining (human review):** see the report — notably [Med] SchoolWizard duplicate-school on flags-write failure; [Med] rejected Events have no resubmit path; [Low] dashboard donut legend omits `expired`; [Low] `updateIn`+`stripUndefined` can't *clear* a field (needs `deleteField`; affects compliance reopen / consent / udise profile clears — mostly masked); [Low] TC issuance doesn't flip student status; [Low] plan/announcement linkage by name not id. P9 security-rule items (consent_records, iep/therapy, payroll) remain deferred.

---

## ⏩ Round 4 — operational-realism audit + foundation wave (2026-06-14, build green @561)
**Research:** `docs/ROLE_AUDIT.md` — sourced Indian-school role audit (CBSE/ICSE/state, day/boarding) with per-role CREATE/EDIT/APPROVE/REVIEW/NEVER matrix, module-ownership correction table, coordinator-tier spec, communication-escalation spec, multi-role model, and hostel/IT/accountant/transport-SOP expansion specs + P0–P3 checklist.
**Fixed this wave:**
- ✅ Messaging "Couldn't load messages" — root cause: `array-contains` + `orderBy` on a different field requires a composite index (not deployable on Spark). Made all message queries single-`where` + client-sort (index-free). Real-time/unread/create intact.
- ✅ Duplicate school creation — `SchoolWizard` now fixes the id once + resumes from the failed step (no second school on retry).
- ✅ Rejected events resubmission — `resubmitPatch`/`canResubmit` + "Resubmit for approval" button returns a rejected event to the Principal/VP queue.
- ✅ Manual-attendance back button — replaced the right-slot button with the standard top-left back chevron (never under the sticky savebar).
- ✅ **Multi-role engine** — `can()` + `useOwnership` now union permissions/ownership across `role` + `member.secondaryRoleId` (VP+Teacher, Class Teacher+HOD, Coordinator+Teacher, Librarian+Teacher). Leadership-only **"Access" tab** on the Staff profile assigns/clears a secondary role (`setMemberSecondaryRole`, audited; clear uses `deleteField()`).
- ✅ **Field-clearing** — `deleteField()` path established via `setMemberSecondaryRole` (pattern for the broader updateIn clear-gap).
- ✅ **Accountant scope** — removed `reports.read` from `chief_accountant` (no academic/attendance analytics hub; financial analytics stay in Fees). Data-minimisation per audit.
**Clarified (NOT bugs):** `transport_manager` cannot create events and `class_teacher` cannot manage canteen for the real role accounts — both are correctly owner-gated; the owner observed these as **Super Admin** (operates everything by design). Test as `transport@`/`teacher@` to confirm.
**Owner infra decisions (locked in):** attachments = URL/link refs (no Storage); server automation = client-side approximations + future-Blaze seams (no Cloud Functions now); roles = reuse existing + multi-role/secondary-role (no new RoleIds).

### Round 4 · Wave 2 — feature builds (2026-06-14, build green @567)
- ✅ **Coordinator powers** (rbac) — `academic_coordinator` now: students.read/write, admissions, timetable, lessonplans, exams, homework.read, reports.read, hr.read (onboarding support). Per ROLE_AUDIT §4 (reuse-existing-role approach).
- ✅ **Events** — student **self-registration** (register/cancel, capacity→waitlist) + staff **participant management** (add/remove/mark attended, waitlist promotion) + **Excel(CSV)/PDF(print) export** + participation tracking. Wired `student`/`events` route + STUDENT_NAV.
- ✅ **Homework attachments** — URL/link references for PDF/DOC/DOCX/XLS/XLSX/JPG/PNG/WEBP (type auto-detected, icons, image thumbnails, safe external links); future-upload seam centralized. (`attachments[]` added to shared `types/daily.ts`.)
- ✅ **Finance UX clarity** — receipt generation signposted (Collect → numbered receipt confirmation + print), fee-status legend (unpaid→partial→paid), expense step-indicator (Raise→Approve→PO→Receive→Record) with who-does-what. No money math touched.
- ✅ **Attendance section-scoping** — class teacher limited to owned sections (`classTeacherUid===uid` ∪ `member.sectionIds`); coordinators/leadership broad. Fixes cross-class marking. (`teacher@`→6A only; `coordinator@`/`principal@`→all.)

### Round 4 · Wave 3 — permission-based user mgmt + final feature waves (2026-06-14, build green @603)
- ✅ **Permission-based user management** (owner architecture call) — new canonical **`user.manage`** permission (Principal/Directors via `*`, VP-Academic, VP-Admin, HR Manager, IT Admin, **Senior Coordinator**=academic_coordinator). Staff-profile **Access** tab (secondary-role assignment) now gates on `can('user.manage')` instead of a hardcoded `LEADERSHIP_ROLES` list. No admin-only roles created — Role + Secondary Roles + Permission Sets.
- ✅ **Payroll approval split** — run lifecycle: HR/Accounts submit → **Principal/VP approve** (DDO) → Accounts **mark paid**; "mark paid" disabled until approved; approver-only "runs awaiting approval" indicator. (Pay math untouched; `PayrollRun` gained submittedAt/approvedByName/approvedAt/approvalNote.)
- ✅ **Transport driver-absent SOP** — report disruption → backup / merge-reroute / cancel → **manual parent-notify** (in-app log via `notifyTransport` seam) → supervised-student checklist → log/review. (`types/ops.ts` + `transport_disruptions`.)
- ✅ **Hostel/boarding expansion** — gate-pass/leave approval chain (warden→chief warden, overdue alerts, gate check-in/out, parent-notify seam), night roll-call, mess/dietary flags + menu, incident/sick-bay log. Block-scoped. (`types/ops.ts` hostel section + new collections.)
- ✅ **Communication escalation hierarchy** — recipient policy (parents/students can only initiate to teachers/coordinators, never Principal/VP), manual **Escalate** ladder (Teacher→Coordinator→VP→Principal) with history + audit, leadership "Escalated to me" queue, client-side overdue SLA. Queries stay index-free.
- ✅ **Student portal completion** — built the 7 "In Build" screens (profile, timetable, academics, calendar, achievements, wellness, support) as read-only premium screens (`features/studentportal`), wired to STUDENT nav/registry.
- ✅ **IT Administration module** (new `features/itadmin`, `/it-admin`, `settings.manage`) — devices/labs register, IT helpdesk tickets, system/backup log + integration registry (CCTV/biometric/SMS/LMS seams), audit viewer. Least-privilege: never reads marks/fees/payroll.
- ✅ **Parent-login** — flow was already correct (`/login`=staff, `/login/parent`=OTP); made the parent entry a prominent button on the staff login. (Testing needs a Firebase Phone **test number** for the demo parent.)

**Round 4 complete.** All owner findings + the full ROLE_AUDIT §8 checklist addressed (Spark-native; Blaze seams documented). Build green @603, tsc clean.

### Round 4 · Wave 4 — verification pass on all new modules (2026-06-14, build green @603, tsc clean)
Cross-cutting (static, by integrator): nav↔registry consistent for every new module; operate-permissions/ownership correctly union across primary+secondary role; all new modules write to tenant-scoped collections (no leaks); the only `role ===` checks are audience/tier distinctions, not operate-authz. 4 parallel verify-and-fix subagents (permissions · multi-role · mobile · navigation · persistence · workflow ownership · role visibility):
- **hostel / transport / staff-attendance** — PASS all dimensions, no fixes needed (gate-pass chain, disruption SOP, kiosk session-safety + idempotent day-doc all verified).
- **messaging / events / homework** — PASS all dimensions; messaging queries confirmed **index-free**; empty-vs-error states correct; recipient policy enforced in picker + create path.
- **itadmin / studentportal** — fixed: **(HIGH)** leadership got review banner *and* operate access → operate now owner-gated (`canOperate`), leadership views/audits via `settings.manage`; **(HIGH)** device form bypassed the gate → now `it_admin`/secondary/super-admin only (multi-role-aware); mobile overflow ≤320px; device-form back-nav; local `kpi-grid--4` fix.
- **payroll / finance / fees / expense / attendance / delegation / multi-role** — fixed: **(HIGH)** payroll Submit/Return set lifecycle fields to `undefined` (stripped by `stripUndefined`) → run stuck in approval queue on reload; now `deleteField()` via a `Clearable<T>` helper; **(MED)** stale requisition clarification notes → same `deleteField()` fix. Attendance scope, payroll approval gate, delegation→operate, and `user.manage`-gated Access tab all verified.
**Known (non-blocking) notes:** IT helpdesk "any staff raise ticket" is currently behind `settings.manage` (needs a separate lightweight all-staff entry if desired); `kpi-grid--4` lives in examinations.css (shared-CSS hygiene; worked around); client-side ticket/id numbering can collide under concurrency (Spark tradeoff, same as other doc numbers); pre-existing student `transport` + staff `security`/`settings` nav still render ModuleStub.

---

## ⏩ Round 5 · Phase 1 — deep adversarial audit (2026-06-14, build green @603) → see **`docs/DEEP_AUDIT.md`**
5 parallel critical-audit teams (architect/security/principal/owner/CBSE-admin/designer/QA lenses) + integrator spine review. **~21 objectively-wrong issues fixed** (incl. CRITICAL cross-class data leak, payment-on-cancelled-invoice, messaging-confidentiality leak; HIGH library txn, ESI rounding, manual-attendance clobber, requisition self-approval, hostel block-scope, SMC 75%, consent timestamp). **11 business decisions (B1–B11)** + **P9 rules/schema flags** documented in DEEP_AUDIT.md. Top architectural finding: **UI scoping is not a security boundary — Firestore rules (P9) must enforce per-section/role read scoping** (student-portal peer-marks + event-registration reads leak server-side). `audit.ts` nested-undefined drop is already mitigated by `ignoreUndefinedProperties`. **Phase 2 — LLM Council DONE** (`council-report-20260614.html` / `council-transcript-20260614.md`): verdict = the security boundary is the #1 gap. Verified `firestore.rules` exist + enforce tenancy + top-tier sensitive collections, BUT the coarse default rule exposes fees/payroll/salary/marks/Aadhaar/IEP/consent/attendance to any active member (incl. parents/students) — real DPDP gap; fix is additive rules (no migration). **Phase 3 corrections QUEUED in DEEP_AUDIT §F** (rules tightening w/ strict own-record scoping; per-student doc leaks; parent/student Messages entry; nav relabel; spec reconciliation). **Owner decision: HOLD rules change until after role-by-role testing** (don't disrupt the live test env), then strict own-record scoping.

---

## Principal review — Round 1

### Bugs / layout
| ID | Type | Area | Finding | Approach |
|---|---|---|---|---|
| P-01 | Bug | Students | Page sometimes won't scroll until a refresh | Investigate scroll/overflow on the list page + global page container; likely a layout/measure race (sticky toolbar / 100dvh / lazy mount). Reproduce + fix. |
| P-02 | UX | Examinations | "Add paper" button reads like a bug | Reframe the Datesheet tab around "Create / build datesheet"; relabel + add context. (`DatesheetTab.tsx`) |
| P-03 | UX | Reports & Analytics | Cards too close together; **AI "coming soon" overlay overlaps content** | Increase section spacing (`an-grid`/`analytics.css`); fix `.ai-lock__veil` so the veil covers its panel cleanly (sizing/overflow/z-index) instead of bleeding. |
| P-04 | UX | Safeguarding | Cards overlap visually | Audit `safeguarding.css` / list grid; fix overlap + spacing. |

### UX clarity / context
| ID | Type | Area | Finding | Approach |
|---|---|---|---|---|
| P-05 | UX | Academics (all pages) | Each page should instantly convey **why it exists / what actions / what data** | Add concise page intros/“purpose” headers + empty-state guidance across academics (pattern can extend platform-wide). |
| P-06 | UX | Gradebook vs Examinations | Distinction unclear | Either sharpen copy/positioning or **rename Gradebook** (e.g. "Continuous Assessment" / "Class Assessments") so purpose is obvious. |
| P-07 | UX | Payroll | Should open on a **review dashboard**, not payroll management | Add a payroll overview/landing for principal/VP; management behind an explicit action. |

### Role-based workflow — recurring theme: **Principal/VP = review & approve, not operate**
| ID | Type | Module | Who should OPERATE | Principal/VP role |
|---|---|---|---|---|
| P-08 | Perm | Student attendance | Class Teacher, approved Substitute (mark) | Review (Principal, VP, Coordinators) |
| P-09 | Perm | Staff attendance | HR, authorized admin (mark) | Review (Principal, VP) |
| P-10 | Perm | Homework | Teachers (assign) | Review — teacher/subject/class monitoring + completion tracking |
| P-11 | Perm | Library | Librarian (operate) | Review / monitor / audit |
| P-12 | Perm | Expense & Procurement | Accountant / Accounts (operate) | Review + approve |
| P-13 | Perm | Payroll | Accountant (operate) | Review/approve (see P-07) |
| P-14 | Perm | Medical | Nurse / medical staff (operate) | Review |
| P-15 | Perm | Visitor & Gate | Security / reception (register) | Review records |
| P-16 | Perm | Canteen | Canteen Administrator (operate) | Review |
| P-17 | Perm | Assets & Facilities | Accountant / facilities staff (operate) | Review + approve |
| P-18 | Perm | Events & Activities | Event/Activity/Sports coordinators, HODs (manage) | Review, approve, intervene |

> **Cross-cutting decision needed** (gates P-07..P-18): hard permission restriction vs. "review-first" UX (keep capability, default to oversight + add approvals). See decision **D-A** below.

### New features / workflows
| ID | Type | Area | Finding | Notes |
|---|---|---|---|---|
| P-19 | Feat | Principal Dashboard | "Command center" — more charts, graphs, KPIs, trend indicators; semantic colors (Gold=important, Green=positive, Red=risk/warning, Blue=neutral) | Sizeable dashboard build. Decision **D-B** (scope). |
| P-20 | Feat | Timetable | **Configurable bell schedule** per school (breaks, lunch, working periods, school timings) — replace hardcoded `DEFAULT_PERIODS` | New per-school config + UI; refactor TimetableTab/Substitutions/StudentDashboard to read it. |
| P-21 | Feat | Timetable | **Clash detection** (teacher / classroom / section / subject) → premium, mobile-optimized alert dialog | Validation on slot save + a conflicts view. |
| P-22 | Feat | Timetable | **Intelligent substitution** — auto-detect affected classes, find free teachers, suggest substitutes | Build on slots + attendance; ranking of available teachers. |
| P-23 | Feat | Examinations | Expand to: Datesheets, **Results**, **Admit Cards** (exist) + **Exam Planning** + **Exam Analytics** | Add Planning + Analytics tabs. Decision **D-C** (contents). |
| P-24 | Feat | HPC | **Approval workflow**: Teacher/Coordinator create → approval request → Principal **and** VP receive → either approves → final card generated. Principal approves, not creates. | New status/approval model on `hpc_cards`. Decision **D-D**. |
| P-25 | Feat | HPC / Report cards | **PDF export + bulk generation + bulk download** | Client-side print-to-PDF + batch. (Also benefits receipts/payslips.) |
| P-26 | Feat | Communication | **Direct 1:1 personal messaging** between users (not just announcements) | New messaging surface (threads, real-time). Decision **D-E** (scope). |

### Future (owner-deferred)
| ID | Type | Area | Finding |
|---|---|---|---|
| P-27 | 🕓 Future | Visitor | Self-registration, Google sign-in, phone verification, automatic check-in/out logging |

---

## Decisions needed (gate the larger items)
- **D-A — Principal/VP access model** (P-07..P-18): *hard-restrict* (Principal/VP lose operate-level write on those modules) **or** *review-first* (keep capability, default each module to a review/oversight view + add explicit approvals for expense/payroll/events/HPC). _Recommendation: review-first + approvals._
- **D-B — Dashboard scope** (P-19): confirm the KPI/chart set + that the gold/green/red/blue semantics are applied system-wide.
- **D-C — Examinations** (P-23): what "Exam Planning" and "Exam Analytics" should contain.
- **D-D — HPC approval** (P-24): confirm "either Principal or VP can approve"; whether parents see only approved cards (already the case).
- **D-E — Direct messaging** (P-26): scope (1:1 only vs groups; which roles; attachments) — this is effectively a new module.

## Notes
- Screenshots referenced for P-03 / P-04 were **not received** in chat; investigating from code. Re-attach if the issue differs from the layout cause found.
