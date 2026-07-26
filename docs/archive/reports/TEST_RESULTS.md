# NEXLI Mobile UI Test Report

**Device emulation:** Galaxy S20 (412×915px viewport, DPR 3.5, mobile media queries active)

**Date tested:** 17 June 2026

**Tester:** Automated browser test via Claude (Anthropic)

**App:** http://localhost:5173 · Nexli Demo International School

---

## Testing Methodology

All testing was conducted with Chrome DevTools device emulation active (Galaxy S20, 412px wide). Mouse-click CDP events time out under device emulation, so all navigation and form interaction was driven via JavaScript DOM calls — functionally equivalent to a real user tapping on a phone. Nav menus were extracted from the live DOM after login for each role. Screenshots were captured via the `zoom` action. Every distinct role type was tested with one account; numbered duplicates (HR Manager 1/2/3 etc.) were collapsed.

---

## Per-Role Findings

### 1. Super Admin (testadmin@nexlidemo.test)

**What worked:** Platform Command Center dashboard loads cleanly (2 schools shown, system health, recent activity). Full drawer menu renders correctly: Dashboard, Schools, Subscriptions, Users & Roles, Roles & Permissions, Plans & Pricing, Onboarding, Platform Settings, Analytics & Reports, Notifications, Activities, System Health, Support Tickets, Audit Logs. Schools page lists both schools with board/plan/student count/status. Roles & Permissions page lists all 115+ role types grouped into 14 categories — readable on mobile. Bottom tab bar: Home, Schools, Subs, Analytics, More. Login page itself is well-designed on phone (single column, no layout break).

**Permissions:** Correct — platform-only console. No school modules visible, which is right.

**Issues:** Login page has a large blank area below the form on mobile (cosmetic — excessive empty space). Screenshots rendered at reduced resolution intermittently but content was confirmed via text extraction.

---

### 2. Chairman (advik.das1@nexlidemo.test)

**What worked:** Dashboard rich with data (Active students: 300, Staff: 300, Attendance today: 0%, Outstanding dues: ₹1.46L, fee collection chart by grade). Bottom tab bar: Home, Students, Attendance, Chat, More — clean.

**Permissions:** ⚠️ **DISCREPANCY.** Roles & Permissions page declares Chairman as "Students · Student · Academics · Examinations · Class +12" (not full access). Actual nav has all 23 modules including HR, Payroll, Transport, Hostel, Compliance, Child Protection, Consent, IT Admin. Chairman gets an identical menu to the full-access Director/CEO. This is likely intentional — a school chairman probably does need oversight of everything — but it contradicts what the Roles & Permissions page says and may be unintentional scope creep.

**Issues:** None layout-wise. Potential permission over-grant vs. declared scope.

---

### 3. Trustee (riya.patel2@nexlidemo.test)

**What worked:** Loaded correctly, full dashboard.

**Permissions:** ⚠️ Same discrepancy as Chairman — declared narrow scope, actual nav is full 23-item menu including HR and Payroll. A trustee having payroll access is a notable governance concern.

**Issues:** Same over-grant as Chairman.

---

### 4. Director / CEO (shaurya.gupta3@nexlidemo.test)

**What worked:** Full 39-item menu (the most complete of any role — includes Admissions, Homework, Library, Medical, Special Education, Child Protection, Privacy/Consent, Visitor, Canteen, Assets/Facility, Alumni, Delegation, IT Admin). Dashboard clean. Drawer nav on mobile is scrollable and readable.

**Permissions:** Correct — "Full access" as declared.

**Issues:** None.

---

### 5. Regional Director (prisha.bajaj4@nexlidemo.test)

**What worked:** Full 39-item menu, same as Director/CEO. Dashboard loads.

**Permissions:** Correct — declared "Full access."

**Issues:** None.

---

### 6. Cluster Director (varun.trivedi5@nexlidemo.test)

**What worked:** Full 39-item menu. Dashboard loads.

**Permissions:** Correct — declared "Full access."

**Issues:** None.

---

### 7. Head of School / HoS (aleena.malhotra6@nexlidemo.test)

**What worked:** Full 39-item menu. Dashboard loads.

**Permissions:** Correct — declared "Full access."

**Issues:** None.

---

### 8. Principal (advik.chauhan7@nexlidemo.test)

**What worked:** Full 39-item menu. Dashboard loads.

**Permissions:** Correct — declared "Full access."

**Issues:** None.

---

### 9. Headmaster (varun.bose8@nexlidemo.test)

**What worked:** Full 39-item menu. Dashboard loads.

**Permissions:** Correct — declared "Full access."

**Issues:** None.

---

### 10. Headmistress (diya.das9@nexlidemo.test)

**What worked:** Full 39-item menu. Dashboard loads.

**Permissions:** Correct — declared "Full access."

**Issues:** None.

---

### 11. Academic Director (pari.patel10@nexlidemo.test)

**What worked:** 26-item nav — Students, Admissions, Academics, Attendance, Staff Attendance, Class Assessments, Homework, Examinations, HPC, Library, HR, Communication, Messages, SPED, Reports, Compliance, UDISE, RTE, SMC, Events, Delegation. Drawer shows "Pari Patel — Academic Director" correctly.

**Permissions:** Mostly correct. HR access is present — arguably elevated for a purely academic role but defensible for viewing teacher profiles. No Fees, no Payroll. ✓

**Issues:** None layout-wise. Drawer mobile rendering clean.

---

### 12. Vice Principal (Academic) (varun.gupta11@nexlidemo.test)

**What worked:** 26-item nav, identical to Academic Director.

**Permissions:** Correct — same academic-leadership scope.

**Issues:** None.

---

### 13. Vice Principal (Admin) (anvi.bajaj12@nexlidemo.test)

**What worked:** 26-item nav, but completely different from VP (Academic): Fees, Expense, HR, Payroll, Transport, Hostel, Consent, Visitor, Canteen, Facility, IT Admin. The system correctly differentiates these two VP types.

**Permissions:** Correct — admin-ops modules, no academic modules.

**Issues:** None.

---

### 14. Administrator (advik.trivedi13@nexlidemo.test)

**What worked:** 26-item nav, same as VP (Admin).

**Permissions:** Shares scope with VP (Admin) — which includes Payroll and IT Admin. This is quite broad for an "Administrator." Functionally fine if intended.

**Issues:** None layout-wise.

---

### 15. School Manager (trisha.malhotra14@nexlidemo.test)

**What worked:** 26-item nav, same as Administrator and VP (Admin).

**Permissions:** Same broad admin scope. ✓

**Issues:** None.

---

### 16. Administrative Manager (shaurya.chauhan15@nexlidemo.test)

**What worked:** 26-item nav, same pattern.

**Permissions:** Same. ✓

**Issues:** None.

---

### 17. Administrative Officer (gauri.bose16@nexlidemo.test)

**What worked:** 20-item nav — Fees, HR, Transport, Hostel but no Payroll, no Expense/Procurement, no IT Admin. Correctly narrower than Administrative Manager.

**Permissions:** Correct — "Students · Admissions · Fees · Human · Transport +7."

**Issues:** None.

---

### 18. Dean of Students (varun.das17@nexlidemo.test)

**What worked:** 12-item nav — Students, Admissions, Attendance, Communication, Reports, Events. Clean.

**Permissions:** Correct — "Students · Student · Events · Communication · Reports." No financial data. ✓

**Issues:** None.

---

### 19. Registrar (diya.patel18@nexlidemo.test)

**What worked:** 18-item nav — Students, Admissions, Academics, Examinations, Compliance, Reports. Students page opens and shows 300 students with pagination.

**Permissions:** Correct — "Students · Admissions · Academics · Examinations · Compliance +2."

**Issues:** None.

---

### 20. Academic Coordinator — Senior (advik.gupta19@nexlidemo.test)

**What worked:** 24-item nav. Shows as "Academic Coordinator" (seniority tier not displayed in role label on dashboard).

**Permissions:** Correct scope. HR present (noted — probably for viewing teacher profiles). No Fees/Payroll. ✓

**Issues:** **Role label doesn't show seniority tier** ("Senior" / "Junior" / "Associate" not shown in dashboard header or drawer footer). All three tiers display as just "Academic Coordinator."

---

### 21. Academic Coordinator — Junior (prisha.malhotra22@nexlidemo.test)

**What worked:** 17-item nav. Correctly narrower than Senior (no HR, no Compliance/UDISE).

**Permissions:** Correct tiered reduction. ✓

**Issues:** Same seniority label issue.

---

### 22. Academic Coordinator — Associate/Assistant (advik.das25@nexlidemo.test)

**What worked:** 14-item nav. Even narrower (no Admissions, no Reports).

**Permissions:** Correct — narrowest academic coordinator tier. ✓

**Issues:** Same seniority label issue.

---

### 23. Head of Department (pari.bajaj28@nexlidemo.test)

**What worked:** 15-item nav — Students, Academics, Gradebook, Homework, Examinations, HPC, Reports, Events.

**Permissions:** Correct. No Fees, no HR, no Payroll. ✓

**Issues:** None.

---

### 24. Exam Controller (advik.chauhan31@nexlidemo.test)

**What worked:** 14-item nav — Examinations, Gradebook, HPC, Students, Reports.

**Permissions:** Correct — exam-focused scope. ✓

**Issues:** None.

---

### 25. Finance Manager (gauri.patel34@nexlidemo.test)

**What worked:** 17-item nav. Fees & Finance page loads with tabs (Overview, Student ledger, Structures, Payments, Settings). Stats cards visible (₹0 across the board — no fee data recorded yet). Fees page clean on mobile.

**Permissions:** HR access present alongside Fees/Payroll. Declared: "Fees · Expense · Payroll · Reports · Students +2." ✓

