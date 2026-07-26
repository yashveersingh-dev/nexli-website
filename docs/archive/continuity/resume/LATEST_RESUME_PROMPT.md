# NEXLI — LATEST RESUME PROMPT (canonical)

> Paste everything below into a brand-new Claude Code session to resume NEXLI development with minimal context loss. Written as a handoff to another senior engineer.

---

You are taking over development of **NEXLI**, a premium, **mobile-first School Operating System** for Indian K-12 schools — a multi-tenant SaaS with a platform **Super Admin** layer above isolated per-school tenants. This is NOT a generic admin/ERP template. The quality bar is **Apple-Enterprise / Linear / Stripe**, in an **Obsidian + Gold + Ivory** identity, flawless mobile-first (320→1920px, no horizontal scroll, 60fps on 5-year-old Android), WCAG 2.1 AA. The project is **approved and actively under construction** in `C:\Users\yashv\Desktop\Yashveer Singh\My-Apps\Nexli\Web`.

## STEP 1 — Read these first, in this exact order
1. `C:\Users\yashv\Desktop\Yashveer Singh\My-Apps\Nexli\Web\context\LATEST_CONTEXT.md` — the canonical current project state (read fully).
2. `C:\Users\yashv\Desktop\Yashveer Singh\My-Apps\Nexli\NEXLI_MASTER_SPECIFICATION.md` — the business source of truth (~50 roles, ~40 modules, §12 Super Admin, §13 import, §14 tech).
3. `C:\Users\yashv\Desktop\Yashveer Singh\My-Apps\Nexli\Web\context\MODULE_STATUS.md` — the living module tracker (what's done / in-progress / pending, with %).
4. `C:\Users\yashv\Desktop\Yashveer Singh\My-Apps\Nexli\Web\docs\CONVENTIONS.md` — the engineering build contract (spine APIs, UI kit, feature-module layout, DOD).
5. `C:\Users\yashv\Desktop\Yashveer Singh\My-Apps\Nexli\Web\docs\QUALITY_REVIEW.md` — the module completion gate.
Also available if needed: repo-root `NEXLI_BUILD_PLAN.md` (full architecture, §13A AI strategy, §14A free-tier constraints, §20 build sequence) and `FIREBASE_SETUP.md` (§0 free-tier mode); and `reference/` (visual source of truth, already ported to `Web/src/styles/nexli.css`). The newest `Web/context/context-*.md` and `Web/resume/resume-prompt-*.md` are the rolling history.

## STEP 2 — Orient
- `cd Web && npm install` (if `node_modules` is missing), then confirm `npm run build` is green and `npm run dev` serves http://localhost:5173 (currently a principal-style ShellPreview at all paths; `/foundation` is the kit smoke test).
- Check `Web/context/MODULE_STATUS.md` for the exact next unit of work.

## STEP 3 — Preserve ALL of these (do not relitigate or regress)
- **Architecture:** React 19 + TS + Vite client SPA / installable PWA (Capacitor later). Tailwind v4 + NEXLI tokens + ported `nexli.css` + `app.css`. Feature-module pattern under `src/features/<module>/`. Major data-entry forms = **dedicated routed pages** (modals only confirm/preview/warn/simple).
- **Firebase / free-tier:** project `nexli-erp`, **Spark (no Blaze), no Cloud Functions yet**, Firestore **India region**. Offline persistence on.
- **Multi-tenant isolation:** all school data under `schools/{schoolId}/…` via `src/lib/db.ts` only; rules enforce it (deploy in P1). Only `super_admin` is cross-tenant.
- **Auth:** email/pass (staff) + phone OTP (parents, no password); no SMS MFA (kept MFA-ready); provisioning via secondary Auth app instance.
- **Permissions:** `src/lib/rbac.ts` for UI gating (rules are authoritative). **Students/parents cannot change own passwords** (only `user.password.manage` roles).
- **Feature flags:** `src/lib/featureFlags.ts` (global ◀ per-school), `useFlag(key)`. **Audit logging:** `src/lib/audit.ts`, `useAudit()`, append-only.
- **Design system + UI kit:** compose `@/components` (Icon, Avatar, Badge, Button, Panel, KPICard, feedback, AILockedOverlay, charts, DataTable) and the reference classes in `nexli.css`; keep one-team consistency (same design/spacing/typography/forms/nav/interaction/mobile across all modules).
- **Mobile-first:** validate every screen at 320/360/375/390/412/768/1024/1440/1920 — no horizontal scroll, no clipped content, no hidden actions, no unusable tables (DataTable → cards <1024). Animate only transform/opacity/filter; respect reduced motion.
- **AI:** build every AI surface fully but integrate **no provider** — wrap content in `<AILockedOverlay>` (exact message in `AI_COMING_SOON_MESSAGE`), gated by `useFlag('ai')`.
- **Recovery system:** keep the rolling, timestamped checkpoints in `Web/context/` + `Web/resume/` (never delete old ones) AND keep `LATEST_CONTEXT.md` + `LATEST_RESUME_PROMPT.md` current as the canonical files. Keep `MODULE_STATUS.md` updated.
- **Quality standard:** a module is complete only after passing `QUALITY_REVIEW.md` (6 axes + completion criteria incl. empty/loading/error states). "Functions" ≠ "done". Fewer modules at exceptional quality > many generic ones.

## STEP 4 — Continue autonomously
Build with momentum and ownership, as if you own the company. Make small/medium decisions yourself; **only stop for major product, business, architecture, or security decisions.** No MVP, no shortcuts, no placeholders; don't switch to testing mode early or ask the user to test partial work. **Use subagents** to parallelize independent feature modules (each in its own `src/features/<module>/` folder, building on the spine + kit); integrate their work yourself and keep `npm run build` green; run each module through the Quality Review before marking complete; update `MODULE_STATUS.md` + rolling checkpoints as you go. Use as many subagents you want during the build, you can use 10 subagents or 50 subagents or 100 subagents or even 1000 subagents - its your choice, I just want the most quality output and asap.

## STEP 5 — Immediate next actions (current state: **P0–P8 + Platform Completeness + Review Rounds 1–5 + Deep Audit + LLM Council DONE; build green @603, tsc clean; owner mid role-by-role testing**)

> **⛔ ON RESUME, CONFIRM BEFORE ACTING (owner decision 2026-06-15):** Phase 3 corrections are designed + queued but **HELD until the owner finishes role-by-role testing**, so the live test env isn't disrupted. Ask the owner: are they (a) **still testing** → keep the trackers current, fix any bugs they report, and **do NOT touch `Web/firestore.rules`**; or (b) **done testing** → execute **Phase 3** (designed in `docs/DEEP_AUDIT.md §F`), starting with the **Firestore rules tightening (strict own-record parent/student scoping)** — then the **owner** runs `firebase deploy --only firestore:rules` (you can't deploy) + emulator-test key roles before it goes live.

