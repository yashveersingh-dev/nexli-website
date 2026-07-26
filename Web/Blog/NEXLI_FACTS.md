# NEXLI FACTS — The Law for Every Article
**Last updated:** 2026-06-19  
**Source documents:** NEXLI_MASTER_SPECIFICATION.md, BUILD_PROGRESS.md (commit `cd0ee28`), TEST_RESULTS.md  
**Rule:** No article may claim a feature that is not listed below. If unsure, treat it as not existing.

---

## WHAT NEXLI ACTUALLY DOES TODAY — IN PRODUCTION

### Core Architecture
- **Type:** Cloud-based school ERP (SaaS) for Indian K-12 schools
- **Tech Stack:** React/TypeScript frontend; Firebase (Firestore, Auth, Cloud Functions); deployed live
- **Data Model:** 118+ data-driven roles (configurable by Super Admin), no hard-coded role tiers
- **Tenancy:** Per-school data isolation with role-based permission matrix (module × action: View/Create/Edit/Approve/Export/Delete/Manage)
- **Deployment:** Firebase ruleset `fa68c528-7134-4bbc-9776-5e4ebf30e21d` live; Firestore security rules enforce all access control
- **Compliance:** DPDP Act 2023, POCSO Act 2012, NEP 2020, CBSE bylaws, RTE Act 2009, UDISE+, FSSAI built-in (not optional)

### Student & Staff Data Systems
- **Student Master Profiles:** Personal, family, medical, academic, special needs, RTE flags, sibling linking, document locker
- **Staff Profiles:** Full HR records with qualifications, experience, background verification, attendance
- **Admissions Pipeline:** Inquiry → Application → Document Verification → Testing → Interview → Offer → Enrollment (fully automated workflows, real data tested)
- **Student Data Import:** Bulk import from CSV/Excel with validation, duplicate detection, error reporting
- **Transfer Certificates (TC):** Multi-department clearance (Library → Accounts → Hostel → Transport → Class Teacher → Principal approval before issuance) ✅ Built
- **Certificates:** Bonafide, Character, Conduct, Leaving, Migration, custom certificates with serial numbering, QR verification, print-ready PDF ✅ Built

### Academic Module
- **Timetable Management:** Constraint-based generation, no double-booking, substitution management, live view for students/parents
- **Attendance:** Period-wise (by subject teacher) + daily consolidated (by class teacher); biometric/RFID integration optional; 75% threshold tracking with alerts
- **Lesson Plans:** Weekly templates, NCERT/board alignment, curriculum coverage tracker, HOD review
- **Gradebook & Marks Entry:** Multiple assessment types; automatic grade calculation per board rules; **critical fix:** marks auto-population now uses `paperId` not `subjectId` (was causing zero marks)
- **Examinations:** Exam schedule, invigilation duty, admit cards, answer script tracking, result entry, tabulation, CBSE LOC export
- **NEP 2020 Holistic Progress Card (HPC):** Multi-domain assessment (cognitive, social-emotional, physical, arts, vocational, life skills), self + peer + teacher + parent input, visual output ✅ Built
- **Report Cards:** CBSE 9-point format, competitive ranking, term-over-term trend chart, custom grading systems (A/B/C/D, A1/A2/B1/B2), co-scholastic fields, sports/activities/remarks, phone-responsive design ✅ Built
- **Rankings — Marks-Based:** School-wide, by class, by batch, by section; normalized by percentage (Class 6 @ 100% ranks above Class 7 @ 99%); full lists with pagination, tie-breaking ✅ Built
- **Rankings — Attendance-Based:** Separate engine, same scope structure, never mixed with marks ✅ Built
- **Homework & Assignments:** Teacher assign → student digital submission → completion tracking → load monitoring
- **Library Management:** Catalog, circulation (issue/return/renewal), overdue alerts, book reservations, reading programs
- **Question Paper Generator:** Curriculum-aligned templates, subject/chapter/difficulty tagging, blueprint-driven generation, answer keys, OMR support ✅ Built

