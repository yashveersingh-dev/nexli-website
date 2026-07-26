# NEXLI SCHOOL ERP — MASTER SPECIFICATION
### Version 1.2 | Date: June 2026 | Status: Source of Truth (product blueprint)

> **Implementation status (current build).** This specification is the product *blueprint*. The app in `Web/` now implements most of it. The points below have changed since v1.0 and **supersede** the matching parts of this document:
> - **Roles & permissions are now DATA-DRIVEN** — not the fixed T1–T7 tiers / clusters in §4.3 and §5. There is a catalogue of ~118 roles, grouped and multi-level, each with a permission matrix (module × action: View / Create / Edit / Approve / Export / Delete / Manage). A Super Admin edits roles and permissions — and adds new ones — as data, with no code change. The tier/cluster content in §4.3 and §5 is kept below as background and role descriptions.
> - **Pricing is size-band based** (by student count); every feature is included on every plan; AI is the only paid add-on; a per-school custom/founding price is supported. See **§12.4** — that section is current.
> - **Student & staff profile pages** (searchable list → full profile, with permission-gated tabs) are built.
> - The **demo school** is fully populated with realistic test accounts, and **Firestore security rules are deployed**.
> - For the authoritative *current* picture and what's next, read **`context/CONTEXT.md`** and **`resume/RESUME.md`** in the project root.

---

## TABLE OF CONTENTS