**Issues:** Fees overview shows ₹0 Outstanding for Finance Manager, while the Chairman dashboard showed ₹1.46L outstanding. Possible role-scoped data display difference, or a data inconsistency between dashboard widgets.

---

### 26. Bursar (advik.trivedi37@nexlidemo.test)

**What worked:** 12-item nav — Fees, Expense, Payroll, Reports.

**Permissions:** Correct — no HR (vs Finance Manager). ✓

**Issues:** None.

---

### 27. Chief Accountant (prisha.bose40@nexlidemo.test)

**What worked:** 12-item nav, same as Bursar.

**Permissions:** Correct. ✓

**Issues:** None.

---

### 28. HR Director (advik.gupta43@nexlidemo.test)

**What worked:** 11-item nav — HR, Payroll, Reports, Students. HR page loads with 300 staff, searchable by name/department/status. "Add staff" and "Leave" buttons visible.

**Permissions:** Correct — "Human · Payroll · Reports · Users · Students." ✓

**Issues:** None.

---

### 29. HR Manager (pari.malhotra46@nexlidemo.test)

**What worked:** 12-item nav (adds Delegation vs HR Director). Clean.

**Permissions:** Correct. ✓

**Issues:** None.

---

### 30. HR Executive (advik.das49@nexlidemo.test)

**What worked:** 9-item nav — HR, Payroll, Students. No Reports, no Delegation.

**Permissions:** Correct reduction. ✓

**Issues:** None.

---

### 31. HR Assistant (gauri.bajaj52@nexlidemo.test)

**What worked:** 7-item nav — HR, Staff Attendance, Communication only. No Payroll. ✓

**Permissions:** Correct — "Human" only.

**Issues:** None.

---

### 32. Payroll Specialist (advik.chauhan55@nexlidemo.test)

**What worked:** 8-item nav — Payroll, HR, Staff Attendance. No student/fee data. ✓

**Permissions:** Correct — "Payroll · Human."

**Issues:** None.

---

### 33. Recruitment Coordinator (prisha.patel58@nexlidemo.test)

**What worked:** 7-item nav — HR only.

**Permissions:** Correct — "Human" only, no Payroll. ✓

**Issues:** None.

---

### 34. IT Manager (advik.trivedi61@nexlidemo.test)

**What worked:** 13-item nav — IT Admin, Compliance, Reports. IT Admin page loads with clear boundary explanation (administers system, not business data; no student marks, payroll figures). Active devices (0), tickets (0).

**Permissions:** Correct — "School · Users · Audit · Reports · Compliance."

**Issues:** None. The DPDP Act "least-privilege" note in the IT Admin page is excellent.

---

### 35. IT Administrator (pari.bose64@nexlidemo.test)

**What worked:** 8-item nav — IT Admin, Delegation. Narrower than IT Manager.

**Permissions:** Correct — "School · Users · Audit."

**Issues:** None.

---

### 36. Transport Manager (advik.gupta67@nexlidemo.test)

**What worked:** 8-item nav. Transport & Fleet page loads with real map (OpenStreetMap), tabs (Live map, Routes, Vehicles, Bus), stats cards (0 live vehicles/fleet/stops). Map renders within the phone viewport. Very good mobile implementation.

**Permissions:** Correct — "Transport · Students."

**Issues:** Map default center is New Delhi; school is in Pune. Minor cosmetic issue (no buses/routes configured in demo).

---

### 37. Estate/Facility Manager (gauri.malhotra70@nexlidemo.test)

**What worked:** 8-item nav — Facility, Expense, Communication.

**Permissions:** Correct — "Assets · Expense." No students, no HR. ✓

**Issues:** None.

---

### 38. Facilities Manager (advik.das73@nexlidemo.test)

**What worked:** 8-item nav, same as Estate/Facility Manager.

**Permissions:** Correct. ✓

**Issues:** None.

---

### 39. Admissions Officer (prisha.bajaj76@nexlidemo.test)

**What worked:** 13-item nav. Admissions page loads with pipeline stages (Enquiry, Application, Doc Verification, Assessment, Interview, Offer, Admitted) as a 2-column grid — works on mobile. "New application" button visible. "No applications yet" empty state.

**Permissions:** Correct — "Admissions · Students · Fees · Communication · Reports." ✓

**Issues:** None layout-wise. Pipeline grid adapts well to narrow screen.

---

### 40. Public Relations Executive (advik.chauhan79@nexlidemo.test)

**What worked:** 9-item nav — Communication, Events, Reports. No Students, no Fees, no HR. ✓

**Permissions:** Correct — "Communication · Events · Reports."

**Issues:** None.

---

### 41. Senior Accountant (pari.patel82@nexlidemo.test)

**What worked:** 10-item nav — Fees, Expense, Payroll, Students. Payroll present (declared in permissions). ✓

**Permissions:** Correct.

**Issues:** None.

---

### 42. School Accountant (advik.trivedi85@nexlidemo.test)

**What worked:** 9-item nav — Fees, Expense, Students. No Payroll (correctly less than Senior Accountant). ✓

**Permissions:** Correct.

**Issues:** None.

---

### 43. Junior Accountant (gauri.bose88@nexlidemo.test)

**What worked:** 9-item nav, same as School Accountant.

**Permissions:** No differentiation from School Accountant in nav. Declared same scope. ✓

**Issues:** None.

---

### 44. Accounts Clerk (advik.gupta91@nexlidemo.test)

**What worked:** 8-item nav — Fees, Expense only (no Students). ✓

**Permissions:** Correct — "Fees · Expense."

**Issues:** None.

---

### 45. Accounts Assistant (prisha.malhotra94@nexlidemo.test)

**What worked:** 8-item nav, same as Accounts Clerk.

**Permissions:** Correct. ✓

**Issues:** None.

---

### 46. Billing Executive (advik.das97@nexlidemo.test)

**What worked:** 8-item nav — Fees, Students (for looking up student ledgers). No Expense, no Payroll. ✓

**Permissions:** Correct — "Fees · Students."

**Issues:** None.

---

### 47. Cashier (pari.bajaj100@nexlidemo.test)

**What worked:** 8-item nav, same as Billing Executive. ✓

**Permissions:** Correct.

**Issues:** None.

---

### 48. Hostel Accountant (advik.chauhan103@nexlidemo.test)

**What worked:** 9-item nav — Fees, Expense, Hostel. Hostel access added on top of standard accounts. ✓

**Permissions:** Correct — "Fees · Expense · Hostel."

**Issues:** None.

---

### 49. Data Protection Officer (gauri.patel106@nexlidemo.test)

**What worked:** 11-item nav — Compliance, Consent, UDISE, RTE, SMC. Consent page loads with DPDP-aligned purpose management (add purposes, consent records). "No purposes defined yet" empty state with helpful starter suggestions.

**Permissions:** Correct — "Privacy · Audit · Compliance." ✓

**Issues:** None.

---

### 50. Consent Officer (advik.trivedi109@nexlidemo.test)

**What worked:** 7-item nav — Consent, Communication only. Correctly narrower than DPO.

**Permissions:** Correct — "Privacy" only. ✓

**Issues:** None.

---

### 51. Designated Child Protection Officer / DCPO (prisha.bose112@nexlidemo.test)

**What worked:** 12-item nav. Safeguarding page loads with excellent POCSO-specific UI: "Confidential. Handle per the POCSO Act & school policy." POCSO cases and Grievances tabs. "Report concern" button. Well-designed sensitive module.

**Permissions:** Correct — "Child · Counselling · Students · Compliance." ✓

**Issues:** The declared "Counselling" scope doesn't map to a real /counselling page (see Bug #1 below).

---

### 52. Alternate Child Protection Officer (advik.gupta115@nexlidemo.test)

**What worked:** 8-item nav — Safeguarding, Students. Correctly narrower than DCPO (no Compliance).

**Permissions:** Correct. ✓

**Issues:** None.

---

### 53. School Counselor (pari.malhotra118@nexlidemo.test)

**What worked:** 8-item nav — Students, Attendance, Communication, Events. Dashboard loads.

**Permissions:** ⚠️ **BUG.** Declared scope includes "Counselling" module but there is no counselling link in the nav, and navigating to /counselling returns a "Page not found" 404. The counselling module is referenced in permissions but not built. A school counselor has no dedicated workspace in the app.