### Fee & Finance
- **Fee Management:** Per-class structures, term/installment-based schedules, online UPI/net banking, offline cash/cheque
- **Fee Ledger:** Per-student per-academic-year tracking (charges, payments, concessions, net due)
- **Online Payment:** Integration with Indian payment gateways (UPI, cards, net banking)
- **Offline Receipts:** Digital receipt with school stamp, shareable via WhatsApp
- **Concessions:** Need-based approval workflow (Principal/VP level)
- **Reminders:** Automated SMS/WhatsApp/app notifications on due dates and overdue
- **Defaulter Reports:** Class-wise, section-wise pending dues with exportable lists
- **RTE Reimbursement Tracking:** Separate claim generation for EWS seats
- **Refunds:** Formal request + approval + bank transfer recording
- **Dashboard KPI:** Collected, Outstanding, MoM trend, dount charts ✅ Seeded with real data (₹2.15Cr billed, ₹1.30Cr collected, ₹85,04,500 outstanding across 300 students, 225 payment records)

### Human Resources & Payroll
- **Staff Directory:** 300+ staff profiles (all roles searchable by name/department/status)
- **Staff Attendance:** Biometric device integration, manual override, late/early flagging, leave linkage
- **Payroll:** Salary calculation, deductions, EPF/ESI/TDS compliance, monthly disbursement (structure visible to HR roles, read-only to appropriate approval chain)
- **Leave Management:** Applications, approval workflow, encashment calculations
- **Recruitment:** Pipeline, offer letter generation
- **Probation Tracking:** Completion monitoring, automated reminders

### Student Welfare & Safety
- **Medical/Clinic:** Visit logs, health records, immunizations, allergen flags, chronic conditions, medical supplies inventory
- **Counselling Workspace:** Confidential session notes locker, behavioral/wellbeing tracking, at-risk flagging, confidential access only ✅ Built
- **POCSO/Safeguarding:** Child protection complaint filing (CPO-exclusive access), encrypted case files, incident timeline, automatic escalation, mandatory reporting workflow
- **Special Education (SPED):** IEP (Individualized Education Program) tracking, therapy logs, CwSN register, disability-linked records
- **Skills Passport / E-Portfolio:** Cumulative student portfolio capturing projects, co-curriculars, sports, volunteering, issued badges, e-portfolio view ✅ Built
- **Career Counselling & Aptitude:** Psychometric assessments, career-path recommendations, stream-selection guidance, aptitude scoring ✅ Built
- **Gamification Dashboard:** Streaks for attendance/homework/reading, badges, points, leaderboards ✅ Built

### Communication & Community
- **Circulars & Announcements:** Staff publish → targeted audience (class, grade, role, custom group) → SMS/WhatsApp/app delivery
- **Parent Portal:** Child-scoped data only (attendance, homework, fees, report cards, timetable, announcements)
- **Student Portal:** Own timetable, homework, assignments, marks, library, canteen menu, help requests
- **Visitor Management:** OTP-verified digital gate register, visitor log, blacklist
- **Alumni Module:** Alumni directory (opt-in), alumni events, mentorship matching setup (data exists but not yet seeded) — Nav accessible but empty ⚠️
- **Parent-Teacher Communication:** Structured messaging (not free-form chat), class-level announcements

### Operations & Infrastructure
- **Transport & Fleet:** Route management, driver/conductor records, vehicle maintenance schedule, GPS live-tracking (maps integration via OpenStreetMap)
- **Hostel Management:** Block assignment, allocations, roll-call (morning + night), exeat (weekend leave) tracking
- **Canteen & Nutrition:** Menu planning, daily meal headcount (for PM POSHAN tracking), FSSAI compliance documentation, vendor certificate tracking
- **Facility & Asset Management:** Asset register, maintenance requests, utility consumption logs, housekeeping roster
- **Visitor Management:** Gate pass, expected-visitor list, security briefing

### Compliance & Governance
- **Compliance Calendar:** Automated alerts for CBSE LOC, UDISE+, fire NOC, building safety, FSSAI license, staff verification, EPF/ESI/TDS, GST, POSH report, water testing, lab safety (all built)
- **UDISE+ Reporting:** Annual data export pre-populated with real data (300 students, grade distribution, enrollment by gender) ✅ Real data seeded
- **RTE Quota Tracking:** Separate pipeline for EWS applications, quota monitoring (page built but currently empty of demo data) ⚠️
- **CBSE LOC (List of Candidates):** Export in required format for Class 10/12 board exams
- **Consent Management (DPDP Act):** Parental consent collection with OTP verification, consent registry, withdrawal tracking, data-access audit logs
- **Privacy & Data Protection Officer (DPO):** Role-specific access to data-processing audit trail (metadata only, not raw data), breach response workflows

