# NEXLI — MASTER BUILD PLAN

**Status:** Built & running on Firebase (free / Spark tier) — most of this plan is implemented. Live current-state + what's next: `resume/RESUME.md`; project background: `context/CONTEXT.md`.
**Source of truth (business):** `NEXLI_MASTER_SPECIFICATION.md`
**Source of truth (visual):** `reference/` (super-admin, principal, parent, student + `styles.css` + `script.js`)
**Build target:** `Web/` — a mobile-first, installable PWA
**Companion doc:** `FIREBASE_SETUP.md` (exact backend configuration + what is needed from you)

> This document is the complete architecture for the NEXLI School Operating System. It covers every role, every module, the information & navigation architecture, the full screen inventory, the design system, the component library, the responsive / motion / accessibility / interaction systems, the data & security model, and the staged build sequence. Nothing in the specification is dropped or simplified.

> **Current status (June 2026).** The app is built and running against Firebase (Spark free tier). **Done:** the role-based app shell + navigation, the Super Admin platform console, and the school modules (students, attendance, academics, gradebook, homework, exams, holistic progress cards, fees, expense & procurement, HR, payroll, transport, hostel, library, medical, compliance/UDISE/RTE, events, communication, messaging, and more); the **data-driven roles & permissions system** (which supersedes §2 below); **student & staff profile pages**; the **size-band pricing model** (features are never gated by plan; AI is the only add-on); a **fully-seeded demo school** with ~930 realistic test accounts; and **deployed Firestore security rules**. **Pending:** the deeper Phase-A security tightening (`PHASE_A_PLAN.md`), the size-band pricing *engine* + a real payment system, a few "In build" pages, and 3 role-permission decisions awaiting the owner. Full detail in `resume/RESUME.md`.

---

## 0. DESIGN INTENT (the bar we are building to)

NEXLI must feel like **Apple Enterprise × Linear × Stripe Dashboard × a luxury private-banking platform** — not a school ERP. The visual identity is **Obsidian + Gold + Ivory**. Every screen is luxurious, elegant, calm, intelligent, and trustworthy. Every interaction is alive but never gimmicky. It is **mobile-first and non-negotiably flawless** at 320 / 360 / 375 / 390 / 412 / 768 / 1024 / 1440 / 1920 px — with **zero horizontal scroll, zero overflow, zero broken cards, zero unusable tables**, and it stays at **60 FPS on 5-year-old low-end Android devices on 2G/3G**.

The four reference dashboards define the visual ceiling. We match their spacing, hierarchy, elegance, and motion exactly — and then make them perfect on mobile (the reference is desktop-led; we invert that).

---

## 1. THE FIVE-LAYER SCHOOL OPERATING SYSTEM

NEXLI is not data management; it is an operating system with five layers (spec §11.2). Every module maps to one or more layers:

1. **Data Layer** — unified real-time fabric (SIS, academics, finance, HR, operations).
2. **Compliance Layer** — DPDP, NEP 2020, RTE, CBSE, POCSO, UDISE+ woven into workflows.
3. **Safety Layer** — child + campus safety, SOS, emergency cascade, visitor/CCTV, hostel night protocol.
4. **Intelligence Layer** — AI insights/predictions surfaced before crises (human-in-the-loop only).
5. **Communication Layer** — structured, safe, boundaried messaging across all stakeholders.

**Competitive promise we must deliver in UX:**
- Principal: "You will never miss something important again." → exception-based command dashboard.
- Teacher: "Every admin task takes < 1 minute." → one-tap attendance, batch actions, smart defaults.
- Parent: "You always know your child is safe and learning." → calm, WhatsApp-simple, real-time.
- Trustee/Director: "You always know your schools are compliant and healthy." → read-only command views.

---

## 2. ROLE DIRECTORY → PERMISSION TIERS

> **Updated — now data-driven.** Roles & permissions are no longer hard-coded tiers. There is a catalogue of ~118 grouped, multi-level roles, each with a module × action permission matrix, editable by a Super Admin (no code change). The tier mapping below is the original design intent and remains a good conceptual guide. Implementation: `Web/src/lib/roles/*`; admin UI under **Roles & Permissions**.

The platform has **one platform-level operator** plus **~50 school roles** across clusters A–L, governed by **7 permission tiers** (spec §4.3) and **least-privilege by default**.

### 2.1 Permission Tiers
| Tier | Title | Scope |
|---|---|---|
| **T1** Strategic | Read-only global | View all dashboards across campuses; no writes |
| **T2** Executive | Full global admin | All campuses/modules; can approve/override |
| **T3** Campus Admin | Full campus control | All modules for their campus; final approver |
| **T4** Departmental | Department write | Read-write within department scope |
| **T5** Functional | Role-scoped write | Write limited to assigned students/sections/tasks |
| **T6** Limited | View-only / self | Own records only |
| **T7** Specialized | Cross-module restricted | Specific modules only, outside normal hierarchy |

