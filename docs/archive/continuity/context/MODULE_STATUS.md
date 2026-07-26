# NEXLI — Module Status Tracker

**Living document** — update on every module milestone. Each module is marked **Complete** only after passing `docs/QUALITY_REVIEW.md`.
Status legend: ⬜ Not started · 🟡 In progress · 🔵 In review · ✅ Complete · ⛔ Blocked
_Last updated: 2026-06-15 (Review Rounds 1–5 + Deep Audit + LLM Council; build green @603 modules, tsc clean)_

## Foundation (P0 / P1)
| Module | % | Status | Remaining work | Blockers |
|---|---|---|---|---|
| Design system & tokens | 100 | ✅ | — | — |
| UI Kit — atoms + charts + DataTable | 100 | ✅ | — | — |
| Form kit (Field/Input/Textarea/Select/Date/Toggle/Checkbox/Radio/File/OTP + RHF·Zod Form + FormPage) | 100 | ✅ | — | — |
| Overlays & nav (Modal/ConfirmModal, Sheet, Tabs, Toast, Portal) | 100 | ✅ | — | — |
| Platform spine (tenancy/RBAC/flags/audit/session) | 100 | ✅ | — | — |
| App shell & navigation | 100 | ✅ | — | — |
| i18n scaffold | 100 | ✅ | — | — |
| Auth & RBAC enforcement (P1) | 100 | ✅ | login (email/pass + parent phone-OTP), guards, session AppLayout, provisioning, bootstrap script, **firestore.rules + indexes written** | rules **deploy** + first-user **bootstrap** need owner `firebase login` / ADC |

> **P0 + P1 complete (code).** Build green (163 modules), dev serves `/login`, `/login/parent`, role-gated app. `firestore.rules` enforce tenant isolation + RBAC + medical/counseling/POCSO allowlists + append-only audit. **Owner action pending (non-blocking for further build):** enable Email/Password + Phone auth in console, run `npm run bootstrap …`, `npm run deploy:rules`. Next: **P2 Super Admin platform.**

### Owner action checklist
- [x] **Admin creds provided** — service-account key at `Web/serviceAccount.json` (project `nexli-erp`); Admin SDK verified (`scripts/verify-admin.mjs`). Key is now gitignored.
- [x] **Demo test environment seeded (2026-06-13)** via `npm run seed:demo` (`scripts/seed-demo.mjs`). Created in `nexli-erp`: **16 Auth users** (Super Admin `yashveersr4@gmail.com` + 13 staff + 1 student + 1 parent-phone), **16 userIndex**, school `nexli-demo` (active/Growth), **100 students**, 13 staff profiles, 4 sections / 6 subjects / houses / rooms, fee structure+4 invoices+1 receipt, attendance, 2 circulars, event, library/homework/assessment, transport + hostel demo. Verified with `scripts/verify-seed.mjs`. Demo staff/student password = `NexliDemo@2026`. See `docs/TESTING_GUIDE.md`.
- [ ] **Enable sign-in providers (still needed to LOG IN)** — Firebase console → Authentication → enable **Email/Password** + **Phone**; add `+91 99999 00001` as a Phone *test number* (code e.g. `123456`) for the parent login. _(Admin-SDK created the users regardless, but client sign-in needs the providers ON.)_
- [ ] `npm run deploy:rules` (deploy `firestore.rules` + `firestore.indexes.json`) — needed if the DB is in *locked* mode so the app can read/write.

> **STATUS 2026-06-13: REVIEW HOLD.** Owner is reviewing/testing the app. Do **not** begin P9 hardening (security/rules/subscription-enforcement/perf/production). Maintain docs + checkpoints only. Await the owner's consolidated review findings; address those, then begin P9.