**Read these review/audit trackers (current source of truth for what's left):**
- `Web/docs/REVIEW_FINDINGS.md` — Rounds 1–5 log (every finding + fix).
- `Web/docs/ROLE_AUDIT.md` — sourced Indian-school role/ownership model (CBSE/ICSE/state, day/boarding).
- `Web/docs/DEEP_AUDIT.md` — Phase-1 fixes (§A), **11 business decisions B1–B11 awaiting owner (§B)**, P9 rules/schema flags (§C), Council outcome (§E), **Phase-3 queued design (§F)**.
- `Web/docs/TESTING_GUIDE.md` — role-by-role test plans + credentials.
- `Web/council-report-20260614.html` + `council-transcript-20260614.md` — the LLM Council verdict (security boundary = #1 gap).

**What was built since P8 (all green @603):** operational-ownership model (`lib/ownership.ts` + `useOwnership` + `<ReviewModeNote>`); **multi-role engine** (primary + `secondaryRoleId` union in `can()`/`useOwnership`; leadership "Access" tab on staff profile; permission-based `user.manage`); modules **staff_attendance** (`/staff-attendance`, 3 kiosk workflows + schedule config), **delegation** (`/delegation`), **it_admin** (`/it-admin`), **student portal** (7 screens); owner-decision features (expense configurable approval, events approval+registration+Excel/PDF export, homework attachments, finance UX, attendance section-scoping, payroll split, transport driver-absent SOP, hostel expansion, messaging escalation hierarchy, coordinator powers). **Deep audit fixed ~21 objectively-wrong issues** (incl. the CRITICAL cross-class data leak via `academics/shared.ts` `useScopedSectionIds`).

**Demo/testing env exists** (do not re-seed without need): `scripts/seed-demo.mjs` seeded the demo school `nexli-demo` (Super Admin + 13 staff roles + parent + student + 100 students + realistic data). Super Admin login `yashveersr4@gmail.com` (password held by owner, NOT stored in repo); demo staff/student password `NexliDemo@2026`; demo parent phone `+91 99999 00001` (needs a Firebase Phone **test number** with a fixed code). Credentials table in `docs/TESTING_GUIDE.md`.

**Spark-native decisions (owner-locked — keep):** attachments = URL/link refs (no Storage); server automation = client-side approximations + future-Blaze SEAMS (no Cloud Functions now); roles = reuse existing + multi-role/secondary-role (no new RoleIds).

**Security posture during testing (NOT a new bug):** UI gating is correct (what's being tested); the DB-layer default rule is still permissive (the queued §F gap). "I could read X via console" = known queued gap, not a finding. The Firestore rules tightening is Phase-3 #1 and is HELD per the owner.

### (superseded) earlier P7→P8 note
**P7 — Compliance & Governance is DONE**: compliance calendar/vault (reference), UDISE+, RTE+lottery/claims, safeguarding (POCSO+grievance, restricted), DPDP consent, SMC. See `context/context-2026-06-13-p7.md`.

### (superseded) earlier P6→P7 note
**P6 — Operations & Safety is DONE**: visitor/gate (reference), transport (Leaflet OSM map), hostel, medical (restricted), canteen, facility. Added **Leaflet** dep. See `context/context-2026-06-13-p6.md`.

### (superseded) earlier P5→P6 note
**P5 — Finance is DONE** (fees+manual payments+receipts, expense & procurement, payroll+statutory). **Finance/forms gotcha (still applies):** the kit's `Form<T>` needs `schema: ZodType<T>` (input===output) — keep numeric RHF fields as `z.string()` and `Number()`-coerce at submit (see `feeSchema.ts`). See `context/context-2026-06-13-p5.md`.

### (superseded) earlier P4→P5 note
**P4 — Daily Operations & Dashboards is DONE**: attendance, gradebook, homework, examinations, library, communication + 4 role dashboards (audience-router in `app/screens/Dashboard.tsx`). Fixed a Rules-of-Hooks bug (`useCan()||useCan()`) + enhanced `rbac.hasPermission` (scoped→unscoped + write⇒read). See `context/context-2026-06-13-p4.md`. P5 (finance) then built on top.

### (superseded) earlier P3→P4 note
**P3 — School Backbone is DONE** (build green @249 modules, dev clean). Foundation: `types/sis.ts`+`academics.ts`+`hr.ts`, shared `features/school/data.ts`+`meta.ts`+`school.css`. Modules under `staff`: **students** (registry/360/add-edit + **/import** CSV wizard + **/tc** transfer-certificate workflow), **admissions** (pipeline→admit creates a Student), **academics** (structure CRUD + timetable [mobile day-list] + substitutions), **hr** (staff/360/add-edit + leave). See `context/context-2026-06-08-p3.md`. P4 then added the daily drivers + dashboards above.

### (superseded) earlier note
**P2 — Super Admin platform is DONE** (`src/features/platform/`, 13 modules, 49 files, build green @214 modules, dev clean): dashboard, schools (registry/360 detail/7-step onboarding wizard that provisions the Principal/subscription lifecycle), subscriptions, plans & pricing, settings + feature-flag admin (global + per-school + kill switch), announcements, audit, activities, analytics, health, users, support. Foundation: `features/platform/data.ts` + `meta.ts` + `platform.css`; platform model types + db refs + rules. Built via 1 reference module (schools, by me) + 5 parallel subagents — that protocol works (see `context/context-2026-06-07-13-10.md`). Deferred: full school-impersonation flow (§12.7).

**Now build P3 — School Backbone** (audience `staff`): SIS (student master profile, admissions/enrollment, student data import, TC/leaving cert), academic structure (grades/sections/subjects/houses/rooms, timetable), staff records/HRMS. Establish a shared school data layer (collections under `schools/{id}/…` via `db.ts` tenant helpers), build one reference module yourself, then fan out subagents (own folder only, register via `registerModule('staff', <navId>, lazy(...))`). Then P4→P9. Keep build green; validate mobile per module; QUALITY_REVIEW before Complete; update `MODULE_STATUS.md` + rolling checkpoints (~10 min).

### (superseded) earlier P1→ note
**P0 foundation + P1 (Firebase Core & RBAC) are done and build-verified** (build green @163 modules; dev serves `/login`, `/login/parent`, the session-gated app). P1 added: `lib/auth.ts` (staff email/pass + parent phone-OTP), `lib/provisioning.ts`, `features/auth/` login pages, `app/AppRouter.tsx` (`ProtectedApp` gate + per-audience `RoleRoutes`), `app/AppLayout.tsx` (session shell), `app/guards.tsx`, `app/moduleRegistry.tsx` + `registerModules.ts` (module integration seam), `app/screens/*`, and `firestore.rules` + `firestore.indexes.json` + `firebase.json` + `.firebaserc` + `scripts/bootstrap.mjs`.

**Continue the autonomous build (do NOT stop between phases):**
1. **P2 — Super Admin platform** (audience `platform`): dashboard, school registry + detail, add-school onboarding wizard (dedicated FormPages), subscription lifecycle, plans & pricing, feature-flag admin (global + per-school), platform announcements, school impersonation, platform audit viewer, system health. Register each under `registerModule('platform', <navId>, lazy(...))`.
2. **P3 SIS/structure/HR → P4 daily drivers + 4 role dashboards → P5 finance → P6 ops/safety → P7 compliance → P8 analytics/AI → P9 hardening** (incl. the full 9-width screenshot QA sweep). Validate mobile per module as you go; run each module through `docs/QUALITY_REVIEW.md` before marking Complete; keep `npm run build` green; update `MODULE_STATUS.md` + rolling checkpoints (~10 min).

**Owner-action items (surfaced; non-blocking for module build):** enable Email/Password + Phone auth in the Firebase console; `cd Web && npm i` then `gcloud auth application-default login`; `npm run bootstrap …` (seed super admin + first school); `npm run deploy:rules`.

## Things to request from the user when reached (non-blocking now)
- ImageKit URL endpoint + public key (+ a free upload-signing endpoint, e.g. Cloudflare Workers/Vercel) to activate profile photo + payment-QR uploads.
- A reCAPTCHA site key (App Check) when hardening auth.
- A `firebase login` from the project owner when deploying Firestore rules/indexes and seeding the first Super Admin + school.

Begin by reading the STEP 1 files, confirm the build is green, then continue from the next item in `MODULE_STATUS.md`.
