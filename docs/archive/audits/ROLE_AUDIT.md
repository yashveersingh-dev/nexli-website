# NEXLI — Role & Operations Audit (Indian K-12 School OS)

**Prepared:** 2026-06-14
**Scope:** CBSE, ICSE/CISCE, State-board; day & boarding/residential; pre-primary → senior secondary (K-12).
**Method:** Primary research against CBSE Affiliation Bye-Laws, school handbooks, published JDs, hostel manuals, transport SOPs, DPDP Act 2023/Rules 2025, and ERP feature sets. Sources cited inline and in the appendix.

> **How to read this:** "Owner" = day-to-day operator who creates/edits records. "Reviewer" = monitors/reads, does not operate. "Approver" = gates a workflow (sign-off). The five-column model — **CREATE / EDIT / APPROVE / REVIEW / NEVER** — is the permission contract NEXLI should enforce.

---

## 1. Executive Summary — Biggest Realism Gaps & Prioritized Fixes

NEXLI's current role-ownership map is broadly sensible but has **structural realism gaps** that will be immediately obvious to any Indian school administrator evaluating the product. The eight highest-impact issues, in priority order:

| # | Gap | Why it's wrong (India-grounded) | Fix |
|---|-----|--------------------------------|-----|
| **P0-1** | **No multi-role support** | The single most common staffing reality in Indian schools. A person is routinely Subject Teacher **+** Class Teacher **+** HOD; a VP still teaches 12+ periods; the Librarian takes library periods, class-teachership, invigilation and proxy duties. CBSE Bye-Laws even require the Principal to teach ≥12 periods/week. A one-role-per-user model cannot represent any real school. | Model roles as a **many-to-many assignment with scoped permission union** (see §6). |
| **P0-2** | **Coordinators are too weak** | In Indian schools coordinators are the **operational spine** — they run timetabling, academic ops, student management, admissions support, event approval at section level, and often staff onboarding. Modeling them as glorified teachers is the biggest functional under-build. | Introduce a tiered Coordinator authority set (see §4). |
| **P0-3** | **Cross-class attendance** | Class teacher can currently mark **unrelated** classes. In reality a class teacher marks **only their own class/section** daily register; a subject teacher marks **only their own period** for classes they teach. Cross-class marking corrupts the source of truth. | Scope attendance write to the user's **assigned section / assigned period only** (see §3 attendance, §6). |
| **P0-4** | **Transport manager can create events** | No operational basis. Transport has zero academic/event authority. This is a leaked permission. | Remove events from transport role entirely. |
| **P0-5** | **Accountant sees academic/attendance analytics** | A bursar's world is fees, receipts, reconciliation, expense/procurement, payroll **disbursement**, and statutory filings (TDS/GST/PF/ESI). Per-student marks, learning analytics, and class attendance trends are **irrelevant to their function** and a data-minimization (DPDP) risk. | Strip academic/attendance analytics from accounts roles (see §7c). |
| **P0-6** | **Class teacher can manage canteen** | No operational basis. Canteen is owned by the Canteen Manager/admin. Leaked permission. | Remove canteen from teacher roles. |
| **P1-7** | **Payroll is HR-only / mis-split** | Real practice splits the function: **HR owns** salary *structure*, attendance-to-payroll inputs, statutory *configuration* and compliance; **Accounts owns** the *disbursement* (it is literally the Principal who is the ex-officio **Drawing & Disbursing Officer** under CBSE Bye-Laws); **Principal/VP-Admin approve** each payroll run. | Split payroll into Structure (HR) → Run/Disbursement (Accounts) → Approval (Principal/VP-Admin) (see §7c, §3 payroll). |
| **P1-8** | **Leadership modeled as help desk / over-broad** | Leadership (Principal/VP/Director) should **review everywhere but never daily-operate**, and parents must **not** be able to message the Principal directly as a first step — communication escalates Class Teacher → Coordinator → VP → Principal. | Enforce review-not-operate for leadership; build the escalation model (see §5). |

**Prioritized fix order:** (1) multi-role engine, (2) attendance scoping, (3) coordinator authority, (4) remove the three leaked permissions (transport→events, teacher→canteen, accountant→analytics), (5) payroll split, (6) communication/escalation model, (7) hostel & IT-admin expansion, (8) transport driver-absent SOP.

---

## 2. Per-Role Matrix (all roles)

Legend for the five-column model — **C**reate / **E**dit / **A**pprove / **R**eview / **N**ever. "Scope" notes the boundary (own class, own section, whole school, etc.).

### 2.1 Governance & Leadership

| Role | Reports to / Manages | Core responsibilities | Approval authority | Should CREATE | Should EDIT | Should APPROVE | Should REVIEW | Should NEVER touch |
|------|----------------------|----------------------|--------------------|---------------|-------------|----------------|---------------|--------------------|
| **Chairman / Trustee** | Board/Society; manages Director & Principal via the Managing Committee | Governance, vision, capital decisions, statutory chair of School Managing Committee (SMC) | Capital budgets, major policy, top appointments | Board policies, annual strategic plan | Governance policy | Capital expenditure, fee-structure changes, senior hires | Whole-school dashboards (read-only) | Daily operations, attendance, gradebooks, individual student records |
| **Director / CEO** | Chairman/Board; manages Principal(s), Heads of Function | Multi-campus strategy, finance oversight, HR policy, expansion, vendor master-agreements | Cross-campus budgets, policy, senior appointments | Org policy, cross-campus initiatives | Policy, org structure | Large expenses, payroll runs (final), senior hiring, fee policy | All operational analytics (read-only) | Marking attendance, entering marks, daily operations |
| **Principal / Head of School** | Director/Board; **ex-officio Hon. Secretary of SMC**; manages all staff | Per CBSE Bye-Laws §23: head of office; **Drawing & Disbursing Officer**; staff supervision; admissions, timetable & teaching-load allocation; academic planning; discipline; progress reports; exam **Centre Superintendent** (non-delegable); ≥12 teaching periods/week | Final school-level approver: admissions, results, payroll run, expenses (within delegated limit), discipline, leave | School calendar, policies, official correspondence/returns; (teaches → gradebook for own periods) | Most modules (supervisory edit); own teaching records | Admissions, exam results/HPC, payroll run, expense (limit), events, transport policy, hostel policy, leave | **Everything** (read across all modules) | Should **not be the daily operator** of any module; should not be parents' first-line help desk |
| **Vice Principal (Academic)** | Principal; manages Coordinators, HODs, teachers | Academic operations, curriculum, exams, timetable oversight, teacher supervision, often still teaches | Approves results, academic events, timetable, academic leave | Academic policy, exam schedules; own teaching gradebook | Timetable, exam config, academic records (supervisory) | Exam results/HPC, academic events, timetable changes | Academic + attendance analytics | Fee ledgers, payroll disbursement, transport routes, hostel ops |
| **Vice Principal (Admin)** | Principal; manages admin/support staff, accounts liaison, transport, security, facilities | Administration, finance liaison, HR liaison, transport/security/facility oversight, compliance | Approves expenses (limit), payroll run review, admin events, vendor POs (limit) | Admin policy, notices | Admin/operational records (supervisory) | Expense, payroll run, transport/facility/security ops, non-academic events | Operational + financial analytics | Entering marks, marking class attendance, gradebooks |

