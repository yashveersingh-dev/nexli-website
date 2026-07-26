# NEXLI — LATEST CONTEXT (canonical recovery)

_Canonical project state. Updated at each major checkpoint. Last updated: **2026-06-15** (P0–P8 + Platform Completeness + Review Rounds 1–5 + Deep Audit + LLM Council; build green **@603 modules**, tsc clean)._
_Companion: `Web/resume/LATEST_RESUME_PROMPT.md`. Rolling history: `Web/context/context-*.md` (latest: `context-2026-06-15-review-audit-council.md`). Live module tracker: `Web/context/MODULE_STATUS.md`. Review trackers: `Web/docs/REVIEW_FINDINGS.md`, `Web/docs/ROLE_AUDIT.md`, `Web/docs/DEEP_AUDIT.md`, `Web/docs/TESTING_GUIDE.md`. Council: `Web/council-report-20260614.html` + `Web/council-transcript-20260614.md`._

---

## 1. Project overview
NEXLI is a premium, **mobile-first School Operating System** for Indian K-12 schools — a multi-tenant SaaS with a **platform Super Admin layer above isolated per-school tenants**. It is NOT a generic admin/ERP template. Quality bar: Apple-Enterprise / Linear / Stripe; **Obsidian + Gold + Ivory** identity; flawless at 320→1920px; 60fps on 5-year-old Android; WCAG 2.1 AA.
- **Business source of truth:** `NEXLI_MASTER_SPECIFICATION.md` (~50 roles, ~40 modules across 15 sections + §12 Super Admin, §13 import, §14 tech).
- **Visual source of truth:** `reference/` (super-admin, principal, parent, student HTML + `styles.css` + `script.js`) — desktop-led; we invert to mobile-first. Ported verbatim to `Web/src/styles/nexli.css`.
- **Build target:** `Web/` (the app). Planning docs at repo root: `NEXLI_BUILD_PLAN.md`, `FIREBASE_SETUP.md`.

## 2. Architecture decisions
- Client-rendered **SPA + installable PWA** (no SSR needed behind login; offline-first; Capacitor-wrappable later for Android/iOS).
- **Platform spine built day-one** (no retrofit): multi-tenant isolation, centralized feature flags, audit logging, RBAC, unified session.
- **Major data-entry = dedicated routed pages** (`/x/new`, `/x/:id/edit`). Modals only for confirm/preview/warn/simple single-field updates.
- **Feature-module pattern** (`src/features/<module>/`: routes.tsx, nav.ts, pages/, components/, data.ts, types.ts) so modules are independently buildable (subagent-friendly); integrator registers routes/nav centrally.
- Presentational `AppShell` decoupled from session (previewable); a session-driven container feeds it per role (P1).