### 2.2 Full Role → Tier Map
| Cluster | Roles | Tier(s) |
|---|---|---|
| **0 Platform** | Super Admin (NEXLI operator) | Platform layer (above all schools) |
| **A Strategic** | Chairman, Trustee/Board Member | T1 |
| | Director/CEO | T2 |
| | Regional Director, Cluster Director/Area Manager | T2 (scoped to region/cluster) |
| **B Campus Leadership** | Principal | T3 |
| | VP (Academic), VP (Administration) | T3 (module-scoped: academic vs ops) |
| **C Academic Mgmt** | Academic Coordinator (Pre-Primary/Primary/Middle/Senior) | T4 (segment) |
| | HOD | T4 (subject dept) |
| | Class Teacher (Homeroom) | T5 (their section) |
| | Subject Teacher | T5 (their subjects×sections) |
| | Substitute Teacher | T5 (time-bound, today only) |
| | Special Educator (CwSN) | T7 (IEP/CwSN) |
| | Counselor | T7 (counseling locker, write-only to others) |
| | Librarian | T4 (library only) |
| | Lab Assistant | T5 (lab only) |
| **D Student Dev** | Sports/PET, Arts/Music/Dance, Activity Coordinator, Club Coordinator, House Master | T5 (their domain; HPC contributions) |
| **E Student Leadership** | Prefect/Head Boy/Girl, House/Sports Captain | T6 (+ house/team views) |
| **F Admin & Ops** | Front Desk/Receptionist | T5 (visitor, certificate requests) |
| | HR Manager | T4 (HRMS/payroll/recruitment) |
| | HR Assistant | T5 (leave/attendance for support staff) |
| | Chief Accountant/Finance Manager | T4 (fee/accounts/expense/procurement) |
| | Accounts Clerk/Fee Collector | T5 (fee collection) |
| | IT Administrator | T7 (config/user mgmt/audit; no data) |
| | DPO | T7 (privacy/consent/audit; metadata only) |
| | Consent Officer | T5 (consent verification) |
| **G Welfare & Safety** | School Nurse/Medical Officer | T7 (clinic/medical) |
| | School Doctor (visiting) | T7 (session-scoped) |
| | CPO/POCSO Officer | T7 (POCSO/grievance, exclusive) |
| **H Transport** | Transport Manager | T4 (transport) |
| | Bus Conductor/Attendant | T5 (route attendance + SOS) |
| | Bus Driver | T6 (route/manifest view; GPS automatic) |
| **I Hostel** | Chief Warden | T4 (all blocks) |
| | Hostel Warden, Matron | T5 (assigned block) |
| | Night Warden | T5 (night roll-call + alert) |
| **J Security & Facilities** | Security Supervisor | T4 (security) |
| | Security Guard/Gatekeeper | T5 (gate/visitor) |
| | CCTV Administrator | T7 (footage, dual-auth) |
| | Estate/Facility Manager | T4 (facility/assets) |
| | Housekeeping/Maintenance | T6 (task log) |
| **K Canteen** | Canteen Manager | T4 (canteen/FSSAI) |
| | Canteen/Kitchen Staff | T6 (menu/prep log) |
| **L Visitors & Community** | Visitor Management Officer | T5 (visitor) |
| | Parent | T6 (their children only) |
| | Student | T6 (self only) |
| | Alumni | T6 (alumni portal only) |

### 2.3 Special independent roles (bypass hierarchy — spec §4.2)
- **DPO** — institutionally independent; cannot be overridden by Principal on privacy; metadata-only access; can freeze processing in a breach.
- **CPO/POCSO** — bypasses hierarchy for child safety; direct escalation to Principal/Board and external authorities; all access logged, immutable.
- **SMC** — parent/community governance body (mandatory for govt schools); own portal.
- **ICC (POSH)** — independent harassment-complaints committee; member-only access.

---

## 3. MODULE CATALOGUE (complete — spec §6, §12, §13)

**Platform layer (spec §12):** Super Admin Command Center — Platform dashboard, School Registry, Add/Edit School (onboarding wizard), Subscription lifecycle, Plans & Pricing, Feature Flags, Platform Analytics & Reports, System Health, Platform Announcements, School Impersonation (support), Audit Trail.