### 2.2 Academic Coordination & Teaching

| Role | Reports to / Manages | Core responsibilities | Approval authority | Should CREATE | Should EDIT | Should APPROVE | Should REVIEW | Should NEVER touch |
|------|----------------------|----------------------|--------------------|---------------|-------------|----------------|---------------|--------------------|
| **Senior Coordinator** (Wing/Section head, e.g. Senior School / Headmistress) | VP-Academic / Principal; manages Junior Coordinators + teachers in their wing | Owns academic operations for their wing: timetabling, curriculum delivery, student management, **admissions support**, exam coordination, event approval (section), staff onboarding support, parent escalations | Approves section-level events, timetable within wing, leave for wing teachers (1st level), substitution | Timetable (wing), exam schedules (wing), events (wing), notices, student records (wing) | Timetable, student data, homework/exam config (wing) | Section events, substitutions, teacher leave (1st level), homework plans | Wing academic + attendance analytics | School-wide finance, payroll, transport routes, hostel ops, other wings |
| **Junior Coordinator** (Sub-section / grade-band, e.g. Primary/Middle) | Senior Coordinator; manages a grade band's teachers | Day-to-day academic ops for grade band: substitution, homework oversight, attendance follow-up, event execution, parent first-escalation | Substitution within band, homework approval, minor leave | Substitution, notices, homework (band), event tasks | Timetable (band, limited), homework, student notes | Substitutions, homework completeness | Band attendance & academic data | Finance, payroll, admissions decisions, cross-wing data |
| **HOD (Head of Department)** | VP-Academic / Coordinator; manages subject teachers in dept | Subject-area leadership: curriculum mapping, lesson-plan & assessment review **before Principal**, teacher mentoring, question-paper moderation, dept events; usually **still teaches** | Approves dept lesson plans, question papers, subject events | Curriculum maps, question-paper templates, dept events; own gradebook | Dept curriculum, assessments (review/edit), own teaching records | Lesson plans, question papers, dept events, marks moderation | Dept performance analytics | Other departments' data, finance, payroll, transport, hostel |
| **Class Teacher** | Coordinator / HOD; "owns" one class/section | **Own section only:** daily attendance register, pastoral care, parent first point-of-contact, report-card compilation, discipline log, leave records for their class | None beyond own-class records | Daily attendance (**own section**), report cards (own class), discipline notes (own class), parent communication | Own-section attendance, own-class student notes, report card | (compiles, does not finally approve results) | Own class's full profile | **Other classes' attendance**, canteen, finance, payroll, transport, hostel, other sections' data |
| **Subject Teacher** | HOD / Coordinator | Teach assigned subject across classes; **period attendance for own periods**; homework, marks entry, assessment | None | Homework (own subject/classes), marks (own subject), period attendance (**own periods only**) | Own subject's homework/marks/gradebook | (submits marks; HOD/coordinator moderates) | Own classes' subject performance | Daily class register of classes they don't teach, finance, payroll, canteen, transport, hostel |
| **Substitute / Proxy Teacher** | Coordinator (assigns proxy) | Cover an absent teacher's period: take period attendance, deliver assigned work | None | Period attendance (**assigned proxy period only**), lesson notes | The covered period's attendance only | None | The covered class for that period | The regular teacher's gradebook/marks, any other module |
| **Special Educator** | Coordinator / Counselor / Principal | IEPs, remedial support, inclusion, accommodations, liaison with parents & POCSO/CWC where relevant | Approves accommodations (with Principal) | IEP/SEN records, accommodation plans, progress notes | SEN records, accommodation plans | (recommends; Principal/VP approves accommodations) | SEN students' academic + attendance data | General gradebook of non-SEN students, finance, payroll, transport |
| **Counselor** | Principal / VP-Academic; member of Child Protection Committee | Student well-being, counseling, POCSO/child-protection support, parent counseling, referral | None (advisory) | Confidential case notes, referrals, well-being logs | Own case notes | (advises CPO/Principal) | Pastoral flags (need-to-know) | Open student academic records beyond need-to-know, finance, payroll |

### 2.3 Activities, Library, Labs

| Role | Reports to / Manages | Core responsibilities | Approval authority | Should CREATE | Should EDIT | Should APPROVE | Should REVIEW | Should NEVER touch |
|------|----------------------|----------------------|--------------------|---------------|-------------|----------------|---------------|--------------------|
| **Sports Coordinator** | VP / Coordinator | PE timetable, teams, fixtures, sports events, equipment, sports-day | Sports event proposals, team selection | Sports events, fixtures, equipment requests, team rosters | Sports schedules, rosters | (proposes; Principal/VP approve event) | Sports participation data | Academic gradebook, finance, payroll, transport, hostel |
| **Arts / Activity / Event Coordinator** | VP / Coordinator | Co-curricular/CCA, cultural events, house activities, exhibitions | Event proposals within budget line | Events, activity schedules, participation records | Activity schedules | (proposes; Principal/VP approve) | Activity participation | Academic marks, finance ledgers, payroll, transport, hostel |
| **Librarian** | Coordinator / VP-Academic | Catalog, issue/return, library periods, reading programs; **often also teaches/invigilates/class-teachership** | Fines (per policy) | Catalog records, issue/return, library events, fines; (if teaching → own gradebook) | Catalog, member records, own teaching records | (recommends acquisitions) | Library usage analytics | Other modules unless a **second role** grants it; finance, payroll, transport, hostel |
| **Lab Assistant** | HOD (Science/IT) / Coordinator | Lab prep, equipment, consumables, safety, practical support | Consumable requests | Inventory records, equipment logs, safety checklists | Lab inventory, equipment status | None | Lab usage | Marks, gradebook, finance, payroll, student records |

