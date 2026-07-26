# NEXLI — Project Context

_Plain-English background for anyone (or any fresh session) starting from zero. For "where things stand and what's next," read `resume/RESUME.md`._

> **Status (2026-06-19):** Two formal pre-launch audits (`Web/Phase 3/1.md`, `2.md`) were systematically remediated over three rounds + a code-polish pass — security, legal/DPDP, data-integrity, finance, performance, UX, **234 Vitest unit tests**, and **249 Firestore-rules emulator tests** — taking launch-readiness from **2.7/10 → ~6.9/10**, essentially the **honest code ceiling (~7.5)**. What remains to actually launch are **owner-only external actions** (Blaze upgrade, payment gateway, service-account key rotation, Sentry, lawyer review of the `legal/` drafts) — all listed with steps in **`docs/LAUNCH_RUNBOOK.md`**. The next phase is the **dedicated Nexli marketing website**. See `resume/RESUME.md` for the full handoff and `BUILD_PROGRESS.md` for the change log.

---

## 1. What Nexli is and who it's for
Nexli is a **school-management web app** — a complete "school operating system" / ERP — built for **Indian schools**. It is **multi-tenant**: one app serves many schools, and each school's data is kept separate and private.

It's for everyone in and around a school:
- The **platform owner** (Super Admin) who runs Nexli itself and onboards schools.
- **School leadership** (Principal, Vice Principals, Directors, Head of School…).
- **Teachers** and **academic** staff (coordinators, HODs, exam controllers…).
- **Admin / finance / HR / IT / operations** staff.
- **Hostel, library, health, security, transport, canteen** staff.
- **Parents** and **students**.

## 2. The goal and the business / pricing model
**Goal:** a beautiful, complete, mobile-first ERP that an Indian school can run its entire operation on.

**Pricing (decided):**
- Schools are charged **by size — student-count bands** (0–500, 500–1,000, 1,000–1,500, 1,500–2,000, … and up). **Not** by features.
- **Every school gets ALL features on every plan.** Features are never locked behind a more expensive tier.
- **AI features are the only separate paid add-on.**
- A **per-school custom / "founding" price** can override the band (used for the first schools).
- _Status:_ **GST tax-invoice generation** for subscription billing now exists (CGST/SGST/IGST split; the seller GSTIN/legal details are owner-config). Still external/unbuilt: the automatic size-band **pricing engine** and a **real payment gateway** (e.g. Razorpay) for actual charging — plans are still assigned manually with the custom-price override. Finalized pricing is saved in **`NEXLI_PRICING.md`**.

## 3. The technology and how the parts fit together
- **Frontend:** React 19 + TypeScript (strict) + Vite 6. It's an **installable PWA** (works offline, has a service worker). Styling is Tailwind v4 plus a bespoke design system.
- **Backend:** **Firebase** — Authentication (email + password; phone-OTP also possible) and **Cloud Firestore** (real-time database with offline caching). Firebase project **`nexli-erp`**, hosted in an **India region**, currently on the **free "Spark" tier**.
- **Multi-tenant shape:** all of a school's data lives under **`schools/{schoolId}/…`**. A top-level **`userIndex/{uid}`** maps a signed-in user to their school + role (or flags a platform Super Admin). Each school has **`schools/{id}/members/{uid}`** — a person's login + role inside that school.
- **How a session works:** sign in → look up `userIndex` → resolve the school + role → resolve that role's permissions → show only what the person is allowed to see.
- **Code "spine"** (under `Web/src/`): `lib/db.ts` (Firestore access + React hooks), `lib/rbac.ts` + `lib/roles/*` (roles & permissions), `lib/ownership.ts` (who *operates* vs *reviews* each module), `app/providers/SessionProvider.tsx` (the session), `app/nav.ts` (menus), `app/registerModules.ts` + `app/moduleRegistry.tsx` (wire each feature module into the shell).