## 3. Technology stack
- React 19 + TypeScript (strict) + Vite 6; installable PWA via `vite-plugin-pwa` (Workbox).
- Tailwind CSS v4 (`@tailwindcss/vite`) themed with NEXLI tokens (`@theme inline` in `src/index.css`) + ported reference CSS (`src/styles/nexli.css`) + app layer (`src/styles/app.css`).
- Firebase JS SDK v11 (modular): Auth + Firestore (offline persistence). State: React context + Firestore real-time hooks. Forms: React Hook Form + Zod. Routing: React Router v7. i18n: i18next (pending). Utils: dayjs, clsx, tailwind-merge.
- Tooling present: Node 22, npm 10, firebase-tools 15, git. Build: `cd Web && npm run build` (tsc --noEmit + vite). Dev: `npm run dev` (http://localhost:5173). Vendor chunks split (firebase/react/router/vendor).

## 4. Firebase decisions
- Project **`nexli-erp`**, **Spark (free) plan — no Blaze, no Cloud Functions deployed yet** (cost-conscious). Firestore in an **India region** (DPDP residency; region ≠ usage restriction — all-India/global usage fine).
- Web config in `Web/.env` (gitignored; public-safe). Offline persistence ON (multi-tab).
- Cloud Functions are documented integration points + local Admin scripts for bootstrap; added on Blaze later. App Check (reCAPTCHA) = later seam. Firebase Storage NOT used (ImageKit for media).

## 5. Multi-tenant strategy
- Every school record lives under `schools/{schoolId}/…`. The data layer (`src/lib/db.ts`) has **no API that reads school data without a schoolId** — isolation is structural. Firestore security rules (to deploy in P1) enforce the same boundary server-side, so no app bug can cross tenants. Only `super_admin` is cross-tenant.
- Platform-only collections: `schools`, `subscriptions`, `plans`, `platform_settings/global`, `platform_announcements`, `platform_audit_log`, `feature_flags/global`, `userIndex/{uid}`.
- Tenant subcollections: `schools/{id}/{members, students, attendance, grades, fees, …, audit_log, settings}`. Per-school flags at `schools/{id}/settings/feature_flags`.

## 6. Authentication strategy
- Firebase Auth: **email/password (staff)** + **phone OTP (parents → no password)**. SMS MFA NOT enabled (paid) but architecture is MFA-ready.
- User provisioning (free-tier): authorized staff create accounts via the **secondary Firebase Auth app instance** pattern (sets initial password without logging the admin out).
- Resolution: a signed-in user → `/userIndex/{uid}` → super_admin (no school) OR member+school+flags. Implemented in `SessionProvider` (`loadProfile`).
- First Super Admin + first school = local Admin bootstrap script (run with `firebase login` / ADC), P1.

## 7. Permission strategy (RBAC)
- ~50 roles → 7 permission tiers (`src/types/roles.ts`). Client RBAC in `src/lib/rbac.ts` (`ROLE_PERMISSIONS`, `hasPermission`, `canManagePasswords`) for UI gating; **Firestore rules are the authoritative boundary** (mirror the intent).
- **Students & parents cannot change their own passwords** — only `user.password.manage` roles (Coordinator, CS HOD/`hod`, Principal, VP Admin, IT Admin, Super Admin).
- UI gates with `useCan('perm')`; modules gate with `useFlag('key')`.

## 8. Feature flag system
- Centralized `src/lib/featureFlags.ts`: 15 keys (ai, whatsapp, sms, email, online_payments, gps_tracking, advanced_analytics, hostel, transport, canteen, library, medical, alumni, smc, push_notifications) with metadata + `DEFAULT_FLAGS`.
- Resolution: **DEFAULT ◀ global (`feature_flags/global`) ◀ per-school (`schools/{id}/settings/feature_flags`)**, via `resolveFlags`. `useFlag(key)` from session. AI dev override via `VITE_AI_ENABLED`. Super Admin will manage flags globally + per school.

## 9. Audit logging system
- `src/lib/audit.ts`: `writeAuditEvent` appends to tenant `audit_log` (or `platform_audit_log` for Super Admin), never throws (auditing must not break UX). Open-ended `AuditAction` (user/student/fee/attendance/password/role/settings/etc.). `useAudit()` returns a session-bound logger. Rules will make logs create-only (append-only). Designed to expand with richer details, no schema change.

## 10. Navigation architecture
- Single manifest `src/app/nav.ts`: `PLATFORM_NAV`, `STAFF_NAV` (superset), `PARENT_NAV`, `STUDENT_NAV`; `audienceForRole`, `navForAudience`, `bottomNavForAudience`, `filterNav` (filters by role permission + feature flag; AI-taggable). Guarantees identical navigation across modules and no unusable links.
- `AppShell` (`src/app/shell/`): desktop fixed sidebar; **mobile sticky app-bar + off-canvas drawer + bottom tab bar** (≤4 + More), safe-area aware. Breakpoint 768px.

## 11. Design system decisions
- Obsidian/Gold/Ivory tokens in `nexli.css :root` (bg #080808, surface #121212, card #181818, gold #C6A55C, gold-light #E8D3A0, text #F7F2E8, muted #A8A29E; success/warning/danger/info; spacing 4–48; radius 8–18; signature ease `cubic-bezier(0.22,1,0.36,1)`; Inter). Mapped into Tailwind theme. App-specific components + mobile fixes in `app.css`.
- UI Kit (`src/components`, barrel `index.ts`): Icon (~55), Avatar (photo→initials), Badge/DotBadge, Button, Panel/PanelAction, KPICard (count-up), feedback (Skeleton/SkeletonText/Spinner/EmptyState/InfoCard), AILockedOverlay (+`AI_COMING_SOON_MESSAGE`), charts (Donut/DonutLegend/Ring/LineChart/BarChart), **DataTable** (table→cards). Compose these; don't restyle.
- **Form kit** (`src/components/form`): `Field` (label/req/optional/hint/error a11y wrapper) + presentational primitives `Input` (icons/prefix/password reveal), `Textarea` (auto-resize), `Select` (native+chevron), `DatePicker` (native date/time), `Toggle`, `Checkbox` (+indeterminate), `RadioGroup` (card/inline), `OTPInput` (paste/arrows/SMS-autofill), `FileUpload` (ImageKit seam → initials/object-URL preview). RHF+Zod `Form` with connected `FormInput/Textarea/Select/Date/Toggle/Checkbox/RadioGroup/OTP/FileUpload`. `FormPage`+`FormSection`+`FormRow` = dedicated-page layout (back/crumbs/title, responsive 2-col grid, sticky save bar above mobile bottom-nav).
- **Overlays & nav** (`src/components`): `Portal`, `Modal`+`ConfirmModal`, `Sheet` (bottom/right/left), `Tabs` (line/pill, WAI-ARIA), `Toast` (`ToastProvider`+`useToast`, tones+action). Shared overlay hooks in `lib/hooks` (`useFocusTrap`, `useLockBodyScroll`, `useEscapeKey`, `usePresence`, `useEvent`).

## 12. Mobile-first decisions
- Design at 320px first; validate 320/360/375/390/412/768/1024/1440/1920. No horizontal scroll, no clipped content, no hidden actions, no unusable tables. Any desktop action equally easy on mobile.
- Mobile inversion of the desktop-led reference: bottom-nav + drawer; **DataTable renders stacked cards <1024px** (kills the reference's 720px horizontal-scroll tables). Safe-area insets honored. Motion only on transform/opacity/filter; reduced-motion respected.

## 13. Completed work
- **P0 Foundation (100%, builds green — 148 modules):** Vite/TS/PWA scaffold; Tailwind theme + nexli.css + app.css + **kit.css**; Firebase init (offline); UI Kit (incl. DataTable); **full form kit** (primitives + RHF·Zod `Form` + `FormPage`); **overlays/nav** (Portal/Modal/ConfirmModal/Sheet/Tabs/Toast); **i18n** (i18next + `locales/en/common.json`); **`AppProviders`** (i18n→Session→Toast) mounted in `main.tsx`; spine (types/models, rbac, featureFlags, db [tenant refs + `useDocument`/`useCollection`], audit, SessionProvider); navigation manifest; AppShell (sidebar/drawer/bottom-nav/appbar) + shared `useFocusTrap`; ShellPreview (principal dashboard demo at `*`); FoundationPage (`/foundation`) + **interactive KitPreview (`/kit`)** smoke tests.
- **Process/docs:** `docs/CONVENTIONS.md`, `docs/QUALITY_REVIEW.md` (completion gate), `context/MODULE_STATUS.md` (living tracker), rolling checkpoints (`context/`, `resume/`), repo-root `NEXLI_BUILD_PLAN.md` + `FIREBASE_SETUP.md`.

## 13b. P1 — Firebase Core & RBAC (COMPLETE, code)
- **Auth service** `lib/auth.ts`: staff email/pass sign-in + password reset; parent phone-OTP (`createRecaptcha` invisible reCAPTCHA, `sendParentOtp`, `confirmParentOtp`, `toE164India`/`isValidIndianMobile`); friendly `authErrorMessage`.
- **Provisioning** `lib/provisioning.ts`: secondary-app account creation (admin stays signed in) + `writeMemberDocs` (member + userIndex batch) + `setMemberStatus` + `generateTempPassword`.
- **Auth UI** `features/auth/`: `AuthLayout` (premium obsidian/gold split, mobile-compact), `StaffLogin` (email/pass + inline reset), `ParentLogin` (phone → `OTPInput`, resend cooldown, invisible reCAPTCHA target) + `auth.css`.
- **Routing/guards** `app/`: `AppRouter.tsx` (`ProtectedApp` gate: loading→`Splash`, unauth→`/login`, no_profile→`NoAccessScreen`, suspended→`SuspendedScreen`; `RoleRoutes` nested per-audience `<Routes>` from nav manifest), `AppLayout.tsx` (session-driven shell: filtered nav/bottom-nav, school/platform context chip, account+notifications Sheets, sign-out), `guards.tsx` (`RequirePermission/RequireFlag/RequireSuperAdmin/Guarded`), `moduleRegistry.tsx` + `registerModules.ts` (module integration seam — lazy route subtrees keyed by audience+navId, fallback `ModuleStub`), `screens/` (Splash, StatusScreen, statuses, Dashboard, ModuleStub). `router.tsx` now: `/login`, `/login/parent`, `/foundation`, `/kit`, `*`→ProtectedApp. `ShellPreview` retired (kept as P4 design reference).
- **Security** (repo root `Web/`): `firestore.rules` (deny-by-default; structural tenant isolation; RBAC via member doc; restricted-collection guard so the tenant wildcard can't widen medical/counseling/POCSO/grievances/members/settings/audit; append-only audit; platform super-admin only; signed-in read of global feature flags), `firestore.indexes.json`, `firebase.json` (firestore + hosting SPA), `.firebaserc` (nexli-erp), `scripts/bootstrap.mjs` (Admin-SDK seed of super admin + first school + principal), npm scripts `bootstrap`/`deploy:rules`/`deploy`.

## 13c. P2 — Super Admin platform (COMPLETE). `src/features/platform/` — 13 modules, 49 files, build green (214 modules), dev clean.
- **Foundation:** `data.ts` (schools CRUD, subscription lifecycle, plans, announcements, settings, activity feed, global/per-school flags, platform audit hooks), `meta.ts` (status/action/board/type/announcement display maps, INDIAN_STATES, plan templates), `platform.css`. Platform model types added to `types/models.ts` (Plan, Subscription, PlatformSettings, PlatformAnnouncement, PlatformActivity, ImpersonationSession; School extended). db refs + rules added for `subscriptions`, `plans`, `platform_activity`, `impersonation_sessions` (super-admin only, append-only where relevant).
- **Modules** (registered in `app/registerModules.ts` under audience `platform`, each lazy-loaded): dashboard (command center, index route via `app/screens/Dashboard.tsx`), schools (registry + 360 detail + 7-step onboarding wizard that provisions the Principal via `provisioning.ts` + subscription lifecycle modal with mandatory reason→audit), subscriptions overview, plans & pricing (cards + create/edit FormPage + seed defaults), settings (general + feature-flag admin global/per-school + kill switch), announcements (compose/target/log), audit (append-only viewer), activities (timeline), analytics (aggregate, no PII), health (status board + metrics seam), users (operator + admin directory), support.
- Built via 1 reference module by me (schools) + 5 parallel subagents; integrated, reconciled, build-verified. No shortcuts/placeholders. Deferred: full school-impersonation session flow (§12.7) — tracked.

## 13d. P3 — School Backbone (COMPLETE). Build green @249 modules, dev clean. Audience `staff`.
- **Foundation:** `types/sis.ts` (Student/Guardian/Admission/TransferCertificate), `types/academics.ts` (Subject/House/Room/TimetableSlot/Substitution/WEEKDAYS/DEFAULT_PERIODS), `types/hr.ts` (StaffProfile/Qualification/LeaveRequest). **Shared P3 data layer `features/school/data.ts`** (tenant CRUD for students/admissions/TC/grades/sections/subjects/houses/rooms/timetable/substitutions/staff/leave via `db.ts` helpers; generic createIn/updateIn/removeIn + audit) + `meta.ts` (status/option maps) + `school.css` (shared toolbar/detail/kv/timeline/guardian/statstrip classes — staff routes don't load platform.css).
- **Modules** (registered `registerModule('staff', …)`, lazy): **students** (registry + 360 profile tabs + add/edit FormPage w/ dynamic guardians via useFieldArray, **+ /import** CSV wizard [template/upload/auto-map/validate/preview/import, dependency-free CSV parser], **+ /tc/** transfer-certificate list/request/clearance-workflow/issue), **admissions** (pipeline + stage stepper + RTE + admit→creates Student), **academics** (hub Tabs: structure CRUD via modals / weekly timetable [grid ≥768, mobile day-list] / substitutions), **hr** (staff list/360/add-edit w/ qualifications + leave requests with approve/reject).
- Built: reference (students) + HR + import-page + TC by me; admissions + academics + CSV/validate helpers by subagents. P3 collections fall under the generic tenant rule in `firestore.rules` (active-member read / staff write) — no rules change needed.

## 13e. P4 — Daily Operations & Dashboards (COMPLETE). Build green, dev boots clean (HTTP 200). Audience `staff`/`parent`/`student`.
- **Foundation:** `types/daily.ts` (AttendanceDay/Assessment/Homework/Exam(+Paper/Result)/LibraryBook/BookCirculation/Circular/PTMSlot), shared **`features/daily/data.ts`** (tenant CRUD + real-time hooks for all P4 collections via `db.ts`; deterministic `attendanceDayId`/`examResultId`) + `meta.ts` (`ATTENDANCE_MIN_PERCENT=75`, status/category maps, `BOOK_CATEGORIES`).
- **Modules** (registered in `app/registerModules.ts`, lazy): **attendance** (mark roster offline-first + <75% overview + parent/student read), **gradebook** (assessments list/FormPage/marks-entry+publish), **homework** (assign/edit + submission tracker + parent/student view & student submit), **examinations** (terms + datesheet papers + results grid w/ pass/compartment/fail + admit cards; parent/student datesheet + published report card), **library** (catalog/circulation/overdue + my-library; flag `library`), **communication** (compose/target circular + staff list + audience-filtered parent/student inbox). **4 role dashboards** via `app/screens/Dashboard.tsx` audience-router: StaffDashboard (principal/admin KPIs + teacher "my classes" branch), ParentDashboard (child cards + homework + notices), StudentDashboard (today's classes + attendance % + homework + notices).
- **Recovery + fixes:** a prior session was cut off mid-integration (build red: dashboards half-wired in `Dashboard.tsx`, `StudentDashboard` imported a non-existent `useTimetable` from daily/data). Fixed import (→ `school/data`), rewrote `Dashboard.tsx` as a clean lazy audience-router, registered the built-but-unregistered modules; built the two missing modules (homework, examinations) via 2 parallel subagents + integrated. Also fixed a **Rules-of-Hooks** bug (`useCan()||useCan()` short-circuit) in attendance/gradebook/HR, and enhanced `rbac.hasPermission` so scoped teacher grants (`*.read.section`, `*.write.period`) satisfy unscoped nav-read (scoped→unscoped + write⇒read) — class/subject teachers now get the correct staff nav. See `context/context-2026-06-13-p4.md`.

## 13f. P5 — Finance (manual, free-tier) (COMPLETE). Build green @344 modules, dev clean. Audience `staff` (+ `parent`/`student` for fees).
- **Foundation:** `types/finance.ts` (fees/expense/procurement/payroll), shared **`features/finance/data.ts`** (tenant CRUD + hooks; **atomic receipt-numbered `recordPayment` via `runTransaction`** on `finance_counters/receipt`; updates invoice paid/due/status) + `meta.ts` (status/category maps + **India statutory** `computePF`/`computeESI`/`computePT`) + `finance.css` (money/ledger/receipt/payslip + print styles).
- **Modules** (registered, lazy): **fees** (reference, me) — hub Tabs (overview KPIs / student ledger / structures / payments / settings), `FeeStructureFormPage` (RHF + `useFieldArray` line items), `StudentLedgerPage` (assign-fees + concession modals), `CollectPaymentPage` → printable `ReceiptDoc`, **parent/student `MyFeesRoutes`** (dues + receipts + how-to-pay QR/bank); **expense & procurement** (subagent) — expenses + requisitions→PO→GRN + vendors; **payroll** (subagent) — salary structures, monthly runs (generate→finalize→paid), statutory PF/ESI/PT/TDS + LOP, printable payslips.
- **Decisions:** added `expense` nav item (`expense.read`). **Finance RHF schemas are string-based** (kit `Form<T>` needs `ZodType<T>` input===output — no `z.coerce`/`.default()`; coerce numbers at submit). Manual reconciliation (no gateway); ImageKit QR seam pending keys. Payroll/salary collections need a tighter rules allowlist at P9. See `context/context-2026-06-13-p5.md`.

## 13g. P6 — Operations & Safety (COMPLETE). Build green @412 modules, dev clean. Audience `staff`.
- **Foundation:** `types/ops.ts`, shared **`features/ops/data.ts`** (tenant CRUD/hooks for all P6 collections; **medical/clinic in the rules-RESTRICTED `medical` collection via `kind` discriminator** + `immunization`) + `meta.ts` + `ops.css` (Leaflet map, SOS banner, gate pass/OTP, menu, rollcall roster, occupancy meter, print).
- **New dep:** **Leaflet** (`leaflet` + `@types/leaflet`) for the transport OSM live map — used imperatively (React-19 safe), `L.divIcon` markers.
- **Modules** (registered, lazy): **visitor** (reference, me) — gate register + check-in FormPage (pass no + OTP + blacklist warning) + printable pass + log + blacklist; **transport** (live map / routes+stops / vehicles+doc-expiry / bus attendance / SOS); **hostel** (blocks+rooms+occupancy / allocations / rollcall night / exeat overdue); **medical** (visits / health records+IHP / immunizations — restricted, self-gated); **canteen** (menu veg-nonveg / headcount / feedback / FSSAI); **facility** (assets+warranty / facilities / maintenance tickets).
- **Decisions:** added nav `visitor` (`visitors.read`) + `facility` (`facility.read`); transport/hostel/medical/canteen stay feature-flagged. Built via 5 parallel subagents on the shared ops data layer. See `context/context-2026-06-13-p6.md`.

## 13h. P7 — Compliance & Governance (COMPLETE). Build green @466 modules, dev clean. Audience `staff`.
- **Foundation:** `types/compliance.ts`, shared **`features/compliance/data.ts`** (POCSO/grievances in the rules-restricted `pocso`/`grievances` collections) + `meta.ts` + `compliance.css` (deadline rows, confidential banner, vault card, budget bar, UDISE stat grid).
- **Modules** (registered, lazy): **compliance** (reference, me) — calendar (deadlines + auto-overdue + mark-filed) + document vault (expiry flags); **udise** — live SIS aggregation (grade×gender, social category, PTR) + CSV/print + profile; **rte** — applications (stages + Fisher-Yates lottery) + reimbursement claims; **safeguarding** — POCSO register (minimal PII, committee workflow) + grievances (self-gated `pocso.read`, confidential); **consent** (DPDP) — purposes + per-student consent records (grant/deny/withdraw); **smc** — members + meetings + budget (FY utilization).
- **Decisions:** added nav `udise`/`rte`/`safeguarding`/`consent`/`smc`. POCSO+grievances restricted (no rule change). **P9:** make `consent_records` restricted + payroll allowlist. See `context/context-2026-06-13-p7.md`.

## 13i. P8 — Analytics, Special & AI surfaces (COMPLETE). Build green @522 modules, dev clean. Audience `staff` (+ `parent`/`student` for HPC).
- **Foundation:** `types/special.ts`+`community.ts`, shared **`features/analytics/data.ts`** (new collections: hpc_cards/iep_plans/therapy_logs/events/event_registrations/alumni; analytics read existing layers) + `meta.ts` + **`RadarChart.tsx`** + **`AiInsightsPanel.tsx`** (the `<AILockedOverlay>`+`useFlag('ai')` pattern) + `analytics.css`.
- **Modules** (registered, lazy): **reports** (reference, me) — academic analytics (attendance distribution + at-risk) + financial analytics (collection/ageing/trend) + custom report builder (CSV export) + AI panels; **hpc** — NEP holistic progress card (radar + scholastic + remarks + printable; parent/student view published); **sped** — IEP plans + therapy + CWSN (self-gated `iep.read`); **events** — calendar + registrations; **alumni** — directory + mentorship (flag `alumni`); **insights** — AI Insights hub (briefing/predictions/assistants) fully built under `<AILockedOverlay>` (flag `ai`).
- **Decisions:** added nav `hpc`/`sped`/`insights`. All AI surfaces provider-less by design. See `context/context-2026-06-13-p8.md`.

## 13j. Review & Hardening rounds — 2026-06-14/15 (build green @603, tsc clean)
After P8 + Platform Completeness, the owner moved into review/testing. Several rounds landed (all tracked in `docs/REVIEW_FINDINGS.md`):
- **Operational-realism model:** `lib/ownership.ts` (`MODULE_OWNERSHIP`: owners/secondary/reviewers/approvers) + `useOwnership(key)` hook + `<ReviewModeNote>`. Owners operate, leadership reviews, approvers sign off. Research-backed by `docs/ROLE_AUDIT.md` (sourced CBSE/ICSE/state, day/boarding role matrix).
- **Multi-role engine:** `can()` + `useOwnership` UNION permissions/ownership across `role` + `member.secondaryRoleId` (VP+Teacher, Class-Teacher+HOD, etc.). Leadership "Access" tab on the staff profile assigns/clears a secondary role; gated by the new **permission-based** `user.manage` (Principal/VP/HR/IT/Senior-Coordinator). `setMemberSecondaryRole` uses `deleteField()`.
- **Owner decisions implemented:** staff-attendance module (manual/device-kiosk/mobile-OTP-kiosk on one `recordStaffCheckIn` seam + schedule-config gated by `schedule.configure`); configurable **expense approval** (4 actions + per-school rules); **events approval** + student self-registration + Excel/PDF export + participant mgmt; temporary **delegation** (`/delegation`, `delegation.manage`, audited, `useOwnership` integration); **homework attachments** (URL refs, all file types); **finance UX** clarity; **attendance section-scoping** (class teacher → own section); **payroll split** (HR structure → Accounts disburse → Principal/VP approve run); **transport driver-absent SOP**; **hostel/boarding expansion** (gate-pass/leave/roll-call/mess); **communication escalation hierarchy** (manual, Spark-native); **student portal** completion (7 screens); **IT Administration** module (`/it-admin`); coordinator powers (`academic_coordinator`); parent-login entry button.
- **New modules registered:** `staff_attendance`, `delegation`, `it_admin` (staff); `events` + `profile`/`timetable`/`academics`/`calendar`/`achievements`/`wellness`/`support` (student).
- **Spark-native decisions (owner-locked):** attachments = URL/link refs (no Storage); server automation = client-side approximations + future-Blaze SEAMS (no Cloud Functions now); roles = reuse existing + multi-role (no new RoleIds).
- **Deep adversarial audit (Phase 1, `docs/DEEP_AUDIT.md`):** 5 critical-audit teams fixed **~21 objectively-wrong issues** (CRITICAL: cross-class data leak [scoped teachers saw all sections] → `academics/shared.ts` `useScopedSectionIds`; payment reviving a cancelled invoice; messaging escalation queue leaking confidential threads to back-office staff. HIGH: library txn, ESI round-up, manual-attendance clobber, requisition self-approval, hostel block-scope by id, SMC 75%, consent timestamp). **11 business decisions B1–B11 documented (await owner).**
- **LLM Council (Phase 2, `llm-council.md` method):** verdict = the **security boundary** is the #1 gap. Verified `firestore.rules` EXISTS + enforces tenancy + top-tier sensitive collections, BUT the coarse default rule exposes **fees/payroll/salary/marks/students(Aadhaar)/staff(PAN)/iep/consent/attendance** to any active member (incl. parents/students). Fix = additive rules (no migration — docs carry schoolId/studentId/sectionId).

## 14. In-progress / next work
- **Phase 3 corrections QUEUED (designed in `docs/DEEP_AUDIT.md §F`):** (1) tighten `firestore.rules` — per-collection role allowlists + **strict own-record** scoping for parent/student (owner chose this); (2) per-student doc leaks (`assessment_results` embeds peers' marks, `event_registrations` names) → split/mask; (3) parent/student **Messages entry point** (recipient policy already exists; spec §7 #1 promise); (4) nav relabel (Communication→Notices + Messages tab; clarify 3 marks tabs); (5) spec reconciliation (annotate §10 Blaze-only items). Logged-not-queued (feature-ish): split AI panels computed-now vs provider-later.
- **OWNER DECISION (2026-06-15): HOLD the rules change until AFTER role-by-role testing** — don't disrupt the live test env. Resume Phase 3 (starting with rules) when the owner finishes testing. **Owner runs `firebase deploy --only firestore:rules`** (I can't deploy) + emulator-test roles before it goes live.
- **Still pending P9-proper after Phase 3:** 9-width screenshot QA (320→1920), a11y/perf audit, PWA icons, deferred Super-Admin impersonation; subscription enforcement; the B1–B11 decisions.

## 15. Pending work
- **P1:** auth (login email/pass + phone OTP), route guards (status/role/flag), session-driven AppShell container (replace ShellPreview), secondary-app provisioning, local bootstrap, **deploy `firestore.rules` + `firestore.indexes.json`** (tenant isolation + medical/counseling/POCSO protection + append-only audit).
- **P2→P8 modules** (per `MODULE_STATUS.md`): Super Admin platform; SIS/structure/HR; daily drivers + 4 role dashboards; finance (manual payments); ops & safety; compliance & governance; analytics + all AI surfaces (provider-less). **P9:** full breakpoint/a11y/perf/security hardening.

## 16. Current phase
**P0–P8 + Platform Completeness COMPLETE; Review Rounds 1–5 + Deep Audit + LLM Council DONE. Build green @603 modules, tsc clean, dev boots clean.** The platform is feature-complete and has been through critical review (see §13j). The owner is **mid role-by-role manual testing** with the seeded demo school.

**THE ONE THING ON RESUME:** Phase 3 corrections are designed + queued in `docs/DEEP_AUDIT.md §F` but **HELD by owner decision until role-by-role testing is finished** (so the live test env isn't disrupted). Tomorrow the owner will either (a) continue testing — keep maintaining the trackers, fix any bugs they report, do NOT touch `firestore.rules`; or (b) say testing is done → execute Phase 3 starting with the **rules tightening (strict own-record scoping)**, then the owner runs `firebase deploy --only firestore:rules` + we emulator-test. Confirm which before acting.

**Known security posture during testing (NOT a new bug — the queued §F gap):** UI gating is correct (that's what's being tested), but the DB-layer default rule is permissive — sensitive collections are broadly readable. "I could read X via console" = the known queued gap, not a finding.

_Last updated: 2026-06-15 (Review Rounds 1–5 + Deep Audit + LLM Council; build green @603)._

## 17. Folder structure (Web/)
```
package.json vite.config.ts tsconfig.json index.html .env(.example) .gitignore
public/favicon.svg  public/icons/(PWA pngs TODO)
docs/ CONVENTIONS.md QUALITY_REVIEW.md
context/ LATEST_CONTEXT.md MODULE_STATUS.md context-*.md
resume/ LATEST_RESUME_PROMPT.md resume-prompt-*.md
src/
  main.tsx index.css vite-env.d.ts
  app/ router.tsx FoundationPage.tsx KitPreview.tsx ShellPreview.tsx nav.ts
    providers/ SessionProvider.tsx AppProviders.tsx
    shell/ AppShell.tsx Sidebar.tsx BottomNav.tsx MobileAppBar.tsx index.ts
  components/ Icon Avatar Badge Button Panel KPICard feedback AILockedOverlay charts DataTable
    Portal Modal Sheet Tabs Toast index.ts
    form/ Field Input Textarea Select DatePicker Toggle Checkbox Radio OTPInput FileUpload Form FormPage index.ts
  lib/ firebase.ts cn.ts format.ts hooks.ts i18n.ts rbac.ts featureFlags.ts db.ts audit.ts legacy-charts.reference.js
  styles/ nexli.css app.css kit.css
  types/ roles.ts models.ts
  locales/en/ common.json
  features/ (empty — modules go here)  routes/
```

## 18. Important implementation notes
- Use the spine + kit (don't reinvent): `useSession/useCan/useFlag/useAudit`, `db.ts` tenant helpers + `useDocument`/`useCollection`, `@/components`, `cn()`, `format.ts`. Alias `@/` → `src/`.
- nexli.css is the visual truth; refine its responsive @media rather than rewrite. New shared components → `src/components` + barrel; module-only → feature folder.
- Tenant records extend `TenantRecord` (id, schoolId, createdAt/By, lastModifiedAt/By, version); always set schoolId; paginate ≤100/query; log audit on mutations.
- Keep Firebase lazy/code-split where possible; animate only transform/opacity/filter.

## 19. Known limitations
- Firestore security rules + indexes NOT yet deployed (enforcement currently UI-side only until P1 — needs `firebase login`).
- No Cloud Functions yet (admin password reset, claims mirroring, bulk import processing, scheduled jobs, emergency fan-out, ImageKit signing = future Blaze).
- ImageKit not wired (no keys yet) → avatars/QR use initials/placeholder; FileUpload is a seam.
- Notifications in-app only; payments manual (QR+bank); GPS via free Leaflet/OSM + driver geolocation (no routing/ETA yet).
- AI fully designed but provider-less (AILockedOverlay).
- Visual screenshot QA across 9 widths not yet executed; PWA icon PNGs missing (build warns); ESLint not configured (Prettier is).
- Firebase bundle ~130kB gz (acceptable; later split firestore/auth + route lazy-load).

## 20. Next implementation priorities
**P0 kit is done (form kit, overlays/nav, i18n, AppProviders — all build-verified at `/kit`).** Continue from P1:
1. **P1 auth:** login pages (staff email/pass + parent phone-OTP using `OTPInput`), route guards (status/role/flag), a **session-driven AppShell container** replacing ShellPreview, secondary-app provisioning helper, local Super-Admin + first-school bootstrap script.
2. **P1 security:** deploy `firestore.rules` + `firestore.indexes.json` (tenant isolation + medical/counseling/POCSO protection + append-only audit) — needs `firebase login` from the owner.
3. **Fan out modules to subagents** (per CONVENTIONS), each passed through QUALITY_REVIEW before Complete; update MODULE_STATUS + rolling checkpoints. Order: P2 Super Admin → P3 SIS → P4 dashboards → P5 finance → P6 ops → P7 compliance → P8 analytics/AI → P9 hardening (incl. the deferred 9-width screenshot QA sweep).

## Still needed from the user (non-blocking)
ImageKit URL endpoint + public key (+ a free upload-signing endpoint); later a reCAPTCHA site key (App Check); a `firebase login` by the project owner to deploy security rules/indexes and seed the first Super Admin + school.