### 2.4 Administration, HR, Finance, IT, Front Office

| Role | Reports to / Manages | Core responsibilities | Approval authority | Should CREATE | Should EDIT | Should APPROVE | Should REVIEW | Should NEVER touch |
|------|----------------------|----------------------|--------------------|---------------|-------------|----------------|---------------|--------------------|
| **HR Manager** | VP-Admin / Director | Recruitment, onboarding/offboarding, staff records, leave policy, **salary structure & statutory config (PF/ESI/TDS/PT)**, payroll **inputs**, performance, compliance | Approves leave (policy), onboarding, structure changes (with VP) | Staff records, salary structures, leave config, payroll inputs, job postings | Staff master, salary structure, leave records | Leave (within policy), staff onboarding | Staff/HR analytics, staff attendance | **Salary disbursement** (Accounts owns), student academic data, fee ledgers, gradebooks |
| **HR Assistant** | HR Manager | Data entry, document collection, leave logging, staff-attendance capture, onboarding paperwork | None | Staff records (draft), leave entries, staff-attendance records | Draft staff records, leave logs | None | Staff attendance | Salary structure approval, disbursement, student/academic data, finance |
| **Chief Accountant / Bursar** | VP-Admin / Principal (DDO) / Director | **Fee collection & receipts, fee reconciliation, expense & procurement, payroll DISBURSEMENT, statutory filings (TDS/GST/PF/ESI), bank reconciliation, budgets, audit liaison** | Approves receipts, vendor payments (limit), processes disbursement (Principal authorizes) | Fee receipts, expense vouchers, payment entries, statutory returns, budgets | Fee ledgers, expense records, payroll disbursement entries | Receipts, payments (limit) | **Financial** analytics only | **Academic marks, class attendance analytics, learning data, gradebooks, IEPs** |
| **Accounts Clerk** | Chief Accountant | Fee counter, receipt issue, daily cash/bank entries, follow-up on dues, voucher data entry | None | Fee receipts, cash/bank entries, dues reminders | Receipt/voucher drafts | None | Own counter/day-book | Payroll approval, statutory filing sign-off, academic data, student records beyond fee context |
| **IT Administrator** | VP-Admin / Director | **User/account lifecycle & role provisioning, device & lab management, network/Wi-Fi, ERP/LMS admin, data backup, security, CCTV/biometric integration, support tickets, vendor liaison** | Approves account provisioning (per role matrix set by leadership), device allocation | User accounts, role assignments (within leadership-approved matrix), device records, tickets, backup jobs | User/role config, system settings, integrations | Account provisioning, support-ticket resolution, device allocation | System/security logs, audit logs | **Student academic content, marks, fee amounts, payroll figures** (admins system, not data; least-privilege) — should not self-grant business-data access |
| **Front Desk / Reception** | VP-Admin / HR | Visitor log, calls, enquiries, gate pass, courier, leave-slip intake, first-line info, **staff-attendance capture (secondary)** | None | Visitor records, enquiry leads, gate passes, message logs | Visitor/enquiry records | None | Visitor/enquiry data | Academic marks, fee ledgers, payroll, attendance registers, hostel/transport ops |
| **Security Officer / Supervisor** | VP-Admin | Campus security, gate control, visitor verification, CCTV monitoring, incident reports, **staff-attendance/gate capture (secondary)** | None | Incident reports, gate/visitor logs, patrol logs | Security logs | None | Security/CCTV/visitor logs | Academic, finance, payroll, gradebooks, student records |

### 2.5 Transport

| Role | Reports to / Manages | Core responsibilities | Approval authority | Should CREATE | Should EDIT | Should APPROVE | Should REVIEW | Should NEVER touch |
|------|----------------------|----------------------|--------------------|---------------|-------------|----------------|---------------|--------------------|
| **Transport Manager / In-charge** | VP-Admin | Routes, stops, vehicle fleet, driver/conductor roster, GPS, transport fees liaison, safety compliance, **driver-absent SOP** (see §7d), parent transport notifications | Approves route changes, driver substitution, transport leave | Routes, stops, vehicle records, driver roster, transport notices, incident logs | Routes, rosters, vehicle records | Route changes, driver substitution, transport-related leave | Transport analytics (ridership, GPS) | **Events** (current bug — remove), academic data, gradebooks, fee ledgers, payroll, hostel |
| **Bus Driver / Conductor** | Transport Manager | Drive route, student pickup/drop, onboard safety, daily vehicle check, mark transport boarding (conductor) | None | Trip logs, boarding marks (own route), vehicle-check logs | Own trip/boarding logs | None | Own route's roster | All other modules |

### 2.6 Hostel / Boarding (residential schools)