## 4. The look and feel / design direction
- The bar: **"Apple Enterprise × Linear × Stripe Dashboard × luxury private-banking platform"** — not a clunky ERP.
- Palette: **Obsidian (near-black) + Gold + Ivory.** Calm, elegant, premium, trustworthy.
- **Mobile-first and non-negotiable:** must be flawless on small phones (no horizontal scroll, no overflow, no broken cards), and stay smooth on old low-end Android.
- The **visual reference** lives in **`reference/`** (`super-admin.html`, `principal.html`, `parent.html`, `student.html`, `styles.css`) — the design ceiling the app matches.

## 5. How the roles and permissions system works (data-driven)
- There is a **catalogue of ~118 roles** in **14 groups**: Platform, Leadership, Academic & Teaching, Administrative & Office, Finance & Accounts, Management & HR, Hostel & Residential, Library, Healthcare, Student Welfare & Protection, Security & Facilities, Transport, Canteen, and Family & Students.
- Many roles have **levels** (e.g. Academic Coordinator Senior / Junior / Associate; the warden, librarian and nurse variants; Headmaster / Headmistress / Head of School).
- Each role has a **permission matrix**: for every part of the app (a "module") it lists which **actions** the role may do — **View, Create, Edit, Approve, Export, Delete, Manage**.
- **It's data, not code.** The bundled catalogue (`Web/src/lib/roles/catalog.ts`) is only the *default*. The live source is **Firestore** (`roleDefinitions`), and a **Super Admin edits roles/permissions — and adds brand-new roles and levels — in the "Roles & Permissions" screen, with no code change.**
- **Enforced in three places:** (1) the **menu** only shows what a role can use; (2) **pages** gate their buttons/tabs (e.g. payroll and health tabs are hidden from people without access); (3) **Firestore security rules** enforce tenant isolation and lock the most sensitive data (medical, counselling, child-protection, grievances) to specific roles.
- An **"operational ownership"** layer decides who actually *operates* a module day-to-day vs who only *reviews* it (e.g. class teachers own attendance; leadership reviews).
- Extras: a person can hold a **secondary role** (permissions become the union of both), and individuals can be granted extra one-off permissions.

## 6. The main features / parts of the app
- **Super Admin (platform) console:** Schools, Subscriptions, Plans & Pricing, Users & Roles, **Roles & Permissions**, Onboarding, Analytics & Reports, Notifications, Activities, System Health, Support Tickets, Audit Logs, Platform Settings.
- **School modules:** Students (records + profiles), Admissions, Academics & timetable, Attendance, Class Assessments, Homework, Examinations, Holistic Progress Cards, Library, Fees & Finance, Expense & Procurement, Human Resources, Payroll, Communication & notices, Messaging, Transport, Hostel, Medical, Special Education, Reports & Analytics, Compliance (UDISE+/RTE/SMC), Privacy & Consent, Child Protection (POCSO), Visitor & Gate, Security, Canteen, Assets & Facility, Events, Delegation, IT Administration, Settings.
- **Parent portal:** dashboard, My Children (family overview), attendance, assignments, examinations, progress card, fees, communication, messages.
- **Student portal:** dashboard, profile, timetable, attendance, academics, assignments, examinations, progress card, library, fees, communication, events, achievements, wellness, support.
- **Profile pages:** a searchable **Students list** → a full **student profile** (overview, enrolment, attendance, fees, health [permission-gated], guardians, IDs & address); a searchable **Staff list** → a **staff profile** (overview, professional, attendance, payroll [permission-gated], contact, and an Access tab for secondary roles).

## 7. The folder layout (where the real app lives, what's empty)
- **`Web/` — THE REAL APP** (the PWA). Everything runs from here.
  - `Web/src/` — source: `app/` (shell, providers, nav, routing), `features/<module>/` (one folder per feature), `components/`, `lib/`, `styles/`, `types/`.
  - `Web/scripts/` — admin/maintenance scripts (seed demo data, deploy rules, user cleanup, diagnostics).
  - `Web/firestore.rules` — the deployed security rules.