## Platform — Super Admin (P2) ✅ · _foundation: types + `features/platform/data.ts` + `meta.ts`; 13 modules, 49 files, build green (214 modules)_
| Module | % | Status | Remaining work | Blockers |
|---|---|---|---|---|
| Super Admin dashboard (§12.2) | 100 | ✅ | — | — |
| School registry + 360 detail (§12.3) | 100 | ✅ | — | — |
| Add-school onboarding wizard (§12.3) | 100 | ✅ | provisions admin via provisioning.ts + per-school flags | live admin-create needs Email/Pass auth enabled |
| Subscription lifecycle (§12.3) | 100 | ✅ | activate/pause/suspend/resume/terminate + mandatory reason → audit | — |
| Plans & pricing (§12.4) | 100 | ✅ | pricing cards + create/edit FormPage + seed defaults | — |
| Subscriptions overview (§12.3) | 100 | ✅ | KPIs, MRR est, renewals-due, table | — |
| Feature flags admin (§12.4) | 100 | ✅ | global + per-school toggles + kill-switch | — |
| Platform settings (§12.4) | 100 | ✅ | general settings form | — |
| Platform announcements (§12.6) | 100 | ✅ | compose/target/log (in-app delivery; email/SMS = seam) | — |
| Platform audit logs (§12.8) | 100 | ✅ | append-only viewer + filters | — |
| Activity feed | 100 | ✅ | grouped timeline + filters | — |
| Platform analytics (§12.5) | 100 | ✅ | aggregate reports (no PII) | — |
| System health (§12.5) | 100 | ✅ | status board + honest metrics seam | live metrics need Blaze |
| Users & roles | 100 | ✅ | operator + cross-school admin directory | — |
| Support | 95 | ✅ | queue shell + impersonation explainer | ticket channel later |
| School impersonation (§12.7) | 10 | 🟡 | audited session start/end UI from school detail | deferred refinement (revisit) |

> P2 built via 1 reference module (schools, me) + 5 parallel subagents. All registered in `registerModules.ts`, build green, dev boots clean, no shortcuts/placeholders. Mobile-first by design (subagents self-checked at 320px); comprehensive 9-width screenshot sweep is the P9 task.
>
> **Platform Completeness pass (2026-06-13, post-P8):** closed the Super-Admin audit gaps — subscription **expiry + renewal** lifecycle (`expired` status, expire/renew actions, `effectiveSubscriptionStatus` auto-derivation, free-tier `sweepExpiredSubscriptions` on dashboard load); **school admin lifecycle** (`ManageAdminPanel`: provision-later / reset password / edit / replace + `adminUid` write-back from wizard); **usage tracking** (telemetry-only rule on `schools/{id}`, `lib/usage.touchSchoolUsage`, `lastActiveAt` heartbeat in AppLayout, count recompute in StaffDashboard); **statistics** (live student/staff counts + estimated MRR/ARR from plan assignments). Build green @524 modules. See `context/context-2026-06-13-platform-completeness.md`. **Still remaining (reported to owner):** school impersonation flow (§12.7), tenant-side subscription enforcement (hardening), data export + purge, rules deploy.

## SIS & structure (P3)  · _foundation: `types/sis.ts`+`academics.ts`+`hr.ts`, `features/school/data.ts`+`meta.ts`+`school.css` ✅_
| Module | % | Status | Remaining | Blockers |
|---|---|---|---|---|
| Student master profile | 100 | ✅ | list/search/filter, 360 profile (tabs), add/edit FormPage w/ dynamic guardians (reference module, me) | — |
| Admissions & enrollment | 100 | ✅ | pipeline + stage stepper + RTE + admit→creates Student (subagent) | — |
| Academic structure (grades/sections/subjects/houses/rooms) | 100 | ✅ | CRUD via modals (subagent) | — |
| Timetable | 100 | ✅ | weekly grid ≥768 + mobile day-list + substitutions (subagent) | — |
| Staff records / HRMS | 100 | ✅ | list/360/add-edit w/ qualifications + leave requests (me) | — |
| Student data import | 100 | ✅ | CSV template/upload/map/validate/preview/import (csv+validate by subagent, page by me) | — |
| TC & leaving certificate | 100 | ✅ | request + department clearance workflow + approve/issue (me) | — |