| Role | Reports to / Manages | Core responsibilities | Approval authority | Should CREATE | Should EDIT | Should APPROVE | Should REVIEW | Should NEVER touch |
|------|----------------------|----------------------|--------------------|---------------|-------------|----------------|---------------|--------------------|
| **Chief Warden** | Principal / Director; manages all wardens, matrons, mess & housekeeping | Principal authority over all hostels: room allocation policy, discipline, leave/gate-pass policy, mess oversight, health/safety, staff roster, grievance redressal | Approves leave/gate-pass (final), room allocation, mess contracts (with admin), discipline action | Hostel policy, allocation plan, mess menu approval, discipline records, rosters | Allocation, rosters, policies | **Leave/gate-pass (final)**, room changes, discipline, visitor exceptions | Hostel-wide attendance, health, discipline, mess | Academic gradebook, school finance ledgers, payroll, transport routes |
| **Hostel Warden** (per block/house) | Chief Warden; manages night warden, matron of block | Block operations: room allocation (execute), in/out **gate pass & leave** (approve 1st level), study-hours supervision, discipline, parent/guardian liaison, health escalation | Approves block leave/gate-pass (1st level), minor discipline | Gate passes, leave records, roll-call/attendance, discipline notes, maintenance requests | Block allocation, leave/gate logs, roll-call | Leave/gate-pass (1st level), room change requests | Block roll-call, health, discipline | School academic marks, finance, payroll, transport, other blocks |
| **Night Warden** | Hostel/Chief Warden | **Night roll-call/attendance**, lights-off, night-time security & emergencies, sick-bay escalation, incident logging | None (escalates) | Night roll-call/attendance, night incident logs, sick escalation | Night roll-call records | None | Night roster | Academic, finance, payroll, day-time allocation decisions |
| **Matron** | Hostel/Chief Warden | Pastoral care (esp. younger/girls' hostel), health & hygiene, linen/laundry, sick-bay support, personal needs, dietary flags | None | Health/hygiene logs, sick-bay notes, dietary flags, linen inventory | Health logs, inventory | None | Resident well-being (need-to-know) | Academic marks, finance, payroll, gate-pass approval |

### 2.7 Health, Canteen, Compliance, Stakeholders

| Role | Reports to / Manages | Core responsibilities | Approval authority | Should CREATE | Should EDIT | Should APPROVE | Should REVIEW | Should NEVER touch |
|------|----------------------|----------------------|--------------------|---------------|-------------|----------------|---------------|--------------------|
| **Nurse / Doctor** | Principal / Chief Warden (hostel) | Infirmary/sick-bay, first aid, health checks, medical records, immunization, emergency response, health reports to parents | Medical decisions (within scope) | Medical records, infirmary logs, health-check data, medication logs | Medical records | (medical sign-off) | Student health data (need-to-know) | Academic marks, finance, payroll, discipline, gradebooks |
| **Canteen Manager** | VP-Admin | Menu, hygiene/FSSAI compliance, stock, vendor, billing, allergy/dietary flags | Menu, stock orders (limit) | Menu, stock records, vendor/billing, hygiene logs | Menu, stock | None | Canteen sales/stock | Academic, finance ledgers (beyond canteen), payroll, student records — and **class teachers must NOT own canteen** (current bug) |
| **DPO (Data Protection Officer)** | Board/Director (independent line) | DPDP Act 2023 compliance: verifiable parental consent, DPIA, breach response, data-subject requests, vendor DPAs, retention/minimization; required if school is a **Significant Data Fiduciary** | Approves data-processing changes, consent flows, breach response | Consent records, DPIA, breach logs, RoPA, DPA register | Consent config, retention policy, privacy notices | Data-processing/consent changes, breach handling, vendor DPAs | All data-flow/audit logs (compliance read) | Should not be a routine data operator; not academic/finance operations |
| **Child Protection Officer (CPO)** | Principal / Board; chairs Child Protection Committee | POCSO compliance, receive & act on disclosures, mandatory reporting to CWC/Police, training, safeguarding policy, background-verification oversight | Approves safeguarding actions, reporting | Safeguarding case records, training logs, policy | Safeguarding records | Mandatory reporting actions, safeguarding measures | Safeguarding flags (confidential) | Routine academic/finance data; non-safeguarding student data |
| **Parent** | — (stakeholder) | View own child's data, pay fees, give consent, communicate via **class teacher first**, apply leave, view transport/hostel status | Consent (own child), fee payment | Leave requests (own child), messages (to class teacher), consent | Own contact details, consent | (gives consent — not staff approval) | **Own child only**: attendance, marks, fees, transport, hostel, health | Any other child's data, staff data, school operations, direct Principal messaging as first step |
| **Student** | — (stakeholder) | View own timetable/homework/marks/attendance, submit work, hostel/leave requests (per age policy) | None | Submissions, leave requests (per policy) | Own profile (limited) | None | **Own** academic/attendance/hostel data | Any other student's data, staff/operational data |

---

## 3. Module-Ownership Correction Table (current vs correct)

| Module | Current (owners / secondary / reviewers / approvers) | **Correct** per real Indian-school practice | Change needed? |
|--------|------------------------------------------------------|---------------------------------------------|----------------|
| **Student attendance** | owners: class_teacher; secondary: substitute/subject_teacher; reviewers: leadership | owners: class_teacher (**own section daily register only**); subject_teacher (**own period only**); substitute (**assigned proxy period only**); reviewers: coordinator → VP → principal | **YES** — add hard scoping: a class teacher must not write attendance for sections they aren't assigned; subject/period writes confined to assigned periods. (Current allows cross-class — bug.) |
| **Staff attendance** | owners: hr_manager/hr_assistant; secondary: front_desk/security; reviewers: principal/vp_admin | Same. owners: HR; secondary capture: front_desk/security/biometric; reviewers: VP-Admin/Principal | No (correct). |
| **Homework / Gradebook** | owners: teachers; reviewers: leadership | owners: subject_teacher (**own subject/classes only**); moderated by HOD; reviewers: coordinator/VP-Academic | Minor — add HOD as moderator/reviewer; scope to teacher's own classes. |
| **Examinations / HPC** | owners: coordinators/HOD/teachers; approvers: principal/vp_academic | owners: exam/academic **coordinator** (build), HOD (question papers/moderation), teachers (marks entry, own subject); approvers: VP-Academic → Principal (results); Principal is exam **Centre Superintendent** (non-delegable) | Minor — formalize coordinator as primary builder; flag Centre-Superintendent as Principal-only. |
| **Timetable** | (not explicit) | owner: **Timetable/Exam Coordinator** or a small delegated team (e.g. 2 IT/senior teachers); editable by Senior Coordinator (wing); approver: VP-Academic/Principal; substitution editable by Junior Coordinator | **YES** — add explicit Timetable owner + delegated-editor team + substitution sub-permission (see §4, Q5). |
| **Library** | owner: librarian | owner: librarian (+ teaching role if assigned via multi-role) | No. |
| **Medical** | owner: nurse/doctor | owner: nurse/doctor; hostel context → reports to Chief Warden | No. |
| **Visitor** | owners: security/front_desk | Same | No. |
| **Canteen** | owner: canteen_manager/staff | owner: canteen_manager/staff **only** | **YES** — remove canteen from class-teacher/teacher roles (current bug: class teacher can manage canteen). |
| **Facility** | owner: estate_manager (+accounts secondary) | owner: estate/facility manager; accounts secondary for procurement/payment; VP-Admin reviewer | No (correct). |
| **Fees** | owners: chief_accountant/accounts_clerk | owners: chief_accountant/accounts_clerk; reviewers: VP-Admin/Principal | No (correct) — but ensure **academic/attendance analytics are NOT exposed** to these roles. |
| **Expense / Procurement** | owners: chief_accountant/accounts_clerk; approvers: vp_admin/principal | Same | No. |
| **Payroll** | owners: hr_manager/chief_accountant; reviewers: principal/vp_admin | **Split:** HR owns *structure + statutory config + inputs*; Accounts owns *disbursement*; **Principal/VP-Admin APPROVE each run** (Principal is ex-officio DDO). Reviewers ≠ approvers here. | **YES** — split structure vs disbursement; make payroll-run an explicit approval gate (see §7c, Q7). |
| **Events** | owners: academic_coordinator/sports_teacher/arts_teacher/hod; approvers: principal/vp_admin | owners: coordinators/sports/arts/HOD; approvers: VP/Principal (section events can be approved by Senior Coordinator) | **YES** — **remove events from transport_manager** (current bug). Add Senior Coordinator as section-event approver. |
| **Transport** | owner: transport_manager | owner: transport_manager (+ driver-absent SOP workflow); reviewers: VP-Admin | **YES** — strip events permission; add driver-absent SOP (§7d). |
| **Hostel** | owners: chief_warden/hostel_warden | owners: chief_warden (policy/final) + hostel_warden (block) + night_warden (night roll-call) + matron (care) + mess; approvers: chief_warden (leave/gate final) | **YES** — expand role set & workflows (§7a). |
| **Compliance / UDISE / RTE / Consent / SEN / SMC / Alumni** | various | UDISE/RTE: admin/principal; **Consent: DPO**; SEN: special educator/counselor; SMC: principal (ex-officio secretary); Child-protection: CPO; Alumni: admin/coordinator | Partial — assign **DPO** as consent owner; **CPO** as safeguarding owner; keep least-privilege. |
| **Leadership (principal, vp_*, director, regional/cluster_director)** | review everywhere, never daily-operate | Correct — **but** Principal retains specific *operate* rights where law requires (DDO/payroll authorization, Centre Superintendent, ex-officio SMC secretary) and may teach (own gradebook) | Minor — leadership is review-by-default with named legal exceptions. |

---

## 4. Coordinator Authority Spec (Senior vs Junior; categories)

Indian schools run on coordinators. They are **not** "teachers with a title" — they own academic operations at a section/wing level. Common naming: **Headmistress / Wing Coordinator / Section Coordinator** for pre-primary, primary, middle, senior; sometimes **Exam Coordinator, Activity Coordinator, Admission Coordinator** cut across.

### Authority categories (what coordinators actually control)
1. **Timetabling** — build/edit the wing timetable, assign teaching loads, daily **substitution**.
2. **Academic operations** — curriculum delivery oversight, homework/lesson-plan review, assessment scheduling, exam coordination.
3. **Student management** — section student records, movement between sections, discipline (minor), pastoral escalation.
4. **Admissions support** — process applications, schedule interactions, recommend (final decision = Principal).
5. **Events** — propose & (senior) approve section-level events.
6. **Staff support** — onboarding support, 1st-level teacher leave, proxy assignment.
7. **Parent communication** — middle tier of the escalation chain (§5).

### Senior vs Junior

| Capability | **Senior Coordinator** (Wing/Section head) | **Junior Coordinator** (grade-band) |
|------------|--------------------------------------------|-------------------------------------|
| Timetable | Create/edit wing timetable; approve changes | Substitution only; limited edit |
| Teacher leave | Approve (1st level) | Recommend; approve minor/proxy |
| Events | **Approve** section events | Propose; execute |
| Admissions | Process + recommend; schedule | Support/data-entry |
| Student records | Full (wing); section transfers | Band-level edit |
| Discipline | Minor action; escalate serious | Log; escalate |
| Staff onboarding | Support + recommend | Paperwork support |
| Parent escalation | 2nd tier (above class teacher & junior) | 1st escalation above class teacher |
| Finance / payroll / transport / hostel | **None** | **None** |

**Permission set name suggestion:** `coordinator.senior` (wing-scoped) ⊃ `coordinator.junior` (band-scoped). Scope is always **bounded to assigned wing/band** — a senior coordinator of "Primary" cannot edit "Senior School" data.

---

## 5. Communication-Hierarchy / Escalation Spec

**Principle:** Leadership is **not a public help desk.** Parents/students enter at the bottom of the chain; issues escalate only if unresolved. This mirrors Indian grievance-redressal practice (school-level → zonal committee) and standard parent-communication protocols.

```
Parent / Student
      │  (routine: academics, attendance, behaviour, homework)
      ▼
1. Class Teacher           ← default & mandatory first contact
      │  (unresolved / cross-subject / cross-class)
      ▼
2. Coordinator             ← Junior → Senior (wing/section)
      │  (unresolved / policy / multi-section)
      ▼
3. Vice Principal          ← Academic (academics) or Admin (fees/transport/admin)
      │  (unresolved / serious / cross-function)
      ▼
4. Principal               ← final school-level authority & grievance owner
      │  (statutory / safeguarding / unresolved)
      ▼
5. Management / SMC / External (CPO→CWC for POCSO; Zonal Grievance Committee)
```

**Routing rules NEXLI should enforce:**
- A parent message defaults to the child's **class teacher**; the UI should **not** offer "Message Principal" as a first action.
- Each tier has an **SLA + escalate button**; if unanswered in N days, auto-surface to the next tier (don't auto-jump tiers blindly — surface, log, and let the next tier pick up).
- **Topic-based routing:** fees → Accounts queue (via VP-Admin), transport → Transport Manager, hostel → Warden, safeguarding → CPO (confidential, bypasses normal chain).
- Leadership inboxes are **escalation queues + read dashboards**, never the default destination.
- Maintain an **audit trail** of who handled/escalated each thread (supports grievance compliance).

---

## 6. Multi-Role Model Recommendation

**Why it's non-negotiable:** Multi-role is the *normal* state in Indian schools — Subject Teacher + Class Teacher + HOD on one person; VP who still teaches 12 periods; Librarian who also has class-teachership, invigilation and proxy periods; coordinators who teach. CBSE Bye-Laws even mandate the Principal teach ≥12 periods/week. A single-role model is unusable.

### Data model
- **Identity (User)** ── *has many* ──> **RoleAssignment**
- Each **RoleAssignment** = `{ role, scope, validFrom, validTo, assignedBy }`
  - `role`: e.g. `subject_teacher`, `class_teacher`, `hod`, `coordinator.senior`, `librarian`, `warden`…
  - `scope`: the boundary object(s) — section(s), class(es), subject(s), wing, department, hostel block, route. **This is what kills cross-class bugs.** A `class_teacher` assignment carries `scope = {section: "VI-B"}`; the user can only write that section's register.
- **Effective permissions = UNION of all active RoleAssignments' permission sets, each clipped to its own scope.**
  - Example: Asha = `subject_teacher{Maths, classes VI–VIII}` + `class_teacher{VI-B}` + `hod{Maths dept}`.
    - She can: enter Maths marks for VI–VIII; mark VI-B's daily register; mark her own Maths periods; moderate Maths dept marks. She **cannot** mark VII-A's daily register (no class-teacher scope there) or touch finance.

### Permission resolution rules
1. **Additive union** of grants across roles.
2. **Scope is intersective** — a grant only applies within its assignment's scope; no scope = no access (deny-by-default).
3. **Explicit denies win** (e.g., a `NEVER` from the matrix — accountant→academic-analytics — is a hard deny even if some future role would grant it).
4. **Conflict logging** — if two roles imply different approval levels, take the higher and log it.

### Assignment workflow (governance)
- **Only Principal / VP (or Director for cross-campus) can create, edit, expire role assignments.** HR can *propose*; leadership *approves*. IT Admin *provisions the account* but operates **within the leadership-approved role matrix** — IT cannot self-grant business roles.
- Assignments are **time-bound** (`validFrom/validTo`) so a "substitute for this week" or "acting HOD this term" naturally expires.
- Every assignment is **audited** (`assignedBy`, timestamp) — supports DPDP accountability and internal audit.
- Provide a **"View effective permissions"** screen per user so leadership can see the union before approving.

---

## 7. Detailed Expansion Specs

### 7a. Hostel / Boarding Expansion Spec

**Role set:** Chief Warden → Hostel Warden (per block/house) → Night Warden + Matron; plus Mess Manager/Mess Committee, Housekeeping, Nurse/Doctor (shared), Security (gate).

**Core workflows to build:**
1. **Room/Bed allocation** — bed-level chart by block/floor; room-change request → warden approve → chief warden confirm; roommate/compatibility flags.
2. **In/Out Gate Pass & Leave** — application by **parent or student** → **warden approval (1st level)** → **chief warden (final for extended/overnight)** → **gate enforcement** (security verifies pass) → **parent notification at exit and return**. Guardian/authorized-pickup verification.
3. **Roll-call / Hostel Attendance** — multiple roll-calls/day; **night warden owns the night roll-call**; mismatch triggers alert/escalation.
4. **Visitor / Guardian** — visiting-hours register, authorized-visitor list, exceptions approved by warden/chief warden.
5. **Mess** — daily menu, per-student **dietary flags** (veg/Jain/no-onion-garlic/allergy) surfaced on kitchen dashboard; mess attendance/billing; mess committee feedback.
6. **Discipline** — incident log → warden (minor) → chief warden (serious) → Principal; parent notification.
7. **Health** — sick-bay/infirmary log, medication, doctor escalation, parent notification; matron daily wellness.
8. **Inventory** — furniture/appliances/linen tracking, maintenance requests.

**Permission scoping:** every hostel role is **block-scoped** (a warden of Block A can't operate Block B); chief warden is house/whole-hostel; none touch academic gradebook, school finance, payroll, or transport routes.

### 7b. IT-Admin Expansion Spec

Real responsibilities to model as IT Admin permissions:
1. **User & account lifecycle** — create/disable accounts on joining/leaving; password/MFA resets.
2. **Role provisioning** — assign roles **only within the leadership-approved role matrix** (IT executes, leadership authorizes); cannot self-elevate to business data.
3. **Device & lab management** — asset register, lab machines, projectors, tablets, allocation/return.
4. **Network** — Wi-Fi, switches, internet, content filtering.
5. **ERP/LMS admin** — system config, integrations, module enablement, academic-year rollover.
6. **Data backup & restore** — scheduled backups, restore drills, retention.
7. **Security** — access logs, audit logs, incident response; **least-privilege enforcement**.
8. **CCTV / biometric integration** — feed health, device mapping, attendance-device sync (operates the *integration*, not the HR decisions).
9. **Support tickets** — L1 triage, resolution, escalation to vendor.

**Critical boundary:** IT Admin **administers the system, not the business data.** They should **not** read student marks, fee amounts, or payroll figures as a matter of routine (least-privilege; DPDP minimization). Any break-glass access is logged and time-boxed.

### 7c. Accountant / Bursar Scope Spec

**Owns (CREATE/EDIT/APPROVE within limit):**
- Fee collection, **receipts**, fee **reconciliation**, dues tracking, refunds.
- **Expense & procurement** vouchers, vendor payments (within delegated limit).
- **Payroll DISBURSEMENT** (the payout step — *after* HR provides structure/inputs and *after* Principal/VP authorizes the run; Principal is ex-officio **Drawing & Disbursing Officer**).
- **Statutory:** TDS, GST, PF, ESI, Professional Tax — computation, deduction, returns, challans.
- **Bank/cash reconciliation, budgets, audit liaison** (internal + external auditors), financial reports to management/SMC.

**Must NOT see (hard NEVER):**
- **Student academic marks / gradebooks / HPC details.**
- **Class/section attendance analytics & learning analytics.**
- **IEP/SEN, counseling, safeguarding records.**
- Anything beyond the **fee context** of a student (they need *fee status*, not *report cards*).

**Split with HR (Q7):** HR = salary *structure*, statutory *configuration*, leave-to-pay inputs, compliance setup. Accounts = *disbursement*, statutory *filing/payment*. **Both gated by Principal/VP-Admin approval of each payroll run.**

### 7d. Transport Driver-Absent SOP Spec

Trigger: driver/conductor marked absent (or no-show) for a scheduled trip. Transport Manager owns the workflow; parents must be notified; **students must never be left stranded.**

**SOP / system workflow:**
1. **Detect & flag** — absence captured (roster/biometric/no-show); system flags affected route(s) immediately.
2. **Backup driver** — assign from standby pool (time-bound role assignment); if license/verification valid, dispatch.
3. **Route merge / re-route** — if no backup, **merge** the orphaned route into the nearest viable route (capacity check) or split stops across adjacent buses.
4. **Cancellation (last resort)** — if neither is possible, **cancel** the route with maximum lead time.
5. **Parent notification (mandatory, automatic)** — push/SMS/app alert to **affected parents only**, stating: backup assigned / merged route + revised ETA / cancellation + instructions. (Bus service "should not be affected by absenteeism" — notify early, keep students seated/safe until arrangements are made.)
6. **Student handling** — at school end-of-day, affected students held in a **supervised waiting area**; only released to authorized pickup; conductor/teacher accounts for each child.
7. **Log & review** — incident logged; VP-Admin reviews; repeated absence → HR/disciplinary.

**Permissions:** Transport Manager CREATE/EDIT/APPROVE backup, merge, cancel, notification; reviewers VP-Admin. Transport Manager has **no events/academic permission** (fixes current bug).

---

## 8. Prioritized Implementation Checklist (engineering)

**P0 — correctness/realism blockers**
- [ ] **Multi-role engine:** User → many RoleAssignment{role, scope, validFrom/To, assignedBy}; effective perms = scoped union; deny-by-default; explicit-deny-wins. (§6)
- [ ] **Attendance scoping:** class_teacher writes **only assigned section** daily register; subject_teacher **only own periods**; substitute **only assigned proxy period**. Block cross-class writes. (§3, Q6)
- [ ] **Remove leaked permissions:** transport_manager ✗ events; class_teacher/teacher ✗ canteen; chief_accountant/accounts_clerk ✗ academic & attendance analytics. (§1 P0-4/5/6)
- [ ] **Role-assignment governance:** only Principal/VP/Director create/edit/expire assignments; HR proposes; IT provisions within approved matrix; per-user "effective permissions" view. (§6)

**P1 — operational depth**
- [ ] **Coordinator tiers:** `coordinator.senior` (wing) ⊃ `coordinator.junior` (band); authority categories (timetable, academic ops, student mgmt, admissions support, events, staff support, parent escalation); strictly wing/band-scoped. (§4, Q2)
- [ ] **Timetable ownership:** dedicated Timetable/Exam Coordinator owner + delegated-editor team; substitution sub-permission to junior coordinator; approval by VP-Academic/Principal. (§3, Q5)
- [ ] **Payroll split + approval gate:** HR(structure/config/inputs) → Accounts(disbursement) → Principal/VP-Admin **approve run**; Principal as DDO. (§7c, Q7)
- [ ] **Communication/escalation model:** default to class teacher; tiered escalate button + SLA; topic routing (fees/transport/hostel/safeguarding); leadership = escalation queue, not default; audit trail. (§5, Q3)

**P2 — domain expansion**
- [ ] **Hostel/boarding module:** chief/hostel/night warden + matron + mess roles (block-scoped); workflows — allocation, gate-pass & leave (parent/student → warden → chief warden → gate → notify), night roll-call, visitor, mess (dietary flags), discipline, health, inventory. (§7a, Q9)
- [ ] **IT-Admin module:** account lifecycle, role provisioning (within matrix), device/lab, network, ERP/LMS admin, backup, security/audit logs, CCTV/biometric integration, tickets; **administers system, not business data** (least-privilege). (§7b, Q10)
- [ ] **Transport driver-absent SOP:** detect → backup → merge/re-route → cancel → mandatory parent notification → supervised student handling → log/review. (§7d, Q8)

**P3 — compliance & stakeholders**
- [ ] **DPO + consent:** verifiable parental consent flows (child <18), DPIA, breach log, RoPA, retention/minimization; assign DPO as consent owner (DPDP Act 2023 / Rules 2025). (§2.7)
- [ ] **CPO + safeguarding:** confidential safeguarding workflow, mandatory-reporting path (POCSO → CWC/Police), bypasses normal chain. (§2.7)
- [ ] **Parent/Student scoping:** strict own-child / own-record access only; no direct-to-Principal default. (§2.7, §5)
- [ ] **Leadership = review-by-default** with named legal operate-exceptions (DDO/payroll auth, Centre Superintendent, SMC secretary, teaching gradebook). (§3)

---

## Appendix — Sources

- CBSE Affiliation Bye-Laws, Chapter VI §23 — *Duties, Powers and Responsibilities of the Principal/Head* (26 enumerated duties; ex-officio Hon. Secretary SMC; Drawing & Disbursing Officer; staff supervision; admissions/timetable/teaching-load; ≥12 teaching periods/week): https://www.rajeevelt.com/cbse-school-principal-headmaster-headmistress-administrator-duties-powers-and-responsibilities-affiliation-bye-laws/rajeev-ranjan/ ; CBSE: https://www.cbse.gov.in/cbsenew/aff-bye-laws.html ; Role of Principal (PDF): https://www.cbse.gov.in/cbsenew/board/Role%20of%20Principal.pdf
- CBSE — Centre Superintendent non-delegable; Principal shall not delegate exam authority: https://www.cbse.gov.in/cbsenew/Exambylaws_archive/Fixation%20of%20Examination%20Centres,%20Appointment%20of%20Centre%20Superintendents,%20etc.%20and%20Rules%20for%20Unfair%20means%20Cases.pdf
- CBSE — Handbook for Principals: https://cbseacademic.nic.in/web_material/Manuals/Principals_Handbook.pdf
- Academic Coordinator (CBSE) roles — curriculum, assessment oversight, teacher development, parent-teacher liaison: https://omsaigroupconsultancy.com/blog/academic-coordinator-in-cbse-school/ ; Coordinator work guide: https://omsaigroupconsultancy.com/blog/coordinator-work-in-school/
- School Coordinator role (liaison admin/teachers/students/parents; curricular & co-curricular): https://www.randstad.in/job-seeker/job-profiles/school-coordinator/ ; https://www.scribd.com/document/51824793/School-Coordinator
- Vice Principal (works with heads/coordinators; CBSE ops knowledge): https://www.udgamschool.com/vice-principals/
- Time Table In-Charge — reports to Principal/coordinator/VP; edits timetable; assigns substitution: https://www.rajeevelt.com/duties-and-responsibilities-time-table-in-charge-school-teacher-indian-educationist/rajeev-ranjan/ ; Examination In-Charge: https://www.rajeevelt.com/examination-in-charge-hod-officer-duties-and-responsibilities-school/rajeev-ranjan/ ; Head Teacher & timetable: https://teachers.institute/managing-teaching-learning/head-teacher-timetable-management/ ; Timetable software (coordinators/admins/substitution): https://www.timetableforme.com/
- HOD pathway → Coordinator (multi-role progression): https://www.suraasa.com/how-to-become-a-teacher/hod-teacher
- Multi-role reality — librarian also teaches/class-teachership/invigilation/proxy (CBSE; librarian = teaching staff): https://www.lislinks.com/forum/topics/librarian-teaching-staff-or-non-teaching-staff-in-cbse-school ; http://lislinks.ning.com/forum/topics/school-librarian-comes-under-teaching-as-per-the-affiliation-by ; library staff used as substitutes in small schools: https://www.teacherlibrarian.org/forum/topics/pulling-library-staff-to-sub-for-other-teachers
- Attendance — class-teacher-signed daily register, inspectable by CBSE: https://www.businesstoday.in/education/story/cbse-2025-heres-what-to-know-about-attendance-criteria-marking-system-no-topper-rule-and-more-453284-2024-11-11 ; teacher attendance management: https://www.edumerge.com/blog/how-to-manage-teacher-attendance-in-schools-india
- Accountant/Bursar — fee collection, payroll, PF/ESI/TDS/GST compliance, reconciliation, audit, procurement: https://www.velvetjobs.com/job-descriptions/bursar ; school accounting (PF/PT/TDS/ESI): https://www.bizindigo.com/accounting-services-for-schools-in-ghaziabad-noida-delhi/ ; payroll journal (Salary/TDS/PF/ESI): https://www.teachoo.com/984/1330/Journal-Entries-for-Salary-with-TDS-PF-ESI/category/PAYROLL-Accounting/
- Payroll HR↔Finance split; disbursement vs calculation; Principal approves/authorizes expenses: https://www.enkash.com/resources/blog/payroll-in-hr ; https://cleartax.in/s/payroll ; https://www.kanakkupillai.com/learn/how-to-implement-payroll-approval-process/ ; Principal approves tenders/expenses: https://in.indeed.com/career-advice/finding-a-job/what-does-school-principal-do
- IT Administrator — L1 ERP/LMS support, user accounts (staff/student/admin), data security/policy: https://in.indeed.com/q-it-admin-school-l-bengaluru,-karnataka-jobs.html ; LMS admin role: https://skillq.com/what-is-an-lms-administrator/
- Transport — driver verification/uniform, female attendants, parent notification, service unaffected by absenteeism; Maharashtra rules (CCTV/driver screening): https://www.tracknow.in/school-bus-safety-rules-in-india ; https://targetpublications.org/blog/new-transport-rules-for-schools-stricter-driver-checks-weekly-screenings-cctv-now-compulsory ; transport policy SOP: https://pssemrschool.com/wp-content/uploads/2023/05/Transport-Policy.pdf ; DPS bus rules: https://dpsdurgapur.com/the-school/infrastructures/transports/bus-rules/
- Hostel/Warden — chief warden principal authority; wardens allot rooms, supervise routines/attendance, night duty rotation; matron care: https://cwo.uohyd.ac.in/roles-responsibilities-of-officers-staff/ ; https://www.scribd.com/document/576448467/The-Duties-of-a-Hostel-Warden ; Eklavya Model Residential School warden duties: https://nests.tribal.gov.in/WriteReadData/RTF1984/1721020571.pdf ; TG Model School warden chart: https://teachersbadi.in/ts-model-school-warden-duties-job-chart-telangana-model-school-warden-staff/
- Hostel workflows — room/bed allocation, leave/outing (parent/student apply → warden approve → gate → notify), mess dietary flags, sick-bay, inventory, log in/out: https://pathshalaerp.in/boarding-school-management-software ; https://www.myclassboard.com/erp/hostel-management-system/ ; hostel rules/committee: https://niamt.ac.in/WriteReadData/hostel-rules-and-regulations.pdf
- Board differences — CBSE (govt/NCERT) vs ICSE/CISCE (private council, higher fee, English medium) vs State boards (regional language, flexible syllabus): https://www.21kschool.com/us/blog/icse-vs-cbse-vs-state-board/ ; https://www.edsys.in/difference-between-cbse-icse-state-boards/
- Communication/grievance — teacher-first then principal/VP; school-level → zonal grievance committee (30-day): https://www.kangarookids.in/blog/parent-teacher-communication-school-home-connection/ ; https://www.entab.in/effective-strategies-parent-teacher-communication.html ; Delhi grievance mechanism: https://www.business-standard.com/article/pti-stories/delhi-govt-notifies-grievance-redressal-mechanism-for-school-116020200979_1.html
- DPDP Act 2023 / Rules 2025 — verifiable parental consent for <18; Significant Data Fiduciary must appoint India-based DPO, DPIA, audit: https://www.ey.com/en_in/insights/cybersecurity/decoding-the-digital-personal-data-protection-act-2023 ; https://ksandk.com/data-protection-and-data-privacy/child-data-protection-under-dpdp-act-parental-consent-rules/ ; https://www.dpdpa.com/dpdparules/rule10.html
- POCSO / Child Protection — Child Protection Committee (CPO, deputy, principal, counselor, nurse); mandatory reporting; special educators register: https://elearnposh.com/pocso-act-role-of-school-authorities-and-teachers/ ; https://sis.edu.in/wp-content/uploads/2023/10/Child-Protection-Policy.pdf ; https://dcpcr.delhi.gov.in/dcpcr/pocso-1