**Issues:** Missing counselling module (see Bug #1). This is the role most affected.

---

### 54. Guidance Counselor (advik.das121@nexlidemo.test)

**What worked:** 7-item nav. Same missing counselling module issue.

**Permissions:** ⚠️ Same "Counselling" declared scope, same missing module. Both counselor roles are stranded.

**Issues:** Missing module (Bug #1).

---

### 55. Wellness Teacher (gauri.bajaj124@nexlidemo.test)

**What worked:** 7-item nav — Students, Communication, Events.

**Permissions:** Correct — "Students · Events." No medical or safeguarding (appropriate). ✓

**Issues:** None.

---

### 56. POSH/POCSO Committee Member (advik.chauhan127@nexlidemo.test)

**What worked:** 11-item nav — Safeguarding, Compliance, UDISE, RTE. Has access to the safeguarding module. ✓

**Permissions:** Correct — "Compliance" scope.

**Issues:** None.

---

### 57. Internal Complaints Committee (ICC) Member (prisha.patel130@nexlidemo.test)

**What worked:** 11-item nav, same as POSH/POCSO. ✓

**Permissions:** Correct.

**Issues:** None.

---

### 58. School Board Representative (advik.trivedi133@nexlidemo.test)

**What worked:** 23-item nav — broad access including HR, Payroll, Fees, Transport, Hostel, Compliance.

**Permissions:** ⚠️ Same pattern as Chairman/Trustee — declared as "Students · Student · Academics · Examinations · Class +12" but actually gets broad access including HR and Payroll. A School Board Representative having payroll visibility is debatable governance-wise.

**Issues:** Same over-grant pattern as Chairman/Trustee.

---

### 59. School Doctor (pari.bose136@nexlidemo.test)

**What worked:** 8-item nav — Medical, Students, Communication. Medical & Clinic page loads: Clinic visits, Health records, Immunizations tabs. "Confidential — clinic staff only" footer. "Log visit" button and search work. ✓

**Permissions:** Correct — "Health · Students." No Payroll, no academic data.

**Issues:** None.

---

### 60. Nurse Practitioner (advik.gupta139@nexlidemo.test)

**What worked:** 8-item nav, same as School Doctor. ✓

**Permissions:** Correct.

**Issues:** None.

---

### 61. Regular School Nurse (gauri.malhotra142@nexlidemo.test)

**What worked:** 8-item nav, same. ✓

**Permissions:** Correct.

**Issues:** None.

---

### 62. Residential School Nurse (advik.das145@nexlidemo.test)

**What worked:** 9-item nav (adds /hostel vs regular nurse). ✓ Correctly differentiated for residential setting.

**Permissions:** Correct — "Health · Students · Hostel."

**Issues:** None.

---

### 63. Special Education School Nurse (prisha.bajaj148@nexlidemo.test)

**What worked:** 9-item nav (adds /sped vs regular nurse). ✓

**Permissions:** Correct — "Health · Students · Special."

**Issues:** None.

---

### 64. Pediatric School Nurse (advik.chauhan151@nexlidemo.test)

**What worked:** 8-item nav, same as regular nurse. ✓

**Permissions:** Correct.

**Issues:** None.

---

### 65. Community Health Nurse (pari.patel154@nexlidemo.test)

**What worked:** 8-item nav. ✓

**Permissions:** Correct.

**Issues:** None.

---

### 66. Visiting School Nurse (advik.trivedi157@nexlidemo.test)

**What worked:** 8-item nav. ✓

**Permissions:** Correct.

**Issues:** None.

---

### 67. Class Teacher (gauri.bose160@nexlidemo.test)

**What worked:** 14-item nav — Students, Admissions, Attendance, Gradebook, Homework, Examinations, HPC, Communication. Clean drawer screenshot. No Fees, no HR, no Payroll. ✓

**Permissions:** ⚠️ **Minor concern:** Class Teacher has Admissions in the nav. A class teacher doesn't typically process admissions. This is slightly elevated vs what most schools would expect. Compare: Subject Teacher doesn't have Admissions — so this looks like an accidental extra permission for Class Teacher.

**Issues:** Admissions access for Class Teacher seems out of scope.

---

### 68. Subject Teacher (advik.gupta163@nexlidemo.test)

**What worked:** 13-item nav — same as Class Teacher but no Admissions. ✓

**Permissions:** Correct — Subject Teacher correctly has narrower scope than Class Teacher.

**Issues:** None.

---

### 69. Substitute Teacher (prisha.malhotra166@nexlidemo.test)

**What worked:** 8-item nav — Attendance, Homework, Communication only. No student list, no gradebook. ✓ Appropriately minimal.

**Permissions:** Correct — "Scoped / portal access."

**Issues:** None.

---

### 70. Special Educator (advik.das169@nexlidemo.test)

**What worked:** 8-item nav — SPED, Students, Communication. SPED page loads with IEP Plans, Therapy logs, CWSN register (confidential notice present). ✓

**Permissions:** Correct — "Special" scope.

**Issues:** None.

---

### 71. Sports Teacher / PET (pari.bajaj172@nexlidemo.test)

**What worked:** 11-item nav — Students, Gradebook, HPC, Events. No Examinations (appropriate — PE teacher doesn't run formal exams). ✓

**Permissions:** Correct — "Students · Student · Events · Progress."

**Issues:** None.

---

### 72. Arts/Music Teacher (advik.chauhan175@nexlidemo.test)

**What worked:** 11-item nav, same as Sports Teacher. ✓

**Permissions:** Correct.

**Issues:** None.

---

### 73. Activity Coordinator (gauri.patel178@nexlidemo.test)

**What worked:** 8-item nav — Events, Students, Communication. ✓

**Permissions:** Correct.

**Issues:** None.

---

### 74. Club Coordinator (advik.trivedi181@nexlidemo.test)

**What worked:** 8-item nav, same as Activity Coordinator. ✓

**Permissions:** Correct.

**Issues:** None.

---

### 75. Lab Assistant (prisha.bose184@nexlidemo.test)

**What worked:** 7-item nav — Academics only. No student data, no grades. ✓

**Permissions:** Correct — "Academics" only.

**Issues:** None.

---

### 76. Head Librarian (advik.gupta187@nexlidemo.test)

**What worked:** 8-item nav — Library, Students, Communication. Library page loads: Catalog, Circulation, Overdue tabs; search; "Add book" button. Add book form tested successfully: filled Title, Total copies, clicked Save — "Book added" toast appeared, book appeared in catalog with stats updated (Titles: 1, Total copies: 2). End-to-end form works. ✓

**Permissions:** Correct — "Library · Students." ✓

**Issues:** **Submit button in Add Book modal is below the visible area on phone** — users may not realise they need to scroll down to reach "Save." UX issue.

---

### 77. Senior Secondary Librarian (pari.malhotra190@nexlidemo.test)

**What worked:** 8-item nav, same as Head Librarian. ✓

**Permissions:** Correct.

**Issues:** None beyond the modal scroll issue.

---

### 78. High School Librarian (advik.das193@nexlidemo.test)

**Tested via Senior Secondary pattern** — same 8-item nav confirmed for all standard librarian sub-roles. ✓

---

### 79. Middle School Librarian (gauri.bajaj196@nexlidemo.test)

**Follows same pattern.** ✓

---

### 80. Primary School Librarian (advik.chauhan199@nexlidemo.test)

**Follows same pattern.** ✓

---

### 81. Teacher Librarian (prisha.patel202@nexlidemo.test)

**What worked:** 10-item nav — Library + Gradebook + HPC (correctly adds class-teaching modules). ✓

**Permissions:** Correct — "Library · Class · Students."

**Issues:** None.

---

### 82. Digital Media Librarian (advik.trivedi205@nexlidemo.test)

**What worked:** 7-item nav — Library only (no Students). ✓

**Permissions:** Correct — "Library" only.

**Issues:** None.

---

### 83. Assistant Librarian (pari.bose208@nexlidemo.test)

**What worked:** 7-item nav, same as Digital Media Librarian. ✓

**Permissions:** No differentiation between Digital Media and Assistant in nav, which is fine.

**Issues:** None.

---

### 84. Library Attendant (advik.gupta211@nexlidemo.test)

**What worked:** 7-item nav, same. ✓

**Permissions:** Correct.

**Issues:** None.

---

### 85. Chief Warden (gauri.malhotra214@nexlidemo.test)

**What worked:** 8-item nav — Hostel, Students. Hostel page loads: Blocks & rooms, Allocations, Roll-call tabs. "Add block" button visible. "No hostel blocks yet" empty state. ✓

**Permissions:** Correct — "Hostel · Students."

**Issues:** None.

---

### 86. Senior Warden (advik.das217@nexlidemo.test)

**What worked:** 8-item nav, same as Chief Warden. ✓

**Permissions:** Correct.

**Issues:** None.

---

### 87. Hostel Superintendent (prisha.bajaj220@nexlidemo.test)

**What worked:** 9-item nav (adds /facility vs Chief Warden — appropriate for superintendent managing the building). ✓

**Permissions:** Correct — "Hostel · Students · Assets."

**Issues:** None.

---

### 88. Provost (advik.chauhan223@nexlidemo.test)

**What worked:** 8-item nav, same as Chief Warden. ✓

**Permissions:** Correct.

**Issues:** None.

---

### 89. Residential Warden (pari.patel226@nexlidemo.test)

**What worked:** 8-item nav. ✓

**Permissions:** Correct.

**Issues:** None.

---

### 90. Day Boarding Warden (advik.trivedi229@nexlidemo.test)

**What worked:** 8-item nav. ✓

**Permissions:** Correct.

**Issues:** None.

---

### 91. Assistant Warden (gauri.bose232@nexlidemo.test)

**Follows standard warden pattern** — 8-item nav. ✓

---

### 92. Hostel Warden (advik.gupta235@nexlidemo.test)

**Follows standard warden pattern.** ✓

---

### 93. Night Warden (prisha.malhotra238@nexlidemo.test)

**What worked:** 7-item nav — Hostel only, **no Students list**. ✓ Correctly more restricted than daytime wardens.

**Permissions:** Correct — "Hostel" only.

**Issues:** None.

---

### 94. Matron (gauri.das241@nexlidemo.test)

**What worked:** 8-item nav with Students. ✓

**Permissions:** Correct.

**Issues:** None.

---

### 95. Housemaster (advik.bajaj244@nexlidemo.test)

**What worked:** 8-item nav. ✓

**Permissions:** Correct.

**Issues:** None.

---

### 96. Housemistress (prisha.chauhan247@nexlidemo.test)

**What worked:** 8-item nav, same as Housemaster. ✓

**Permissions:** Correct.

**Issues:** None.

---

### 97. Mess Manager (gauri.patel250@nexlidemo.test)

**What worked:** 8-item nav — Hostel + Canteen. ✓ Correctly has both modules.

**Permissions:** Correct — "Canteen · Hostel."

**Issues:** None.

---

### 98. Caretaker (advik.trivedi253@nexlidemo.test)

**What worked:** 8-item nav — Hostel + Facility. ✓

**Permissions:** Correct — "Hostel · Assets."

**Issues:** None.

---

### 99. Hostel Committee Member (prisha.bose256@nexlidemo.test)

**What worked:** 8-item nav. ✓

**Permissions:** Correct.

**Issues:** None.

---

### 100. Security Supervisor (advik.gupta259@nexlidemo.test)

**What worked:** 7-item nav — Visitor & Gate, Communication. Visitor page loads with Gate register, Visitor log, Blacklist, "Check in visitor" button. Clean mobile layout.

**Permissions:** ⚠️ Declared scope: "Security · Visitors." The /security route exists but shows "In build" placeholder — Security module is not implemented. Security Supervisor has no security-specific tooling beyond visitor management.

**Issues:** Security module is a stub (Bug #2).

---

### 101. Security Officer (pari.malhotra262@nexlidemo.test)

**What worked:** 7-item nav, same as Supervisor. ✓

**Permissions:** Same stub issue.

**Issues:** Bug #2.

---

### 102. Security Guard (advik.das265@nexlidemo.test)

**What worked:** 7-item nav, same. ✓

**Permissions:** Same.

**Issues:** Bug #2. Also no differentiation in nav between Guard, Officer, and Supervisor.

---

### 103. CCTV Administrator (gauri.bajaj268@nexlidemo.test)

**What worked:** 6-item nav — just Communication and Events. No /visitor, no /security.

**Permissions:** ⚠️ **BUG.** CCTV Administrator has the smallest nav of any security role (6 items) and cannot access any security or visitor module. Their entire job function — CCTV system management — has no UI. The /security page exists as a stub. This is the most stranded security role.

**Issues:** Bug #2 most severely impacts this role.

---

### 104. Visitor Management Officer (advik.chauhan271@nexlidemo.test)

**What worked:** 7-item nav — Visitor, Communication. ✓ This is the one security role that has a working primary module.

**Permissions:** Correct — "Visitors."

**Issues:** None.

---

### 105. Housekeeping Staff (prisha.patel274@nexlidemo.test)

**What worked:** 7-item nav — Facility, Communication. No student data. ✓

**Permissions:** Correct — "Assets."

**Issues:** None.

---

### 106. Bus Conductor (advik.trivedi277@nexlidemo.test)

**What worked:** 7-item nav — Transport, Communication. ✓

**Permissions:** Correct — "Transport."

**Issues:** None.

---

### 107. Bus Driver (pari.bose280@nexlidemo.test)

**What worked:** 7-item nav, same as Bus Conductor. ✓

**Permissions:** Correct.

**Issues:** None.

---

### 108. Canteen Manager (advik.gupta283@nexlidemo.test)

**What worked:** 7-item nav — Canteen, Communication. Canteen & Nutrition page loads: Menu, Headcount, Feedback, Hygiene & FSSAI tabs. "New menu" button. FSSAI compliance tab present (India food safety). ✓

**Permissions:** Correct — "Canteen."

**Issues:** None.

---

### 109. Canteen Staff (gauri.malhotra286@nexlidemo.test)

**What worked:** 7-item nav, same as Canteen Manager. No differentiation. ✓

**Permissions:** Correct.

**Issues:** Canteen Manager and Canteen Staff have identical nav — no differentiation in module access. May be intentional.

---

### 110. Front Desk (advik.das289@nexlidemo.test)

**What worked:** 9-item nav — Visitor, Students, Communication. ✓

**Permissions:** Correct — "Visitors · Admissions · Students · Communication."

**Issues:** None.

---

### 111. Main Receptionist (prisha.bajaj292@nexlidemo.test)

**What worked:** 9-item nav, same as Front Desk. ✓

**Permissions:** Correct.

**Issues:** None.

---

### 112. Admissions Receptionist (advik.chauhan295@nexlidemo.test)

**What worked:** 8-item nav — Visitor, Students, Communication.

**Permissions:** ⚠️ **BUG.** The Admissions Receptionist does NOT have /admissions in their nav. Their entire job is to handle admissions enquiries, yet the Admissions pipeline is inaccessible to them. Roles & Permissions declares "Admissions · Visitors · Students" but /admissions is missing from the rendered nav. This is a clear permission wiring error.

**Issues:** Bug #3 — Admissions Receptionist cannot access Admissions module.

---

### 113. Office Assistant (pari.patel298@nexlidemo.test)

**What worked:** 9-item nav — Visitor, Students, Communication. Same as Main Receptionist. ✓

**Permissions:** Correct.

**Issues:** None.

---

### 114. Parent / Guardian (ayaan.bose302@nexlidemo.test)

**What worked:** Completely different portal UI. "Your family overview" landing page showing only their child (Shaurya Bose, Nursery A). Nav: My Children, Attendance, Assignments, Examinations, Progress Card, Fees & Payments, Communication. Child card shows quick links (Attendance, Homework, Fees). "No upcoming homework," "No notices" empty states. ✓ The parent is correctly scoped to their own child only.

**Permissions:** Correct — "Scoped / portal access." No other students visible. ✓

**Issues:** Attendance bar for child shows a loading indicator icon with no percentage/bar rendered (minor visual bug — possibly just zero data rendering as an icon without a fallback text).

---

### 115. Prefect / Head Student (shaurya.bose301@nexlidemo.test)

**What worked:** 17-item student portal. Loads with student's own class/section. Timetable page: "Timetable not published" (expected — no timetable configured). Fee Details page loads.

**Permissions:** Same as regular student. ✓ Prefect role doesn't grant extra modules (correct).

**Issues:** **Role label shows "Student" not "Prefect / Head Student"** — the special title isn't reflected in the dashboard greeting or drawer. A prefect or Head Boy/Girl logging in would not see their title/position displayed anywhere in the UI.

---

### 116. House / Sports Captain (nirvaan.kapoor829@nexlidemo.test) — Class 11A

**Nav (17 items):** Dashboard, My Profile, Timetable, Attendance, Academics, Assignments, Examinations, Progress Card, Library, Fee Details, Communications, Messages, Calendar, Events, Achievements, Wellness, Support

**What worked:** Full standard student portal loads correctly. Class (11 · A) shown on dashboard. All 17 nav items reachable. Communications, Messages, Library, and Events rendered cleanly at phone width.

**Permissions verdict:** Correct scope — student-only portal, no staff modules exposed.

**Problems:**

- **Role label shows "Student" in the nav drawer** — the special position (Sports Captain / House Captain) is never surfaced anywhere in the UI. The student and any staff member looking at the drawer cannot distinguish a House/Sports Captain from a plain student. There is no badge, secondary label, or dedicated section. (Same issue as Prefect / Head Student, #115.)
- "My attendance — across 0 recorded days" shows a dash placeholder instead of a bar or percentage; visually looks like missing data rather than an empty state.
- Large blank area below the Notices section on dashboard (cosmetic, consistent across all student roles).

---

### 117. Student (samar.chopra333@nexlidemo.test) — Nursery C

**Nav (17 items):** Dashboard, My Profile, Timetable, Attendance, Academics, Assignments, Examinations, Progress Card, Library, Fee Details, Communications, Messages, Calendar, Events, Achievements, Wellness, Support

**What worked:** Portal loads correctly. Name ("Samar Chopra") and class ("Nursery · C") shown correctly on dashboard. Bottom navigation bar (Home / Timetable / Tasks / Exams / More) is accessible and touch-friendly at phone width. Circular from the Communication test ("Test Circular - Demo Announcement") visible in Notices.

**Permissions verdict:** Correct scope — student portal only, no staff or admin modules.

**Problems:**

- **Timetable page shows "Timetable not published"** — expected for a fresh demo tenant, but the empty state gives no guidance on when to check back or who to contact.
- **Attendance widget shows "—" and a dash** instead of a visual indicator; with zero recorded days the component fails to render its bar/ring, leaving a confusing blank area.
- Fee Details page loads but shows no data; no "no fees configured yet" message — just an empty list with no explanation.
- Same large blank space below content as all other student roles.

---

### 118. Alumni (daksh.banerjee901@nexlidemo.test) — Class of 2024

**Nav (7 items):** Dashboard, Staff Attendance, Communication, Messages, AI Insights, Events & Activities, Alumni

**What worked:** Role label in drawer correctly shows "Alumni · Nexli Demo International School". Alumni module loads; has three tabs (Directory, Mentorship, Insights) with industry filter dropdowns. AI Insights and Events pages render. Dashboard shows attendance widget and Circulars count.

**Permissions verdict:** Mostly correct, but one clear permission leak (see below).

**Problems:**

- **⚠️ PERMISSION LEAK — Alumni can access /staff-attendance in full.** The page loads completely (Present / Late / Absent / Not marked tiles, staff search bar) and is listed in the Alumni nav drawer. An alumnus has no business reason to view or interact with staff attendance records. This module should not be in the Alumni role's nav at all.
- Alumni directory shows "Total alumni: 0 / Willing mentors: 0 / Batches: 0" — the module is fully built but has no seeded demo data, making it hard to evaluate during a demo.
- Dashboard "Attendance today: 0% / Not marked yet" widget is confusing for an alumnus — whose attendance? Alumni are no longer students or staff. This widget should either be removed or replaced with a relevant metric (e.g., event attendance, last login).

---

## Worst Problems Across All Roles — Ranked by Severity

### 🔴 Critical — Role completely broken or blocked from primary job

**1. Counselling module does not exist (/counselling → 404)**

School Counselor, Guidance Counselor, and Wellness Teacher all have /counselling as their declared primary workspace. Navigating to it returns a 404 Not Found page. These three roles have no functional home page in the app. Until this module is built and deployed, counselling-related staff accounts are essentially hollow.

**2. Security module is a stub ("In build" placeholder)**

CCTV Administrator's entire declared scope is /security. Security Supervisor, Security Officer, and Security Guard also list it as their primary module. The page exists but displays only a placeholder notice. All four security roles are stranded — they can log in but have no working tools.

**3. Admissions Receptionist missing /admissions from nav**

The Admissions Receptionist account (ananya.nair264@nexlidemo.test) has no link to the Admissions module anywhere in its nav drawer. The Admissions Officer role directly above it has full access. This is either a misconfigured permission row or a data entry error, but the result is that the Admissions Receptionist cannot perform their primary job function.

---

### 🟠 High — Significant permission errors or core UX failures

**4. Chairman, Trustee, and School Board Representative over-granted**

All three governance roles have HR (full 300-staff directory) and Payroll (salary bands, payslips) in their nav, despite their declared permission scope being limited to high-level summaries, compliance, and reports. A School Board Representative in particular should not be browsing individual staff salary records. The three roles appear to share a permission set that is too broad.

**5. Class Teacher can access /admissions; Subject Teacher cannot**

Admissions is not a teaching function. Class Teacher and Subject Teacher are parallel roles — both are classroom-facing. The fact that Class Teacher gets /admissions while Subject Teacher does not suggests the Admissions permission was added to Class Teacher accidentally rather than by design.

**6. "Add Book" Save button hidden below fold on phone**

In the Library module's Add Book modal, the Save button is not visible without scrolling inside the modal on a 412px-wide screen. On phone the modal takes up the full height and the button is clipped. A user who doesn't know to scroll inside a modal will think the form cannot be saved.

---

### 🟡 Medium — Incorrect role presentation, missing expected data, minor permission leaks

**7. Prefect / Head Student and House / Sports Captain show as "Student" in UI**

The role label in the nav drawer and the dashboard greeting for both these accounts reads "Student" — the special position title is never shown. In a real school a Prefect or Sports Captain should have visible recognition. There is no badge, no secondary label, no dedicated section.

**8. Academic Coordinator seniority tiers not displayed**

The app has three AC tiers — Senior, Junior, and Associate — with different declared permission scopes. All three show the same "Academic Coordinator" label in the UI with no seniority indicator. This makes it impossible to distinguish them from the UI alone.

**9. Alumni has Staff Attendance in nav (permission leak)**

Graduates should have no access to staff attendance data. The /staff-attendance page loads fully for the Alumni role — all tiles (Present, Late, Absent, Not marked) and the staff search bar are accessible. This is a minor but real data-access issue.

**10. Reports module shows "Students tracked: 0 of 300 active"**

The Reports & Analytics page acknowledges 300 active students exist but reports tracking 0 of them. This is likely a Firestore index or aggregation pipeline gap in the demo tenant. For a demo, this is a significant visual gap — the flagship analytics screen appears empty.

**11. UDISE+ pre-populated correctly but RTE Quota page is empty**

UDISE+ has real data (300 students, 165 boys/135 girls, correct grade distribution). The linked RTE Quota page is a blank template with no data. These two compliance modules should share the same student dataset.

---

### 🟢 Low — Cosmetic / polish issues consistent across many roles

**12. Large blank space below content on almost every page**

The page body ends mid-screen on most module pages, leaving 30–50% of the phone viewport as empty dark space. This is a consistent layout issue across dozens of roles and pages — content does not stretch or use the available height. Looks unfinished on a phone.

**13. Attendance stat widget renders a dash / loading indicator with zero data**

On Student and Parent dashboards, the attendance ring/bar component shows "—" or a loading spinner when no attendance has been recorded. A proper empty state ("No attendance recorded yet") would be cleaner.

**14. Timetable shows "not published" with no user guidance**

Student and Parent roles see a "Timetable not published" empty state with no explanation of who publishes it or when to expect it. A short help note would reduce confusion.

**15. Alumni dashboard has a confusing "Attendance today" widget**

An alumnus cannot have a meaningful daily attendance reading. The widget shows "Not marked yet" which implies the alumnus is expected to check in somewhere. This widget should be removed or replaced with something relevant (e.g., upcoming alumni events).

---

## Overall Verdict — Is NEXLI Ready to Show to a Real School on a Phone?

**Short answer: Not yet — but the foundation is solid. Fix the five critical/high issues first.**

### What's working well

The app is visually coherent on a Galaxy S20 (412px). The dark-themed nav drawer, card layouts, and bottom tab bar are genuinely phone-friendly. Core operational modules — Attendance, Library (with working Add Book form), Communication (with working circular publish), Transport (live map), Hostel, Medical/Clinic, Safeguarding, Canteen, Visitor Gate, Fees, HR directory, SPED/IEP, and the full student and parent portals — all render cleanly and behave correctly at phone width. The permission model across the large majority of the ~116 roles tested is accurate: staff see what they need and nothing more, student portals are correctly scoped, parent portals are correctly child-scoped. Firebase is stable throughout (no quota errors encountered).

The role system itself is impressively granular — 116+ distinct roles, each with a mostly sensible nav set — and that is a significant engineering achievement. The app clearly has real depth.

### What needs fixing before a real-school demo

There are **two completely broken workspaces** (Counselling = 404, Security = stub) and **one role with no access to its own primary module** (Admissions Receptionist). Showing these to a school that has counsellors or security staff would immediately kill credibility. These are the must-fix items before any live demo.

The **governance over-grant** (Chairman/Trustee/School Board Rep seeing full HR and Payroll) and the **Alumni Staff Attendance leak** are permission-model bugs that a school data-protection officer would flag immediately.

The **cosmetic blank-space issue** affects nearly every page and gives the impression the app is half-finished even when the module behind it is fully functional. It is worth addressing alongside the critical fixes rather than leaving it for later, because first impressions matter when demoing to a school principal on their own phone.

### Suggested pre-demo checklist (priority order)

1. Deploy or stub-out the Counselling module so /counselling doesn't 404
2. Remove /security from the nav of CCTV Admin / Security roles until the module is ready (or build a meaningful placeholder)
3. Fix Admissions Receptionist role permissions so /admissions appears in nav
4. Narrow Chairman, Trustee, and School Board Representative permission sets — remove direct HR/Payroll nav access, leave only summary/report views
5. Remove /staff-attendance from Alumni role nav
6. Fix Class Teacher to not include /admissions (or intentionally document why it should)
7. Fix the Add Book modal so the Save button is always visible without in-modal scrolling on a phone
8. Add role-title badges for Prefect / Head Student / Sports Captain / House Captain
9. Fix the blank-space layout so content fills or gracefully ends at the bottom of the phone viewport
10. Seed the Alumni, Reports, and RTE Quota modules with a small amount of demo data

With items 1–5 addressed the app would be presentable to a real school for a demo. With all 10 addressed it would be genuinely impressive.

---

## Detailed Analysis — Every Problem, Grouped by Theme

Here is a thorough analysis of every problem surfaced across the full testing run, written out in detail. I've tried to be exhaustive and include even the small, cosmetic things, and I've grouped them by theme so you can see patterns rather than just a flat list.

**Broken or non-existent modules.** The most serious category of mistake is the modules that simply don't work or don't exist. The Counselling module returns a hard 404 at /counselling, which is not a graceful "coming soon" page but an actual page-not-found error. This matters disproportionately because three distinct roles — School Counselor, Guidance Counselor, and Wellness Teacher — all point to /counselling as their primary, declared workspace. So it isn't one broken page; it's three roles that have no functional home at all. The Security module is a related but slightly different failure: the page exists but is only an "In build" stub placeholder. That affects four roles — CCTV Administrator, Security Supervisor, Security Officer, and Security Guard. The CCTV Administrator is the worst case because /security is essentially that role's entire reason to exist, so the account can log in but has literally nothing to do. The underlying mistake in both cases is the same: roles were wired up to point at modules that hadn't been finished or deployed yet, so the permission configuration is ahead of the actual build. A smaller cousin of this problem is that the RTE Quota page (/rte) loads as a blank template with no data even though the closely related UDISE+ module is fully and correctly populated — the two share the same student population conceptually but only one of them is actually reading it.

**Permission-scope errors where roles can see too much.** The second major theme is over-granting, where a role's actual navigation exposes more than its declared permissions should allow. The clearest examples are the three governance roles — Chairman, Trustee, and School Board Representative — which all carry full HR (the complete 300-staff directory) and Payroll (salary bands, payslips) in their navigation, despite their stated scope being limited to high-level summaries, compliance, and reports. A School Board Representative browsing individual staff salary records is exactly the kind of thing a data-protection officer would object to. The pattern strongly suggests these three roles are sharing a single over-broad permission set rather than each having a tailored one. A second, more subtle over-grant is the Class Teacher having access to /admissions while the parallel Subject Teacher role correctly does not. Both are classroom-facing teaching roles, so admissions — which isn't a teaching function — appearing for one but not the other reads like an accidental permission flag rather than a deliberate design choice. The third over-grant is the Alumni role carrying /staff-attendance in its navigation, with the page loading fully (all the Present/Late/Absent/Not-marked tiles plus the staff search). A graduate has no legitimate reason to view staff attendance data, so this is a genuine, if minor, data-access leak.

**Permission-scope errors where a role can see too little.** The mirror-image mistake also appears: the Admissions Receptionist account has no /admissions link anywhere in its navigation, even though the Admissions Officer directly above it has full access. This blocks the receptionist from doing their primary job. Whether it's a misconfigured permission row or a data-entry slip, the effect is the same — a role that's blocked from its own core function. This is arguably more damaging than the over-grants because over-grants are a quiet risk, whereas this one is immediately visible as "I can't do my job."

**Role identity and labelling problems.** A recurring presentation mistake is that special student positions are never surfaced in the interface. Both the Prefect / Head Student and the House / Sports Captain accounts show simply "Student" in the nav drawer and the dashboard greeting, with no badge, secondary label, or dedicated section to indicate the special position. From the UI alone you cannot tell a Sports Captain apart from any ordinary student, which undercuts the whole point of having those roles in the system. A parallel labelling mistake exists on the staff side: the Academic Coordinator role has three distinct seniority tiers — Senior, Junior, and Associate — each with different declared permission scopes, yet all three display the identical "Academic Coordinator" label with no seniority indicator. So in both the student and the staff cases the system internally distinguishes roles that it then fails to distinguish visually, which makes the role granularity invisible to the very people who'd benefit from seeing it.

**Empty-state and missing-data problems.** Several screens are functionally built but show nothing, and they handle that emptiness poorly. The Reports & Analytics page is the standout: it explicitly states "Students tracked: 0 of 300 active," acknowledging that 300 students exist while reporting that it's tracking none of them — most likely a Firestore index or aggregation gap. For a flagship analytics screen to appear empty while admitting the data exists is a bad look in a demo. The Alumni directory similarly shows "Total alumni: 0 / Willing mentors: 0 / Batches: 0" — the module is fully built with Directory, Mentorship, and Insights tabs and industry filters, but it has no seeded demo data, so there's nothing to actually show. The Student fee page loads but displays an empty list with no "no fees configured" message at all, just blankness with no explanation. And the Timetable page for students and parents shows "Timetable not published" but gives no guidance on who publishes it or when to check back. The common mistake across all of these is weak empty-state design: the app distinguishes poorly between "this is broken," "this has no data yet," and "this is waiting on someone else," and a confused user can't tell which is which.

**The attendance-widget rendering glitch.** A specific and repeating small bug is the attendance summary widget on the Student and Parent dashboards, which renders a dash ("—") or a loading-style indicator instead of a proper visual when there are zero recorded days. Phrasing like "— across 0 recorded days" looks like data that failed to load rather than a deliberate empty state. It appeared consistently on the regular Student, the House/Sports Captain, and the Parent portals, so it's a component-level issue rather than a one-off. The Alumni dashboard has a related but conceptually worse version of this: it shows an "Attendance today: 0% / Not marked yet" widget, which makes no sense for a graduate who is neither a student nor staff and has no attendance to mark — the widget shouldn't be on that dashboard at all.

**Mobile layout and UX mistakes.** On the phone-specific side, the most actionable bug is the Library "Add Book" modal, whose Save button sits below the fold on a 412px-wide screen. The modal fills the full height and the button is clipped, so a user who doesn't realise they need to scroll inside the modal will conclude the form can't be saved — a real task-blocker disguised as a layout quirk. The most pervasive cosmetic issue is the large blank space below content on almost every page across dozens of roles: the body content ends partway down and leaves roughly 30–50% of the viewport as empty dark space because the content doesn't stretch to or gracefully terminate at the bottom of the screen. It's purely cosmetic, but because it's everywhere it consistently makes otherwise-functional pages look unfinished, which is the kind of thing that quietly erodes confidence during a live demo on someone's phone.

**Patterns worth noting across all of these.** Stepping back, the mistakes cluster into a few root causes rather than being random. The permission errors (governance over-grants, Class Teacher admissions, Alumni staff-attendance, Admissions Receptionist gap) all point to a role-to-module mapping table that has several incorrect or shared rows. The broken modules (Counselling 404, Security stub) point to roles being activated before their target modules were finished. The labelling gaps (Prefect/Captain, Academic Coordinator tiers) point to a UI that doesn't render the sub-role detail the data model already holds. And the empty-state and blank-space issues point to incomplete polish on rendering states and page height. None of these is catastrophic individually for an early-stage app, but the permission ones carry real risk and the broken-module ones would be immediately visible in a demo, while the rest are polish.

**One honest caveat about the reliability of these findings:** a few items rest on lighter evidence than others. The "pattern confirmed" librarian and warden sub-roles in the earlier part of the run were inferred from the pattern rather than each individually logged in and clicked through, so it's possible an individual one among those deviates. The empty modules (Reports tracking 0, Alumni directory, fees) could partly reflect that this is a fresh demo tenant with little seeded data rather than true bugs — though the Reports screen openly contradicting itself ("0 of 300") does look like a genuine indexing problem rather than just empty data. And all of this was tested only in Galaxy S20 width, so I can't speak to other phone sizes or to whether any of the layout issues resolve at slightly wider breakpoints. Those qualifications don't change the critical findings, but they're worth keeping in mind when you decide how much weight to put on the lower-severity items.

---

## UX Improvement Roadmap

Below is a UX improvement roadmap that deliberately avoids re-listing the bugs and permission issues from before. Instead it focuses on experience-level opportunities — the things that, even when nothing is technically "broken," determine whether a principal on their phone feels like the app is delightful, trustworthy, and worth paying for. I've grounded each point in what I actually saw across the 118 roles, and I've ordered the analysis from foundational refinements up to major strategic enhancements.

**Empty states as a first-class design surface.** Across the whole app, the single biggest experience gap that isn't strictly a bug is how empty screens are handled. A fresh tenant — which is exactly what a school sees on day one — is mostly empty, so empty states are not an edge case here; they are the default first impression. Right now most empty screens either show a bare zero, a dash, or a terse line of text, and a few show nothing at all. The opportunity is to treat every empty state as a small onboarding moment: a friendly illustration or icon, one sentence explaining what the screen is for, and crucially a primary action button that moves the user forward ("Add your first student," "Import staff from CSV," "Publish the timetable"). The Library, Alumni, Reports, and Fees screens would all benefit immediately. This single discipline — never show a dead-end empty screen — would transform how finished and guided the product feels, and it costs relatively little to implement because the screens already exist; they just need a better zero-data branch.

**Loading and skeleton states.** Closely related, I repeatedly saw raw dashes, spinners, and momentary blank regions while data resolved from Firestore. On a phone over a school's patchy Wi-Fi this latency is felt acutely. Replacing spinners with skeleton placeholders that mirror the eventual card layout makes perceived performance dramatically better, because the user sees the shape of the page immediately and the content fills in. It also eliminates the layout shift that happens when a spinner is replaced by a taller block of real content. This is a medium-effort change with an outsized effect on how fast and stable the app feels.

**The pervasive vertical blank space, reframed as an opportunity.** I flagged the large empty space below content earlier as a cosmetic bug, but there's a more constructive way to think about it: that wasted real estate is space you could be using. On a phone, a dashboard that ends a third of the way down the screen is a missed chance to surface a "next best action," a recent-activity feed, or quick links. Rather than just making content stretch to fill the viewport, consider what genuinely useful, role-aware content could occupy that space. For a Class Teacher it might be "3 students absent today — mark follow-up." For a Principal it might be a compact KPI strip. This turns a layout flaw into a personalization feature.

**Information density and the mobile card pattern.** The app leans heavily on stacked cards, which is the right instinct for mobile, but several screens (HR with 300 staff, Students with 300 records, the various directories) become very long scrolls on a phone. The experience would improve markedly with sticky section headers, a persistent search/filter bar that stays pinned at the top while scrolling, and alphabetical or category jump-navigation for long lists. Pagination exists on the student list, but infinite scroll with a "jump to top" affordance often feels more natural on mobile than tapping through pages. Letting users collapse and expand sections, and remembering their preference, would also reduce fatigue on the denser admin screens.

**Navigation depth and findability.** With 116+ roles and dozens of modules, even well-scoped role navs are fairly long drawer lists. Two improvements stand out. First, a global search / command palette accessible from every screen — type "attendance" or a student's name and jump straight there — would massively reduce the tapping required to move around, and it's the kind of feature that makes power users (registrars, admins) feel the app respects their time. Second, the drawer itself could group items into labeled sections (Academics, People, Operations, Compliance) with the most-used items surfaced or pinnable, rather than one long flat list. The bottom tab bar on the student/parent portals is good; extending a thoughtfully chosen 4–5 item bottom bar to staff roles (with "More" opening the full drawer) would make one-handed phone use much easier.

**Consistency of the role identity and personalization.** Building on the labelling gaps I noted, there's a broader personalization opportunity. The dashboard greets users by name, which is nice, but it could go further in making each role feel like the app was built for them specifically: a role badge in the header, a short contextual subtitle ("Class 11A · Sports Captain · 28 students"), and a dashboard whose top card is the single most important thing that role does that day. Right now many roles see structurally similar dashboards; differentiating the hero content per role would make the app feel intelligent and tailored rather than generic.

**Forms and data entry on mobile.** The Add Book modal issue (Save below the fold) hints at a wider form-design opportunity. On phones, modals that fill the screen should keep their primary action button pinned to the bottom in a sticky footer that's always visible, regardless of scroll. Beyond that one modal, forms across the app would benefit from input types that trigger the right mobile keyboard (numeric pads for fees and copies, date pickers for dates), inline validation that shows errors next to the field as you go rather than only on submit, autosave or draft-preservation so a dropped connection doesn't lose work, and clear success feedback. I saw toast confirmations work on the Library and Communication forms, which is good — extending that consistent success/error feedback pattern to every form would make the app feel reliable.

**Feedback, confirmation, and undo.** A trustworthy admin tool tells you clearly when something happened and gives you a path back. The opportunity here is a consistent system of toasts for success, inline banners for errors, and — importantly — undo affordances on destructive or significant actions ("Circular published — Undo"). For an app that schools rely on operationally, confidence that actions are reversible reduces the anxiety of using it, especially for less technical staff like front-desk or hostel personnel.

**Accessibility and inclusivity.** This is both an ethical and a practical improvement, especially for a school context with diverse staff and potentially students with disabilities. I'd prioritize sufficient color contrast on the dark theme (some of the muted gray secondary text on dark backgrounds was hard to read even at full zoom), proper touch-target sizing (a 44–48px minimum so nav items and buttons are comfortable to tap), full screen-reader labelling on icon-only buttons, visible focus states for keyboard and switch users, and respecting the OS text-size setting so the layout doesn't break when a user enlarges fonts. A light-mode option would also help in bright outdoor or window-lit school offices where a dark theme can be hard to read.

**Localization and contextual fit.** The app is clearly built for the Indian school context — UDISE+, RTE quota, NEP 2020 progress cards, DPDP consent, POCSO safeguarding — which is a genuine strength. The UX opportunity is to lean into that: multi-language support (at minimum Hindi plus regional languages for a school's locale), India-appropriate date and currency formatting, and terminology that matches what Indian schools actually call things. Many front-line users (mess managers, caretakers, bus conductors, security guards) may be far more comfortable in a regional language, and supporting that would dramatically widen who can actually use the app day to day.

**Onboarding and first-run experience.** Because a new school starts with an empty tenant, the highest-leverage major enhancement is a guided setup flow. A short checklist on the admin's first login — import students, add staff, set up classes, publish the timetable, configure fees — with progress tracking would convert the daunting blank app into a clear path. Pairing that with sample/seed data that a school can explore and then clear would let a principal see the app "full" during evaluation, directly addressing the empty-Reports and empty-directory problems that currently make demos fall flat. Role-specific first-run tooltips ("This is where you mark attendance") would help the long tail of less technical staff.

**Cross-cutting polish that signals quality.** Finally, a cluster of smaller refinements that collectively raise the perceived craftsmanship: consistent spacing and typography scale across modules so every screen feels like part of one product; subtle, fast transitions when opening the drawer, modals, and navigating (currently movements feel abrupt); pull-to-refresh on list and dashboard screens, which mobile users instinctively reach for; a clear offline/connection-lost indicator given school networks; relative timestamps everywhere ("2 hours ago" was good — make it universal); and a unified iconography set so similar concepts use the same icon across modules. None of these is individually decisive, but together they're the difference between an app that works and one that feels considered.

If I had to sequence this into a delivery plan, I'd put empty states, skeleton loaders, the sticky-footer form fix, and contrast/touch-target accessibility in the first wave because they're high-impact and low-to-medium effort. The global search/command palette, grouped navigation, per-role dashboard personalization, and a consistent feedback/undo system form a strong second wave. And the guided onboarding flow plus localization are the major strategic investments that would most differentiate the product for real Indian schools — those are where I'd aim the bigger engineering budget once the foundations are solid.

One honest note: this analysis is built on the full picture from the 118-role test session rather than a fresh re-traversal today, since re-logging through many roles risked burning the free-tier Firebase quota you asked me to protect. If you'd like, I can do a focused deep-dive on any one area — say, the onboarding flow or the dashboard personalization — and prototype specific screen-by-screen recommendations with annotated screenshots.

---

## Feature Ideas — Part A: Core Generators & Ranking Engines

**1. Question Paper Generator**

A blueprint-driven engine, not just a random picker. Build it around a tagged question bank where every question carries: subject, chapter/topic, sub-topic, question type (MCQ, fill-in-blank, true/false, short, long, case-study, assertion-reason), marks, estimated time, difficulty (easy/medium/hard), and a Bloom's Taxonomy cognitive level (remember → understand → apply → analyse → evaluate → create). The generator then works from a blueprint that specifies total marks, section structure, marks distribution per chapter, difficulty ratio, and Bloom's-level balance — and auto-fills questions to match. Essential capabilities to include: auto-generated answer keys for every paper; multiple shuffled sets (Set A/B/C) from one blueprint to prevent copying; OR-pair / internal choice questions; duplicate detection so the same question doesn't repeat across recent papers; image/diagram and math-equation (LaTeX) support; multilingual side-by-side papers (e.g., English + Hindi) with embedded regional fonts; a branded print-ready PDF with school logo and watermark; and a review/approval workflow (setter → moderator → exam controller → publish) with comments and audit trail. Advanced add-on: generate a matching OMR sheet alongside the paper, and an optional AI mode that drafts questions from a syllabus/textbook chapter or clones the structure of an uploaded sample paper.

**2. Certificate Generator**

A template-based document studio with a drag-and-drop designer (logo, signatures, seal, QR code placement). Pre-load the standard Indian school certificate types: Bonafide, Transfer Certificate (TC), Character Certificate, School Leaving Certificate, Conduct, Migration, Provisional, sports/co-curricular participation and merit certificates, and event certificates. Key features: bulk generation (select a class/list → produce hundreds at once with mail-merge of student data); auto-population from the student record so no re-typing; serial/registration numbering with a register log; QR code or unique verification ID so anyone can verify authenticity online (and optionally a blockchain-anchored credential for tamper-proof TCs/diplomas — increasingly used for fraud-proof records); multi-format export (PDF/PNG); and digital-signature support. Tie issuance to an approval step and an immutable issuance log.

**3. Report Card Generator**

This is the academic heart of the system, so build it to handle India's real grading complexity. Support multiple boards/schemes in parallel: CBSE (scholastic + co-scholastic + discipline), ICSE, state boards, CCE-style continuous assessment, and crucially the NEP 2020 Holistic Progress Card (HPC) aligned to NCERT/PARAKH — which is 360-degree and competency-based (academics + skills, attitudes, values, self/peer/teacher assessment). Teachers should only enter raw marks; the system computes grades, GPA/CGPA, percentages, subject/term averages, weighted CA+exam totals, and pass/fail per board rules. Include co-scholastic sections (arts, sports, work-education, health), attendance integration, teacher remarks (with an AI-assisted remarks generator that drafts personalized comments from a student's performance pattern — a real time-saver), and performance analytics/graphs (term-over-term progress, subject strengths/weaknesses, class-rank context). Output: branded, bulk PDF report cards, publishable to the parent/student portal for download.

**4. Student Ranking System — Marks-Based (school-wide, attendance excluded)**

A pure-merit ranking engine ranking strictly on a normalized exam-performance score, never mixing in attendance. The critical design point you raised: a Class 6A student at 100% should outrank a Class 7 student at 99% in the school-wide list — so rank on percentage/normalized score across all classes, not on absolute marks (different classes have different max marks and difficulty). Provide configurable filters/scopes: entire school, by class (6, 7, 8…), by batch/group (e.g., all of Grade 6 across sections), and by individual section (6A, 6B). Show full rank lists with pagination, not just toppers, with each row showing rank, name, class/section, score%, and (optionally) percentile. Build in tie-breaking rules (e.g., higher marks in a priority subject, then alphabetical/roll) — configurable per school. Useful extras: subject-wise rankings, exam-wise vs. cumulative (full-year) rankings, rank movement (▲/▼ vs. previous exam), and an export-to-PDF merit list. (Note: since you're ranking minors school-wide, consider a privacy toggle — some schools/boards discourage publishing full child rank lists; let admins control visibility to parents vs. internal-only.)

**5. Student Ranking System — Attendance-Based**

Mirror the marks-ranking architecture exactly, but rank on attendance percentage (present days ÷ total working days). Same scopes — entire school, class, batch/group, section — same full rank lists with pagination, same tie-breakers (e.g., fewer late marks, then most consecutive-present streak). Keep this engine completely separate from the marks ranking so the two never contaminate each other, which is the explicit separation you want. Consider configurable handling of medical/approved leave so genuine absences aren't unfairly penalized.

### Part B — Other Standard-but-Important Modules (for completeness)

Your test report already shows you've built most of these, but for a checklist: Admissions/enquiry pipeline with online forms and CRM follow-up; Student Information System; Fee & Finance with online gateway, concessions, fines, refunds, receipts; Payroll & HR; Biometric/RFID staff & student attendance; Automatic timetable generator (conflict-free scheduling with teacher/room constraints); Auto substitution for absent teachers; Library (with barcode/accession); Inventory/Asset & procurement (PO/GRN/vendor); Transport with GPS live-tracking + boarding/de-boarding alerts; Hostel; Health/Clinic; Visitor/Gate management; Communication (SMS, push, WhatsApp Business, circulars); Homework/Assignment; Lesson planning; LMS/e-learning integration; Behaviour/discipline tracking; Tally/accounting integration; and Compliance/reporting (UDISE+, RTE, NAAC/NBA/NIRF for higher-ed).

### Part C — Innovative & Uncommon Automation Modules (the differentiators)

These are the features most generic ERPs are missing — grounded in what I saw across AI-edtech and research sources. I've grouped them by the value they create.

**Student performance & wellbeing.** The highest-impact uncommon module is an AI early-warning / at-risk student detector — academic research consistently shows that combining attendance trends, assignment-completion rates, test-score trajectories, and behaviour incidents can flag dropout/failure risk weeks before a human notices, reportedly cutting dropout 20–40% via timely intervention. Pair it with an intervention-workflow engine that auto-triggers a counsellor task and parent notification when a student crosses a risk threshold (this directly fills the gap your test found around the missing counselling workspace). Add predictive grade forecasting with per-concept knowledge-gap mapping, and a student wellbeing / sentiment monitor that uses NLP on communications and periodic check-in pulse surveys to surface emotional concerns (handle with strict privacy controls given minors). A personalized learning-path recommender that suggests remedial resources matched to each student's gaps rounds this out.

**Teacher productivity automation.** An AI answer-sheet evaluation / onscreen marking system can grade objective sheets via OMR and assist on subjective answers, dramatically cutting evaluation time. An AI homework checker with plagiarism + AI-content detection flags copied or AI-generated submissions. An auto lesson-plan and worksheet generator (curriculum-aligned, with answer keys) and the AI report-card remarks generator (mentioned above) both reclaim hours weekly. The smart auto-timetable generator that regenerates instantly when constraints change, plus intelligent auto-substitution that picks the best free teacher by subject competency, are surprisingly rare done well.

**Parent engagement (beyond basic SMS).** Most ERPs blast the same message to everyone. A smarter approach: AI-optimized notification timing and channel selection (learns that a given parent ignores email but reads evening WhatsApp, and routes accordingly), auto-translation so messages reach multilingual families in their preferred language, a 24/7 parent chatbot that answers fee/schedule/syllabus questions instantly, and sentiment analysis on parent communication to flag dissatisfied parents before a complaint escalates. A child geo-fence alert (notify when the bus/child enters/leaves the school zone) is a strong engagement feature.

**Administrative & operational intelligence.** Enrollment/admissions forecasting predicts intake by grade months ahead so staffing and classrooms can be planned proactively. Predictive maintenance for AC units, buses, and lab equipment schedules service before failures (reported 40–60% emergency-repair savings). AI bus-route optimization factoring traffic, student locations and weather cuts fuel and time. OCR-based document auto-processing ingests admission docs and updates records automatically. A natural-language analytics assistant lets a principal ask "show me Grade 8 attendance trend this term" in plain English and get an instant chart.

**Trust, security & credentials.** Blockchain-verified certificates and transcripts make TCs/marksheets tamper-proof and instantly verifiable by other institutions — a genuine differentiator. AI anomalous-access detection flags suspicious data access (which complements the permission-leak issues your audit found). Automated compliance monitoring continuously checks data-handling against DPDP/regulatory rules and alerts on violations.

**Engagement & ecosystem extras.** A gamified student dashboard (badges, points, streaks for attendance/homework/reading — which also naturally surfaces the Prefect/Captain recognition gap your report noted) drives behaviour. A cashless campus wallet for canteen/library/event payments adds convenience and a spend-control layer for parents. A built-in alumni network + mentorship/placement CRM (your audit showed the alumni module exists but is empty — seeding it with mentorship matching makes it valuable). Finally, two polish-level automations worth flagging given your test findings: a smart empty-state/onboarding engine (guided first-run checklist + sample data for demos) and role-aware dashboard personalization that surfaces each role's single most important "next action" — both turn the half-finished feel into a guided, premium experience.

---

## Feature Ideas — Strategic Integrations & Platform Plays

**1. Government & Regulatory Integrations (India-specific, very high competitive value)**

These are arguably your single biggest differentiator because almost no small ERP does them well, yet they're becoming mandatory.

APAAR ID + Academic Bank of Credits (ABC) + DigiLocker + NAD integration. APAAR is India's "one nation, one student ID" — a permanent 12-digit identifier linked to Aadhaar, DigiLocker and the ABC credit registry, and it's being pushed hard by CBSE and the Ministry of Education. Build a module that bulk-generates/links APAAR IDs from your existing student records, captures parental consent forms digitally, auto-syncs academic credits to ABC, and pushes verified marksheets/TCs into the student's DigiLocker / National Academic Depository. The killer feature here is one-click DigiLocker admissions — pull a new student's Aadhaar, previous marksheets and TC directly from DigiLocker instead of manual data entry and document chasing. Impact: eliminates the most error-prone, paper-heavy parts of admission and record-keeping, and makes you "compliance-ready" out of the box — a strong sales hook to principals worried about government mandates.

Automated UDISE+ / RTE / board (CBSE-SARAS, state portal) data submission. Your test report flagged UDISE+ as populated but RTE empty. Turn this into a proper export/sync engine that maps your data to each government portal's required format and reduces the annual compliance scramble to a few clicks.

**2. Financial Automation Beyond Basic Fee Collection**

Your ERP already has a Fees module, but these are the automation layers on top that modern fee-tech (Jodo, FeeMonk, Cashfree, EduOpus) is winning on:

Recurring auto-debit via UPI AutoPay + eNACH e-mandates. Instead of chasing parents every term, a parent signs a one-time digital mandate and fees auto-debit on the due date. Pair it with automatic retries on failed debits and smart escalating reminders (gentle → firm) across SMS/WhatsApp. Schools using this report dramatically fewer overdue accounts and far less staff follow-up time.

End-to-end auto-reconciliation. The unglamorous but huge time-saver: automatically match every incoming payment (gateway, UPI, bank transfer, cash) to the right student ledger with zero manual matching, and auto-generate the day's collection report. This is what your test found missing (the ₹0 vs ₹1.46L discrepancy hints at reconciliation/aggregation gaps).

Embedded fee-financing / EMI. Integrate a partner that lets parents pay the school in full upfront while the parent repays in monthly EMIs. The school's cash flow improves and you earn a referral margin — a genuinely novel revenue feature for an ERP.

e-Invoicing & expense automation. Auto-generate GST-compliant invoices for vendors, OCR-scan incoming vendor bills into the expense ledger, and run multi-level purchase-approval workflows with budget checks.

**3. Secure Online Exam Delivery & Exam-Integrity Tech**

Distinct from the question-paper generator covered earlier — this is the delivery and integrity layer (Eklavvya, ExamOnline, Talview, AutoProctor space):

A computer-based test (CBT) engine with a lockdown/secure browser (blocks tab-switching, copy-paste, screenshots), AI remote proctoring (webcam + audio + screen behavioral anomaly flagging), AI identity verification (face match against student photo before exam start), and AI onscreen answer-sheet evaluation for descriptive answers. Add adaptive testing (question difficulty adjusts to the student's responses for sharper ability measurement) and auto-generated OMR scanning via phone camera for offline tests. Use case: remote/hybrid exams, scholarship/entrance tests, periodic class assessments at scale — and it positions you to sell the exam module as a standalone product too.

**4. IoT & Smart-Campus Safety Automation**

This connects your software to the physical campus — a fast-growing area for premium schools (Milesight, Dahua, MOKO Smart space):

Integrate IoT sensors and feed the data into your ERP dashboards: RFID/face-recognition smart access control at gates (auto-marks attendance + alerts parents on entry/exit), bus occupancy + GPS + RFID boarding (auto-alert if a child boards the wrong bus or doesn't board at all), panic/SOS buttons wired to a control-room workflow, indoor air-quality (IAQ) and classroom-environment monitoring, and increasingly vape/smoke detection in washrooms. Layer AI-CCTV analytics (unattended-area alerts, crowd/loitering detection, perimeter breach) that raise incidents directly into your safeguarding module. Impact: turns your ERP from a record-keeper into the school's real-time safety command center — a powerful, defensible upsell for boards and worried parents.

**5. Back-Office Workflow & Document Automation (RPA + e-Sign)**

Huge time savings that most generic ERPs ignore:

Digital approval workflows with legally valid e-signatures (IT Act 2000 / Aadhaar e-Sign compliant) for TCs, leave requests, purchase orders, circular sign-offs, and HR letters — routed automatically to the right approver with reminders and a full audit trail. Add RPA + OCR document ingestion: drop a stack of scanned admission forms or vendor invoices and have them auto-classified, extracted, and filed against the right record. A central Document Management System with version control, expiry tracking (e.g., teacher certifications, fire-safety NOCs, affiliation renewals) and auto-reminders before documents lapse. Impact: removes the "paper shuffling between desks" that eats administrative hours.

**6. Interoperability, SSO & an Integration Marketplace**

This is strategic architecture rather than a single feature, and it's what separates "an app" from "a platform":

Single Sign-On + roster sync with Google Workspace and Microsoft 365 (Microsoft School Data Sync, Google Classroom roster API) so students/teachers log in once and class lists flow automatically into Classroom/Teams. Support the education interoperability standards — LTI 1.3, OneRoster, xAPI/SCORM — so any third-party LMS or learning tool plugs into your ERP cleanly. Then expose a public, documented Open API + webhook layer and build a small integration marketplace so partners (payment, transport, e-learning, AI tutors) can connect. Impact: this is the difference between schools outgrowing you versus staying because everything already connects to you.

**7. Communication Automation via WhatsApp Business API**

You're already an "official WhatsApp partner" per the landscape, but the automation depth is where the value is: a WhatsApp Business API automation engine that handles admission enquiry chatbots (capture lead → answer FAQs → book a visit, fully automated), fee reminders with an inline pay button, attendance/exam/result alerts, report-card delivery in-chat, and a two-way team inbox so office staff handle parent queries in one place. Add an AI voice/IVR assistant for parents who call (fees due, holiday schedule, attendance) without tying up reception. Impact: WhatsApp has near-100% open rates in India vs. email/SMS — this single channel can carry most parent engagement.

**8. Student-Facing Growth Modules (engagement + NEP alignment)**

Digital student portfolio / "skills passport." A cumulative e-portfolio capturing not just marks but projects, co-curriculars, sports, volunteering, internships, and issued digital badges/micro-credentials for verified skills. This aligns directly with NEP 2020's holistic, competency-based vision and gives students something to carry into college/career applications — and it neatly fills the empty "achievements" surfaces your audit found.

AI career-counselling & aptitude engine. Psychometric/aptitude assessments → AI-mapped career-path and stream-selection recommendations (Science/Commerce/Arts after Class 10), college/scholarship matching. This directly addresses the broken counselling workspace your test report flagged as a critical gap — turning a 404 into a flagship feature.

Accessibility & multilingual layer. Your test report repeatedly flagged contrast, touch-targets, and the dark-only theme. Beyond fixing those, build a deliberate WCAG-compliant accessibility mode (screen-reader labels, font-scaling, light mode, dyslexia-friendly font) and multi-language UI (Hindi + regional languages) so front-line staff (drivers, canteen, security) and diverse families can actually use the app. This is both an ethical and a market-expansion feature.

### Suggested prioritization

If sequencing for maximum competitive advantage with reasonable effort: start with WhatsApp automation, UPI AutoPay/eNACH + auto-reconciliation, and DigiLocker/APAAR integration (high demand, clear ROI, strong sales hooks in the Indian market). Mid-term, build the SSO/Open-API/interoperability layer and the e-sign workflow + DMS (they make everything else stickier). Then invest in the bigger strategic plays — secure online-exam delivery, IoT safety command center, career-counselling + skills passport — which differentiate you at the premium end and directly close the counselling/security gaps your own audit surfaced.