- **`reference/`** — the design reference (HTML/CSS the app's visual style is matched to).
- **`Android/` and `Ios/`** — **EMPTY placeholder folders.** There are **no native apps**; the product is the installable **PWA in `Web/`**.
- **Project-root docs:** `NEXLI_MASTER_SPECIFICATION.md` (the blueprint), `NEXLI_BUILD_PLAN.md` (architecture/plan), `NEXLI_TEST_PLAN.md` (every demo account + how to test), `PHASE_A_PLAN.md` (security-tightening plan), `FIREBASE_SETUP.md`, plus dated snapshots `AUDIT_REPORT.md` and `BILLING_REVIEW.md` — and now **`context/CONTEXT.md`** (this file) and **`resume/RESUME.md`**.
- **Live working docs (kept current each session):** **`BUILD_PROGRESS.md`** — the running build log (what was fixed/built, gates run, rules deployed); **`TEST_RESULTS.md`** — the mobile UI test report; **`RETEST_PLAN.md`** — the focused, phone-friendly re-test plan covering only what changed. Phased feature plans live under **`docs/feature-plans/<module>/`**.

## 8. The demo school and test accounts
- One demo tenant: **`nexli-demo` = "Nexli Demo International School."**
- **Structure:** 15 grade levels (Nursery, LKG, UKG, Class 1–12) × 3 sections (A/B/C) = **45 classes**; **5 houses** (Red, Blue, Green, Yellow, Orange).
- **People:** **300 students**, **300 parents** (each parent sees only their own child), **300 staff** (an account for every role), **30 alumni**, and **1 test Super Admin** (`testadmin@nexlidemo.test`).
- **Student leadership titles** (given to existing students — not new accounts): 2 Head Students, 10 House Captains + 10 Vice House Captains, 2 Sports Captains, 90 class Prefects.
- **Every demo account shares ONE password** (written in `NEXLI_TEST_PLAN.md`). Realistic Indian names and valid-looking emails/phone numbers — no gibberish.
- The **real owner Super Admin `yashveersr4@gmail.com`** is separate and is never touched.
- The complete account list + a step-by-step testing order is in **`NEXLI_TEST_PLAN.md`** (project root).
- **Seeded academic data (so the modules show real numbers, not empty states):** ~30 school days of **attendance** across all 45 sections (a realistic present/absent/late/leave mix), one published **"Term 1 Examination"** with marks across each grade's subjects, **published report cards** for all 300 students (CBSE 9-point, class-ranked), and **fees** — annual invoices with a realistic paid / part-paid / unpaid mix giving real outstanding dues (~₹85 lakh). Added *additively* by `Web/scripts/seed-academic-demo.mjs` (idempotent; accounts/students/staff are never modified). This makes Rankings, Report Cards, the dashboards and the Fees figures all show live numbers.

## 9. The important rules and decisions we've made
- **Charge by school size, not by features.** Every feature is included on every plan; price comes from the student-count band; **AI is the only paid add-on**; a per-school custom/founding price can override the band.
- **Permissions are editable data.** A Super Admin can add roles/levels and change permissions without a developer touching code.
- **Privacy & compliance matter (Indian schools).** The app is built around **DPDP** (data protection), **NEP 2020**, **RTE**, **CBSE**, **POCSO** (child protection) and **UDISE+** reporting. Data sits in an **India region**. The most sensitive data (medical, counselling, child-protection, grievances) is **tightly restricted** to the right roles in the security rules. The Super Admin can **not** read a school's raw student/medical/counselling records — only platform-level metrics.
- **Demo / fake data only.** No real schools or people in the demo; the service-account key is never committed or shared.
- **Free-tier reality.** Runs on Firebase Spark (free) for now — there are **daily limits** on reads/writes/auth, so heavy testing should be spread across days.