1. [NEXLI Foundation — Vision, Mission, Purpose](#1-nexli-foundation)
2. [Indian School Ecosystem](#2-indian-school-ecosystem)
3. [Regulatory & Compliance Framework](#3-regulatory--compliance-framework)
4. [School Hierarchy & Governance](#4-school-hierarchy--governance)
5. [Complete Role Directory](#5-complete-role-directory)
6. [ERP Module Catalogue](#6-erp-module-catalogue)
7. [Communication Architecture](#7-communication-architecture)
8. [AI Opportunities](#8-ai-opportunities)
9. [UX & Design Principles](#9-ux--design-principles)
10. [Security & Data Governance](#10-security--data-governance)
11. [Missing Opportunities & Competitive Differentiation](#11-missing-opportunities--competitive-differentiation)
12. [Super Admin System — Platform Command Center](#12-super-admin-system--platform-command-center)
13. [Student Data Import System](#13-student-data-import-system)
14. [Technical Architecture](#14-technical-architecture)

---

# 1. NEXLI FOUNDATION

## 1.1 Vision
To be the operating system of every Indian school — the invisible backbone that makes every administrator more effective, every teacher more impactful, every parent more connected, and every student more supported.

## 1.2 Mission
NEXLI exists to eliminate the chaos of school management by replacing fragmented registers, spreadsheets, and WhatsApp groups with one unified, intelligent platform that understands the unique complexity of Indian K-12 education.

## 1.3 Purpose
Indian schools are among the most complex organizations to run. A single school simultaneously operates as:
- An academic institution (teaching, assessment, curriculum)
- A government compliance entity (CBSE, state boards, RTE, NEP 2020)
- A financial organization (fees, payroll, procurement)
- A social welfare system (EWS students, counseling, nutrition)
- A safety infrastructure (transport, hostel, medical, security)
- A communication hub (teachers, parents, students, staff)
- A data custodian (DPDP Act, POCSO, minor data protection)

No existing ERP handles all of these with the depth that Indian schools need. NEXLI does.

## 1.4 Target Users

### Primary Users (Daily Active)
| User Type | Estimated Volume per School | Key Need |
|---|---|---|
| Teachers | 40–150 | Fast attendance, gradebook, communication |
| Students | 300–3000 | Assignments, timetable, results |
| Parents | 600–6000 | Fee payment, child updates, safety alerts |
| Administrative Staff | 10–30 | Records, compliance, finance |
| Support Staff | 20–80 | Attendance, task logs |

### Secondary Users (Weekly Active)
- School Management (Principal, VP, Coordinators)
- HR and Accounts departments
- Transport and Hostel managers
- Medical and counseling staff

### Tertiary Users (On-Demand)
- Trustees and Directors
- Data Protection Officer
- Auditors and inspectors
- Government officials (UDISE reporting)

### Platform-Level User (NEXLI Operator)
| User Type | Count | Key Need |
|---|---|---|
| Super Admin (NEXLI Owner) | 1 | Platform-wide control, school onboarding, subscription management, system health |

## 1.5 Target School Segments
> All segments get the **same full feature set**; only the size-based price differs (see §12.4 Pricing Model). The notes below are market context, not feature/price tiers.
- Private unaided schools (CBSE, ICSE, State Board) — primary market
- School chains (2–500 branches) — each branch is its own tenant, billed by its own size
- Government-aided schools — usually smaller size bands (lower price); all features still included
- Boarding and residential schools — hostel/residential modules are included like every other feature (never a paid add-on)
- International schools (IB, Cambridge) — usually larger size bands

## 1.6 Core Principles

**1. India-First by Default**
Every feature is designed for Indian realities: low-bandwidth mobile internet, multilingual parents, government compliance mandates, cash-heavy fee payment culture, WhatsApp-first communication habits.

**2. Role-Based Trust Hierarchy**
Every user sees only what their role permits. No exceptions. No workarounds. The principle of least privilege is the foundation of the entire permission system.

**3. Child Safety Above Everything**
Any feature that could compromise student safety — from direct messaging to data exports — is disabled or heavily restricted by default. POCSO and DPDP compliance are non-negotiable.

**4. Operational Continuity**
Schools cannot afford downtime. Every critical workflow (attendance, fee collection, emergency alerts) must work on 2G connections and offline-first on mobile.

**5. Compliance Built-In, Not Bolted-On**
NEP 2020, DPDP Act 2023, RTE Act, CBSE Bye-Laws, UDISE+ reporting — these are not optional add-ons. They are woven into the core design of every module.

**6. Human-Centered AI**
AI assists and suggests. Humans decide and approve. No automated action affecting a student's academic record, attendance, or safety happens without human confirmation.

**7. Transparent Data Ownership**
Parents own their child's data. Schools are custodians, not owners. The system must make it easy for parents to view, consent, and withdraw consent for data usage.

**8. Platform Governance Separation**
The NEXLI Super Admin operates at the platform layer — entirely above and separate from any individual school's data and operations. School data is never accessible to the Super Admin in raw form. The Super Admin manages the platform (schools, subscriptions, health, settings) but is not a user within any school's ERP.

---

# 2. INDIAN SCHOOL ECOSYSTEM

## 2.1 School Type Matrix

| School Type | Board | Key ERP Implications |
|---|---|---|
| Private Unaided (Urban) | CBSE / ICSE | High fee collection, digital parent engagement, WhatsApp integration, CBSE OASIS portal sync |
| Private Unaided (Semi-Urban) | CBSE / State | Mixed digital literacy, regional language support, cash fee collection |
| Government / Government-Aided | State Board | UDISE+ reporting, PM POSHAN meal tracking, RTE 25% quota management, Samagra Shiksha integration |
| Boarding / Residential | CBSE / ICSE / IB | Hostel management, night roll-calls, exeat tracking, in loco parentis obligations, medical clinic |
| Day-Cum-Boarding | CBSE / ICSE | Hybrid workflows — day student transport + boarder residential management |
| School Chain (Multi-Branch) | Mixed | Multi-tenant SaaS, HQ oversight dashboard, centralized HR, branch autonomy with chain-level reporting |
| International School | IB / Cambridge / CAIE | Narrative assessments, inquiry logs, global data privacy, international alumni tracking |
| Special Education School | State / NIOS | IEP (Individualized Education Program) tracking, therapy scheduling, CwSN compliance |
| Minority Institution | CBSE / State | Additional governance layers, separate trust/management structure |
| Open School / Distance | NIOS | Flexible enrollment, part-time attendance, remote assessment |

## 2.2 Academic Board Variations

### CBSE Schools
- Mandatory OASIS portal sync for exam registration
- List of Candidates (LOC) submission for Class 10 and 12
- Appendix-V format Transfer Certificates
- NEP 2020 Holistic Progress Card (HPC) for foundational and preparatory stages
- Minimum 75% attendance enforcement with automated parent alerts
- Internal assessment marks moderation guidelines
- School affiliation renewal compliance calendar

### ICSE / ISC Schools (CISCE)
- Strict practical marks moderation and internal assessment rules
- SUPW (Socially Useful Productive Work) grading module required
- Council-specific TC format
- ISC Class 12 subject combination restrictions

### State Board Schools
- Compatibility with state-specific portals: Rajasthan RAJPSP, Tamil Nadu EMIS, UP PRERNA, Maharashtra SARAL, AP/Telangana CFMS
- Vernacular language UI and data entry
- State scholarship and mid-day meal scheme integration

### IB / Cambridge Schools
- Narrative and inquiry-based assessment logs
- International Baccalaureate CAS (Creativity, Activity, Service) tracking
- Global data privacy compliance (GDPR for international families)
- Data localization in India despite international board affiliation

## 2.3 Academic Year Lifecycle (CBSE Reference)

| Phase | Months | Key ERP Activities |
|---|---|---|
| Pre-Year Planning | March–April | Timetable creation, section formation, teacher allocation, fee structure setup |
| New Admissions | March–June | Inquiry tracking, document verification, enrollment, fee collection |
| Term 1 | April–September | Daily attendance, lesson plan execution, Unit Tests, Half-Yearly exams |
| Mid-Year Operations | August–October | PTM scheduling, report card generation, TC issuance, new admissions (transfer students) |
| Board Exam Prep | September–November | LOC submission to CBSE, admit card generation, pre-board scheduling |
| Term 2 | October–February | Continuous assessment, Annual exam preparation, project submissions |
| Year-End Closure | February–March | Annual exams, result processing, HPC generation, TC for departing students, UDISE+ submission |
| Summer Operations | April–May | Admissions peak, vacation programs, infrastructure maintenance scheduling |

## 2.4 School Size Tiers

> These labels are a **descriptive profile only.** Every NEXLI feature/module is available to **every** school regardless of size — the column below describes typical usage, not what's unlocked. **Price** is set by the official student-count bands in **§12.4 Pricing Model** (0–500, 500–1k, 1k–1.5k, …), not by these labels.

| Tier | Student Count | Staff Count | Typical profile (all modules available on every tier) |
|---|---|---|---|
| Micro | <300 | <25 | Single branch; smaller operations |
| Small | 300–800 | 25–60 | Standard day school |
| Medium | 800–2000 | 60–150 | Day school; transport + advanced analytics often in active use |
| Large | 2000–5000 | 150–400 | Multi-section; complex timetabling; residential common |
| Enterprise | 5000+ / Chain | 400+ | Multi-tenant; HQ dashboard; chain-wide HR and finance |

---

# 3. REGULATORY & COMPLIANCE FRAMEWORK

## 3.1 Primary Legislation

### DPDP Act 2023 (Digital Personal Data Protection Act)
- All students under 18 are classified as children under the Act
- Verifiable parental consent is mandatory before collecting any child's personal data
- Consent must be specific, informed, and freely given — no blanket consent forms
- Parents have the right to: access their child's data, correct it, erase it, withdraw consent
- Schools must appoint a Data Protection Officer (DPO)
- Data breaches must be reported to the Data Protection Board of India (DPBI) within 72 hours
- Cross-border data transfers are restricted — student data must be hosted in India
- No data processing beyond the stated educational purpose
- NEXLI must provide consent dashboards, audit logs, and breach notification workflows

### RTE Act 2009 (Right to Education)
- 25% reservation for EWS/disadvantaged students in private unaided schools
- State government reimburses private schools for EWS seats at government school rates
- Schools must track RTE students separately for reimbursement claims
- No discrimination in treatment of RTE vs. fee-paying students
- NEXLI must support: RTE quota tracking, reimbursement claim generation, EWS document management

### NEP 2020 (National Education Policy)
- 5+3+3+4 structure: Foundational (ages 3–8), Preparatory (8–11), Middle (11–14), Secondary (14–18)
- Competency-based assessment replaces rote learning metrics
- Holistic Progress Card (HPC) — 360-degree assessment including: academic competencies, social-emotional learning, physical health, arts, vocational skills, self-assessment, peer assessment
- Multilingualism: mother tongue as medium of instruction in early years
- No board exams until Class 10; reduced high-stakes testing
- Vocational education integration from Class 6
- NEXLI must support: HPC generation, competency mapping, multi-language report cards, vocational activity tracking

### CBSE Affiliation Bye-Laws
- Mandatory staff qualification records (B.Ed., M.Ed. tracking)
- Minimum infrastructure requirements: lab space, library, playground
- Affiliation renewal every 5 years with documentation audit
- School must maintain: attendance registers, fee records, result records for inspection
- NEXLI must support: compliance calendar, document vault, automated affiliation audit reports

### POCSO Act 2012 (Protection of Children from Sexual Offences)
- Schools must have a Child Protection Officer (CPO) or POCSO officer
- Mandatory reporting: any complaint must be reported to police within 24 hours
- No mediation or settlement of POCSO complaints outside legal process
- Staff background verification before hiring
- NEXLI must support: encrypted grievance filing, CPO-only case access, incident timeline, automatic escalation alerts

### POSH Act 2013 (Prevention of Sexual Harassment at Workplace)
- Schools with 10+ employees must have an Internal Complaints Committee (ICC)
- ICC must include at least one external member
- Annual report submission to district officer
- NEXLI must support: confidential complaint filing, ICC case management, annual report generation

### PM POSHAN (Mid-Day Meal Scheme)
- Government schools: daily meal records per student
- Menu compliance with nutritional guidelines
- Monthly utilization reports to state government
- NEXLI must support: daily meal headcount, menu logging, monthly government reports

### UDISE+ (Unified District Information System for Education)
- Annual data collection: school infrastructure, enrollment, teachers, results
- All schools (government and private) must report
- Data submission portal maintained by Ministry of Education
- NEXLI must support: UDISE+ data pre-population, annual report export in required format

### FSSAI (Food Safety and Standards Authority of India)
- School canteens are food business operators under FSSAI
- License renewal tracking, food handler health certificates
- Junk food restrictions near school campuses
- NEXLI must support: FSSAI license calendar, vendor certificate tracking, menu safety flags

## 3.2 Compliance Calendar (Automated Alerts)

| Compliance Item | Frequency | Alert Trigger |
|---|---|---|
| CBSE LOC Submission | Annual | 60 days before deadline |
| UDISE+ Annual Report | Annual | 90 days before deadline |
| CBSE Affiliation Renewal | Every 5 years | 180 days before expiry |
| Fire NOC Renewal | Annual | 90 days before expiry |
| Building Safety Certificate | As required | 90 days before expiry |
| FSSAI License Renewal | Annual | 60 days before expiry |
| Staff Police Verification | Per hire | On joining + annual reminder |
| EPF/ESI Monthly Returns | Monthly | 7 days before due date |
| TDS Quarterly Returns | Quarterly | 15 days before due date |
| GST Returns | Monthly/Quarterly | 5 days before due date |
| Annual POSH Report | Annual | 30 days before due date |
| Drinking Water Quality Test | Half-yearly | 30 days before due |
| Lab Safety Audit | Annual | 60 days before due |

---

# 4. SCHOOL HIERARCHY & GOVERNANCE

## 4.1 Recommended Governance Structure

### Tier 1 — Strategic (Board Level)
- **Chairman / Chairperson** — Ultimate authority, fiduciary and vision owner
- **Board of Trustees / Governing Body** — Policy oversight, asset protection, audit
- **Secretary** — Board-level administration and documentation
- **Treasurer** — Financial oversight at board level

### Tier 2 — Executive (Chain / Group Level)
- **Director / CEO** — Cross-campus execution, P&L owner for the chain
- **Regional Director** — Cluster of branches in a geographic region
- **Cluster Director** — 3–8 schools in a district or city

### Tier 3 — Campus Leadership (School Level)
- **Principal** — Campus head, final authority for all school functions
- **Vice Principal (Academic)** — Academic delivery, curriculum, teaching quality
- **Vice Principal (Administration)** — Operations, finance, HR, facilities

### Tier 4 — Department Heads
- **Academic Coordinators** (Primary, Middle, Senior, Pre-Primary)
- **Heads of Department** (Subject HODs)
- **HR Manager**
- **Chief Accountant**
- **IT Administrator**
- **Chief Warden** (boarding schools)
- **Transport Manager**
- **Medical Officer / School Doctor**
- **Security Supervisor**

### Tier 5 — Delivery & Functional Staff
- Class Teachers, Subject Teachers, Special Educators
- Counselors, Librarians, Lab Assistants
- Hostel Wardens, Matrons, Night Wardens
- Accounts Staff, HR Assistants, Front Desk
- Drivers, Bus Conductors, Security Guards
- Canteen Staff, Housekeeping, Maintenance

### Tier 6 — Students & Parents (External Users)
- Students (read-only learner portal)
- Parents (guardian portal — their children only)
- Alumni (restricted alumni portal)

## 4.2 Special Governance Roles (Independent of Hierarchy)

### Data Protection Officer (DPO)
- Statutorily independent — reports to Principal AND Board, not to any department
- Has audit access to all data processing activities but no raw student data visibility
- Cannot be overridden by Principal on data privacy decisions
- Must be a dedicated role in schools with 500+ students

### Child Protection Officer (CPO) / POCSO Officer
- Bypasses standard hierarchy for child safety issues
- Direct escalation path to Principal and Board
- Can also escalate directly to external authorities (police, NCPCR) without internal approval

### School Management Committee (SMC)
- Mandatory for government schools under RTE Act
- 75% parent/community representation required
- Powers: school development planning, budget approval, monitoring
- NEXLI must provide SMC-specific dashboards and reporting

### Internal Complaints Committee (ICC) — POSH
- Minimum 50% female membership required
- External member mandatory
- Operates independently of Principal for harassment complaints
- Access restricted to ICC members only

## 4.3 Permission Tier Framework

> **Now superseded by the data-driven role system.** The live app no longer hard-codes these T1–T7 tiers; it resolves each role's permissions from an editable catalogue (a module × action matrix per role). The tiers below remain a useful conceptual map of authority levels. See `context/CONTEXT.md` → "Roles & permissions".

| Tier | Title | Description | Example Roles |
|---|---|---|---|
| T1 — Strategic | Read-Only Global | View all dashboards, no write access | Chairman, Trustee |
| T2 — Executive | Full Global Admin | All campuses, all modules, approve anything | Director, CEO |
| T3 — Campus Admin | Full Campus Control | All modules for their campus, final approver | Principal |
| T4 — Departmental | Department-Level Write | Read-write for their department scope | HOD, HR Manager, Chief Accountant |
| T5 — Functional | Role-Scoped Write | Write access limited to their assigned students/sections/tasks | Class Teacher, Subject Teacher |
| T6 — Limited | View Only / Self | Own records only; no others | Student, Parent, Support Staff |
| T7 — Specialized | Cross-Module Restricted | Specific modules only, no standard hierarchy | DPO, CPO, ICC Member |

---

# 5. COMPLETE ROLE DIRECTORY

Each role entry contains: Purpose, Daily Activities, Problems They Face, Key Permissions, Communication Rights, AI Assistance Opportunities.

> **Implementation note.** In the built app these roles — plus several new levels (e.g. Senior / Junior / Associate Academic Coordinator, the warden, librarian and nurse variants, Headmaster/Headmistress, Head of School, etc.) — live in a data-driven catalogue (`Web/src/lib/roles/catalog.ts`), seeded as defaults and editable by a Super Admin under **Roles & Permissions**. The descriptions below remain the reference for what each role does day-to-day.

---

## CLUSTER 0 — PLATFORM ADMINISTRATION (NEXLI OPERATOR LEVEL)

> These roles exist at the NEXLI platform layer, above all individual schools. They do not belong to any school. They operate the NEXLI SaaS platform itself.

### 0.1 Super Admin (NEXLI Platform Owner)
**Purpose:** The single highest-authority user on the entire NEXLI platform. This is the NEXLI product owner / operator. The Super Admin provisions schools onto the platform, manages their lifecycle and subscriptions, monitors platform health, configures global settings, and has complete visibility into all platform-level activity.

**Scope:** The Super Admin operates exclusively at the platform layer. Raw student academic records, individual teacher gradebooks, medical data, and counseling files within a school are NOT visible to the Super Admin — school-level data privacy is maintained. What the Super Admin sees are platform metrics, aggregate statistics, school configuration, and system health data.

**Daily Activities:**
- Reviews the Platform Command Dashboard: new sign-ups, schools onboarded today, subscription renewals due, system alerts
- Onboards new schools: creates school account, configures initial settings, assigns School Admin credentials
- Reviews platform health metrics: uptime, API response times, Firebase usage, error rates
- Manages subscription lifecycle: activates, pauses, suspends, or resumes school subscriptions
- Reviews platform-wide analytics: total active schools, total active users, daily active users, feature usage heatmaps
- Sends platform-wide announcements to all schools or targeted subsets
- Configures global platform settings: pricing plans, feature flags, compliance templates, default configurations
- Reviews support escalations and system incidents
- Manages platform billing and invoicing per school

**Problems They Face:**
- No visibility into which schools are at risk of churning (low engagement, unpaid invoices)
- No way to identify if a school is experiencing a crisis (mass staff attendance failures, compliance deadline missed)
- Platform incidents affecting multiple schools with no centralized alert
- Manual school onboarding taking too long when multiple schools sign up simultaneously

**Key Permissions:**
- Absolute platform-level authority — can create, modify, suspend, and delete any school account
- Access to all school configuration settings across all schools
- Access to platform-aggregate analytics (not individual student data)
- Access to system infrastructure health, Firebase console metrics, error logs
- Access to billing and subscription management for every school
- Can impersonate a School Admin for support purposes (with mandatory audit log entry)
- Can push announcements to all schools or any subset
- Can configure feature flags to enable/disable features globally or per school
- Can configure the size-based price bands, set a custom/founding price for a specific school, and manage the AI paid add-on (the only paid add-on — all other features are included for every school on every plan)
- Cannot access: individual student academic records, individual teacher data, medical records, counseling files, or any RBAC-protected school-internal data

**Communication Rights:**
- Can send platform-wide announcements to all registered School Admins
- Can send targeted messages to specific schools or school groups
- Receives automated platform health alerts and incident notifications
- Cannot message individual teachers, parents, or students within schools

---

## CLUSTER A — STRATEGIC LEADERSHIP

### A1. Chairman / Chairperson
**Purpose:** Ultimate strategic authority and fiduciary responsibility for the institution. Sets long-term vision, approves major capital expenditure, and ensures the institution fulfills its educational mission and legal obligations.

**Daily Activities:**
- Reviews consolidated financial and operational dashboards
- Approves capital expenditure above threshold
- Reviews compliance status for all campuses
- Attends board meetings and reviews minutes
- Reviews strategic KPIs: enrollment growth, academic outcomes, staff retention

**Problems They Face:**
- Information overload — too many reports from too many sources
- Lack of real-time visibility into campus operations
- Difficulty comparing performance across multiple campuses
- Compliance risk from unknown regulatory breaches

**Permissions:**
- Read-only access to all modules across all campuses
- Can view global financial dashboards, compliance status, enrollment trends
- Cannot modify any records or approve individual transactions
- Receives automated exception alerts for critical issues

**Communication Rights:**
- Can send messages to: Director, Principal
- Cannot directly message teachers, parents, or students

---

### A2. Trustee / Board Member
**Purpose:** Fiduciary oversight of assets, audit compliance, and institutional governance. Protects the long-term interests of the institution and its stakeholders.

**Daily Activities:**
- Reviews asset registers, property records, and investment portfolios
- Approves annual budgets and audited financial statements
- Reviews compliance reports and risk registers
- Participates in board meetings (monthly or quarterly)

**Problems They Face:**
- Incomplete or delayed financial reporting
- Difficulty understanding operational metrics without context
- Risk of signing off on non-compliant decisions

**Permissions:**
- Read-only: Finance, Asset Management, Audit, Compliance modules
- No access to student records, HR details, or academic data
- Can view board-level summary reports only

---

### A3. Director / CEO (Chain Level)
**Purpose:** Executes the board's vision across all campuses. Owns the P&L for the entire school chain. Makes cross-campus decisions on HR, finance, academics, and strategy.

**Daily Activities:**
- Reviews branch performance scorecards
- Approves senior appointments (Principal level)
- Reviews chain-wide financial reports and fee collection
- Makes decisions on new campus launches or closures
- Monitors compliance status across all branches

**Problems They Face:**
- Inconsistent data formats across branches making comparison impossible
- Unable to identify underperforming branches early
- Slow escalation of critical issues from campus level

**Permissions:**
- Full Super-Admin across all campuses in the chain
- Can override Principal-level approvals in exceptional cases
- Can configure chain-wide policies, fee structures, academic calendars
- Access to all modules: read-write at global level

**Communication Rights:**
- Can send to: Regional Directors, Principals, any staff
- Can initiate chain-wide emergency broadcasts

---

### A4. Regional Director
**Purpose:** Manages a cluster of schools in a geographic region. Acts as the link between chain HQ and campus Principals.

**Permissions:** Full admin for their region's campuses. Read-only for other regions.

---

### A5. Cluster Director / Area Manager
**Purpose:** Manages 3–8 nearby campuses. Conducts campus visits, monitors compliance, supports Principals.

**Permissions:** Full admin for their assigned campuses. Reports to Regional Director.

---

## CLUSTER B — CAMPUS LEADERSHIP

### B1. Principal
**Purpose:** The highest authority on campus. Responsible for every aspect of school operations: academic quality, staff management, student welfare, parent relations, financial oversight, and regulatory compliance.

**Psychology:** Principals carry enormous pressure. They are simultaneously accountable to the board (financial performance), parents (academic outcomes and safety), teachers (fair management), students (welfare), and government (compliance). They need a command center that gives them complete situational awareness in under 2 minutes.

**Daily Activities:**
- Reviews morning dashboard: staff attendance, student attendance anomalies, pending approvals
- Signs off on Transfer Certificates, bonafide certificates, experience letters
- Reviews disciplinary cases and makes final decisions
- Conducts or chairs staff meetings and PTMs
- Reviews fee collection status and pending dues
- Monitors compliance calendar for upcoming deadlines
- Reviews flagged incidents: medical, security, behavioral
- Approves leave applications for senior staff

**Problems They Face:**
- Fragmented information — attendance in one register, fees in another, complaints in email
- No way to know what's happening in each classroom without physically walking around
- Parents calling directly on personal mobile because the school has no formal communication channel
- Staff calling sick at 7 AM with no substitute plan in place
- Not knowing about a student health incident until it becomes a crisis
- Annual UDISE+ submission being a nightmare of manual data collection

**Key Permissions:**
- Complete read-write for all modules on their campus
- Final approval authority: TC, admissions, disciplinary action, fee waivers, staff leaves
- Can configure campus-level settings within chain-permitted parameters
- Cannot modify chain-level policies without Director approval

**Communication Rights:**
- Can message: all staff, all students, all parents on their campus
- Can initiate campus-wide emergency broadcasts
- Receives all escalated alerts automatically

---

### B2. Vice Principal (Academic)
**Purpose:** Owns the academic delivery of the school. Ensures curriculum coverage, teaching quality, assessment integrity, and alignment with board requirements.

**Daily Activities:**
- Reviews lesson plan submissions from teachers
- Manages substitute teacher assignments
- Reviews academic performance data: class-wise, subject-wise
- Coordinates with HODs on curriculum pacing
- Reviews and approves exam schedules
- Handles academic complaints from parents or students
- Prepares academic KPI reports for Principal

**Problems They Face:**
- Teachers not submitting lesson plans on time
- No visibility into which topics have been taught vs. pending
- Exam timetable conflicts discovered late
- Substitute arrangements being chaotic when a teacher calls sick

**Permissions:**
- Full read-write: Academic modules (Timetable, Attendance, Gradebook, Curriculum, Lesson Plans, Assessments)
- Read-only: Fee, HR, Transport modules
- Cannot access medical records, counseling files, or financial details

---

### B3. Vice Principal (Administration)
**Purpose:** Runs the operational backbone of the school: finance, HR, facilities, transport, security, and compliance administration.

**Daily Activities:**
- Reviews fee collection and pending dues
- Approves procurement requests
- Reviews transport fleet status
- Monitors facility maintenance requests
- Reviews staff attendance and HR issues
- Tracks compliance deadlines

**Permissions:**
- Full read-write: Administration modules (Fee, HR, Transport, Facility, Security, Compliance)
- Read-only: Academic data (for operational context)
- Cannot modify academic records, grades, or assessment data

---

## CLUSTER C — ACADEMIC MANAGEMENT

### C1. Academic Coordinator (Primary / Middle / Senior / Pre-Primary)
**Purpose:** Manages academic operations for a specific school segment. Acts as the daily operational link between VP (Academic) and classroom teachers.

**Psychology:** Coordinators are often senior teachers who have transitioned to administrative roles. They understand both classroom realities and management pressures. They need tools that reduce their coordination overhead (substitutes, lesson plan follow-ups, parent queries) so they can focus on academic quality.

**Daily Activities:**
- Reviews teacher attendance for their segment and arranges substitutes
- Follows up on pending lesson plans
- Coordinates PTM scheduling for their segment
- Handles parent academic complaints
- Reviews section-wise academic performance
- Monitors exam schedule adherence

**Permissions:**
- Read-write: Timetable, Attendance (staff), Lesson Plans, Substitution module for their segment
- Read: Grade reports for their segment, Student profiles
- No access: Fee records, HR salary details, counseling files

---

### C2. Head of Department (HOD)
**Purpose:** Subject matter expert and quality lead for their department. Ensures curriculum coverage, assessment quality, and teacher professional development within their subject.

**Daily Activities:**
- Reviews curriculum mapping and pacing plans
- Designs or approves question papers for internal exams
- Reviews teacher lesson plans for quality alignment
- Conducts department meetings
- Reviews student performance in their subject across sections
- Mentors junior teachers

**Permissions:**
- Read-write: Department gradebooks, Question Bank, Lesson Plan module (for their subject)
- Read: Student academic profiles
- No access: Fee, HR salary, counseling, medical records

---

### C3. Class Teacher (Homeroom Teacher)
**Purpose:** The primary point of contact for a specific section. Responsible for daily student wellbeing, attendance, academic monitoring, and parent communication for their assigned class.

**Psychology:** Class teachers are the most information-dense role in the school. They know each student's family situation, academic struggles, friendships, and behavioral patterns. They need a system that captures this institutional knowledge while not becoming administrative burden.

**Daily Activities:**
- Marks daily attendance within the first 5 minutes of school
- Reviews absent student alerts and notifies parents
- Updates student cumulative records
- Issues Diary remarks or disciplinary notes
- Coordinates parent communication for their class
- Generates and distributes report cards (terminal)
- Processes leave applications
- Updates the class notice board / circular board

**Problems They Face:**
- Marking attendance in the register + entering it digitally = double work
- Parent queries on WhatsApp at 11 PM
- Lost or unsigned almanacs/diaries
- Students claiming they gave a letter when they didn't
- Knowing which students are "at risk" academically before it's too late

**Permissions:**
- Full read-write: Their assigned homeroom class only (attendance, remarks, report cards, leave records, student profiles)
- Cannot access: other classes, HR records, fee details beyond their own children, counseling files
- Can message parents of their class students directly

---

### C4. Subject Teacher
**Purpose:** Delivers curriculum content for their assigned subject across assigned sections. Responsible for lesson planning, teaching, assessment, and grade entry.

**Psychology:** Teachers in India face enormous pressure: large class sizes (40–60 students), limited planning time, parent expectations for board exam results, and administrative overhead that competes with teaching time. The best ERP for teachers is one that reduces the time they spend on non-teaching tasks.

**Daily Activities:**
- Marks period-wise attendance for their assigned classes
- Delivers lesson as per lesson plan
- Assigns and grades homework/assignments
- Enters test marks into the gradebook
- Prepares and submits lesson plans weekly
- Updates curriculum coverage tracker
- Responds to student academic queries

**Problems They Face:**
- Forgetting to log attendance for a particular period
- Manually calculating terminal exam averages across multiple assessments
- Having no visibility into whether a student has been absent repeatedly across all their subjects
- No structured way to flag a student who is academically struggling

**Permissions:**
- Read-write: Gradebooks for their assigned subjects + sections only
- Read-write: Period attendance for their assigned periods only
- Read: Student academic profile (academic data only, no medical or counseling data)
- Cannot access: other subjects' grades, salary records, fee data, counseling files

---

### C5. Substitute Teacher
**Purpose:** Maintains class continuity when the assigned teacher is absent. Must be able to pick up where the regular teacher left off without disruption.

**Permissions:**
- Read-only: Today's lesson plan for assigned class
- Read-only: Class roster and student names
- Write: Substitute attendance log
- No access to gradebooks, student history, or any administrative module

---

### C6. Special Educator (CwSN Teacher)
**Purpose:** Provides specialized academic support for Children with Special Needs (CwSN). Manages Individualized Education Programs (IEP) and coordinates with therapists, parents, and regular teachers.

**Daily Activities:**
- Conducts therapy and resource room sessions
- Updates IEP goals and progress notes
- Coordinates with subject teachers on accommodation strategies
- Communicates with parents on therapy progress
- Documents medical and developmental observations

**Permissions:**
- Full read-write: CwSN profiles, IEP module, therapy logs
- Read: Medical records relevant to disability
- Read: Academic performance to align IEP goals
- No access to other students' medical or counseling data

---

### C7. Counselor / Student Wellness Counselor
**Purpose:** Provides emotional, psychological, and career counseling support to students. Operates under strict confidentiality while being a safety valve for the school's mental health ecosystem.

**Psychology:** Counselors are caught between student confidentiality and institutional safety obligations. They need a system that protects counseling session privacy by default, with clear escalation triggers for safeguarding situations.

**Daily Activities:**
- Conducts one-on-one counseling sessions
- Runs group wellness workshops
- Reviews academic referrals from teachers
- Maintains confidential session notes in locked files
- Monitors at-risk student list (confidential)
- Coordinates with parents when necessary (with student consent where appropriate)
- Reports safeguarding concerns to Principal/CPO

**Permissions:**
- Write: Counseling File Locker (write-only — no one else can read without DPO/Principal authorization)
- Read: Academic performance data (for context only)
- Read: Attendance data (to identify patterns)
- No access: Fee, HR, or medical modules beyond shared-care cases

---

### C8. Librarian
**Purpose:** Manages the school library — book catalog, circulation, digital resources, and reading programs.

**Daily Activities:**
- Processes book issue and return (barcode/RFID-based)
- Catalogs new arrivals with ISBN tracking
- Manages overdue notices
- Runs reading programs and competitions
- Maintains digital resource subscriptions

**Permissions:**
- Full read-write: Library Management Module
- Read: Student profiles (name, class, contact — for circulation only)
- No access to academic records, fees, or HR

---

### C9. Lab Assistant (Science / Computer / Language)
**Purpose:** Manages laboratory equipment, consumables, safety, and student activity coordination during lab periods.

**Daily Activities:**
- Prepares equipment and materials for scheduled lab sessions
- Maintains lab inventory and logs equipment usage
- Logs safety incidents
- Orders consumable replenishments

**Permissions:**
- Read-write: Lab Inventory module, Lab Session log
- Read: Lab schedule, student roster for lab periods
- No access to academic grades, HR, or financial modules

---

## CLUSTER D — STUDENT DEVELOPMENT

### D1. Sports Teacher / Physical Education Teacher (PET)
**Purpose:** Manages sports curriculum delivery, student fitness assessment, inter-school competitions, and sports equipment.

**Permissions:**
- Read-write: Sports/PE module, fitness records, equipment inventory
- Can contribute to HPC (physical development section)

---

### D2. Arts Teacher / Music Teacher / Dance Teacher
**Purpose:** Delivers co-curricular arts education. Contributes to HPC co-curricular section and manages annual events.

**Permissions:**
- Read-write: Activity/Arts module for their sessions
- Can contribute to HPC co-curricular and creative sections

---

### D3. Activity Coordinator / Co-Curricular Coordinator
**Purpose:** Plans and executes all non-academic school events: annual day, sports day, cultural programs, inter-school competitions.

**Permissions:**
- Read-write: Events module, Club/Activity module
- Read: Student participation records, teacher availability

---

### D4. Club / Society Coordinator
**Purpose:** Manages specific student clubs (Debate, Science Club, Robotics, Environment Club, etc.) — scheduling, membership, activities, achievements.

**Permissions:**
- Read-write: Assigned club module
- Read: Member student profiles (limited to name, class, participation status)

---

### D5. House Master / House Mistress
**Purpose:** Leads one of the school's houses in a house system. Coordinates inter-house competitions, monitors house points, provides pastoral care to house members.

**Permissions:**
- Read-write: House Points module
- Read: Academic and behavioral records of house members

---

## CLUSTER E — STUDENT LEADERSHIP

### E1. School Prefect / Head Boy / Head Girl
**Purpose:** Student leadership role. Assists in maintaining school order, representing student body to administration.

**Permissions:**
- Read: Daily notice board, house points, event schedule
- No access to any administrative, academic, or personal data of other students

---

### E2. House Captain / Sports Captain
**Purpose:** Student captain of a house or sports team. Facilitates team coordination.

**Permissions:**
- Same as general student, plus: can view house points and team schedules

---

## CLUSTER F — ADMINISTRATION & OPERATIONS

### F1. Front Desk / Receptionist / Administrative Assistant
**Purpose:** First point of contact for the school. Handles visitor management, phone inquiries, certificate requests, general administration.

**Daily Activities:**
- Manages visitor sign-in and verification
- Issues gate passes to visitors
- Processes certificate requests (bonafide, TC initiation)
- Routes phone calls and messages
- Manages incoming mail and courier
- Assists with event logistics

**Permissions:**
- Read-write: Visitor Management module, Certificate Request module
- Read: Student names and classes (for visitor verification — no academic or financial data)
- No access to academic records, grades, fee details, HR data

---

### F2. HR Manager
**Purpose:** Manages the entire human capital lifecycle: recruitment, onboarding, payroll, leave management, performance management, compliance (EPF/ESI/TDS).

**Daily Activities:**
- Processes leave applications
- Runs payroll (salary calculation, deductions, disbursement)
- Maintains staff records (qualifications, experience, background verification)
- Manages recruitment pipeline
- Handles disciplinary proceedings
- Generates EPF, ESI, TDS statutory reports
- Monitors staff attendance via biometric integration

**Problems They Face:**
- Staff calling sick at 7 AM with no digital record
- Leave encashment calculations being error-prone in spreadsheets
- Tracking probation completion for 50+ staff
- Background verification being manual and often skipped

**Permissions:**
- Full read-write: HRMS, Biometric Attendance (staff), Payroll, Recruitment module
- Read: Staff profile, qualifications
- No access to student records, academic grades, fee data

---

### F3. HR Assistant
**Permissions:**
- Read-write: Leave applications, attendance records for support staff
- Read: Staff directory
- No access to salary details, student data, or financial records

---

### F4. Chief Accountant / Finance Manager
**Purpose:** Manages all financial operations: fee collection, expense management, payroll disbursement, vendor payments, financial reporting, statutory compliance (GST, TDS).

**Daily Activities:**
- Reviews daily fee collection report
- Processes vendor invoices and purchase orders
- Generates fee defaulter reports and initiates follow-up
- Coordinates with banks for fee payment reconciliation
- Prepares monthly financial statements
- Files GST and TDS returns
- Manages petty cash and expense claims

**Problems They Face:**
- Parents paying fees to multiple bank accounts / offline causing reconciliation nightmares
- Fee concession requests having no formal approval trail
- Exam fee and annual charges being disputed by parents
- Tally data vs. ERP data not reconciling

**Permissions:**
- Full read-write: Fee Management, Accounts, Billing, Expense, Procurement modules
- No access to academic records, counseling files, or HR salary administration

---

### F5. Accounts Clerk / Fee Collector
**Permissions:**
- Read-write: Fee Collection module (fee receipt generation, payment recording)
- Read: Student fee ledger, pending dues
- No access to salary data, academic records, or procurement beyond fee-related items

---

### F6. IT Administrator / System Administrator
**Purpose:** Maintains digital infrastructure — servers, devices, internet, ERP configuration, user accounts, security monitoring.

**Daily Activities:**
- Manages user account creation, modification, suspension
- Configures role permissions as directed by Principal
- Monitors system performance and uptime
- Coordinates data backups
- Responds to IT support requests
- Updates and patches software
- Monitors security audit logs

**Permissions:**
- Full write: Technical Configuration, User Management, Permission Settings, System Audit Logs
- No access to student academic data, medical records, or financial transactions (principle: IT admins configure the system, not use it)

---

### F7. Data Protection Officer (DPO)
**Purpose:** Statutory compliance role under DPDP Act 2023. Ensures lawful data processing, manages consent, handles data subject requests, and leads breach response.

**Daily Activities:**
- Audits data access logs (who accessed what, when)
- Reviews and processes parental data requests (access, correction, erasure)
- Maintains consent registers
- Trains staff on data protection obligations
- Leads data breach investigation and response
- Reports to Principal and Board on compliance status

**Independence:** The DPO is institutionally independent — they cannot be instructed by any staff member (including Principal) to approve non-compliant data processing. Their reporting line includes direct access to the Board.

**Permissions:**
- Full read-write: Privacy & Consent module, Data Access Audit Logs, Consent Registers
- Read: Metadata of all data processing activities (what data, for what purpose, who accessed — not the raw data itself)
- Cannot read raw student academic records, medical files, or counseling notes without specific lawful basis
- Can freeze data processing operations in a breach scenario

---

### F8. Consent Officer
**Purpose:** Operational support role to the DPO. Manages day-to-day consent collection, verification, and withdrawal processing.

**Daily Activities:**
- Sends consent request notifications to new parents
- Verifies parent identity via Aadhaar-linked OTP or mobile OTP
- Processes consent withdrawal requests
- Maintains consent audit trail
- Reports to DPO

**Permissions:**
- Read-write: Consent Verification module
- Read: Parent contact details for consent communication
- No access to student academic, medical, or financial records

---

## CLUSTER G — STUDENT WELFARE & SAFETY

### G1. School Nurse / Medical Officer
**Purpose:** Manages the school health clinic, student medical records, first aid, emergency response, and routine health checks.

**Daily Activities:**
- Handles walk-in clinic visits and records them
- Reviews student allergen and chronic condition flags
- Administers first aid and refers serious cases
- Conducts routine health checks (vision, BMI, dental)
- Maintains immunization records
- Coordinates with parents on medical incidents
- Manages medical supplies inventory

**Permissions:**
- Full read-write: Clinic module, Medical Records, Health Check logs, Immunization records
- Read: Student profiles (medical section only), Emergency contact details
- No access to academic grades, fee records, or HR data

---

### G2. School Doctor (Part-time / Visiting)
**Permissions:**
- Read-write: Clinic module for active session
- Read: Student medical history for patients seen
- No persistent access to full student database

---

### G3. Child Protection Officer (CPO) / POCSO Officer
**Purpose:** Designated safeguarding lead. Receives and investigates child protection concerns. Mandatory reporter under POCSO Act.

**Daily Activities:**
- Reviews flagged behavioral or wellbeing concerns
- Investigates child protection complaints
- Coordinates with Principal, Counselor, and external authorities
- Maintains confidential case files
- Trains staff on child protection protocols
- Reports to Principal and Board directly (bypasses standard hierarchy)

**Permissions:**
- Full read-write: POCSO/Grievance module (CPO-exclusive access)
- Read: Student profiles, attendance, medical records for case-related purposes
- All access is logged and cannot be deleted
- Can initiate emergency escalation to Principal with one action

---

## CLUSTER H — TRANSPORT

### H1. Transport Manager
**Purpose:** Designs and manages the school transport system — route planning, driver management, fleet safety, GPS tracking, parent communication.

**Daily Activities:**
- Reviews morning vehicle dispatch status
- Monitors GPS fleet in real-time during peak hours
- Processes new transport enrollment requests
- Reviews driver attendance and vehicle logs
- Manages vehicle maintenance schedule
- Responds to parent transport complaints

**Permissions:**
- Full read-write: Transport module, Route Management, Driver Records, Vehicle Records, GPS Dashboard
- Read: Student transport enrollment details (home address, boarding point, parent contact)
- No access to academic grades, fee records beyond transport fees, HR salary

---

### H2. Bus Conductor / Transport Attendant
**Purpose:** Accompanies the bus, manages student boarding/deboarding, communicates student status to transport manager and parents.

**Daily Activities:**
- Marks students present/absent on the bus using the app
- Triggers SOS alert in emergency
- Communicates with Transport Manager on delays

**Permissions:**
- Read-write: Bus Attendance for their assigned route only
- Can trigger SOS alert
- Read: Student names and boarding points for their route
- No access to any other student data

---

### H3. School Bus Driver
**Permissions:**
- View: Their route schedule and student manifest for the day
- No write access to any student records
- GPS tracking is automatic (not user-controlled)

---

## CLUSTER I — HOSTEL & RESIDENTIAL

### I1. Chief Warden
**Purpose:** Overall residential operations head for boarding schools. Manages hostel infrastructure, warden staff, student welfare, and boarding parent communication.

**Permissions:**
- Full read-write: Hostel module, all hostel blocks
- Read: Student residential profiles, medical flags, parent contacts
- Can view hostel-related fee records

---

### I2. Hostel Warden (Block/House Warden)
**Purpose:** Manages a specific hostel block. Responsible for student safety, daily routines, discipline, and welfare in their block.

**Daily Activities:**
- Conducts morning and evening roll calls
- Records exeat (weekend leave) requests and approvals
- Monitors homework/prep hours
- Reports disciplinary issues
- Coordinates medical referrals to school clinic
- Communicates with parents on student welfare

**Permissions:**
- Read-write: Their assigned block's student roster, roll call records, exeat module, incident logs
- Read: Student profiles (boarding section), emergency contacts, medical flags
- No access to academic grades, fee records, or other blocks

---

### I3. Night Warden / Night Duty Staff
**Purpose:** Maintains overnight supervision and safety in hostel buildings.

**Permissions:**
- Read-write: Night roll-call log
- Can trigger emergency/medical alert
- Read: Student names and room assignments for their block

---

### I4. Matron
**Purpose:** Female warden responsible for the welfare, hygiene, and personal care of girl students in the hostel.

**Permissions:** Same scope as Hostel Warden, restricted to assigned female block.

---

## CLUSTER J — SECURITY & FACILITIES

### J1. Security Supervisor
**Purpose:** Manages the campus security team, CCTV monitoring, visitor management protocols, and emergency response coordination.

**Daily Activities:**
- Reviews daily visitor log
- Manages security guard roster
- Reviews CCTV alerts and incident reports
- Coordinates with Police on security matters
- Manages access card/RFID system

**Permissions:**
- Full read-write: Visitor Management, Gate Pass, Security Incident Log, Guard Roster
- Read: Vehicle entry logs, CCTV alert feeds
- No access to student academic, medical, or financial data

---

### J2. Security Guard / Gatekeeper
**Purpose:** Manages physical access to the campus — student entry/exit, visitor verification, vehicle management.

**Daily Activities:**
- Verifies student RFID/ID cards at entry
- Signs in visitors using OTP-verified digital register
- Issues visitor passes and alerts host teachers
- Logs vehicle entry/exit
- Reports suspicious activity

**Permissions:**
- Read-write: Visitor Entry Log, Gate Pass module
- Read: Expected visitor list, student photo for ID verification
- No access to student records, academics, or financial data

---

### J3. CCTV Administrator / Surveillance Operator
**Purpose:** Monitors live CCTV feeds and manages recorded footage for security investigations.

**Permissions:**
- View: Live CCTV feeds for their campus
- Limited access to footage retrieval (requires Principal + Security Supervisor co-authorization)
- No access to any student or HR records

---

### J4. Estate Manager / Facility Manager
**Purpose:** Manages physical infrastructure — buildings, utilities, maintenance, housekeeping, and civil works.

**Daily Activities:**
- Reviews maintenance requests and assigns contractors
- Monitors utility consumption (electricity, water)
- Manages housekeeping roster
- Tracks infrastructure compliance certificates

**Permissions:**
- Read-write: Facility Management module, Maintenance Requests, Asset Register (physical assets)
- No access to academic, financial, or student personal data

---

### J5. Housekeeping Staff / Maintenance Staff
**Permissions:**
- Write: Daily task completion log
- Read: Their assigned task list
- No access to any student, academic, or financial data

---

## CLUSTER K — CANTEEN & NUTRITION

### K1. Canteen Manager / Cafeteria In-Charge
**Purpose:** Manages cafeteria operations, menu planning, vendor management, FSSAI compliance, and student nutrition.

**Daily Activities:**
- Plans and posts weekly menu
- Monitors daily meal headcount (for PM POSHAN if applicable)
- Reviews vendor certificates and ingredient stocks
- Manages canteen staff
- Records FSSAI compliance documentation

**Permissions:**
- Read-write: Canteen module, Menu Planning, Vendor Records, FSSAI Compliance module
- Read: Student allergen flags (for menu planning)
- No access to academic, financial, or general student data

---

### K2. Canteen / Kitchen Staff
**Permissions:**
- Read: Today's menu and headcount estimate
- Write: Food preparation log
- No access to any student or administrative data

---

## CLUSTER L — VISITORS & COMMUNITY

### L1. Visitor Management Officer
**Purpose:** Dedicated role in large schools to manage the visitor workflow — pre-registration, OTP verification, pass issuance, and visitor tracking.

**Permissions:**
- Read-write: Visitor Management module
- Read: Staff and class schedules (to route visitors to correct person)

---

### L2. Parent
**Purpose:** Legal guardian of enrolled student(s). Primary external stakeholder. Pays fees, gives consent, receives communications about their child.

**Psychology:** Indian parents range from highly digitally literate (metro, private schools) to low digital literacy (semi-urban, government schools). Communication preference is heavily WhatsApp-first. They want simple, clear information about their child — not complex dashboards. Key concerns: child safety, academic performance, fee transparency, and timely communication.

**Daily Activities:**
- Views child's attendance (real-time notification if absent)
- Pays fee installments online
- Reviews homework and assignments
- Reads school circulars and announcements
- Provides digital consent for events, activities, data processing
- Books PTM appointments
- Raises service requests (TC application, bonafide certificate)

**Permissions:**
- Read: Their children's profiles, attendance, academic reports, fee ledger, timetable, homework, announcements
- Write: Fee payment, consent responses, PTM appointment booking, service requests, leave applications for child
- Absolutely no access to any other student's data
- Cannot view teacher salary, HR records, or school financials beyond their own invoices

**Communication Rights:**
- Can message: Their child's Class Teacher, Subject Teachers (within school hours only), Front Desk
- Cannot directly message Principal unless escalated
- Cannot message other parents

---

### L3. Student
**Purpose:** The primary beneficiary of the entire ERP system. All data flows ultimately serve the student's educational journey.

**Psychology:** Student experience varies dramatically by age: Foundational stage (3–8) — parents interact on their behalf; Primary/Middle (8–14) — increasing self-service; Secondary (14–18) — near-adult digital citizens who want agency over their own academic data.

**Daily Activities:**
- Views today's timetable and homework assignments
- Submits digital assignments
- Views marks and progress reports (age-appropriate)
- Reads announcements
- Books library books
- Views cafeteria menu
- Raises queries to teachers (via structured channels)

**Permissions:**
- Read: Their own timetable, homework, assignments, exam schedule, library records, cafeteria menu
- Read: Their own marks (when published by teacher)
- Write: Assignment submissions, library requests, help requests
- Absolutely no access to any other student's data, staff records, or financial information

**Communication Rights:**
- Cannot send private messages to any other student
- Can post questions in moderated class-specific study groups
- Can message assigned teacher via structured query form (not free-form chat)

---

### L4. Alumni
**Purpose:** Former students who remain connected to the institution for networking, mentoring, and institutional legacy purposes.

**Permissions:**
- Read: Alumni directory (opt-in members only), school news and events
- Write: Alumni profile updates, RSVP to alumni events
- No access to current student data, academic records, or financial information

---

# 6. ERP MODULE CATALOGUE

Each module entry contains: Why It Exists, Who Uses It, Core Features, Key Permissions, User Journeys, Benefits, Edge Cases, Common Problems It Solves.

---

## SECTION 1 — STUDENT INFORMATION SYSTEM (SIS)

### Module 1.1 — Student Master Profile
**Why It Exists:** Every interaction in the ERP begins with a student identity. This module is the single source of truth for all student data — personal, academic, medical, and family.

**Who Uses It:** All roles (with different field-level visibility based on role permissions)

**Core Features:**
- Unique Student ID (internal) + APAAR ID / PEN (national registry sync)
- Personal information: name, DOB, gender, nationality, religion, mother tongue, photo
- Family information: father/mother/guardian details, occupation, annual income bracket, contact details
- Academic information: enrollment date, current class/section, previous school details, board registration number
- Document Locker: TC from previous school, birth certificate, Aadhaar (encrypted), caste certificate, medical fitness certificate, photographs
- Medical Profile: blood group, known allergies, chronic conditions, immunization history, emergency medical instructions
- Special Needs Flag: CwSN category, disability certificate, IEP link
- RTE Flag: EWS/disadvantaged category, supporting documents
- Sibling Links: automatic family grouping for sibling discounts, combined parent communications
- Student Status: Active, On Leave, Transferred Out, Graduated, Alumnus, Deceased

**Key Permissions:**
- Class Teacher: Full read-write for their section, all fields
- Subject Teacher: Read — name, photo, class section only
- HR/Accounts: Read — name, class, family income bracket for RTE/concession purposes
- Medical Staff: Read-write — medical fields only
- Counselor: Read — academic and attendance patterns only; write — counseling notes (separate locker)
- Parent: Read — their children's full profile; write — contact details, address updates (subject to approval)
- Student: Read — their own profile, limited fields

**Benefits:**
- Eliminates duplicate data entry across multiple registers
- Enables instant certificate generation (bonafide, character, transfer)
- Supports UDISE+ and CBSE LOC auto-population

---

### Module 1.2 — Admissions & Enrollment Management
**Why It Exists:** The admission process is the school's revenue gateway and first parent experience. A disorganized admission process loses good students and creates poor first impressions.

**Who Uses It:** Admissions Officer, Front Desk, Principal, Accounts, Parents

**Core Features:**
- Inquiry Registration: online form, walk-in entry, phone inquiry log
- Lead Tracking: inquiry source, follow-up history, status pipeline (Inquiry → Applied → Document Submitted → Tested → Interview → Offered → Confirmed → Enrolled)
- Application Form: online fillable with document upload
- Entrance Test Scheduling: test slots, admit card generation, result entry
- Interview Scheduling: calendar integration, interviewer assignment
- Offer Letter Generation: automated with custom fee structure
- Document Verification Checklist: per board requirements (CBSE TC requirements, age proof, caste certificate, etc.)
- Fee Collection at Admission: registration fee, admission fee, first term fee — linked to Fee Management module
- Enrollment Confirmation: converts application to active student profile in SIS
- Waiting List Management: ranked waiting list per section, automated notifications on seat availability
- RTE Quota Management: separate pipeline for EWS applications, lottery system for RTE seat allocation

**User Journey — Parent:**
1. Visits school website, fills online inquiry form
2. Receives WhatsApp/SMS confirmation + school brochure
3. Receives test/interview date notification
4. Pays registration fee online
5. Submits documents digitally
6. Receives offer letter
7. Confirms admission, pays admission fee
8. Receives enrollment confirmation + student credentials

**Benefits:**
- Reduces paper-based inquiry forms
- Gives admission team real-time pipeline visibility
- Automates follow-up reminders for unconverted leads
- Provides conversion rate analytics per inquiry source

---

### Module 1.3 — Student Data Import
**Why It Exists:** During school onboarding and annual admissions, entering hundreds or thousands of student records one-by-one is impractical. Bulk import via Excel or CSV dramatically reduces the time to go live and eliminates manual data entry errors. This module is the primary tool for getting a school's existing student database into NEXLI quickly.

**Who Uses It:** School Admin (IT Admin, Principal, VP Admin, Accounts) — during onboarding and at the start of each academic year for new batch enrollment.

**Core Features:**

*Import Entry Points:*
- "Import Students" button prominently placed within the Student Management / SIS module
- Available from the Admissions module as an alternative to manual individual enrollment
- Accessible to School Admin, IT Admin, VP (Admin) — not available to teachers or parents

*Sample File Downloads:*
- "Download Sample CSV" button — downloads a pre-formatted CSV with all required column headers, example rows, and inline comments explaining each field
- "Download Sample Excel (.xlsx)" button — downloads a structured Excel workbook with: a "Instructions" sheet explaining each column with allowed values and formats; a "Student Data" sheet with column headers and two example rows; a "Reference Data" sheet with allowed values for dropdowns (grade, section, board, gender, RTE status, blood group, etc.)
- Sample files are always kept in sync with the current student data schema — when new fields are added to the student profile, the sample files are updated automatically

*Upload & Validation:*
- Drag-and-drop upload area or file picker — accepts .xlsx and .csv files only
- Maximum file size: 10 MB per upload (approximately 5,000–10,000 student records)
- On upload, the system runs a full pre-processing validation before any records are created:
  - Required field check: flags any row missing mandatory fields (name, DOB, class, section, parent contact)
  - Format validation: DOB must be a valid date, mobile numbers must be 10-digit Indian format, email format validation
  - Duplicate detection: checks uploaded records against existing students in the school by: name + DOB combination, APAAR ID (if provided), Aadhaar number (if provided) — configurable sensitivity
  - Invalid value check: grade/section must match the school's configured academic structure, gender values must match allowed options, board must be one of configured boards
  - Cross-row duplicate check: flags duplicate rows within the uploaded file itself

*Preview Before Import:*
- After validation, show a preview table of all records with color coding:
  - Green rows: valid, ready to import
  - Yellow rows: warnings (non-critical issues, will be imported with defaults)
  - Red rows: errors, will be skipped unless corrected
- Admin can: scroll through all records, correct inline errors in the preview table, remove specific rows, or go back and fix the source file and re-upload
- Shows summary counts: X records valid, Y warnings, Z errors before confirmation

*Import Execution:*
- Admin clicks "Confirm Import" after reviewing preview
- System processes records in background (non-blocking for large files)
- Progress bar shown during processing
- Records created in Firestore in batches using Firebase Cloud Functions

*Import Summary Report:*
- After completion, shows: Total records uploaded, Successfully created, Skipped (duplicate), Failed (validation error), Warnings (created with defaults)
- Downloadable error report: Excel file listing all failed rows with the specific error reason per row — admin can fix these and re-import
- Downloadable success report: list of all successfully created student IDs for reference
- Import history log: each import attempt is logged with timestamp, admin who ran it, file name, and summary counts — visible to IT Admin and Principal

*Duplicate Prevention Rules (Configurable):*
- School Admin can configure duplicate detection sensitivity: strict (flag if name + DOB match), moderate (flag if name + DOB + parent mobile match), lenient (flag only if APAAR ID matches)
- On detecting a potential duplicate, the system shows the existing record alongside the imported record and asks admin to choose: skip, update existing, or create new

**Benefits:**
- Reduces school onboarding time from days to hours
- Eliminates manual data entry for schools migrating from another system or from paper registers
- Standardizes data quality at point of entry through validation
- Provides a clear audit trail of how student records were created (manual vs. imported)

**Edge Cases:**
- Partial import failure (file partially processed before error): system rolls back incomplete imports and reports the failure — no partial data states
- File with mixed formats (some columns merged in Excel): validation error with specific instructions
- Import by non-admin (attempt by teacher): access denied with clear message
- Re-importing the same file: duplicate detection catches all existing records; admin sees a clear "all records already exist" message

---

### Module 1.5 — Transfer Certificate (TC) & Leaving Certificate Management
**Why It Exists:** TC issuance is legally required and involves multiple departments (academics, accounts, library, hostel). It is one of the most process-intensive administrative tasks.

**Who Uses It:** Front Desk, Class Teacher, Library, Accounts, Hostel Warden (if boarder), Principal

**Core Features:**
- TC Application: parent submits online request
- Multi-Department Clearance Workflow:
  - Library: No pending books
  - Accounts: No pending fees
  - Hostel (if applicable): Room cleared, no dues
  - Transport (if applicable): No pending transport fees
  - Class Teacher: Confirms academic record
- TC Generation: CBSE Appendix-V format (or board-specific format), auto-populated from SIS
- Digital Signature: Principal digital signature integration
- TC Register: Sequential TC numbers, issuance log
- TC Verification Portal: Receiving schools can verify TC authenticity via unique code

**Edge Cases:**
- Student owing fees: TC held until clearance; parent notified
- Disputed TC content: Goes to Principal for manual review
- Emergency TC (medical relocation): Expedited workflow with VP approval
- TC requested by court order: Legal escalation path

---

## SECTION 2 — ACADEMIC MANAGEMENT

### Module 2.1 — Timetable Management
**Why It Exists:** The timetable is the most complex scheduling problem in a school. A poor timetable causes teacher overload, room conflicts, and academic imbalance. Creating it manually in a spreadsheet takes weeks.

**Who Uses It:** VP (Academic), Academic Coordinator, All Teachers (view), Students (view), Parents (view)

**Core Features:**
- Period Configuration: number of periods, duration, break times per day
- Academic Calendar: working days, holidays, exam periods
- Teacher Load Balancing: maximum periods per day/week, subject distribution
- Room/Lab Assignment: capacity, equipment availability
- Constraint Engine: teacher availability, room availability, subject distribution rules (no two science periods back-to-back), double-period preferences
- Timetable Generation: algorithm-assisted scheduling with conflict detection
- Substitution Management: when a teacher is absent, suggests available qualified substitutes, notifies them, updates the day's timetable
- Live Timetable View: teachers and students see today's timetable dynamically (updated if substitutions occur)
- Exam Timetable: separate exam schedule with room allocation and invigilation duty assignment

**Benefits:**
- Reduces timetable creation from 2 weeks to 2 hours
- Eliminates double-booking conflicts
- Makes substitution management transparent

---

### Module 2.2 — Attendance Management
**Why It Exists:** Attendance is the most-used module in the ERP. Teachers mark it 6–8 times per day. It is also legally significant (CBSE 75% rule, court cases about TC issuance). Every minute of friction in attendance marking costs weeks of adoption.

**Who Uses It:** Every teacher (daily); Class Teacher (daily summary); Academic Coordinator (monitoring); Parents (real-time); Principal (anomaly alerts)

**Core Features:**
- Student Attendance:
  - Period-wise attendance marking per subject teacher
  - Daily consolidated attendance by class teacher
  - Biometric (fingerprint/face) and RFID integration options
  - One-tap mobile marking with class roster
  - Late arrival marking with reason logging
  - Leave pre-approval linkage (if leave approved, marked accordingly)
  - Auto-alert to parents when student marked absent (SMS + app notification)
  - 75% threshold monitoring with alert at 80%, 77%, 75% milestones
  - Medical exemption marking (linked to clinic module)
  - Monthly and cumulative attendance reports per student

- Staff Attendance:
  - Biometric device integration
  - Manual override with VP approval
  - Late arrival and early departure flagging
  - Leave integration (approved leaves auto-populate attendance)

- Bus Attendance: separate tracking by conductor (bus boarding vs. school entry)

**Edge Cases:**
- Student boards bus but not marked at school gate: alert to transport + front desk
- Attendance dispute by parent: formal dispute log with teacher resolution
- Biometric device offline: manual backup entry, sync on reconnect

---

### Module 2.3 — Lesson Plan Management
**Why It Exists:** Academic quality depends on planning. Without visibility into lesson plans, Coordinators and HODs cannot ensure curriculum coverage or provide meaningful feedback to teachers.

**Who Uses It:** All Teachers (create), HOD (review), Academic Coordinator (monitor), VP Academic (audit)

**Core Features:**
- Weekly Lesson Plan Template: topic, learning objectives, teaching methodology, resources used, assessment planned
- NCERT / Board Curriculum Alignment: topics mapped to textbook chapters and NEP 2020 competencies
- Curriculum Coverage Tracker: real-time view of how much of the syllabus has been covered vs. planned
- Peer Review Option: HODs can comment on and approve lesson plans
- Substitute Continuity: when teacher is absent, substitute can see the lesson plan for that day
- Historical Archive: lesson plans stored per academic year, can be reused/adapted next year

---

### Module 2.4 — Assessment & Gradebook
**Why It Exists:** Grading is one of the most consequential activities in a school. Assessment data must be accurate, tamper-proof, and accessible to the right people at the right time.

**Who Uses It:** Subject Teachers (enter grades), HOD (review), Class Teacher (compile), Academic Coordinator (analyze), Principal (audit), Parents (view published results), Students (view own results)

**Core Features:**
- Assessment Configuration: multiple assessment types (Unit Test, Half-Yearly, Annual, Project, Assignment, Practical, Oral)
- Marks Entry: online gradebook per teacher, per subject, per section
- Grade Calculation: automatic weightage application as per board rules
- NEP 2020 HPC Integration: competency-based grading across multiple domains
- Rubric-Based Assessment: rubric templates for project and practical work
- Question Paper Bank: store and reuse question papers with version control
- Result Publication Control: marks visible to parents/students only after teacher submits + coordinator approves
- Report Card Generation: auto-populated from gradebook, multiple formats (term report, annual, HPC)
- Board Exam Marks: CBSE internal assessment marks with moderation compliance
- Academic Analytics: class average, highest/lowest, distribution graphs, subject-wise performance trends

**Edge Cases:**
- Marks submitted after deadline: flagged for coordinator review
- Contested marks: formal re-evaluation request workflow
- Student absent for an assessment: marking rules per board (AB, EX, Medical Exemption)

---

### Module 2.5 — NEP 2020 Holistic Progress Card (HPC)
**Why It Exists:** NEP 2020 requires a 360-degree assessment that goes beyond academic marks. The HPC is mandatory for CBSE foundational and preparatory stages and best practice for all stages.

**Core Features:**
- Multi-Domain Assessment: Cognitive, Social-Emotional, Physical Health, Arts & Creativity, Vocational, Life Skills
- Self-Assessment Module: age-appropriate student self-reflection inputs
- Peer Assessment Module: structured peer feedback (anonymous for younger students)
- Teacher Observation Log: narrative comments per competency
- Parent Input Section: parent observations on learning at home
- HPC Report Generation: visual radar chart, domain-wise progress, narrative summary
- Multi-Language Output: generate HPC in English + regional language

---

### Module 2.6 — Homework & Assignment Management
**Why It Exists:** Homework communication is one of the primary reasons parents resort to WhatsApp groups. A structured module eliminates the chaos of homework being missed, duplicated, or overloaded.

**Who Uses It:** Subject Teachers (assign), Students (view, submit), Parents (view on behalf of young students), Class Teacher (monitor load)

**Core Features:**
- Homework Assignment: teacher assigns homework with subject, date, description, optional attachment, due date
- Homework Load Monitoring: auto-flag if daily homework load exceeds school policy threshold
- Digital Submission: students submit assignments digitally (for older grades)
- Submission Tracking: teacher sees who submitted and who did not
- Homework Calendar: student/parent sees all upcoming assignments in calendar view
- Automated Reminders: reminder to students/parents 1 day before due date

---

### Module 2.7 — Examination Management
**Why It Exists:** Exam operations involve scheduling, room allocation, invigilation duty, admit card generation, answer script tracking, and result publication — all of which are complex and error-prone when done manually.

**Core Features:**
- Exam Schedule Creation: dates, subjects, timings, rooms
- Invigilation Duty Assignment: auto-allocation respecting same-subject-teacher restrictions
- Hall Ticket / Admit Card Generation: per student, with photo, roll number, exam schedule
- Answer Script Tracking: receipt acknowledgment by head examiner
- Result Entry: online marks entry with duplicate verification
- Result Tabulation: automatic pass/fail calculation, grace marks application
- CBSE LOC Generation: List of Candidates export in required format for board exams
- Pre-Board Management: mock exam scheduling separate from official exam

---

### Module 2.8 — Library Management
**Why It Exists:** Libraries are under-utilized because access is cumbersome. A digital library system encourages reading culture and reduces administrative burden.

**Core Features:**
- Book Catalog: ISBN-based entry, Dewey Decimal System, digital catalog search
- Circulation: issue, return, renewal via barcode scan or manual entry
- Overdue Management: automated overdue alerts to students and parents, fine calculation
- Book Reservation: student can reserve a book currently issued to another
- New Acquisition Tracking: purchase orders, book arrivals, cataloging workflow
- Reading Programs: track student reading activity, reading challenges, book reviews
- Digital Resources: e-book subscriptions, digital periodicals management
- Inventory Audit: periodic physical verification against catalog

---

## SECTION 3 — FEE & FINANCE MANAGEMENT

### Module 3.1 — Fee Management
**Why It Exists:** Fee collection is the school's primary revenue stream. Inefficiency in fee management directly affects cash flow, creates parent disputes, and increases administrative workload.

**Who Uses It:** Accounts Staff (collect), Chief Accountant (reconcile), Principal (reports), Parents (pay), HR (salary dependency)

**Core Features:**
- Fee Structure Configuration: per class, per category (general, RTE, sibling discount, staff ward, transport, hostel)
- Fee Schedule: installment-based, term-based, or monthly with due dates
- Online Payment: UPI, net banking, debit/credit cards, payment gateway integration
- Offline Payment: cash and cheque receipt generation with unique receipt number
- Fee Ledger: per student, per academic year — all charges, payments, dues, concessions
- Sibling Discount: automatic application when siblings are enrolled
- Concession Management: need-based concession requests with approval workflow (Principal/VP approval)
- Fee Reminder: automated SMS/WhatsApp/app notification on due dates and overdue
- Defaulter Reports: class-wise, section-wise pending fee reports
- Fee Receipt: digital receipt with school stamp, shareable via WhatsApp
- Tally / Accounting Software Sync: export fee collection data to Tally
- Refund Management: fee refund requests, approval workflow, bank transfer record
- RTE Reimbursement Tracking: government reimbursement claims for EWS seats

**Edge Cases:**
- Returned cheque: flag account, notify parent, add bounce charge
- Fee concession dispute: formal escalation to Principal
- Fee paid to wrong class/head: adjustment workflow with dual authorization

---

### Module 3.2 — Expense & Procurement Management
**Why It Exists:** Schools spend on hundreds of items — stationery, lab consumables, sports equipment, maintenance, utilities. Without a procurement system, petty cash abuse and unauthorized spending are common.

**Core Features:**
- Purchase Requisition: any staff member can raise a procurement request
- Approval Workflow: VP Admin → Principal (above threshold) → Trustee (capital expenditure)
- Vendor Management: approved vendor list, rate contracts, vendor performance
- Purchase Order: auto-generated on approval
- Goods Receipt Note: acknowledgment of delivery
- Invoice Processing: three-way match (PO, GRN, Invoice)
- Expense Claims: staff expense reimbursement with receipt upload and approval
- Budget vs. Actual Tracking: per department, per category
- Petty Cash Management: daily cash register, expense log

---

### Module 3.3 — Payroll Management
**Why It Exists:** Payroll is the largest expense for any school. Manual payroll calculation for 50–300 staff is error-prone and compliance-heavy (TDS, EPF, ESI).

**Core Features:**
- Salary Structure Configuration: basic, HRA, conveyance, special allowance, DA (if applicable)
- Leave Deduction Integration: automatically deducts LOP (Loss of Pay) based on approved leaves
- Biometric Integration: auto-calculates late deductions based on attendance
- EPF/ESI Calculation: statutory deduction computation per CTC
- TDS Calculation: income tax projection and TDS per Form 16 requirements
- Payslip Generation: digital payslip per employee, password-protected PDF
- Bank Transfer File: generates NEFT/RTGS file for salary disbursement
- Statutory Returns: EPF challan, ESI return, TDS Form 24Q generation
- Arrear Calculation: backdated salary revision handling
- Full and Final Settlement: exit employee clearance, gratuity, leave encashment

---

## SECTION 4 — HUMAN RESOURCES MANAGEMENT

### Module 4.1 — Staff Records & HRMS
**Core Features:**
- Staff Master Profile: personal, educational qualifications, experience history, background verification status, employment contract
- Document Locker: degrees, B.Ed./M.Ed. certificates, police verification, Aadhaar, PAN
- Qualification Tracker: CBSE requires B.Ed. for secondary teachers — automatic compliance flag
- Contract Management: probation period tracking, contract renewal alerts
- Appraisal Management: annual performance review, goal setting, KPI tracking
- Promotion and Increment History

---

### Module 4.2 — Leave Management
**Core Features:**
- Leave Policy Configuration: CL, EL, ML, PL, SL, LOP — per category, per staff type
- Leave Application: staff applies digitally; automatic routing to supervisor for approval
- Leave Approval Workflow: HOD/Coordinator → VP/Principal for senior staff
- Leave Balance: real-time balance per employee
- Leave Calendar: class-level visibility for coordinators to manage coverage
- Leave Encashment: end-of-year calculation

---

### Module 4.3 — Recruitment Management
**Core Features:**
- Job Posting: internal and external (integration with recruitment portals)
- Application Tracking: resume pool, shortlisting, interview scheduling
- Demo Lesson Scheduling: for teacher candidates, with evaluator feedback forms
- Background Verification: police verification tracking, reference checks
- Offer Letter Generation: digitally signed
- Onboarding Checklist: new joinee document collection, system access provisioning

---

## SECTION 5 — COMMUNICATION SYSTEM

### Module 5.1 — Announcement & Circular Management
**Why It Exists:** Schools circulate dozens of notices per month — fee reminders, exam schedules, event announcements, holiday notifications. Without a structured system, these get lost in WhatsApp groups.

**Core Features:**
- Announcement Creation: rich text, attachments, scheduled publishing
- Target Audience: all staff / specific departments / all parents / specific classes / all students / specific grade level
- Priority Levels: normal, important, urgent/emergency
- Delivery Channels: in-app, SMS, WhatsApp, email (configurable per announcement)
- Acknowledgment Tracking: see who has read the circular
- Announcement Archive: searchable library of past announcements
- Multilingual Support: translate announcement to regional language before sending

**Permission Rules:**
- Emergency broadcast: Principal, VP, Director only
- Class-specific announcements: Class Teacher, Subject Teacher, Coordinator
- School-wide announcements: Principal, VP, Coordinator (with Principal approval)
- Parents cannot broadcast; they receive only

---

### Module 5.2 — Parent-Teacher Communication
**Core Features:**
- Structured Messaging: parents can initiate a message to Class Teacher or Subject Teacher
- Working Hours Enforcement: messages received outside school hours are queued for next business day; teachers not expected to respond in real-time outside hours
- PTM Appointment Booking: online slot booking for parent-teacher meetings
- Response SLA Monitoring: tracker for unanswered parent messages (VP can see)
- Communication Log: full history of parent-teacher exchanges, stored for accountability
- WhatsApp Integration: outbound notifications via WhatsApp Business API; inbound WhatsApp replies routed to ERP inbox

---

### Module 5.3 — Internal Staff Communication
**Core Features:**
- Staff Messaging: one-to-one and group messaging within the school
- Department Groups: each department has a group channel
- Committee Groups: specific groups for SMC, ICC, CPO team, etc.
- Task Assignment: Principals/VPs can assign tasks to staff within the system
- Notice Board: digital staff notice board for circulars, policy updates
- Meeting Management: agenda, minutes, action items tracking

---

### Module 5.4 — Emergency Communication
**Core Features:**
- Emergency Broadcast: one-click message to ALL parents + ALL staff simultaneously
- Emergency Categories: Fire, Medical Emergency, Natural Disaster, Security Threat, School Closure
- Multiple Channels: SMS (guaranteed delivery even without internet), app push notification, WhatsApp, auto-voice call
- Pre-Written Templates: for common emergency scenarios (enables fast activation under stress)
- Acknowledgment: parents confirm they have received the message
- SOS Alert: bus conductor or security guard triggers SOS alert — principal and transport manager notified immediately with GPS location
- Emergency Contact Cascade: if primary parent contact unreachable, auto-triggers alternate contact

---

## SECTION 6 — PARENT ENGAGEMENT

### Module 6.1 — Parent Portal
**Core Features:**
- Child Dashboard: real-time view of attendance, latest grades, upcoming events, homework due
- Fee Section: current balance, payment history, pay now button
- Communication Hub: messages, announcements, circular archive
- Academic Reports: downloadable report cards and HPC
- Consent Management: view pending consents, give/withdraw consent
- PTM Appointment: book, view, reschedule meetings
- Service Requests: TC application, bonafide certificate, leave application for child

---

### Module 6.2 — Consent Management (DPDP Compliance)
**Why It Exists:** Under DPDP Act 2023, schools cannot process a child's data without verifiable parental consent. This is not a checkbox — it requires genuine opt-in, specific to each purpose.

**Core Features:**
- Consent Request Delivery: on enrollment, new parents receive consent request with specific purposes listed
- Purpose-Specific Consent: separate consent for each data use category (academic records, medical records, photos for school events, GPS tracking, WhatsApp notifications, third-party educational tools)
- Verification: Aadhaar-linked OTP or mobile number OTP to verify parent identity
- Consent Withdrawal: parent can withdraw consent for any purpose at any time; system automatically stops processing for that purpose
- Minor Consent Age Threshold: students above 18 can give own consent; below 18, parent consent required
- Consent Audit Trail: immutable log of all consent actions with timestamp, IP address, verification method
- Re-Consent Workflow: if purpose changes, system sends new consent request automatically
- DPO Dashboard: DPO views consent status across all students, identifies gaps

---

## SECTION 7 — TRANSPORT MANAGEMENT

### Module 7.1 — Transport & Fleet Management
**Why It Exists:** Transport safety is a top parent anxiety. A school bus incident is catastrophic for reputation and legal liability. Real-time tracking and structured operations are non-negotiable.

**Core Features:**
- Student Transport Enrollment: home address, nearest boarding point, preferred route
- Route Management: route mapping, boarding points, sequence, estimated arrival times
- Driver & Conductor Records: license validity tracking, background verification, medical fitness
- Vehicle Records: RC, insurance, PUC, fitness certificate — with renewal alerts
- GPS Live Tracking: real-time vehicle position visible to Transport Manager and parents
- Speed Alert: alerts if vehicle exceeds school policy speed limit
- Bus Attendance: conductor marks students boarded/deboarded, parent sees in real-time
- Estimated Arrival Notification: parent gets push notification 15 minutes before bus reaches their boarding point
- SOS Emergency: conductor or driver triggers SOS; principal, transport manager, and parent alerted simultaneously with GPS location
- Absence Notification: if a transport-enrolled student is absent at school, parent notified, route adjusted

**Edge Cases:**
- Bus breakdown: emergency contact cascade to all parents on route, alternate arrangement coordination
- Student not boarded at stop: bus conductor alerts, parent notified, school protocol triggered
- Driver absent: substitute driver assignment workflow

---

## SECTION 8 — HOSTEL & RESIDENTIAL MANAGEMENT

### Module 8.1 — Hostel Management
**Why It Exists:** Boarding schools operate under in loco parentis obligations. Without structured residential management, student safety and welfare cannot be guaranteed.

**Core Features:**
- Room Allocation: block, floor, room number, bed assignment per student
- Roll Call Management: morning, evening, and night roll calls with digital logging; absent students flagged immediately
- Exeat (Weekend Leave) Management: student applies for home visit, warden approves, parent confirms, gate pass generated
- Guest / Parent Visit Management: pre-registration, security coordination, visit logging
- Study Hours (Prep) Monitoring: scheduled prep hours tracked, warden signs off
- Incident Reporting: behavioral, medical, safety incidents logged confidentially
- Hostel Fee Integration: hostel charges linked to fee module
- Housekeeping Roster: room inspection, cleanliness records
- Laundry Management: schedule tracking for large boarding schools
- Nutrition Tracking: meal preferences, dietary restrictions, allergen flags synced with canteen

---

## SECTION 9 — MEDICAL & HEALTH MANAGEMENT

### Module 9.1 — Clinic & Health Management
**Why It Exists:** School medical facilities are legally and morally obligated to maintain health records, respond to emergencies, and prevent communicable disease spread.

**Core Features:**
- Clinic Visit Log: date, student, complaint, diagnosis, treatment, medication given, follow-up action
- Medical Records: blood group, allergens, chronic conditions, current medications, immunization history
- Emergency Medical Information: visible to nurse and first responders without login barrier for true emergencies
- Immunization Tracking: vaccination schedule per student, overdue alerts, parent notification
- Health Check Campaigns: BMI tracking, vision screening, dental check records
- Infectious Disease Alert: if 3+ students present with similar symptoms, alert to Principal for possible outbreak protocol
- Medication Administration Log: for students on daily medication — log per dose given
- Medical Referral: if clinic refers student to external hospital, record created, parent notified
- IHP (Individualized Healthcare Plan): for students with complex medical needs (diabetic students, severe allergies, epilepsy)

---

## SECTION 10 — SECURITY & SAFETY

### Module 10.1 — Visitor & Gate Management
**Core Features:**
- Digital Visitor Register: name, purpose, person to meet, vehicle number, photo capture
- OTP Verification: visitor receives OTP on their mobile; system verifies mobile number before entry (prevents impersonation)
- Host Alert: system automatically notifies the teacher/staff being visited
- Visitor Badge / Gate Pass: printed or digital pass with time validity
- Blacklist Management: flagged individuals prevented from entry with alert to security supervisor
- Vehicle Log: vehicle entry/exit with number plate and purpose
- Expected Visitor Pre-Registration: class teachers or staff can pre-register visitors, expediting entry
- Contractor Entry: separate workflow for maintenance and construction workers

---

### Module 10.2 — POCSO & Grievance Management
**Why It Exists:** Child protection complaints require absolute confidentiality, structured investigation, and compliance with POCSO mandatory reporting obligations.

**Core Features:**
- Encrypted Complaint Filing: parents, students, or any staff member can file a complaint; end-to-end encrypted
- CPO-Only Access: only the designated CPO can open and manage complaints; Principal has emergency override
- Case Timeline: all actions, communications, and decisions logged with timestamps
- Evidence Vault: document attachments stored encrypted with audit trail
- Legal Escalation: one-click generation of POCSO complaint for police submission (24-hour obligation)
- Committee Management: ICC/POCSO committee member assignment, meeting scheduling within the case
- Case Status Tracking: open, under investigation, escalated, closed
- Anonymous Reporting: option to submit without identifying the reporter

---

### Module 10.3 — CCTV & Surveillance Management
**Core Features:**
- Camera Inventory: list of all cameras, location, status, coverage area
- Footage Request: formal request workflow — requires Principal + Security Supervisor dual authorization
- Footage Retention Policy: automatic deletion after retention period (typically 30–90 days per policy)
- Alert Feed: motion detection or unusual activity alerts from camera system
- No unauthorized access to live or recorded footage

---

## SECTION 11 — CANTEEN & NUTRITION

### Module 11.1 — Canteen Management
**Core Features:**
- Menu Planning: weekly/monthly menu publication
- Allergen Flagging: menu items flagged with common allergens; cross-referenced with student allergen list
- FSSAI Compliance: vendor license tracking, ingredient certificates, expiry monitoring
- Junk Food Policy: flag items that violate school nutrition policy
- Meal Headcount: daily headcount for PM POSHAN reporting
- Inventory Management: ingredient stock levels, reorder alerts
- Vendor Management: approved vendor list, rate contracts, delivery logs
- Canteen Feedback: students/parents can rate meals and report quality issues

---

## SECTION 12 — ASSET & FACILITY MANAGEMENT

### Module 12.1 — Asset Management
**Core Features:**
- Asset Register: all physical assets — furniture, equipment, vehicles, IT assets, lab equipment, sports equipment
- Asset Tagging: QR code or barcode per asset for tracking
- Depreciation Tracking: financial depreciation calculations linked to accounts
- Maintenance History: service records per asset
- Disposal Management: formal approval process for asset disposal

---

### Module 12.2 — Facility & Infrastructure Management
**Core Features:**
- Maintenance Request: any staff member can raise a facility issue
- Work Order Management: assignment to maintenance staff or external contractor
- Preventive Maintenance Schedule: recurring tasks (AC servicing, fire extinguisher checks, generator maintenance)
- Compliance Certificate Tracking: fire NOC, building safety certificate, lift inspection — with auto-renewal alerts
- Utility Monitoring: electricity and water consumption tracking
- Space Booking: book halls, labs, conference rooms for events or classes

---

## SECTION 13 — COMPLIANCE & GOVERNANCE

### Module 13.1 — Compliance Calendar & Documentation
**Core Features:**
- Compliance Event Database: all regulatory deadlines, auto-populated for board type
- Alert System: 90-day, 60-day, 30-day, 7-day alerts to responsible person
- Document Vault: all compliance certificates stored digitally with expiry tracking
- Checklist Management: CBSE affiliation checklist, UDISE+ checklist, RTE compliance checklist
- Audit Report Generation: one-click pre-populated reports for common government inspections

---

### Module 13.2 — UDISE+ Reporting
**Core Features:**
- Auto-Population: pulls data from all modules (enrollment, teachers, infrastructure, results)
- Annual Data Snapshot: locks data at a point in time for annual submission
- Format Compliance: output in UDISE+ required format
- Submission Tracking: records submission date, reference number

---

### Module 13.3 — RTE Quota Management
**Core Features:**
- EWS Enrollment Tracking: separate register for RTE students
- Document Management: supporting documents for each EWS seat
- Lottery Management: computer-based random selection for RTE seat allocation
- Reimbursement Claim Generation: state-wise format for government reimbursement
- Claim Status Tracking: amount claimed, amount received, pending amounts

---

## SECTION 14 — ANALYTICS & REPORTING

### Module 14.1 — Principal Command Dashboard
**Core Features:**
- Real-Time Overview: today's attendance (staff + students), fee collection today, pending approvals, active alerts
- Academic Health: class-wise performance trends, subject failure rates, at-risk student list
- Compliance Status: upcoming deadlines, overdue items
- Financial Health: monthly fee collection vs. target, outstanding dues
- Safety Status: clinic visits today, transport status, visitor log
- Customizable Widgets: principal configures their own dashboard layout

---

### Module 14.2 — Academic Analytics
**Core Features:**
- Student Performance Trends: individual student trajectory over time
- Class Comparison: section A vs. B vs. C performance
- Subject Analysis: subject-wise class averages, identify weak subjects
- At-Risk Student Identification: students with declining grades + attendance below threshold
- Teacher Effectiveness: class performance under different teachers (Principal-only view, never shared)
- Board Exam Prediction: projected board scores based on internal assessment trend

---

### Module 14.3 — Financial Analytics
**Core Features:**
- Revenue Dashboard: fee collection by category, by class, by month
- Collection Efficiency: % of expected fees collected on time
- Outstanding Dues Analysis: aging analysis — 0–30 days, 30–60 days, 60+ days overdue
- Expense Analysis: budget vs. actuals by department
- Payroll Cost Analysis: payroll as % of revenue trend

---

### Module 14.4 — Custom Report Builder
**Core Features:**
- Drag-and-drop report builder for Principal and Accounts
- Export to Excel, PDF, or UDISE+ format
- Scheduled Reports: automatically email reports on a schedule

---

## SECTION 15 — SPECIAL MODULES

### Module 15.1 — Special Education & IEP Management
**Core Features:**
- CwSN Student Profiles: disability category, assessment reports, therapy history
- IEP Creation & Management: goals, accommodations, modifications, responsible teachers
- IEP Progress Tracking: periodic review, goal achievement measurement
- Therapy Session Logs: speech, occupational, physical therapy records
- Accommodation Flags: automatic notification to subject teachers of required accommodations
- CBSE/NIOS Special Allowances: track and apply exam accommodations (extra time, scribe)

---

### Module 15.2 — Event & Activity Management
**Core Features:**
- Event Calendar: annual day, sports day, cultural programs, competitions
- Participant Registration: student and team registration for events
- Results and Achievement Recording: individual and team achievements logged to student profile
- Permission Slips: digital permission forms for off-campus events with parent acknowledgment
- Budget Management: event-wise expense tracking

---

### Module 15.3 — Alumni Management
**Core Features:**
- Alumni Registry: automatic transition from active student to alumni on graduation
- Alumni Directory: opt-in profile with current occupation, location, social links
- Alumni Events: reunion invitations, networking events
- Mentorship Program: alumni-student mentorship matching
- Donation Management: alumni contribution tracking (for institutions that accept)

---

### Module 15.4 — School Management Committee (SMC) Portal
**Core Features:**
- SMC Member Directory: elected members, terms, contact details
- Meeting Management: agenda, attendance, minutes, action items
- Budget Visibility: SMC members view school development fund budget
- School Development Plan: collaborative planning with progress tracking
- Government Report Generation: SMC reports required for government schools

---

# 7. COMMUNICATION ARCHITECTURE

## 7.1 Permission Matrix — Who Can Message Whom

| Sender | Can Message | Cannot Message | Notes |
|---|---|---|---|
| Super Admin (NEXLI) | School Admins (Principal / IT Admin) of any registered school via platform announcements | Individual teachers, parents, students | Platform-layer communication only; uses Platform Announcement module |
| Director | All staff, Principals, any role | — | Full chain access |
| Principal | All staff, all parents, all students | — | Campus-wide authority |
| VP (Academic / Admin) | All staff on campus, parents (for academic/admin matters) | Direct student private messages | Via class/group channels |
| Academic Coordinator | Teachers in their segment, Class Teachers, parents via announcement | Other segment's staff directly | |
| HOD | Department teachers, students via study groups | Other departments' staff directly | |
| Class Teacher | Students in their class, parents of their class students, school announcement board | Parents of other classes, other students | Core communication role |
| Subject Teacher | Students in their classes (via study group), parents (through class teacher system) | Direct parent private messages | Parent communication routes through class teacher |
| HR Manager | All staff (for HR matters) | Students, parents | HR-specific channel |
| Chief Accountant | Parents (fee communications), staff (payroll matters) | Students (except for specific fee queries) | Fee-focused channel |
| School Nurse | Parents of students seen at clinic, class teacher for health alerts | Direct messaging to all parents | Emergency health alerts to Principal |
| Hostel Warden | Parents of their block students, other wardens, transport | Parents of other blocks | |
| Transport Manager | All parents on transport (for transport matters), conductors, drivers | Students directly | |
| Security Supervisor | Principal, Security Guards, Transport Manager | Parents, Students | Internal security channel |
| Parent | Class Teacher, Subject Teacher (via structured form), Front Desk | Principal (direct — goes through front desk), other parents, other students, teachers of other classes | |
| Student | Teachers (via structured query — not free chat), school announcement (read-only) | Other students (no direct P2P), teachers (no private chat), parents, admin | Study group participation is moderated |
| Alumni | Alumni network members (opt-in) | Current students, any staff (except alumni coordinator) | Alumni portal only |

## 7.2 Communication Channels

| Channel | Purpose | Who Can Use | Key Rules |
|---|---|---|---|
| Emergency Broadcast | Campus-wide emergency alert | Principal, VP, Director only | All channels triggered simultaneously; acknowledgment required |
| School Announcement | Official circulars and notices | Principal, VP, Coordinators | Approval required for school-wide; class teachers for class-specific |
| Class Notice Board | Class-specific updates | Class Teacher, Subject Teacher | Visible to parents and students of that class only |
| Parent Inbox | Direct parent-teacher communication | Class Teacher → Parent (push); Parent → Class Teacher (pull) | Working hours only; logged for accountability |
| Staff Internal Chat | Inter-staff communication | All staff | Department groups + individual; no student access |
| Study Groups | Academic discussion for students | Subject Teacher moderates; students post questions | Teacher-moderated; no student-to-student private messages |
| PTM Channel | Appointment booking and meeting notes | Parent + Class Teacher / Subject Teacher | Structured booking; notes shared post-meeting |
| Emergency SOS | Physical safety alert | Transport Conductor, Security Guard, Medical Staff | Instantly notifies Principal, VP, Transport Manager, parents |
| WhatsApp Integration | Outbound notification delivery | System-generated only | Inbound WhatsApp replies route to ERP inbox; not free-form |

## 7.3 Working Hours Communication Policy

- School communication hours: 7:30 AM — 6:00 PM on school days
- Messages received by parents outside hours: delivered immediately but teacher response SLA begins next school day at 8 AM
- Emergency communications bypass working hours restriction (broadcast enabled 24/7)
- Teachers' personal mobile numbers are never shared via the ERP; all parent contact routes through the ERP messaging system

## 7.4 Banned Communication Patterns

| Pattern | Reason |
|---|---|
| Student-to-student direct messages | Cyberbullying prevention; POCSO compliance |
| Teacher-to-student private messages outside study groups | Safeguarding; POCSO risk mitigation |
| Parent-to-parent direct messages | Privacy; potential harassment risks |
| Anonymous peer-to-peer messages (except grievance reporting) | Accountability |
| Staff sharing personal contact details via ERP | Maintains professional boundaries |
| Bulk parent data exports for external communication | DPDP Act compliance |

## 7.5 Escalation Communication Chain

| Situation | First Contact | Escalation 1 | Escalation 2 | External |
|---|---|---|---|---|
| Academic concern | Class Teacher | Academic Coordinator | VP (Academic), Principal | — |
| Fee dispute | Accounts Clerk | Chief Accountant | Principal | — |
| Student safety / wellbeing | Class Teacher | Counselor, CPO | Principal, Board | Police, NCPCR (POCSO) |
| Medical emergency | School Nurse | Principal, parent | Ambulance, hospital | — |
| Transport emergency | Bus Conductor (SOS) | Transport Manager, Principal | Parent, Police | — |
| Harassment complaint (staff) | ICC member | ICC Chairperson | Principal, Board | District Officer (POSH) |
| Data breach | IT Admin | DPO | Principal, Board | DPBI (72-hour window) |
| Infrastructure safety | Estate Manager | VP (Admin) | Principal | Municipality, Fire Dept |
| Child protection | CPO | Principal | Board | Police (24-hour obligation) |

---

# 8. AI OPPORTUNITIES

## 8.1 Guiding Principles for AI in NEXLI
- AI suggests; humans decide. No AI action modifies student records without human confirmation.
- All AI models must be trained on de-identified data only.
- AI cannot be used to make final decisions on admission, TC issuance, or disciplinary action.
- Every AI recommendation must show its confidence level and reasoning (explainable AI).
- Parents and students must be informed when AI-based analysis influences a decision about them.

## 8.2 AI Opportunities by Role

### Principal
| Task | AI Opportunity |
|---|---|
| Morning situational review | Automated morning briefing: attendance anomalies, fee alerts, compliance deadlines — delivered as a 3-point summary |
| At-risk student identification | AI flag: students whose attendance + grade trend predicts academic risk in the next 4 weeks |
| Staff performance monitoring | AI pattern detection: teacher lesson plan delays, attendance irregularities, parent complaint clusters |
| Fee defaulter prediction | AI prediction: which families are likely to default this term based on payment history |
| Compliance deadline management | Proactive compliance assistant: 90-day action plan for upcoming deadlines |

### Class Teacher
| Task | AI Opportunity |
|---|---|
| Attendance marking | Smart auto-fill: suggest attendance based on patterns (flag outliers for manual review) |
| Report card comments | AI-generated first draft comments based on assessment data and attendance; teacher edits and personalizes |
| Parent communication | Suggest message templates based on situation (first absence, repeated late, exam score drop) |
| At-risk student alert | Class-level weekly digest: students showing combined attendance + grade decline |

### Subject Teacher
| Task | AI Opportunity |
|---|---|
| Lesson plan creation | AI curriculum assistant: suggest lesson plan aligned to NCERT topic + NEP 2020 competencies |
| Question paper generation | Generate question paper drafts from the topic + difficulty level + question type inputs |
| Grade analysis | Auto-analysis after marks entry: which questions students struggled with most, topic-level gap analysis |
| Homework differentiation | Suggest different-level homework sets for advanced, average, and struggling students in the class |

### Academic Coordinator
| Task | AI Opportunity |
|---|---|
| Substitute scheduling | Auto-suggest qualified available substitutes when teacher marks absent before 7:30 AM |
| Curriculum coverage monitoring | Alert: sections that are more than 15% behind the curriculum pacing plan |
| PTM preparation | Generate data summary for each parent meeting: attendance, marks trend, teacher observations |

### Counselor
| Task | AI Opportunity |
|---|---|
| At-risk identification | AI referral trigger: automatically flag students with attendance < 75%, multiple teacher behavioral flags, or grade drop > 20% |
| Resource matching | Suggest relevant counseling resources, worksheets, or intervention programs based on presenting concern category |

### Accounts / Finance
| Task | AI Opportunity |
|---|---|
| Fee defaulter prediction | Predict non-payment probability 30 days before due date; enable proactive outreach |
| Expense anomaly detection | Flag unusual expense patterns or vendor invoices that deviate from historical norms |
| Financial forecasting | Project end-of-term fee collection and cash position based on enrollment and collection trends |

### Transport Manager
| Task | AI Opportunity |
|---|---|
| Route optimization | AI route re-planning when student enrollment on a route changes or traffic patterns shift |
| Driver fatigue monitoring | Flag drivers working more than policy hours or with late arrival patterns |
| Predictive maintenance | Alert based on vehicle mileage and service history: suggest next service before breakdown risk |

### HR Manager
| Task | AI Opportunity |
|---|---|
| Leave pattern analysis | Identify staff with unusual Monday/Friday leave patterns; surface for HR review |
| Payroll anomaly detection | Flag unusual salary calculations before disbursement |
| Retention risk | Predict staff likely to resign based on leave frequency, performance trends, and tenure patterns |

### Parents
| AI Opportunity | Description |
|---|---|
| Regional language communication | Auto-translate all school communications to parent's preferred language |
| Learning support suggestions | Suggest home learning activities based on child's performance gaps (generated by AI from gradebook data) |
| Fee payment nudge | Smart reminders timed to parent's payment behavior patterns, not just due dates |

### Students (Secondary Level)
| AI Opportunity | Description |
|---|---|
| Personalized practice | Generate practice questions in weak topics based on assessment history |
| Study plan suggestion | Recommend study schedule for upcoming exam based on syllabus coverage and time available |
| Career guidance | Match student's academic strengths and interests to career and stream options |

## 8.3 AI Automation vs. Human Control

| Category | Examples | Policy |
|---|---|---|
| Fully Automatable | Fee reminders, attendance alerts, compliance notifications, parent communication translations | Can run without human review |
| AI-Assisted (Human Edits) | Report card comments, lesson plan drafts, question papers, substitute suggestions | AI generates draft; human reviews and approves before action |
| Human-Controlled (AI Informs Only) | Disciplinary decisions, TC issuance, student academic risk flags, staff performance reviews | AI surfaces data and recommendations; final decision is always human |
| AI Prohibited | Admission selection, final exam grading, legal/compliance decisions, POCSO case handling | No AI involvement; fully human |

---

# 9. UX & DESIGN PRINCIPLES

## 9.1 Design Philosophy
NEXLI's design must reflect the reality of its users:
- A teacher in a noisy staffroom marking attendance on a 3-year-old Android phone with 2G internet
- A parent in a semi-urban town checking their child's fee balance on a basic WhatsApp-capable phone
- A principal reviewing the morning situation while walking from the gate to their office
- A trustee in a board meeting wanting a 30-second school status update on their iPad

Every design decision is tested against these four scenarios.

## 9.2 Role-Specific Dashboard Design

### Principal Command Dashboard
- **Above the fold (first screen, no scroll):** Today's attendance %, fee collection today, critical alerts count, pending approvals
- **Quick Actions:** Emergency broadcast, approve TC, view at-risk students, message a teacher
- **Visual Design:** Red/orange/green status indicators, not tables of numbers; exception-based (only shows what needs attention)
- **Load time:** < 3 seconds on 3G connection

### Teacher Dashboard
- **Above the fold:** Today's timetable, next period details, pending homework submissions, quick attendance button
- **One-tap attendance:** Period attendance marked in under 30 seconds
- **Design principle:** Minimize cognitive load during hectic school days; batch administrative tasks to specific windows

### Parent Dashboard
- **Above the fold:** Child's attendance today, next fee due date, latest announcement, homework due tomorrow
- **Language:** Default to parent's registered language; every screen in simple, clear language (no ERP jargon)
- **Design principle:** WhatsApp-like familiarity; avoid "enterprise software" visual language

### Student Dashboard
- **Above the fold:** Today's timetable, pending homework, upcoming exams
- **Design principle:** Age-appropriate — different UI for foundational stage (icon-heavy) vs. secondary stage (text-rich)

## 9.3 Mobile-First Requirements
- All critical workflows must work on Android devices with 1GB RAM and 3G internet (Indian mid-range phone baseline)
- Offline capability for: attendance marking (syncs when online), homework viewing, timetable access
- App size: < 30 MB initial download
- SMS fallback: critical alerts (absence, fee due, emergency) delivered via SMS even without internet
- WhatsApp Business API: primary communication delivery channel for parents who don't use the app

## 9.4 Accessibility Standards
- WCAG 2.1 AA compliance minimum
- Screen reader support for visually impaired staff
- Adjustable text size across all screens
- Color-blind-safe palette (no red-green-only differentiation)
- Regional language support: English + Hindi + 10 major regional languages (Marathi, Tamil, Telugu, Kannada, Gujarati, Bengali, Malayalam, Punjabi, Odia, Assamese)

## 9.5 Data Entry Principles
- No field requires more than 2 taps to reach from the relevant dashboard
- Attendance marking: maximum 3 screens from login to complete
- Fee payment (parent): maximum 4 steps from login to payment confirmation
- Auto-save all draft entries; never lose work due to network interruption
- Smart defaults: pre-fill known values; only ask for what changes
- Inline validation: show errors as user types, not after submission

## 9.6 Error and Edge Case Handling
- Offline queue: actions taken offline are queued and synced automatically with conflict resolution
- Clear error messages in local language; never show technical error codes to end users
- Graceful degradation: if a feature is unavailable, show a clear message and suggest alternative action
- Undo support: any accidental deletion or submission triggers an undo option (30-second window)

## 9.7 Notification Design
- Push notifications must be actionable (contain enough context + deep link to relevant screen)
- Maximum 5 push notifications per day per user in normal operations (prevent notification fatigue)
- Emergency notifications bypass limits
- Notification preferences: parents can opt down to SMS-only; must not opt out of emergency or safety notifications

---

# 10. SECURITY & DATA GOVERNANCE

## 10.1 Authentication & Access Control
- Multi-Factor Authentication (MFA): mandatory for all admin, Principal, VP, HR, Accounts, IT Admin roles; optional but encouraged for teachers
- Strong Password Policy: minimum 10 characters, complexity requirements, 90-day rotation for admin roles
- Session Management: auto-logout after 30 minutes of inactivity (configurable by role)
- Single Sign-On (SSO): support for Google Workspace and Microsoft 365 for schools using these platforms
- Failed Login Lockout: 5 failed attempts locks account for 15 minutes; 10 attempts triggers security alert to IT Admin
- Device Registration: admin accounts can only log in from registered devices; unknown device triggers MFA challenge

## 10.2 Role-Based Access Control (RBAC)
- Every user has exactly one primary role, with optional secondary role (e.g., Class Teacher + Sports Coordinator)
- Permission inheritance: secondary role permissions do not exceed primary role permissions
- Time-bound permissions: substitute teacher permissions active only during assigned period
- Principle of Least Privilege: default state for any new role is no access; permissions explicitly granted only
- Permission audit: quarterly review of all role permissions required
- Emergency access: in emergency, Principal can grant temporary elevated permissions with mandatory justification log

## 10.3 Data Encryption & Storage
- All data encrypted at rest (AES-256) and in transit (TLS 1.3)
- Student personal data hosted exclusively in India (AWS Mumbai / Google Cloud Mumbai region — DPDP Act compliance)
- Sensitive fields (Aadhaar, medical records, counseling notes, financial records) stored in separate encrypted vault with separate access keys
- Database backups: daily incremental, weekly full; stored in geo-redundant Indian region
- Backup retention: 7 years for academic records (CBSE requirement), 3 years for financial records, 1 year for communication logs

## 10.4 Audit Logging
- Every data read, write, export, or delete is logged with: user ID, role, timestamp, IP address, action performed, record affected
- Audit logs are immutable — cannot be modified or deleted by any user including IT Admin
- DPO has full audit log read access; IT Admin can see technical system logs only
- Automated anomaly detection: unusual data access patterns (e.g., bulk student data export at 2 AM) trigger security alert
- Retention: audit logs retained for 5 years minimum

## 10.5 Data Breach Response Protocol
1. Detection: automated alert triggers on anomalous access pattern or intrusion detection system alert
2. Containment (T+0): IT Admin suspends affected accounts, isolates affected systems
3. Assessment (T+4 hours): DPO and IT Admin assess scope — what data, how many students, what risk
4. Notification (T+24 hours): Notify Principal and Board
5. Regulatory Notification (T+72 hours): DPO notifies Data Protection Board of India (DPBI) in prescribed format
6. Parent Notification (T+72 hours): Notify affected parents via multiple channels with clear information about what happened and what they should do
7. Post-Incident Review (T+7 days): Root cause analysis, remediation plan, policy updates

## 10.6 Data Retention & Deletion Policy
| Data Category | Retention Period | Deletion Method |
|---|---|---|
| Academic records (marks, attendance, certificates) | 7 years post-graduation | Secure deletion with audit trail |
| Financial records (fee, payroll) | 7 years | Secure deletion per accounting standards |
| Medical records | 7 years (3 years post-majority for students) | Secure deletion |
| Communication logs | 1 year | Automatic purge |
| Counseling records | 5 years | Manual deletion with DPO approval |
| Visitor logs | 1 year | Automatic purge |
| CCTV footage | 30–90 days per school policy | Automatic overwrite |
| Recruitment records (unsuccessful) | 6 months post-decision | Secure deletion |

## 10.7 Multi-Tenant Security (School Chains)
- Complete data isolation between campuses — one campus cannot see another campus's student data
- Chain-level admin access is explicitly logged and monitored
- Cross-campus data aggregation available only in anonymized, aggregate form for chain analytics
- Each campus has a unique encryption key; compromise of one campus does not expose others
- Tenant-level backup and recovery independent of other campuses

## 10.8 Third-Party Integration Security
- All third-party integrations (payment gateways, GPS providers, WhatsApp API, Tally) reviewed for data security compliance before integration
- Minimum data sharing: only the data the third party absolutely needs
- Third-party access is logged in the audit trail
- Integration contracts include data processing agreements and breach notification obligations
- Aadhaar data is never shared with third parties; OTP verification uses UIDAI API without exposing Aadhaar number

---

# 11. MISSING OPPORTUNITIES & COMPETITIVE DIFFERENTIATION

## 11.1 Most Overlooked Features in Existing School ERPs

### 1. Infrastructure Safety Compliance Calendar
Most ERPs ignore the legal compliance lifecycle of school infrastructure. Schools risk fire safety certificate lapses, drinking water quality compliance failures, and building safety certificate expiry. NEXLI must provide automated compliance calendars with 90-day pre-alerts for every certificate — fire NOC, structural safety, lab safety, lift inspection, drinking water test, electrical audit.

### 2. Government Portal Direct Connectors
Every state has its own education data portal (RAJPSP, TN-EMIS, UP PRERNA, Maharashtra SARAL). Schools currently do double data entry — once in their ERP, once in the government portal. NEXLI should build direct API connectors for top 10 state portals, eliminating this duplication and saving 20+ hours per school per year.

### 3. RTE Quota Reimbursement Management
Private schools with EWS students are entitled to government reimbursement. Most schools fail to claim fully due to documentation chaos. NEXLI should provide end-to-end RTE reimbursement management: seat tracking, document audit, claim generation in state-specific format, and claim status tracking.

### 4. Counselor Referral Pipeline
Teachers see distress signals in students every day. Currently, there is no formal system to refer a student to counseling. NEXLI should provide a structured, confidential referral workflow: teacher raises a concern (no diagnostic language, just observation) → counselor is notified → parent is contacted if required → case is tracked confidentially without the referring teacher having access to counseling session details.

### 5. CBSE Board Exam End-to-End Integration
The CBSE LOC (List of Candidates) and OASIS portal integration is one of the most time-consuming compliance tasks for Class 10/12 schools. NEXLI should pre-populate LOC from the SIS, validate against CBSE eligibility criteria (attendance, internal marks), and generate the submission file in the exact CBSE-required format. Same for admit card management, internal mark moderation, and result reconciliation.

### 6. Staff Mental Health & Wellbeing Monitoring
Teacher burnout is an epidemic in Indian schools but is never addressed by any ERP. NEXLI could introduce an anonymous staff wellbeing pulse — a weekly 3-question anonymous check-in that gives the Principal a wellbeing score for their staff without identifying individuals. Early intervention before resignations.

### 7. Parent Financial Hardship Workflow
When families hit financial difficulty mid-year, they rarely formally apply for fee concessions — they just stop paying. NEXLI should provide a dignified, confidential fee concession application pathway, with a structured review workflow, Principal approval, and a payment plan builder. This recovers more revenue than aggressive defaulter notices.

### 8. Alumni Career Tracking
Schools rarely track where their alumni go. This is missed institutional intelligence. NEXLI alumni module should track 5-year, 10-year outcomes: university enrolled, career field, professional milestone. This data powers: marketing (school's pride), career guidance for current students (hearing from alumni), and institutional legacy.

### 9. Substitute Teacher Quality Matching
Current ERPs just fill the substitution gap by finding any available teacher. NEXLI should match substitutes by: subject qualification, familiarity with the class, lesson plan availability, and student feedback from previous substitute sessions. Quality-matched substitution, not just gap-filling.

### 10. Multi-Language Report Card
Every Indian school serves families whose preferred language is not English. Yet report cards are universally in English. NEXLI should generate HPC and report cards in the parent's registered language automatically — not just a translation, but a culturally appropriate framing of assessment data.

### 11. Chain-Level Benchmarking
For school chains, no existing ERP enables meaningful cross-campus comparison. NEXLI should provide chain-level benchmarking dashboards: academic performance normalized for student demographic, fee collection efficiency, teacher retention rates, compliance health scores — enabling the Director to identify which campuses need support and what best practices to replicate.

### 12. Exam Stress & Wellbeing Calendar
The period around board exams and annual exams is the highest-risk time for student mental health. NEXLI should integrate an exam stress protocol: auto-notify counselor when exam period begins, trigger parent awareness communications, schedule proactive wellbeing check-ins, and monitor clinic visit spikes during exam weeks.

### 13. Digital Diary / Almanac
The school almanac/diary is the oldest parent-school communication tool. Most schools still use paper diaries that get lost and never reach parents. NEXLI should replace the physical diary with a digital almanac: daily homework, weekly schedule, school calendar, leave applications, remarks — all in one app interface accessible to parents in real-time.

### 14. Visitor Blacklist Intelligence
Currently, visitor blacklists are manual. NEXLI should integrate with the National Sex Offender Registry (where available) and allow inter-school blacklist sharing within a chain — if a person is flagged at one campus, they are automatically flagged at all chain campuses.

### 15. Boarding School Night Emergency Protocol
Boarding schools are alone in managing medical and safety emergencies in the middle of the night. NEXLI should provide a structured night emergency protocol: night warden triggers alert → on-call nurse/doctor notified → parents called → ambulance coordination → principal emergency notification — all from a single SOS button with GPS location and student medical history instantly accessible to emergency responders.

## 11.2 The NEXLI Differentiator — School Operating System Vision

NEXLI is not just another School ERP. Existing ERPs are data management tools. NEXLI is a **School Operating System** — the intelligent layer that connects every aspect of school operations and enables better decisions by every stakeholder.

**5 Layers of the NEXLI School Operating System:**

1. **Data Layer** — Unified, real-time data fabric connecting all school operations (replaces fragmented registers)
2. **Compliance Layer** — Automatic regulatory compliance built into every workflow (DPDP, NEP 2020, RTE, CBSE, POCSO)
3. **Safety Layer** — Proactive child and campus safety monitoring with real-time alerts and response protocols
4. **Intelligence Layer** — AI-powered insights and predictions that surface what matters before it becomes a crisis
5. **Communication Layer** — Structured, safe, professional communication between every stakeholder with appropriate boundaries

**The NEXLI Competitive Promise:**
- To a Principal: "You will never miss something important again."
- To a Teacher: "Every administrative task will take less than a minute."
- To a Parent: "You will always know your child is safe and learning."
- To a Trustee: "You will always know your school is compliant and financially healthy."
- To a Director: "You will know which schools in your chain need attention before they ask."

---

## APPENDIX A — Glossary of Key Terms

| Term | Definition |
|---|---|
| APAAR ID | Academic Bank of Credits ID — national student identity number per NEP 2020 |
| CBSE | Central Board of Secondary Education — India's most prevalent school board |
| CwSN | Children with Special Needs |
| DPDP Act | Digital Personal Data Protection Act 2023 |
| DPO | Data Protection Officer |
| DPBI | Data Protection Board of India |
| EWS | Economically Weaker Section — beneficiaries of RTE 25% reservation |
| HPC | Holistic Progress Card — NEP 2020 360-degree assessment report |
| IEP | Individualized Education Program — for CwSN students |
| IHP | Individualized Healthcare Plan — for students with complex medical needs |
| LOC | List of Candidates — CBSE board exam enrollment submission |
| NEP 2020 | National Education Policy 2020 |
| OASIS | CBSE portal for school data returns |
| PEN | Permanent Education Number — national student identifier |
| POCSO | Protection of Children from Sexual Offences Act 2012 |
| POSH | Prevention of Sexual Harassment at Workplace Act 2013 |
| RTE | Right to Education Act 2009 |
| SMC | School Management Committee — parent-led governance body |
| SUPW | Socially Useful Productive Work — CISCE assessment component |
| TC | Transfer Certificate |
| UDISE+ | Unified District Information System for Education |

---

---

# 12. SUPER ADMIN SYSTEM — PLATFORM COMMAND CENTER

## 12.1 Overview
The Super Admin system is a dedicated, isolated layer of NEXLI that operates entirely above the school-level ERP. It is the control panel for the NEXLI platform itself — the tool used by the NEXLI product owner to manage every registered school, their subscriptions, their lifecycle, and the health of the entire platform.

The Super Admin dashboard is a separate application (or a clearly separated section of the NEXLI web app) that is never accessible to any school-level user. It has its own authentication flow, its own navigation, and its own data scope.

---

## 12.2 Super Admin Dashboard

**Purpose:** Provides a real-time command center view of the entire NEXLI platform. The first screen after Super Admin login must answer in one glance: Is the platform healthy? Are schools active and engaged? Are there any billing or compliance issues requiring attention?

**Dashboard Sections:**

### Platform Health Overview (Top of Dashboard)
- Total registered schools (all-time)
- Active schools (subscription status = Active)
- Paused schools count
- Suspended schools count
- Platform uptime percentage (current and 30-day rolling)
- Firebase error rate (last 24 hours)
- Total active users across all schools (last 24 hours)
- Alerts panel: critical issues requiring immediate attention (overdue subscriptions, system errors, failed imports)

### School Activity Feed
- Chronological feed of recent platform events: new school registered, school subscription renewed, school suspended, bulk student import completed, school account settings changed
- Filterable by event type and date range

### Subscription Health Summary
- Pie/bar chart: Active vs. Paused vs. Suspended vs. Trial schools
- Renewals due in the next 30 days (with school names and amounts)
- Overdue subscriptions (past renewal date, unpaid)
- MRR (Monthly Recurring Revenue) trend chart
- Schools with declining usage (engagement risk signal)

### Feature Usage Heatmap
- Which modules are being actively used across all schools
- Identifies under-utilized features for product improvement decisions
- Average daily active users per school tier

---

## 12.3 School Management

### School Registry
The complete list of all schools registered on the NEXLI platform. Searchable, filterable, sortable.

**School Record Contains:**
- School name, logo (ImageKit URL), board, type, city, state
- School Admin contact (name, email, mobile)
- Subscription plan, billing cycle, renewal date
- Subscription status: Trial / Active / Paused / Suspended / Terminated
- Onboarding completion percentage
- Last active date
- Total students enrolled (aggregate count — not individual records)
- Total staff count (aggregate)
- Modules enabled for this school
- Notes field (Super Admin internal notes about the school)

**Actions Per School (from registry):**
- View School Profile (detailed view)
- Edit School Details and Settings
- Manage Subscription (activate, pause, suspend, resume, terminate)
- Access School Configuration Panel
- Send Message to School Admin
- View School Activity Log
- Impersonate School Admin (support access — logged in audit trail)
- Delete School (requires confirmation + mandatory reason + 30-day soft-delete before permanent deletion)

### Adding a New School
**Step-by-step onboarding flow:**

1. **School Basic Details:** School name, address, city, state, pincode, phone, email, website
2. **School Classification:** Board (CBSE / ICSE / State / IB / Cambridge), School type (Day / Boarding / Chain branch / Government), School size tier
3. **School Admin Account:** Create the School Admin user — name, email, mobile number; system generates temporary password and sends welcome email
4. **Subscription:** Select the price band (auto-suggested from the expected student count), billing cycle (monthly/annually), start date, trial period (if applicable). The Super Admin may set a custom/founding price here that overrides the band price.
5. **Initial Configuration:** Academic year setup, grade structure (Pre-KG through Class 12 as applicable), section names
6. **Module Activation:** Every school gets ALL features on every plan. Toggle off only modules that don't apply operationally (e.g. Hostel for a day school) or paid external integrations (WhatsApp/SMS) — module availability is **never** tied to the price band.
7. **Onboarding Checklist:** System generates a checklist for the School Admin to complete setup (logo upload, class configuration, teacher accounts, student import)
8. **Go Live:** School account is activated; School Admin receives credentials

### Editing School Details and Settings
- Super Admin can edit any school's: basic details, classification, contact information, enabled modules (all features are available regardless of price), price band, and custom/founding price
- Setting changes are logged with timestamp and reason
- Certain settings (like grade structure) can only be changed if the academic year has no active records — safety guard

### Subscription Lifecycle Management

| Action | When Used | Effect |
|---|---|---|
| Activate | New school, or resuming after pause | Full platform access restored; all features enabled (every plan includes all features) |
| Pause | Temporary hold (school on vacation, payment pending but in negotiation) | Login still possible but data entry features locked; read-only access |
| Suspend | Non-payment, policy violation, school request | All user logins blocked; data preserved but inaccessible |
| Resume | After resolving suspension reason | Full access restored; audit log records reason and date |
| Terminate | School permanently closes or switches platform | 30-day soft-delete period; school can request data export; after 30 days all data deleted per retention policy |

- All subscription actions require the Super Admin to enter a reason (stored in audit log)
- When suspended, school admin receives automated notification with reason and contact instructions
- When a school is within 14 days of subscription expiry, automated renewal reminder sent to school admin; Super Admin sees it in the "Renewals Due" section

---

## 12.4 Platform Settings & Configuration

### Global Platform Settings
- Platform name, logo, support email, support phone
- Default academic year start/end month
- Default grade structure template (can be overridden per school)
- Default section names (A, B, C — configurable)
- Default compliance templates per board type
- Email and SMS sender configuration (SendGrid, Twilio, etc.)
- WhatsApp Business API configuration
- ImageKit configuration (API key, endpoint URL)
- Firebase project configuration (read-only reference)

### Pricing Model (CONFIRMED — size-based; all features included on every plan)

NEXLI charges **by school size (student count), never by features.** Every school — on every plan — gets **all** standard modules and features. Features are **never** locked behind a higher or more expensive plan. There is no per-plan feature matrix and no feature/module add-ons.

- **Price = student-count band.** A school's monthly/annual price is set solely by which student-count band it falls in. Official bands (Super Admin can edit/extend them):

  | Band | Students |
  |---|---|
  | 1 | 0 – 500 |
  | 2 | 500 – 1,000 |
  | 3 | 1,000 – 1,500 |
  | 4 | 1,500 – 2,000 |
  | 5 | 2,000 – 3,000 |
  | 6 | 3,000 – 5,000 |
  | 7 | 5,000 – 10,000 |
  | 8 | 10,000 – 20,000 |
  | 9 | 20,000 – 40,000 |
  | … | … continues in higher bands as needed |

  Each band has one price per billing cycle (monthly / annual). The band is derived from the school's **current, real, enrolled student count — active students only.** Students who have left (Transfer Certificate issued / transferred / graduated / left) are **excluded** from the count so they never inflate the bill (see §1.1 student status and §12.x onboarding).
- **All features included on every band.** No "included modules" list, no plan-based feature flags, no module pricing. Operational modules that don't apply to a school (e.g. Hostel for a day school) may be toggled off for tidiness only — this is never tied to price or plan.
- **AI is the only paid add-on.** Future AI features are a **separate, optional paid add-on**, billed on their own line, fully independent of the size band. A school on any band may have the AI add-on on or off. (Until AI ships it stays inactive — see §8 AI Strategy.) No other capability is ever a paid add-on.
- **Custom / founding price per school.** The Super Admin can set a **custom price for one specific school** that overrides its band price — used for the first 5 "founding schools" and any negotiated pricing. The override is stored on the school record and shown clearly in billing.
- **Band crossing.** When a school's student count grows or shrinks past a band boundary, its price moves to the new band from the next billing cycle (with part-period/pro-rata adjustment once a billing/payment integration is in place).
- **Trial period settings:** default trial length; during a trial the school has full feature access (identical to any paid band).

### Feature Flag Management
- Toggle any feature on/off globally (affects all schools)
- Toggle any feature on/off per specific school (override)
- Feature flags for: beta features, regional features, compliance-specific features
- Emergency kill switch: disable a specific module across all schools instantly (e.g., if a critical bug is discovered)

### Notification Templates
- Edit email and SMS templates used for: school welcome, subscription renewal, suspension notice, data export ready, system maintenance alerts
- Multilingual template management

---

## 12.5 Platform Analytics & Reporting

### Platform-Level Reports
All reports show aggregate, anonymized data — never individual student or staff PII.

| Report | Description | Frequency |
|---|---|---|
| School Engagement Report | DAU/MAU per school, feature usage, at-risk schools (declining engagement) | Weekly |
| Subscription Revenue Report | MRR, ARR, churn rate, renewal rate, revenue by plan tier | Monthly |
| Onboarding Funnel Report | Schools in each onboarding stage, time-to-activation, drop-off points | Weekly |
| Platform Health Report | Uptime, error rates, Firebase usage (reads/writes/storage), API performance | Daily |
| Feature Adoption Report | Which features are used by what % of schools, rollout tracking for new features | Monthly |
| Student Volume Report | Aggregate total students across all schools (no individual data) | Monthly |
| Geographic Distribution | Schools by state, city — growth heatmap | Monthly |

### System Health Monitoring
- Firebase Firestore: read/write operations per minute, latency percentiles
- Firebase Authentication: login success/failure rates
- Firebase Cloud Functions: execution count, error rate, average duration
- Storage: ImageKit usage and CDN bandwidth
- Error tracking: top errors by frequency, grouped by module
- Slow operation alerts: any operation exceeding 5-second response time

---

## 12.6 Platform-Wide Announcements

**Purpose:** Super Admin can communicate with all registered School Admins or targeted subsets.

**Announcement Types:**
- **Maintenance Notice:** Scheduled downtime or degraded performance windows
- **New Feature Release:** Feature announcements with release notes
- **Policy Update:** Changes to platform terms, data policies, compliance requirements
- **Billing Notice:** Subscription renewal reminders, pricing changes
- **Emergency Notice:** Critical security or data issues requiring immediate action

**Targeting:**
- All schools
- Schools on a specific plan tier
- Schools in a specific state or region
- Schools of a specific board type
- Specific individual schools (selected manually)

**Delivery Channels:** In-app banner (shown to School Admin on login), email to School Admin, optional SMS for critical notices

**Announcement Log:** Full history of all platform announcements sent, with delivery status (seen / unseen per school)

---

## 12.7 School Impersonation (Support Access)

When a school admin raises a support ticket and the issue requires investigation inside their account, the Super Admin can impersonate the School Admin to see what they see.

**Rules:**
- Impersonation is possible only with a reason entered before activation
- Every action taken during an impersonation session is logged separately in the audit trail, tagged as "Super Admin impersonation"
- School Admin receives an in-app notification that their account was accessed for support purposes, with timestamp
- Impersonation sessions auto-expire after 60 minutes
- Super Admin cannot take destructive actions (delete records, change passwords, modify subscription) during impersonation — those actions require exiting impersonation and acting from the Super Admin panel directly
- Impersonation does not reveal medical records, counseling files, or POCSO case data — these remain protected even in support mode

---

## 12.8 Audit Trail (Super Admin Actions)
All Super Admin actions are logged permanently:
- School created / modified / deleted
- Subscription status changed (with reason)
- Feature flags modified
- Platform settings changed
- Impersonation sessions (start time, end time, reason, actions taken)
- Announcements sent
- Plan pricing modified

The audit trail cannot be modified or deleted even by the Super Admin. It is stored in a separate, append-only Firestore collection.

---

# 13. STUDENT DATA IMPORT SYSTEM

> This section provides the detailed specification for the Student Data Import feature. The feature description within Module 1.3 covers the school admin's perspective. This section covers the complete system design, field mapping, validation rules, and file specifications.

## 13.1 Supported Import Formats
- **CSV (.csv):** UTF-8 encoded; comma-separated; first row is header row
- **Excel (.xlsx):** OOXML format; multi-sheet workbook with Instructions, Student Data, and Reference sheets

## 13.2 Student Import Field Specification

| Column Header | Field Name | Required | Type | Allowed Values / Format | Notes |
|---|---|---|---|---|---|
| student_first_name | First Name | Yes | Text | Max 50 characters | |
| student_last_name | Last Name | Yes | Text | Max 50 characters | |
| date_of_birth | Date of Birth | Yes | Date | DD/MM/YYYY | Must match CBSE/board format |
| gender | Gender | Yes | Enum | Male, Female, Other | Case-insensitive |
| grade | Grade / Class | Yes | Text | Must match school's configured grades | e.g., "Class 1", "Grade 5", "KG" |
| section | Section | Yes | Text | Must match school's configured sections | e.g., "A", "B", "Rose" |
| admission_number | Admission Number | No | Text | Max 20 characters | Auto-generated if blank |
| apaar_id | APAAR ID | No | Text | 12-digit number | National student ID |
| blood_group | Blood Group | No | Enum | A+, A-, B+, B-, O+, O-, AB+, AB- | |
| known_allergies | Known Allergies | No | Text | Free text | Max 500 characters |
| medical_conditions | Chronic Conditions | No | Text | Free text | Max 500 characters |
| special_needs | Special Needs | No | Enum | Yes, No | Triggers CwSN flag |
| disability_category | Disability Category | No | Text | Only if special_needs = Yes | |
| rte_category | RTE Category | No | Enum | EWS, Disadvantaged, No | |
| father_name | Father's Full Name | Yes | Text | Max 100 characters | |
| father_mobile | Father's Mobile | Yes | Text | 10-digit Indian mobile | |
| father_email | Father's Email | No | Email | Valid email format | |
| father_occupation | Father's Occupation | No | Text | Max 100 characters | |
| mother_name | Mother's Full Name | Yes | Text | Max 100 characters | |
| mother_mobile | Mother's Mobile | No | Text | 10-digit Indian mobile | |
| mother_email | Mother's Email | No | Email | Valid email format | |
| guardian_name | Guardian Name | No | Text | Used if primary guardian is not parent | |
| guardian_mobile | Guardian Mobile | No | Text | 10-digit Indian mobile | |
| address_line1 | Address Line 1 | No | Text | Max 200 characters | |
| address_city | City | No | Text | Max 100 characters | |
| address_state | State | No | Text | Must be valid Indian state | |
| address_pincode | Pincode | No | Text | 6-digit Indian pincode | |
| previous_school | Previous School Name | No | Text | Max 200 characters | For transfer students |
| tc_number | TC Number | No | Text | From previous school | |
| admission_date | Admission Date | No | Date | DD/MM/YYYY | Defaults to import date if blank |
| academic_year | Academic Year | No | Text | YYYY-YYYY format | e.g., 2025-2026 |
| transport_enrolled | Transport Enrolled | No | Enum | Yes, No | |
| hostel_enrolled | Hostel Enrolled | No | Enum | Yes, No | Only for boarding schools |
| preferred_language | Preferred Language | No | Text | ISO language name | For regional communication |
| photo_url | Student Photo URL | No | URL | ImageKit URL or blank | School uploads photos separately |

## 13.3 Validation Rules (Applied Before Preview)

**Critical Errors (row rejected, cannot import):**
- student_first_name or student_last_name is blank
- date_of_birth is missing, future date, or more than 25 years ago
- grade does not match any configured grade in the school's academic structure
- section does not match any configured section for the specified grade
- father_name is blank
- father_mobile is not a valid 10-digit Indian mobile number
- gender is not one of: Male, Female, Other

**Warnings (row imported with default or flag):**
- admission_number is blank → auto-generated
- blood_group is blank → recorded as "Unknown"
- address fields are blank → acceptable, flagged for completion
- academic_year is blank → defaults to school's current academic year

**Duplicate Detection Logic:**
- Primary duplicate check: student_first_name + student_last_name + date_of_birth matches an existing student in the same school
- Secondary check: apaar_id matches an existing student (if apaar_id is provided)
- Intra-file duplicate: same combination appears more than once in the uploaded file
- Result: duplicate rows shown in preview with "Potential Duplicate" badge; admin decides per row

## 13.4 Sample File Content (Structure Reference)

**CSV Sample — First 3 rows (header + 2 example rows):**
```
student_first_name,student_last_name,date_of_birth,gender,grade,section,admission_number,blood_group,father_name,father_mobile,mother_name,mother_mobile,address_city,address_state
Arjun,Sharma,15/08/2012,Male,Class 6,A,ADM2024001,B+,Rajesh Sharma,9876543210,Sunita Sharma,9876543211,Mumbai,Maharashtra
Priya,Verma,22/03/2013,Female,Class 5,B,,A+,Anil Verma,8765432109,Kavita Verma,,Pune,Maharashtra
```

**Excel Sample — Sheet Structure:**
- Sheet 1 "Instructions": Description of each column, required/optional status, format rules, example values, common errors to avoid
- Sheet 2 "Student Data": Column headers in row 1, 2 example rows in rows 2–3, rows 4 onward for school to populate
- Sheet 3 "Reference": Dropdown value lists for grade (pulled from school config), section, gender, blood group, RTE category, Indian states list

## 13.5 Import Summary Report Structure

After import completion, the following summary is displayed and available as a downloadable file:

**On-Screen Summary:**
- Import date and time
- File name uploaded
- Total rows in file: X
- Successfully imported: X (green)
- Imported with warnings: X (yellow)
- Skipped (duplicate): X (blue)
- Failed (validation error): X (red)

**Downloadable Error Report (Excel):**
- One row per failed or warned record
- Columns: Row Number in Original File, Student Name, Error Type, Error Detail, Suggested Fix
- Example error row: Row 15 | Rohit Gupta | INVALID_MOBILE | father_mobile "98765" is not a valid 10-digit number | Correct the mobile number to 10 digits

**Import History Log (in-app):**
- Stored per school, visible to School Admin and IT Admin
- Columns: Import Date, Imported By (user name), File Name, Total, Success, Failed, Skipped
- Super Admin can see aggregate import activity across all schools (not the file contents)

## 13.6 Permissions for Student Data Import

| Role | Permission |
|---|---|
| School Admin (IT Admin, Principal) | Full access: upload, preview, confirm, download reports, view history |
| VP (Administration) | Full access |
| Academic Coordinator | Upload and preview only; requires VP or Principal to confirm |
| Class Teacher | No access |
| Accounts Staff | No access |
| Super Admin | Can view import history aggregate for all schools; cannot upload or view school's student data |

---

# 14. TECHNICAL ARCHITECTURE

> This section defines the technical infrastructure decisions for the NEXLI platform. These are binding architectural decisions that all development must align with.

## 14.1 Core Infrastructure — Firebase

NEXLI is built entirely on Firebase as the primary backend infrastructure. The choice of Firebase is driven by: real-time data synchronization needs (attendance, alerts, messaging), serverless scaling (no capacity planning required for school size variability), rapid development velocity, and Firebase's strong security model that aligns with NEXLI's RBAC requirements.

### Firebase Authentication
**Purpose:** User authentication, identity management, and session management for all NEXLI users.

**Implementation Rules:**
- Every user (Super Admin, School Admin, Teacher, Student, Parent) has a Firebase Auth account
- Email + password is the primary authentication method
- Phone number (OTP) authentication is enabled for parent accounts (many parents in India are more familiar with OTP than passwords)
- Multi-Factor Authentication (MFA) via phone OTP is enforced for: Super Admin, School Admin (IT Admin, Principal), Finance roles (Chief Accountant)
- Custom Claims: role information (role, schoolId, permissions scope) is stored in Firebase Auth custom claims and used for Firestore Security Rules enforcement
- Super Admin custom claim: `{ "role": "super_admin" }` — this claim grants access to the Super Admin panel and is only assignable by the Firebase project owner
- School-level admin claim: `{ "role": "school_admin", "schoolId": "SCH_XXX" }` — limits access to that school's data only
- Session tokens expire after 1 hour of inactivity; refresh tokens used for seamless re-authentication
- Account suspension: suspending a school's subscription immediately disables all Firebase Auth accounts belonging to that school via a Cloud Function

### Firebase Firestore
**Purpose:** Primary database for all NEXLI data — school records, student profiles, academic data, financial records, communication, and all ERP module data.

**Collection Architecture:**
```
/nexli_platform/                    ← Super Admin platform data
  /schools/{schoolId}/              ← School configuration and settings
  /subscriptions/{schoolId}/        ← Subscription status and billing
  /platform_announcements/          ← Super Admin to School messages
  /audit_log/                       ← Platform-level audit trail

/schools/{schoolId}/                ← School-level data (school-scoped)
  /students/{studentId}/            ← Student profiles
  /staff/{staffId}/                 ← Staff profiles
  /attendance/{date}/{classId}/     ← Daily attendance records
  /grades/{termId}/{subjectId}/     ← Gradebook data
  /fees/{studentId}/                ← Fee ledger per student
  /timetable/{academicYear}/        ← Timetable configuration
  /announcements/                   ← School announcements
  /communication/                   ← Messages and conversations
  /medical/{studentId}/             ← Medical records (restricted)
  /counseling/{studentId}/          ← Counseling files (highly restricted)
  /compliance/                      ← Compliance calendar and documents
  /transport/                       ← Routes, vehicles, GPS logs
  /hostel/                          ← Hostel blocks, rooms, roll calls
  /import_history/                  ← Student import audit log
```

**Firestore Security Rules Principles:**
- All data access is denied by default; access must be explicitly granted in rules
- School data is scoped to `schoolId` — a user with `schoolId = SCH_001` in their claims can never read or write data in `/schools/SCH_002/`
- Super Admin access to school data: Super Admin can read school configuration and aggregate metrics but cannot access `/schools/{schoolId}/students/`, `/medical/`, `/counseling/`, or any individual student record collections
- Medical records: accessible only to users with `role = nurse`, `role = doctor`, or `role = principal` within the same school
- Counseling records: accessible only to `role = counselor` and `role = principal` (with logged access); no other role
- POCSO/Grievance files: accessible only to `role = cpo` and `role = principal` with co-authorization requirement for principal access

**Indexing Strategy:**
- Composite indexes for: attendance by date + class, fees by student + status, students by grade + section, staff by department + role
- No full-table scans; all queries must use indexed fields
- Firestore pagination used for all list views (no loading more than 100 records in a single query)

### Firebase Cloud Functions
**Purpose:** Server-side business logic, automated workflows, scheduled tasks, and integrations that should not run in the client.

**What Cloud Functions Handle:**
- Student bulk import processing (parse file, validate, batch write to Firestore)
- Attendance 75% threshold monitoring (triggered on attendance write; checks cumulative and sends alert)
- Fee reminder scheduling (cron: daily at 8 AM, checks due dates, sends SMS/WhatsApp)
- Compliance deadline alerts (cron: daily, checks compliance calendar, sends alerts at 90/60/30/7 day marks)
- Payroll calculation (triggered on payroll run initiation; processes all staff in batch)
- TC multi-department clearance automation (orchestrates clearance checks across Library, Accounts, Hostel)
- Subscription lifecycle management (activate, pause, suspend — triggered by Super Admin actions)
- Emergency broadcast delivery (fan-out to all parents via SMS + WhatsApp + push)
- Student import error report generation (generate Excel file, store temporarily, return download URL)
- Firebase Auth account management for school suspension/resumption
- UDISE+ data compilation (scheduled annually; aggregates data across all modules)
- AI inference tasks (dropout risk scoring, fee defaulter prediction) — runs nightly in batch

**Cloud Functions Architecture Rules:**
- All functions are idempotent (safe to retry on failure)
- Functions that process student data are school-scoped (receive schoolId, never process cross-school data)
- Long-running operations (bulk import, payroll) use Firebase Task Queue for reliable execution
- All functions log to Firebase Cloud Logging with structured log format (school_id, function_name, user_id, action, result)
- Error handling: all functions catch and log errors; user-facing operations return structured error responses (never raw exceptions)
- Maximum function timeout: 540 seconds for long-running batch operations; 30 seconds for user-facing operations

### Firebase Storage
**Status: NOT USED in current implementation.**

Firebase Storage will be integrated in a future version. All file storage (documents, certificates, student/staff/school photos, import file processing) is handled via ImageKit (for media assets) and temporary in-memory processing (for import files — never persisted to permanent storage).

---

## 14.2 Media & Image Management — ImageKit

**Purpose:** All image assets in NEXLI are stored, served, and managed via ImageKit. ImageKit provides CDN delivery, real-time image transformations, format optimization, and caching — critical for performance on low-bandwidth Indian mobile networks.

**Scope of ImageKit Usage:**
| Asset Type | ImageKit Usage |
|---|---|
| Student photos | Uploaded on enrollment or profile edit; stored in ImageKit; served via CDN |
| Staff (teacher/admin) photos | Same as student photos |
| School logo | Uploaded during school onboarding; used in report cards, certificates, letterheads |
| School cover image / banner | Displayed in parent portal and school public page |
| Chairman / Trustee photos | For governance directory |
| Report card header images | School-specific branding in generated PDFs |
| Event / activity photos | Photos from school events uploaded by Activity Coordinator |

**ImageKit Folder Structure:**
```
/nexli/
  /schools/{schoolId}/
    /logo/
    /students/{studentId}/
      /profile/
    /staff/{staffId}/
      /profile/
    /events/{eventId}/
    /governance/
```

**Image Transformation Rules:**
- Student profile photo: stored at 400×400px; served as 80×80 thumbnail in lists, 200×200 in profile views, 400×400 in reports
- School logo: stored at original resolution; auto-compressed; served at appropriate size per context (32px favicon, 120px header, 240px report card)
- Transformations are done at delivery time via ImageKit URL parameters — original is never altered

**Upload Flow:**
1. School admin selects photo in the NEXLI web/app interface
2. Client sends image to ImageKit via ImageKit Upload API with school-scoped folder path
3. ImageKit returns the file URL + file ID
4. NEXLI stores only the ImageKit URL in Firestore (not the file itself)
5. All subsequent references to the image use the ImageKit CDN URL

**Security:**
- ImageKit private API key is stored only in Firebase Cloud Functions environment variables — never in client-side code
- Client-side uploads use ImageKit authentication tokens generated by a Cloud Function (short-lived, school-scoped)
- Image URLs are public CDN URLs (no authentication required to view) — this is intentional for performance; sensitive images (medical, counseling) are never stored as images; they are text records in Firestore

**What Is NOT Stored in ImageKit:**
- Documents (TC, bonafide certificates, fee receipts) — generated as PDFs at request time, not stored
- Imported CSV/Excel files — processed in-memory by Cloud Functions, never persisted
- POCSO/Grievance files — stored as encrypted text records in Firestore only (future: Firebase Storage with restricted access)
- Medical records — text-only in Firestore

---

## 14.3 Technology Decision Summary

| Layer | Technology | Purpose |
|---|---|---|
| Authentication | Firebase Authentication | User login, session management, MFA, custom claims for RBAC |
| Database | Firebase Firestore | Real-time NoSQL database for all ERP data |
| Server-Side Logic | Firebase Cloud Functions | Business logic, automation, scheduled tasks, integrations |
| File Storage | NOT IMPLEMENTED (future: Firebase Storage) | Document storage deferred to future version |
| Media / Images | ImageKit | CDN delivery of all image assets with transformations and optimization |
| Frontend | (To be defined in separate frontend spec) | Web app + mobile app |
| Email Delivery | (Integration via Cloud Functions) | Transactional emails (welcome, receipts, alerts) |
| SMS / WhatsApp | (Integration via Cloud Functions) | Parent notifications, OTP, emergency alerts |

---

## 14.4 Data Architecture Principles

**School Isolation (Multi-Tenancy)**
Every Firestore document belongs to exactly one school via the `schoolId` field in its path and data. Firestore Security Rules enforce that users can only access documents matching their `schoolId` claim. This is not just a UI constraint — it is enforced at the database rules layer, meaning no bug in application code can ever expose cross-school data.

**Real-Time vs. Batch**
- Real-time (Firestore listeners): attendance marking, messaging, emergency alerts, live dashboard metrics
- Batch (Cloud Functions, scheduled): payroll processing, report generation, compliance alerts, bulk import, analytics aggregation

**Offline First**
Firestore's built-in offline persistence is enabled for all mobile clients. Critical data (today's timetable, class roster, pending assignments) is cached locally. Attendance can be marked offline; it queues and syncs automatically when connectivity is restored.

**Data Versioning**
All critical records (student profiles, fee ledger entries, attendance records) include a `lastModifiedAt`, `lastModifiedBy`, and `version` field. Before overwriting, the previous value is written to a `_history` sub-collection for audit purposes.

---

## APPENDIX B — Glossary Additions (Version 1.1)

| Term | Definition |
|---|---|
| Super Admin | The NEXLI platform owner/operator; the highest authority on the entire platform above all schools |
| Firebase | Google's app development platform; provides Authentication, Firestore, and Cloud Functions for NEXLI |
| Firestore | Firebase's NoSQL cloud database used as NEXLI's primary data store |
| Cloud Functions | Firebase serverless functions handling NEXLI's server-side business logic |
| ImageKit | CDN and image management platform used for all image assets in NEXLI |
| Custom Claims | Firebase Auth user attributes used to enforce RBAC at the Firestore security rules layer |
| Tenant | A school registered on the NEXLI platform; each school is a separate tenant with isolated data |
| Feature Flag | A system toggle that enables or disables a specific feature for all schools or individual schools |
| MRR | Monthly Recurring Revenue — total subscription revenue billed per month across all active schools |
| Soft Delete | A deletion that marks a record as inactive rather than permanently removing it, allowing recovery within a defined window |
| Impersonation | Super Admin capability to temporarily view the platform as a School Admin for support purposes |

---

*Document Status: Version 1.1 — Source of Truth for NEXLI ERP Development*
*This document supersedes all prior research files in the ai_reports directory.*
*Last Updated: June 2026*
*Changes in v1.1: Added Super Admin System (Section 12), Student Data Import System (Section 13), Technical Architecture — Firebase + ImageKit (Section 14), Appendix B Glossary*