> **P3 COMPLETE.** Build green @249 modules, dev boots clean. Reference (students) + HR + import-page + TC by me; admissions, academics (structure+timetable+subs) by subagents; import CSV/validate helpers by subagent. Registered under `staff`: students (incl. /import, /tc/*), admissions, academics, hr. Session-limit interruptions during fan-out were recovered by finishing the cut modules directly.

## Academic daily drivers + dashboards (P4) ✅ · _foundation: `types/daily.ts`, `features/daily/data.ts`+`meta.ts`; build green, dev clean_
| Module | % | Status | Remaining | Blockers |
|---|---|---|---|---|
| Attendance (offline-first) | 100 | ✅ | section/date roster, all-present, 75% overview/alerts, parent/student read view | period/bus attendance later (transport, P6) |
| Assessment & gradebook | 100 | ✅ | list + create FormPage + per-student marks entry + publish; letter grades | — |
| Homework | 100 | ✅ | staff assign/edit + submission tracker; parent/student view + student submit | — |
| Examinations | 100 | ✅ | exam terms + datesheet (papers CRUD) + results grid + admit cards; parent/student datesheet + report card | — |
| Library | 100 | ✅ | catalog CRUD + circulation (issue/return) + overdue + student "my library" | flag `library` (off by default; per-school enable) |
| Announcements & communication | 100 | ✅ | compose/target circular + staff list + parent/student inbox; emergency/pin | PTM scaffolded in data layer (`ptm_slots`), surface later |
| Principal dashboard | 100 | ✅ | StaffDashboard: KPIs (students/staff/attendance today/circulars) + quick actions + notices | — |
| Teacher dashboard | 100 | ✅ | StaffDashboard branch: my classes + mark-attendance + notices (teaching roles) | — |
| Parent dashboard | 100 | ✅ | child cards (attendance %), upcoming homework, school notices | — |
| Student dashboard | 100 | ✅ | today's classes, attendance %, homework due, notices | — |

> **P4 COMPLETE.** Build green, dev boots clean. Recovered a cut-off prior session (dashboards were half-wired into `Dashboard.tsx`; `StudentDashboard` imported a non-existent `useTimetable` from daily/data) → fixed import to `school/data`, rewrote `Dashboard.tsx` as a clean audience-router, registered the built-but-unregistered modules (gradebook/library/communication). Built the two missing modules (homework, examinations) via 2 parallel subagents, integrated + build-verified. Fixed a **Rules-of-Hooks** violation (`useCan()||useCan()` short-circuiting hook calls) in attendance/gradebook/HR, and enhanced `rbac.hasPermission` so scoped teacher grants (`*.read.section`, `*.write.period`) satisfy unscoped nav-read requests (scoped→unscoped + write⇒read inferences) — otherwise class/subject teachers saw a near-empty nav. Dashboards registered via `app/screens/Dashboard.tsx` (audience branch). Communication `ptm_slots` data layer exists; PTM scheduling UI deferred to a later pass. Attendance is daily-by-section; period/bus attendance arrives with Transport (P6).

## Finance (P5) ✅ · _foundation: `types/finance.ts`, `features/finance/data.ts`+`meta.ts`+`finance.css`; build green @344 modules, dev clean_
| Module | % | Status | Remaining | Blockers |
|---|---|---|---|---|
| Fee management (+ manual payments, hardship) | 100 | ✅ | heads + structures (FormPage w/ line items) + student ledger + assign fees + concessions (RTE/staff/sibling/need-based) + atomic receipt-numbered payments (`runTransaction`) + printable receipts + settings (UPI/bank/QR seam) + parent/student fee view (reference, me) | online gateway intentionally out (manual); ImageKit QR upload pending keys |
| Expense & procurement | 100 | ✅ | expenses (FormPage, approve/pay, petty cash) + requisitions (FormPage→approve/reject→create PO) + purchase orders (FormPage + GRN goods-receipt) + vendors CRUD (subagent) | — |
| Payroll | 100 | ✅ | salary structures (per-staff FormPage, live gross/CTC) + monthly payroll runs (generate→finalize→mark paid) + statutory PF/ESI/PT/TDS (India defaults, editable) + LOP + printable payslips (subagent) | bank NEFT file / Form-24Q export later; biometric LOP feed later |

> **P5 COMPLETE.** Build green @344 modules, dev boots clean. Foundation (`types/finance.ts` + `features/finance/data.ts`+`meta.ts`+`finance.css`) + **fees** reference module (me); **expense** + **payroll** via 2 parallel subagents. Registered under `staff`: fees (+ parent/student `MyFeesRoutes`), expense, payroll. Added `expense` nav item (`expense.read`). Money is whole INR; receipts use an atomic `runTransaction` counter (`finance_counters/receipt`). RHF schemas are string-based (kit `Form<T>` needs input===output — no `z.coerce`/`.default()`); documented as the finance forms pattern. P5 collections fall under the generic tenant rule (active-member read / staff write) — payroll/salary should get a tighter `payroll.*`/HR allowlist when rules are next revised (noted for P9).

## Operations & safety (P6) ✅ · _foundation: `types/ops.ts`, `features/ops/data.ts`+`meta.ts`+`ops.css`; build green @412 modules, dev clean_
| Module | % | Status | Remaining | Blockers |
|---|---|---|---|---|
| Visitor & gate | 100 | ✅ | gate register (on-premises KPIs) + check-in FormPage (pass no + OTP + blacklist warning) + printable gate pass + check-out + visitor log + blacklist CRUD (reference, me) | — |
| Transport & fleet (Leaflet/OSM live) | 100 | ✅ | live OSM map (imperative Leaflet, divIcons) + routes (FormPage w/ stops field-array) + student assignment + vehicles (doc-expiry flags) + bus attendance (offline) + SOS raise/ack/resolve (subagent) | live positions need a driver geolocation feed (no Cloud Fn); no routing/ETA |
| Hostel & residential | 100 | ✅ | blocks/rooms (occupancy meter) + allocations (bed sync) + rollcall (morning/evening/night, offline) + exeat passes (request→approve→out→returned, overdue) (subagent) | flag `hostel` |
| Medical & clinic | 100 | ✅ | clinic visits (FormPage) + per-student health records (allergies/conditions/meds chips, IHP) + immunizations (due/overdue) — restricted `medical`/`immunization` collections, self-gated (subagent) | flag `medical`; clinic-staff-only |
| Canteen & nutrition | 100 | ✅ | menu (FormPage, meals→items field-array, veg/non-veg) + headcount + feedback (avg rating) + FSSAI/hygiene inspections (subagent) | flag `canteen` |
| Asset & facility | 100 | ✅ | asset register (FormPage, warranty flags) + facilities CRUD + maintenance tickets (open→assigned→in_progress→done) (subagent) | — |

> **P6 COMPLETE.** Build green @412 modules, dev boots clean. Foundation (`types/ops.ts` + `features/ops/data.ts`+`meta.ts`+`ops.css`) + **visitor** reference (me); **transport/hostel/medical/canteen/facility** via 5 parallel subagents. Added **Leaflet** dep (`leaflet` + `@types/leaflet`) for the transport OSM map (imperative, divIcons — no broken marker images). Added nav items `visitor` (`visitors.read`) + `facility` (`facility.read`); transport/hostel/medical/canteen stay feature-flagged. **Medical/immunization use the rules-restricted collections** (nurse/doctor/principal/vp_admin) — no rule change needed; medical module also self-gates on `medical.read`. The `security` nav item (CCTV/security monitoring) remains a stub — out of P6 core scope.

## Compliance & governance (P7) ✅ · _foundation: `types/compliance.ts`, `features/compliance/data.ts`+`meta.ts`+`compliance.css`; build green @466 modules, dev clean_
| Module | % | Status | Remaining | Blockers |
|---|---|---|---|---|
| Compliance calendar | 100 | ✅ | deadlines (FormPage + auto-overdue + mark-filed) + document vault (expiry flags) (reference, me) | — |
| UDISE+ reporting | 100 | ✅ | live SIS aggregation (grade×gender, social category, PTR) + CSV/print export + school profile form (subagent) | — |
| RTE quota & reimbursement | 100 | ✅ | applications (FormPage + stages + Fisher-Yates lottery) + reimbursement claims (draft→submitted→approved→received) (subagent) | — |
| POCSO & grievance (CPO-only) | 100 | ✅ | POCSO case register (minimal PII, committee workflow) + grievance redressal (overdue) — restricted `pocso`/`grievances`, self-gated (subagent) | confidential; CPO-only |
| Consent management (DPDP) | 100 | ✅ | purpose catalog (+ starter purposes) + per-student consent records (grant/deny/withdraw) + counts (subagent) | `consent_records` should become a restricted collection (P9) |
| SMC portal | 100 | ✅ | members (RTE composition hint) + meetings (FormPage + minutes/decisions/attendees) + budget (FY utilization bars) (subagent) | flag `smc` |

> **P7 COMPLETE.** Build green @466 modules, dev boots clean. Foundation (`types/compliance.ts` + `features/compliance/data.ts`+`meta.ts`+`compliance.css`) + **compliance calendar/vault** reference (me); **udise/rte/safeguarding/consent/smc** via 5 parallel subagents. Added nav items `udise`, `rte`, `safeguarding` (`pocso.read`), `consent` (`consent.read`), `smc` (flag `smc`). **POCSO + grievances use the rules-restricted `pocso`/`grievances` collections** (CPO/DPO/principal) — no rule change; safeguarding module also self-gates on `pocso.read`. **P9 note:** make `consent_records` a restricted collection (DPO/principal); tighten payroll/salary + sensitive-ops rules in the same pass.

## Analytics, special & AI surfaces (P8) ✅ · _foundation: `types/special.ts`+`community.ts`, `features/analytics/data.ts`+`meta.ts`+`RadarChart.tsx`+`analytics.css`; build green @522 modules, dev clean_
| Module | % | Status | Remaining | Blockers |
|---|---|---|---|---|
| Academic analytics | 100 | ✅ | attendance distribution + at-risk list + grade-wise + AI panel (reports hub, me) | — |
| Financial analytics | 100 | ✅ | collection efficiency + ageing buckets + 6-mo trend (LineChart) + AI panel (me) | — |
| Custom report builder | 100 | ✅ | entity (students/staff/payments) → column picker → preview + CSV export (me) | — |
| NEP HPC | 100 | ✅ | radar (multi-domain) + scholastic/co-scholastic + remarks + printable card; staff generate, parent/student view published (subagent) | — |
| Special education / IEP | 100 | ✅ | IEP plans (goals field-array, review-due) + therapy logs + CWSN register; self-gated `iep.read` (subagent) | `iep_plans`/`therapy_logs` → restrict in P9 (sensitive) |
| Events & activities | 100 | ✅ | calendar/list + event FormPage + registrations (capacity/waitlist/attended) (subagent) | — |
| Alumni (+ career) | 100 | ✅ | directory + mentorship board + career insights; flag `alumni` (subagent) | — |
| AI surfaces (provider-less, all roles) | 100 | ✅ | **AI Insights** hub (smart briefing / predictions / assistants) fully built under `<AILockedOverlay>` + `useFlag('ai')`; plus AI panels in analytics (subagent) | AI provider intentionally deferred (by design) |

> **P8 COMPLETE.** Build green @522 modules, dev boots clean. Foundation (`types/special.ts`+`community.ts` + `features/analytics/data.ts`+`meta.ts`+`RadarChart.tsx`+`analytics.css`) + **reports/analytics** reference (me: academic + financial + report builder, charts kit, AILockedOverlay AI panels); **hpc/sped/events/alumni/insights** via 5 parallel subagents. Added nav `hpc` (staff+parent+student), `sped` (`iep.read`), `insights` (flag `ai`). All AI surfaces are provider-less under `<AILockedOverlay>` per the AI strategy. **P9 note:** restrict `iep_plans`/`therapy_logs` (special-ed), plus the earlier `consent_records` + payroll allowlists.

## Review & Operational-Realism rounds (2026-06-14/15) ✅ · _build green @603, tsc clean_
| Area | % | Status | Notes |
|---|---|---|---|
| Operational-ownership model (`lib/ownership.ts` + `useOwnership` + `<ReviewModeNote>`) | 100 | ✅ | owners operate / leadership reviews / approvers sign off; backed by `docs/ROLE_AUDIT.md` |
| Multi-role engine (primary + `secondaryRoleId` union) + leadership "Access" tab | 100 | ✅ | `user.manage` permission-gated (Principal/VP/HR/IT/Sr-Coordinator) |
| Staff Attendance module (`/staff-attendance`: manual / device kiosk / OTP kiosk + schedule config) | 100 | ✅ | one `recordStaffCheckIn` seam; `schedule.configure` perm |
| Delegation (`/delegation`, temporary operate access) | 100 | ✅ | `delegation.manage`; audited; `useOwnership` integration |
| IT Administration (`/it-admin`) | 100 | ✅ | devices/tickets/backup/integrations; least-privilege |
| Student Portal (profile/timetable/academics/calendar/achievements/wellness/support) | 100 | ✅ | read-only, own-data scoped |
| Expense configurable approval · Events approval+registration+export · Homework attachments · Finance UX · Attendance section-scope · Payroll split · Transport driver-absent SOP · Hostel expansion · Messaging escalation | 100 | ✅ | owner-decision implementations; Spark-native + Blaze seams |
| Deep adversarial audit (Phase 1) — ~21 fixes | 100 | ✅ | `docs/DEEP_AUDIT.md §A`; 11 decisions B1–B11 await owner |
| LLM Council review vs spec (Phase 2) | 100 | ✅ | `council-report-20260614.html`; verdict = security boundary is #1 gap |

## Phase 3 — corrections QUEUED (HELD by owner until role-by-role testing done) · _`docs/DEEP_AUDIT.md §F`_
| Item | % | Status | Notes |
|---|---|---|---|
| Tighten `firestore.rules` (per-collection role allowlists + strict own-record parent/student) | 0 | ⬜ HELD | owner runs `firebase deploy --only firestore:rules` + emulator-test; do NOT disrupt live test env |
| Per-student doc leaks (`assessment_results` peers' marks, `event_registrations` names) | 0 | ⬜ | split/mask — rules can't fix doc shape |
| Parent/student Messages entry point (recipient policy exists) | 0 | ⬜ | spec §7 #1 promise |
| Nav relabel (Communication→Notices + Messages; clarify 3 marks tabs) | 0 | ⬜ | UX clarity (Outsider council finding) |
| Spec reconciliation (annotate §10 Blaze-only items) | 0 | ⬜ | doc-only |

## Hardening (P9 — after Phase 3)
| Module | % | Status | Remaining | Blockers |
|---|---|---|---|---|
| Cross-breakpoint + a11y + perf QA | 0 | ⬜ | full sweep 320→1920; PWA icons | — |
| Subscription enforcement + deferred Super-Admin impersonation | 0 | ⬜ | tenant-side enforcement; §12.7 | — |
| B1–B11 business decisions | 0 | 🔵 | await owner (plan-id, exam-publish gate, PF base, payroll self-approval, grace period, refunds, RTE lottery, exeat dedup, PO linkage, datesheet clash) | owner |