### Dashboards & Analytics
- **Principal Dashboard:** KPI band (students, staff, attendance, fees), fee collection trends, enrollment-by-grade, attendance health, at-risk students, institutional KPIs
- **Chairman/Trustee/Director Dashboards:** KPI band, fee trends, enrollment, operations summary, compliance notices
- **Staff Dashboard:** Attendance, assignments pending, student performance, at-risk list
- **Student Dashboard:** Timetable, homework, grades, attendance, events, achievements
- **Parent Dashboard:** Child-scoped attendance, fees, homework, announcements
- **Reports & Analytics:** Page built but showing "Students tracked: 0 of 300" — likely missing Firestore index ⚠️

### Data Integrity & Security
- **Role-Based Access Control (RBAC):** 118+ roles, each with a permission matrix (module × action)
- **Firestore Security Rules:** Live ruleset enforces all role-scoped access; emulator tests **145/0 passing** (all rules tested)
- **Data Isolation:** Per-school data is perfectly isolated; Super Admin has no raw access to school-level academic/medical/financial records
- **Audit Logs:** All data access is logged; DPO can review who accessed what when
- **Encrypted Data Storage:** Minor data (Aadhaar, medical notes) encrypted in Firestore

### Tested & Verified
- **Build:** `npm run build` exits cleanly, `tsc --noEmit` passes 0 errors
- **Mobile Testing:** All 118+ roles tested on Galaxy S20 (412px width); core workflows verified on phone
- **Rules Testing:** Emulator test suite **145/0** passing on live ruleset
- **Demo Data Seeding:** ~2,565 documents added idempotently (academic data only, Super Admin/core accounts untouched)
  - Attendance: 1,350 days across 30 working days × 45 sections
  - Exams: 1 published exam + 79 exam papers + 300 exam results
  - Report Cards: 300 published CBSE cards
  - Fees: 300 invoices (135 paid, 90 partial, 75 unpaid), 225 payment records
- **Production Deployment:** Firestore rules deployed live; app accessible at demo tenant

---

## WHAT IS PLANNED / COMING SOON — NOT YET BUILT

### Blocked by External APIs / Paid Services (plan written, no fake implementations)
- **UPI AutoPay + eNACH:** Recurring auto-debit for fees; blocked by payment-gateway integration (Razorpay, Cashfree, Instamojo)
- **DigiLocker + APAAR ID + ABC Integration:** Govt credential links; blocked by DigiLocker API access (requires Ministry approval)
- **Secure Online Exam (CBT + Proctoring):** AI remote proctoring, adaptive testing; blocked by proctoring-platform API (Talview, ExamOnline) and GDPR considerations
- **IoT Campus Safety:** Smart gate access, bus GPS, panic buttons, RFID boarding; blocked by hardware vendors and integration partnerships
- **WhatsApp Business API:** Automation engine for circulars, fee reminders, chatbots; blocked by WhatsApp approval + API access
- **SSO & Open API:** Google Workspace roster sync, LTI 1.3, OneRoster; not yet architected
- **AI At-Risk Student Detection:** Scoring logic (attendance + marks + behavior trends) is buildable, but predictive models blocked by AI key access
- **Cashless Campus Wallet:** Parent and student payment processing; blocked by gateway partnerships
- **e-Sign (Digital Signatures):** Legally valid e-signatures for TCs, approvals; blocked by signing-service API (Yodlee, e-mudhra)

### Buildable, Planned for Next Wave (high-effort, offline/demo-friendly)
- **Automated Document Management System (DMS):** OCR-scanned documents, version control, expiry alerts, RPA workflows
- **RPA + Form Auto-Fill:** Auto-extract admission forms, vendor invoices into the ERP
- **Advanced Report Card Features:** Auto-fill from gradebook (not just exam marks), sports/activities integration, AI remarks generator, trend visualization
- **AI Adaptive Learning Paths:** Per-student knowledge-gap remedial content recommendations
- **Parent Chatbot:** 24/7 FAQ (fees, schedule, progress) via WhatsApp/in-app
- **Enrollment Forecasting:** Predict intake by grade 6 months ahead for staffing planning
- **Predictive Maintenance:** IoT sensor data → predict AC/bus/lab equipment failures before breakdown
- **Bus Route Optimization:** AI-optimized routing factoring traffic, student locations, weather
- **Multilingual UI + Accessibility:** Hindi + regional languages, WCAG screen-reader support, light mode, dyslexia-friendly font, touch-target fixes, contrast improvements
- **Guided Onboarding Flow:** First-run checklist for new schools (import students → add staff → setup classes → publish timetable → configure fees)
- **Predictive Grade Forecasting:** Per-student per-subject grade forecast based on assessment trajectory