**Pricing & billing model (CONFIRMED — size-based; see spec §12.4):** NEXLI charges **by student-count band, not by features.** Every school on every plan gets **all** modules/features — nothing is locked behind a higher/pricier plan, and there is no per-plan feature matrix or module add-on. Price bands by student count: 0–500, 500–1k, 1k–1.5k, 1.5k–2k, 2k–3k, 3k–5k, 5k–10k, 10k–20k, 20k–40k, … (one price per band per billing cycle, derived from the school's **active, currently-enrolled** student count — leavers/TC/graduated excluded). The Super Admin can set a **custom/founding price** for a specific school (overrides the band — for the first 5 founding schools and any negotiated pricing). **AI features are the only paid add-on**, billed separately and independently of the size band. Crossing a band boundary moves the school to the new band from the next cycle (with pro-rata once a billing/payment integration exists).

**School layer (spec §6) — 15 sections, ~40 modules:**

| # | Section | Modules |
|---|---|---|
| 1 | Student Information System | 1.1 Student Master Profile · 1.2 Admissions & Enrollment · 1.3 Student Data Import · 1.5 TC & Leaving Certificate |
| 2 | Academic Management | 2.1 Timetable · 2.2 Attendance · 2.3 Lesson Plans · 2.4 Assessment & Gradebook · 2.5 NEP HPC · 2.6 Homework · 2.7 Examinations · 2.8 Library |
| 3 | Fee & Finance | 3.1 Fee Management · 3.2 Expense & Procurement · 3.3 Payroll |
| 4 | Human Resources | 4.1 Staff Records/HRMS · 4.2 Leave · 4.3 Recruitment |
| 5 | Communication | 5.1 Announcements/Circulars · 5.2 Parent–Teacher Comm · 5.3 Internal Staff Comm · 5.4 Emergency Comm |
| 6 | Parent Engagement | 6.1 Parent Portal · 6.2 Consent Management (DPDP) |
| 7 | Transport | 7.1 Transport & Fleet (GPS, bus attendance, SOS) |
| 8 | Hostel | 8.1 Hostel & Residential (roll call, exeat, night protocol) |
| 9 | Medical | 9.1 Clinic & Health (records, immunization, IHP, outbreak) |
| 10 | Security & Safety | 10.1 Visitor & Gate · 10.2 POCSO & Grievance · 10.3 CCTV |
| 11 | Canteen | 11.1 Canteen & Nutrition (FSSAI, allergens, PM POSHAN) |
| 12 | Asset & Facility | 12.1 Asset Management · 12.2 Facility & Infrastructure |
| 13 | Compliance & Governance | 13.1 Compliance Calendar · 13.2 UDISE+ · 13.3 RTE Quota |
| 14 | Analytics & Reporting | 14.1 Principal Command · 14.2 Academic Analytics · 14.3 Financial Analytics · 14.4 Custom Report Builder |
| 15 | Special Modules | 15.1 Special Ed/IEP · 15.2 Events & Activities · 15.3 Alumni · 15.4 SMC Portal |

> Note: spec numbers SIS as 1.1, 1.2, 1.3, 1.5 (no 1.5→1.4); preserved as-is.

**Competitive differentiators to bake in (spec §11.1):** infrastructure-safety compliance calendar, govt-portal connectors, RTE reimbursement, counselor referral pipeline, CBSE LOC/OASIS, staff wellbeing pulse, hardship fee workflow, alumni career tracking, substitute quality matching, multi-language report cards, chain benchmarking, exam-stress wellbeing calendar, digital diary/almanac, visitor blacklist intelligence, boarding-school night emergency protocol.

---

## 4. DOMAIN MODEL & RELATIONSHIPS

Core entities and how stakeholders connect (this drives Firestore design in §15 and security in §16):

- **Platform** → owns **Schools (tenants)** → each school owns its own isolated data graph.
- **School** → Academic Years → Grades → Sections; Subjects; Houses; Departments; Rooms/Labs.
- **Student** ↔ **Parents/Guardians** (many-to-many via family group; sibling links). Student ∈ one Section; enrolled in Subjects; optional Transport route, Hostel room, RTE flag, CwSN/IEP, Medical profile, Fee ledger.
- **Staff** → one primary Role (+ optional secondary ≤ primary); Class Teacher → one Section; Subject Teacher → Subjects×Sections; HOD → Department; Coordinator → Segment.
- **Attendance** keyed by date×section (daily) and date×period (subject); links to leave + medical exemptions + bus attendance.
- **Gradebook** keyed by term×subject×section; rolls up to Report Card / HPC; publication gated (teacher submit → coordinator approve → visible to parent/student).
- **Fee ledger** per student×year; concessions, sibling/RTE/staff-ward discounts; payments (online/offline); reimbursement claims.
- **Communication** is permission-gated by the message matrix (spec §7.1) and working-hours policy (§7.3); banned patterns enforced (§7.4); escalation chains modeled (§7.5).
- **Safety**: SOS → fan-out to Principal/Transport Mgr/parents; POCSO case → CPO-only graph; consent → per-purpose records gating data processing.

**Relationship rule of thumb for UI:** every screen is rendered through the lens of *who is looking* (role + scope) and *which student/section/campus is in context*. There is no "global" screen — context is always explicit.

---

## 5. INFORMATION ARCHITECTURE

Two top-level apps sharing one design system and one codebase, separated by authentication + custom claims:

### 5.1 Platform App (Super Admin only)
`Dashboard · Schools · Subscriptions · Users & Roles · Plans & Pricing · Onboarding · Platform Settings · Analytics & Reports · Notifications · Activities · System Health · Support Tickets · Audit Logs`

### 5.2 School App (all school roles — menu is role-filtered)
Full superset (Principal sees most of it):
`Dashboard · Students · Admissions · Academics (Timetable/Lesson Plans/Gradebook/HPC/Homework) · Attendance · Examinations · Library · Fees & Finance · HR · Payroll · Communication · Parent Engagement · Transport · Hostel · Medical · Security (Visitor/POCSO/CCTV) · Canteen · Assets & Facilities · Compliance (Calendar/UDISE+/RTE) · Reports & Analytics · Events & Activities · Alumni · SMC · Settings`

Each role sees a **curated subset** (see Navigation §6). The four reference dashboards are the **Dashboard** screen for Principal, Parent, Student (Super Admin = Platform Dashboard). Teacher and all other roles get purpose-built dashboards in the same language.

### 5.3 Persona "above the fold" (spec §9.2) — the first paint, no scroll
- **Principal:** today's attendance %, fee collected today, critical alerts count, pending approvals, quick actions (emergency broadcast, approve TC, at-risk, message teacher).
- **Teacher:** today's timetable, next period, pending homework submissions, one-tap attendance.
- **Parent:** child attendance today, next fee due, latest announcement, homework due tomorrow.
- **Student:** today's timetable, pending homework, upcoming exams.
- **Super Admin:** platform health, active/paused/suspended schools, MRR, renewals due, alerts.

---

## 6. NAVIGATION ARCHITECTURE

### 6.1 Desktop / tablet (≥768px)
Fixed left **sidebar** (248px) exactly as reference: logo, context chip (school selector / profile / house), role-filtered nav, Quick Actions block, help/footer. Top bar: greeting, global search (⌘K), notifications, messages, date/year, profile pill, secondary action row.

### 6.2 Mobile (<768px) — the inversion (this is where we beat the reference)
- Sidebar becomes an **off-canvas drawer** (overlay + slide, focus-trapped, swipe-to-close) — already stubbed in reference; we harden it.
- Add a **persistent bottom tab bar** (5 items max) for the highest-frequency destinations per role (e.g., Parent: Home · Attendance · Fees · Messages · More). Bottom nav is the primary mobile pattern; drawer holds the full menu under "More". Safe-area-inset aware (iPhone notch/home-bar).
- Top bar collapses: greeting truncates, search becomes an icon→full-screen sheet, profile pill collapses to avatar.
- **⌘K command palette** on desktop; on mobile a full-screen search sheet.
- Global **Quick Action FAB** for create-heavy roles (Teacher/Principal/Accounts), with a radial/sheet of contextual actions.

### 6.3 Role-filtered menus
Menu items are generated from a single **navigation manifest** filtered by the user's role + enabled modules (feature flags) + scope. One source of truth → consistent, testable, and impossible to show a link a user can't use.

---

## 7. SCREEN INVENTORY

Notation per module: **L** = list/index, **D** = detail, **C/E** = create/edit, **W** = workflow, **R** = report. Each screen is later documented with the **Screen Spec Template** (§7.3).

### 7.1 Platform (Super Admin)
- Platform **Dashboard** (health KPIs, schools donut, subscription bar, MRR line, activity feed, system health, all-schools table) — *realized from `super-admin.html`*.
- Schools: **L** registry (search/filter/sort) · **D** school profile · **C/E** add/edit (8-step onboarding wizard) · **W** subscription lifecycle (activate/pause/suspend/resume/terminate w/ reason) · **W** impersonation (reason → 60-min session → audit) · soft-delete (30-day).
- Subscriptions **L/R**, Plans & Pricing **C/E** (size-based price bands by student count, per-school custom/founding price override, AI paid add-on, trials — **all features included on every band; no feature matrix, no module add-ons**), Feature Flags (global + per-school + kill switch), Platform Settings (branding, academic defaults, SMS/Email/WhatsApp/ImageKit/Firebase refs), Notification Templates (multilingual).
- Analytics & Reports (engagement, revenue/MRR/churn, onboarding funnel, platform health, feature adoption, geo), System Health monitoring, Platform Announcements (compose, target, deliver, log), Audit Logs (append-only, immutable).

### 7.2 School modules (key screens per module)
- **SIS 1.1 Profile:** L students (filter grade/section/status) · D 360° profile (personal/family/academic/documents/medical/SEN/RTE/siblings/status, field-level by role) · C/E · history/versioning.
- **1.2 Admissions:** pipeline board (Inquiry→…→Enrolled) · inquiry C/E · application + doc upload · test/interview scheduling · offer letter · waiting list · RTE lottery.
- **1.3 Import:** W upload → validate → preview (green/yellow/red, inline fix) → confirm → progress → summary + downloadable error/success reports · import history.
- **1.5 TC:** W parent request → multi-dept clearance (library/accounts/hostel/transport/class teacher) → generate (Appendix-V) → digital sign → register → verification portal.
- **2.1 Timetable:** builder (constraints/load balancing/rooms) · live "today" view · substitution W · exam timetable + invigilation.
- **2.2 Attendance:** one-tap period marking (offline-first) · daily consolidation · biometric/RFID · late/medical exemption · 75% monitoring · bus attendance · disputes · reports.
- **2.3 Lesson Plans:** weekly plan C/E (objectives/methodology/resources/competencies) · coverage tracker · HOD review · substitute continuity · archive.
- **2.4 Gradebook:** assessment config · marks entry · weightage calc · publication control · report card gen · analytics (distribution, weak topics).
- **2.5 HPC:** multi-domain entry, self/peer/parent input, radar visualization, multilingual output.
- **2.6 Homework:** assign · load monitor · submission tracking · calendar · reminders.
- **2.7 Examinations:** schedule · invigilation · admit cards · script tracking · result entry/tabulation · CBSE LOC export · pre-board.
- **2.8 Library:** catalog (ISBN/Dewey) · circulation (barcode) · overdue/fines · reservations · acquisitions · reading programs · audit.
- **3.1 Fees:** structure config · schedule · online/offline payment · ledger · discounts/concessions (approval W) · reminders · defaulter reports · receipts · Tally export · refunds · RTE reimbursement · **hardship workflow**.
- **3.2 Expense/Procurement:** requisition → approval chain → PO → GRN → 3-way match · vendors · budgets · petty cash · expense claims.
- **3.3 Payroll:** salary structure · LOP/biometric integration · EPF/ESI/TDS · payslips · bank file · statutory returns · arrears · F&F.
- **4.1 HRMS:** staff profile/docs · qualification compliance · contract/probation · appraisal.
- **4.2 Leave:** policy config · apply · approval W · balance · calendar · encashment.
- **4.3 Recruitment:** posting · ATS pipeline · demo lessons · background verification · offer · onboarding checklist.
- **5.1 Announcements:** compose (rich text, attachments, schedule) · targeting · priority · channels · acknowledgment · archive · multilingual.
- **5.2 Parent–Teacher:** structured inbox (working-hours policy) · PTM booking · SLA monitor · log · WhatsApp routing.
- **5.3 Internal Staff:** 1:1 + groups (dept/committee) · task assignment · notice board · meetings (agenda/minutes/actions).
- **5.4 Emergency:** one-click broadcast (categories, multi-channel, templates, acknowledgment) · SOS console · contact cascade.
- **6.1 Parent Portal:** child dashboard *(from `parent.html`)* · fees · communication · reports · consent · PTM · service requests.
- **6.2 Consent:** purpose-specific consent · OTP verification · withdrawal · re-consent · DPO consent dashboard · immutable audit.
- **7.1 Transport:** enrollment · routes/boarding points · driver/conductor/vehicle records (renewal alerts) · **live GPS map** · speed alerts · bus attendance · ETA notifications · SOS · breakdown cascade.
- **8.1 Hostel:** room allocation · roll calls (morning/evening/**night**) · exeat W · visit mgmt · prep monitoring · incidents · hostel fees · housekeeping/laundry/nutrition.
- **9.1 Medical:** clinic visit log · medical records · emergency info · immunization · health campaigns · **outbreak alert** · medication log · referral · IHP.
- **10.1 Visitor/Gate:** digital register · OTP verification · host alert · gate pass · **blacklist** · vehicle log · pre-registration · contractor flow.
- **10.2 POCSO/Grievance:** encrypted filing (anonymous option) · CPO-only case mgmt · timeline · evidence vault · legal escalation (24h) · committee mgmt.
- **10.3 CCTV:** camera inventory · footage request (dual-auth) · retention · alert feed.
- **11.1 Canteen:** menu planning · allergen flags · FSSAI compliance · junk-food policy · headcount (PM POSHAN) · inventory · vendors · feedback.
- **12.1 Assets:** register · QR tagging · depreciation · maintenance history · disposal.
- **12.2 Facility:** maintenance requests · work orders · preventive schedule · compliance certs (Fire NOC etc.) · utilities · space booking.
- **13.1 Compliance:** calendar (90/60/30/7-day alerts) · document vault · checklists · audit report gen.
- **13.2 UDISE+:** auto-population · annual snapshot · format export · submission tracking.
- **13.3 RTE:** EWS register · documents · lottery · reimbursement claims · status.
- **14.1–14.4 Analytics:** Principal Command · Academic Analytics · Financial Analytics · Custom Report Builder (drag-drop, export, scheduled).
- **15.1 IEP:** CwSN profiles · IEP create/track · therapy logs · accommodation flags · exam allowances.
- **15.2 Events:** calendar · registration · results/achievements · permission slips · budget.
- **15.3 Alumni:** registry/transition · directory (opt-in) · events · mentorship · **career tracking** · donations.
- **15.4 SMC:** member directory · meetings · budget visibility · development plan · govt reports.

### 7.3 Screen Spec Template (applied to every screen during build)
For each screen we document: **Purpose · Primary users · Layout (mobile→desktop) · Key interactions · Mobile behavior · Desktop behavior · Animations · Empty/loading/error/offline states · Edge cases · Permissions/scope**. The four reference dashboards already have a complete reference; we extend the template to every screen as it is built (and keep these specs in `Web/docs/screens/`).

---

## 8. DESIGN SYSTEM (extracted from `reference/styles.css` — the visual source of truth)

### 8.1 Color tokens
Surfaces: `--bg #080808`, `--surface #121212`, `--surface-2 #161616`, `--card #181818`, `--card-hover #1c1c1c`, `--card-elev #1f1f1f`; borders `rgba(255,255,255,.06/.09)`.
Text: `--text #F7F2E8`, `--text-muted #A8A29E`, `--text-dim #6b6660`, `--text-faint #4a4641`.
Brand: `--gold #C6A55C`, `--gold-light #E8D3A0`, `--gold-deep #9c7e3f`, `--gold-glow rgba(198,165,92,.14)`.
Status (each with 12%-alpha bg): success `#22C55E`, warning `#F59E0B`, danger `#EF4444`, info `#60a5fa`.

### 8.2 Spacing, radius, type, elevation, motion tokens
- Spacing scale: 4/8/12/16/20/24/28/32/40/48.
- Radius: 8/12/14/18/pill(999).
- Type: **Inter** (400/500/600/700); base 14px/1.45; scale used by reference: 9–48px with tight letter-spacing on headings.
- Shadows: `--shadow-sm/md/gold`.
- Motion easing: `--ease cubic-bezier(0.22,1,0.36,1)` (the signature NEXLI ease); standard durations 0.15–0.22s (UI), 0.5–1.6s (reveals).

### 8.3 Implementation
All tokens become the theme (CSS custom properties + utility theme). The bespoke component CSS in `styles.css` (donut, line/bar charts, timeline, profile-strip, fee bar, tiles, alerts, badges, pager, transport card, house shield, etc.) is the **canonical seed** — ported into the component layer so fidelity is preserved 1:1, then made responsive-perfect.

---

## 9. COMPONENT LIBRARY — the "NEXLI UI Kit"

Built once, used everywhere; each is mobile-first, themeable, accessible, animated, with explicit loading/empty/error states.

**Shell:** `AppShell`, `Sidebar` (+drawer), `BottomNav`, `TopBar`, `Greeting`, `GlobalSearch/CommandPalette`, `ContextSwitcher` (school/child/term), `QuickActions`, `FAB`, `PageHeader`, `Footer`.
**Surfaces:** `Panel` (+head/action/footer-link), `KPICard`, `StatTile`, `SectionCard`, `Sheet/Drawer`, `Modal/Dialog`, `Popover/Menu`, `Tooltip`.
**Data:** `DataTable` → **responsive: table on ≥768, stacked cards on mobile** (this fixes the reference's horizontal-scroll tables), `Pager`, `Filters/SearchBar`, `Tabs`, `Accordion`, `Timeline`, `ActivityFeed`, `NoticeList`, `AlertList`, `ResultList`, `ExamList`, `TileList`, `ProfileStrip`.
**Charts (hand-rolled SVG, GPU-cheap, animated):** `Donut`, `Ring`, `LineChart`(area+draw), `BarChart`, `Sparkline`, `RadarChart`(HPC), `ProgressBar`(fee), `Heatmap`(feature usage/attendance).
**Inputs:** `Button` (gold/ghost/track/pay variants), `Input/Select/Textarea/DatePicker/FileUpload(drag-drop)/OTPInput/Toggle/Checkbox/Radio/Stepper`, `Form` (RHF+Zod), `Badge`, `DotBadge`, `LiveBadge`(pulse).
**Feedback:** `Skeleton`/`Shimmer`, `Toast`, `EmptyState`, `ErrorState`, `OfflineBanner`, `Confetti/Celebration`, `Spinner`, `ProgressBar`, `Undo` snackbar, **`AILockedOverlay`** (premium glossy "AI coming soon" overlay — see §13A).
**Domain:** `StudentCard`, `FeeSummary`, `AttendanceDonut`, `TimetableGrid`, `TransportTracker`, `HouseShield`, `ConsentCard`, `SOSButton`, `AdmissionsBoard`, `GradebookGrid`, `ReportCard`, `HPCRadar`.

Every component ships with: keyboard support, focus-visible rings, ARIA, reduced-motion fallback, and the `--ease` motion signature.

---

## 10. RESPONSIVE STRATEGY (mobile-first, non-negotiable)

**Target widths:** 320, 360, 375, 390, 412 (phones — incl. Samsung/Vivo/Oppo + iPhone 13/15/17 Pro), 768 (tablet), 1024, 1440, 1920 (desktop). QA matrix includes all nine + landscape + dynamic text scaling + notch/safe-areas.

**Principles:**
1. **Mobile is the design baseline**; desktop is progressive enhancement (opposite of the reference, which we invert).
2. **No horizontal scroll, ever.** `overflow-x: hidden` guarded + every component proven at 320px.
3. **Tables → cards on mobile.** No 720px min-width scrollers. Each row becomes a labeled card with primary info + expandable detail + an actions menu.
4. **Charts scale:** responsive SVG with sensible min sizes; donuts center on mobile; line/bar keep aspect via `preserveAspectRatio`.
5. **Grids collapse predictably:** 6/5-col KPI → 3 → 2 → 1; 3-col panel rows → 1; profile-strip reflows (already in reference, we refine).
6. **Touch:** targets ≥44×44px; spacing for thumbs; bottom-reachable primary actions; swipe gestures (drawer, dismiss, tabs).
7. **Bottom nav + drawer** replace the desktop sidebar on phones.
8. **Fluid type & spacing** via `clamp()`; safe-area insets honored.
9. **Container queries** for components that appear in different column widths.

Breakpoints (refining the reference's 1400/1180/900/540/380): **sm 480 · md 768 · lg 1024 · xl 1280 · 2xl 1536**, plus component-level container queries.

---

## 11. MOTION SYSTEM

**Philosophy:** expensive, intentional, invisible-until-noticed. Motion communicates state and hierarchy; it never blocks or distracts. Signature ease `cubic-bezier(0.22,1,0.36,1)`.

**Catalog (from reference + extensions):** fade-up entrance (staggered KPIs/panels), counter count-up (IntersectionObserver, easeOutCubic), donut/ring sweep, line-chart draw + area fade, bar grow, fee-bar fill, live pulse, card hover lift, button press + gold glow, magnetic primary buttons, 3D tilt on hero cards (subtle, desktop only), skeleton shimmer, page/route transitions (shared-axis), drawer/sheet spring, toast slide, success checkmarks, **achievement/streak celebrations** (students), notification pop, dropdown reveal, kinetic/inertial scroll where native.

**Performance rules (mandatory):** animate only `transform`/`opacity`/`filter`; `will-change` used sparingly; no layout-thrashing properties; `content-visibility` for offscreen; GPU compositing; rAF for JS-driven motion; **respect `prefers-reduced-motion`** (degrade to instant/opacity). Budget: nothing drops below 60 FPS on a 2019 mid-range Android.

---

## 12. ACCESSIBILITY SYSTEM (WCAG 2.1 AA minimum — spec §9.4)

- Full **keyboard navigation** + visible focus (`:focus-visible` gold ring), logical tab order, focus trapping in modals/drawers, skip-to-content.
- **Screen-reader** support: semantic landmarks, ARIA roles/labels/live-regions (alerts, toasts, async results), accessible names on icon buttons.
- **Contrast**: ivory-on-obsidian and gold combinations validated to AA; status never conveyed by color alone (icon + text + shape) → **color-blind safe** (no red/green-only).
- **Reduced motion** mode; **text scaling** to 200% without breakage; adjustable density.
- **i18n a11y**: correct `lang`, RTL-ready primitives, translated ARIA labels.
- **Forms**: inline validation announced, errors associated to fields, never error-by-color-only.
- Automated (axe) + manual SR testing in the QA gate.

---

## 13. INTERACTION SYSTEM (dopamine engineering — spec brief)

- **Optimistic UI** for high-frequency actions (attendance, homework) with rollback on failure.
- **Offline-first UX:** clear offline banner, queued actions with sync indicator, conflict resolution, **30-second undo** on destructive/accidental actions (spec §9.6).
- **Smart defaults & auto-save** (spec §9.5): pre-fill known values, never lose drafts; attendance ≤ 3 screens; parent payment ≤ 4 steps.
- **Progress & reward (without being childish):** completion %, streaks, milestones, animated insights, smart celebrations for students; calm confirmations for staff/parents.
- **Feedback for everything:** hover/press states, loading skeletons + shimmer, success animations, contextual toasts with actions, empty states that teach.
- **Notifications** (spec §9.7): actionable + deep-linked, ≤5/day normal, emergencies bypass; per-user channel prefs (cannot opt out of safety alerts).
- **Command palette** (⌘K) for power users; **quick actions** everywhere create-heavy.

---

## 13A. AI STRATEGY — full UX now, providers later (CONFIRMED)

Every AI opportunity in the spec (§8) is **fully designed and built as a first-class part of the product** — navigation items, screens, widgets, insight panels, prediction modules, recommendation engines, automation screens, workflows, data structures, integration points, and permissions. These surfaces must feel **production-ready**, not stubbed.

**But no AI provider/API/model/SDK is integrated at this stage.** Rules:
- **No** AI provider, API, model, or external AI service.
- **No** free AI APIs, **no** temporary providers, **no** mock AI responses, **no** simulated AI behavior.
- Build clean **integration seams** so production AI can be added later **without redesigning** the app (typed service interfaces, data shapes, callable-function stubs, feature-flagged AI modules).

**The "coming soon" experience:** on every AI-powered page/feature/widget/assistant/insight/prediction/recommendation/automation surface, the **primary content area** is covered by a **premium, elegant, glossy blurred overlay** (Obsidian/Gold, intentional and polished — never broken/empty/unfinished) showing:

> *"AI features are currently in development and will be released in a future update. Please keep an eye on announcements from the Super Admin for upcoming AI capabilities."*

**Implementation:** a single `AILockedOverlay` component (frosted/blurred backdrop over the real, fully-built UI beneath it + gold AI glyph + the message). It is driven by a global `aiEnabled` feature flag (per §16 feature flags) so flipping it on later reveals the already-built surfaces. AI surfaces are tagged in the navigation manifest so they render with a subtle "AI" marker. The Super Admin feature-flag panel is where AI will eventually be enabled (matching the message's reference to Super Admin announcements).

---

## 14. TECHNOLOGY STACK (CONFIRMED)

> Decisions locked with the user: **React + Vite PWA**, **Tailwind + ported NEXLI tokens/components**, **AI fully designed but provider-less (see §13A)**, **Web/PWA now → Capacitor later**. Backend (Firebase + ImageKit) is fixed by the spec.

**Frontend (confirmed):** **React (latest) + TypeScript + Vite**, shipped as an **installable PWA** (client-rendered SPA).
*Why over Next.js:* this is a behind-login, real-time, offline-first dashboard — no SSR/SEO needs; a client SPA on the Firebase Web SDK is lighter, simpler, and a better fit (smaller runtime, perfect offline persistence, route-level code-splitting). *Why over SvelteKit:* React wins on ecosystem, hiring, shadcn/ui + tooling for a long-lived "billion-dollar" product; with disciplined code-splitting + CSS-driven motion it hits the same low-end-device performance. (Svelte remains the alternative if absolute smallest bundle is the top priority.)

**Supporting libraries:**
- Routing: React Router (data router) with lazy per-module routes.
- State: Zustand (UI/global) + custom Firestore real-time hooks; TanStack Query for callable-function/REST data.
- Styling (confirmed): **Tailwind (latest) themed with NEXLI tokens + a ported `@layer components` carrying the bespoke reference CSS** — preserves reference fidelity 1:1 + adds utility velocity.
- Motion: CSS transforms/transitions first; **Motion One** (tiny, WAAPI) for orchestrated/spring; no heavy runtime motion lib on low-end paths.
- Charts: hand-rolled SVG (reuse reference approach) → buttery + tiny.
- Icons: inline SVG sprite + `Icon` component (Feather-style set already used in reference).
- Forms/validation: React Hook Form + Zod.
- i18n: i18next (English, Hindi + 10 regional languages — lazy-loaded locales).
- Firebase: **JS SDK (modular)**, offline persistence, App Check.
- Tooling: TypeScript strict, ESLint, Prettier, Vitest + Testing Library, Playwright (e2e later), `vite-plugin-pwa` (Workbox).

**Backend (fixed by spec §14):** Firebase **Authentication** (email/pass + phone OTP + MFA for privileged roles) · **Firestore** (Native, India region, multi-tenant) · **Cloud Functions** (TS; automation, import, payroll, broadcasts, scheduled compliance, AI batch) · **ImageKit** (all images via CDN; private key only in Functions). Firebase Storage **not used now** (deferred per spec). Hosting: **Firebase Hosting** (default; integrates with Functions + India CDN).

**Native apps (`Android/`, `Ios/`):** out of scope for this build; the React PWA can be wrapped with **Capacitor** later to ship to stores from the same codebase — a key reason for the SPA choice.

**Project structure (Web/):**
```
Web/
  index.html · vite.config.ts · tailwind theme · firebase.json · .firebaserc
  firestore.rules · firestore.indexes.json
  src/
    main.tsx · app/(router, providers, shells, guards)
    design-system/(tokens + NEXLI UI Kit)
    features/(platform, sis, academics, attendance, fees, hr, comms,
             transport, hostel, medical, security, canteen, assets,
             compliance, analytics, special, parent, student)
    lib/(firebase, auth, firestore-hooks, rbac, i18n, imagekit, utils)
    routes/ · types/ · locales/
  functions/(TypeScript Cloud Functions)
  docs/screens/(per-screen specs)
```

---

## 14A. CONFIRMED OPERATING CONSTRAINTS (free-tier phase — approved 2026-06-06)

These user-approved constraints govern the initial build. Everything paid is **architected-for but not required now** (clean seams, no redesign later). Full backend detail in `FIREBASE_SETUP.md §0`.

| Area | Initial build (free) | Seam for later |
|---|---|---|
| **Firebase plan** | Spark (free), project `nexli-erp`, Firestore **India region** | Blaze when scaling |
| **Auth** | Email/Password (staff) + **Phone OTP (parents, no password)**; no SMS MFA | MFA toggle; SSO |
| **RBAC** | Role/scope in **protected Firestore profile docs**, enforced by security rules via `get()` (no custom claims yet) | Cloud Function mirrors roles → custom claims (perf) |
| **User provisioning** | Staff create accounts via **secondary Auth app instance** (sets initial password, no admin logout) | Admin-SDK Cloud Function |
| **Passwords** | Students/parents **cannot** change own password; only `user.password.manage` roles (Coordinator, CS HOD, School Admin, Principal, IT Admin). Student reset via local Admin script | Cloud Function secure reset |
| **Cloud Functions** | **None deployed**; integration points documented; local Admin scripts for bootstrap | Deploy on Blaze |
| **Payments** | **No gateway.** School QR images + bank details (Accounts-managed); parents pay offline; staff record + receipt | Razorpay/Stripe/UPI + auto-reconciliation |
| **Notifications** | **In-app only** (real-time center) + Announcements + Notice Board + Parent Comms; info cards for future channels | WhatsApp/SMS/Email/FCM push |
| **Images** | ImageKit (profile photos + QR) as URLs; **initials-on-gradient fallback** + upload UI behind config flag (ImageKit keys pending) | Free signing endpoint (CF Workers/Vercel) |
| **Maps/GPS** | **Leaflet + OpenStreetMap** (no key) + driver PWA geolocation → Firestore real-time | Google Maps / GPS hardware / routing API |

**Forms rule (your requirement, overrides any modal-form pattern):** all **major data-entry** flows are **dedicated routed pages**, never modals/drawers/slide-overs/overlays — e.g. Add/Edit Student, Add/Edit Teacher, Add/Edit Staff, Admissions, Fee Configuration, Transport Setup, Hostel Setup, Exam Creation, Timetable Creation. **Modals are only for small actions:** confirmations, quick previews, warnings, simple single-field updates. (Dedicated pages are far more reliable across devices and mobile layouts.) This is reflected in routing (`/students/new`, `/students/:id/edit`, …) and in the component library (`Modal` is intentionally minimal-scope).

---

## 15. DATA ARCHITECTURE (Firestore — spec §14.1, §14.4)

**Multi-tenant isolation:** every document lives under a `schoolId` path/field; rules enforce a user can only touch their `schoolId` (no app bug can leak cross-school data). Collections (per spec):
```
/nexli_platform/{schools, subscriptions, platform_announcements, audit_log, plans, feature_flags, settings}
/schools/{schoolId}/{students, staff, attendance/{date}/{classId},
   grades/{termId}/{subjectId}, fees/{studentId}, timetable/{year},
   announcements, communication, medical/{studentId} (restricted),
   counseling/{studentId} (highly restricted), compliance, transport,
   hostel, import_history, admissions, library, hr, payroll, events,
   visitors, pocso (CPO-only), consent, assets, facilities, canteen, ...}
```
**Principles:** indexed queries only (composite indexes for attendance-by-date+class, fees-by-student+status, students-by-grade+section, staff-by-dept+role); pagination ≤100/query; real-time listeners for live data, Cloud Functions for batch; **offline persistence on**; **versioning** (`lastModifiedAt/By`, `version`, `_history` subcollection on critical records).

---

## 16. SECURITY & RBAC MODEL (spec §10, §14)

- **Custom claims** carry identity for rules: `{ role, schoolId, scope, perms }`. `super_admin` claim assignable only by project owner (bootstrap script). School-admin claim `{role:"school_admin", schoolId}` limits to one tenant.
- **Firestore rules:** deny-by-default; school-scoped reads/writes; **medical** → nurse/doctor/principal only; **counseling** → counselor/principal (logged); **POCSO** → CPO/principal (co-auth); Super Admin can read school config/aggregates but **never** student/medical/counseling/POCSO data.
- **Auth:** MFA enforced for Super Admin, Principal/IT Admin, Chief Accountant; phone-OTP for parents; lockout policy; session expiry.
- **App Check** (reCAPTCHA) protects Firestore/Functions from abuse.
- **Audit logging:** immutable append-only logs (read/write/export/delete with user/role/time/IP); DPO full read; anomaly alerts; 5-year retention.
- **Data governance:** India-only hosting (DPDP), encryption at rest/in transit, sensitive vault separation, retention/deletion schedules, breach protocol (72h DPBI), consent gating before processing.
- **Comms guardrails:** message matrix enforced server-side; banned patterns blocked (no student↔student, no teacher↔student private, no parent↔parent, no bulk PII export).

---

## 17. PERFORMANCE BUDGET

- Initial route JS ≤ ~150KB gzip (code-split per module); total PWA install footprint small (spec target < 30MB app).
- Dashboard interactive < 3s on 3G; critical workflows usable on 2G.
- 60 FPS animations on 2019 mid-range Android; no main-thread jank > 50ms on interactions.
- Images via ImageKit with width/format params; lazy-load offscreen; `content-visibility`.
- Lighthouse: Performance / Accessibility / Best-Practices / PWA all ≥ 90 (target 95+) on mobile.

---

## 18. PWA & OFFLINE

Installable (manifest, icons, splash, theme-color obsidian), offline app shell + cached read data (today's timetable, roster, pending assignments), **offline attendance** queue with auto-sync + conflict resolution, background sync, push notifications (FCM) for alerts. SMS/WhatsApp remain the guaranteed channels for emergencies (server-side via Functions).

---

## 19. INTERNATIONALIZATION

English + Hindi + Marathi, Tamil, Telugu, Kannada, Gujarati, Bengali, Malayalam, Punjabi, Odia, Assamese (spec §9.4). Lazy-loaded locale bundles; locale-aware number (Indian grouping util already in reference), date, currency; per-user preferred language drives UI + outbound comms + report cards. RTL-ready primitives.

---

## 20. BUILD SEQUENCE (complete vision — staged, not an MVP)

Each phase is fully built (UI + data + rules + tests + responsive/a11y/perf passes) before moving on; nothing is left as placeholder.

- **P0 — Foundation:** repo scaffold (Vite+TS+PWA), design tokens, **NEXLI UI Kit** (every component matching reference, mobile-perfect), shells (sidebar/drawer/bottom-nav/topbar), motion + a11y + responsive primitives, i18n scaffold, navigation manifest.
- **P1 — Firebase core:** init + App Check, auth flows (email/pass, phone OTP, MFA), custom-claims/RBAC, Firestore data layer + security rules + indexes, offline persistence, error/telemetry plumbing, Super Admin bootstrap.
- **P2 — Platform (Super Admin):** entire §12 (dashboard, registry, onboarding wizard, subscriptions, plans, feature flags, analytics, system health, announcements, impersonation, audit).
- **P3 — School backbone:** SIS (profile/admissions/import/TC), academic structure (grades/sections/subjects/houses/rooms), timetable, staff/HRMS.
- **P4 — Daily drivers:** Attendance (offline), Gradebook/Assessment, Homework, Announcements/Communication, **Principal / Teacher / Parent / Student dashboards** (the four reference screens + their sub-pages, mobile-perfected).
- **P5 — Finance:** Fees + payments + concessions + hardship, Expense/Procurement, Payroll.
- **P6 — Operations & safety:** Transport (GPS/SOS), Hostel (+night protocol), Medical/Clinic, Visitor/Gate (+blacklist), Canteen, Assets/Facility.
- **P7 — Compliance & governance:** Compliance calendar, UDISE+, RTE (+reimbursement), POCSO/Grievance, Consent/DPDP, DPO dashboards, audit, SMC, ICC.
- **P8 — Intelligence & delight:** Analytics (academic/financial/command), HPC, Custom Report Builder, Events, Alumni (+career), **all AI surfaces fully built with provider-less "coming soon" overlay + integration seams (§13A)**, achievements/dopamine layer.
- **P9 — Hardening:** full cross-breakpoint QA (320→1920), 60 FPS audits on low-end, WCAG AA audit, security review, performance-budget enforcement, content/empty/error/offline polish.

---

## 21. DEFINITION OF DONE (per screen / per phase)

A screen is done only when: matches reference quality; perfect at all 9 widths with no horizontal scroll/overflow; keyboard + SR accessible; AA contrast; reduced-motion safe; loading/empty/error/offline states present; permissions/scope enforced in UI **and** rules; optimistic + undo where relevant; 60 FPS interactions; i18n-wired; screen spec recorded.

---

---

## 22. CONTINUITY & DISASTER-RECOVERY SYSTEM

To survive crashes / power loss / lost sessions, two checkpoint files are maintained throughout development:
- `Web/context/context-YYYY-MM-DD-HH-MM.md` — live project state: implementation status; completed / in-progress / pending modules; architecture, design-system & Firebase decisions; folder-structure summary; key notes; assumptions; known issues; next recommended actions.
- `Web/resume/resume-prompt-YYYY-MM-DD-HH-MM.md` — a complete senior-engineer handoff prompt: lets a brand-new Claude Code session understand state, read the latest context + the spec, and continue from the exact stopping point.

**Cadence:** updated at frequent checkpoints (~every 10 minutes of active work and at every milestone), and always refreshed before ending a working turn — so the newest timestamped pair always reflects current reality. (Authoring requires reasoning about state, so this is produced by the assistant at checkpoints rather than a blind background copy.) Files are kept concise, accurate, and continuously current; the latest timestamp is the source of truth.

---

*End of Master Build Plan. See `FIREBASE_SETUP.md` for the exact backend configuration required before implementation begins.*