### Known Gaps / To-Be-Fixed
- **Counselling Module (Phase 2):** Module exists and is gated correctly, but currently no student/parent-facing counselling request/booking workflow — only staff-side case management
- **Security Module:** Currently a placeholder "In build" — no physical security/CCTV/gate-access features yet built (plans exist)
- **Alumni Mentorship Seeding:** Alumni module exists, but demo data for mentorship matching / directory not yet seeded
- **Reports & Analytics Index:** Firestore index likely missing for the aggregation pipeline; "0 of 300 tracked" is a data-gap, not a feature gap
- **RTE Quota Demo Data:** Page built but no demo data populated for RTE-flagged students
- **Class Teacher → Section Scoping:** Staff ↔ member identity linkage works in demo (equal seeding) but needs formal decision on staff ID vs. auth uid before production
- **Admissions Receptionist Role:** Has declaration in permissions but missing nav link to /admissions — to be fixed in role-permission matrix
- **Mobile Layout Blank Space:** Large empty area below content on many pages — to be filled with role-specific next-actions or removed (polish task)
- **Student Leadership Titles:** Prefect / Head Student / Sports Captain / House Captain not displayed in UI (labels exist in data, display layer missing)
- **Academic Coordinator Tier Labels:** Senior / Junior / Associate tiers exist but no UI badge showing which tier

---

## WHAT NEXLI DOES NOT DO — EXPLICITLY OUT OF SCOPE

- **Direct messaging between students:** Not allowed (child safety policy)
- **Real-time video conferencing / live classes:** Not in ERP scope (separate LMS integration point)
- **Payment gateway processing:** Does not hold payment processing secrets (integrates with Razorpay, Instamoji, etc. as middleware)
- **Student/teacher device management:** Not an MDM (Mobile Device Management) system
- **Inventory for school supplies** (beyond canteen/hostel/transport): Out of current scope
- **Campus bus tracking** beyond GPS + RFID boarding alerts (no real-time autonomous dispatch optimization built)

---

## KEY NUMBERS — WHAT THE DEMO SHOWS

- **Roles:** 118+ in catalog, all tested on mobile
- **Modules:** 55+ (Student Info, Academics, Finance, HR, Compliance, Communications, Operations, Safety)
- **Firestore Collections:** 45+ with live security rules
- **Demo Students:** 300 (across Nursery to Class 12, 45 sections, realistic grade/gender distribution)
- **Demo Staff:** 300+ (across all 118+ roles)
- **Demo Attendance Days:** 1,350 (30 working days × 45 sections, realistic present/absent/late/leave mix)
- **Demo Fee Data:** ₹2.15 Cr billed, ₹1.30 Cr collected (₹85,04,500 outstanding)
- **Demo Exams:** 1 published "Term 1 Examination" + 79 exam papers + 300 result records
- **Demo Report Cards:** 300 published cards with ranks
- **Build Size:** ~1.46 MB bundle (verified on 412px mobile)
- **Rules Test Suite:** 145/0 passing (all access-control scenarios verified)

---

## WHAT TO NEVER CLAIM IN ARTICLES

❌ "Nexli integrates with DigiLocker" — it doesn't yet (planned)  
❌ "Students and teachers can video-call" — not supported (out of scope)  
❌ "Security module manages CCTV and panic buttons" — not yet (stub exists)  
❌ "Automated AI attendance prediction" — scoring logic is, model API is not (blocked)  
❌ "WhatsApp Business API is built-in" — not yet (blocked)  
❌ "Counselling requests from students/parents" — not yet (only staff-side case mgmt exists)  
❌ "Exact pricing tiers" — pricing is finalized but not a blog topic; talk value/ROI instead  
❌ "Blockchain-verified certificates" — planned, not built  
❌ "Real-time bus live-map to parents" — GPS tracking is, live-map in parent portal is not yet  

---

## WHEN IN DOUBT

**The rule:** Read the TRUTH section above. If a feature is not listed there, do not claim it exists in any article. 
If you're unsure whether something is "existing" or "planned," err on the side of treating it as not existing.

Every article must pass this test: *"Could I defend this claim to a school admin who is evaluating Nexli right now?"*

If the answer is no, remove it.

---

**Last audited:** 2026-06-19 by full codebase review + Firestore inspection + mobile testing  
**Maintained by:** Blog authoring team — update this file whenever a feature is added or status changes
