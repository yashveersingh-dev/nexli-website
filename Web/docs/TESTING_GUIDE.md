# NEXLI — Platform Testing Guide

_Current state: P0–P8 + platform completeness + review-round decisions (staff attendance, expense/events approval, temporary delegation, schedule config). Build green @561 modules; UI-level ownership enforcement (DB rules land in P9)._

This guide makes testing **systematic**: who to log in as, what to do, what should happen, and what counts as a bug.

---

## 0. Before you start

1. **Dev server:** `cd Web && npm run dev` → http://localhost:5173. After pulling new code, **hard-refresh** the browser (Ctrl-Shift-R) — the module registry initializes once at app start.
2. **Data is already seeded** (`scripts/seed-demo.mjs`): 1 school ("Nexli Demo Public School", id `nexli-demo`), 13 staff accounts, 1 student, 1 parent, **100 students** across Grades 6–7 (sections A/B), grades/subjects/houses/rooms, fee structure + invoices, sample attendance/assessments/transport/hostel.
3. **Phone OTP (parent + staff-attendance OTP kiosk):** you've enabled the Phone provider. For the demo parent number `+91 99999 00001`, add it as a **test number with a fixed code** in Firebase Console → Authentication → Sign-in method → Phone → "Phone numbers for testing" (otherwise no real SMS arrives). Do the same for any staff mobile you test in the OTP kiosk.
4. **Two browsers / a private window** help: keep Super Admin in one, a school role in another, so sessions don't collide.

### Credentials

| Role (login) | Email / phone | Password | Notes |
|---|---|---|---|
| **Super Admin** | `yashveersr4@gmail.com` | `Nexli-Eternity-root` | Platform layer; cross-tenant; can operate everything |
| Principal | `principal@nexlidemo.test` | `NexliDemo@2026` | Leadership — reviews & approves |
| VP (Admin) | `admin@nexlidemo.test` | `NexliDemo@2026` | Leadership; can manage delegations + schedule |
| Academic Coordinator | `coordinator@nexlidemo.test` | `NexliDemo@2026` | Operates academics/events |
| Class Teacher (6A) | `teacher@nexlidemo.test` | `NexliDemo@2026` | Marks attendance, assigns homework |
| Subject Teacher (Maths) | `subteacher@nexlidemo.test` | `NexliDemo@2026` | Assessments, homework |
| Chief Accountant | `accounts@nexlidemo.test` | `NexliDemo@2026` | Fees, expense, POs |
| HR Manager | `hr@nexlidemo.test` | `NexliDemo@2026` | Staff attendance, payroll, schedule config |
| Transport Manager | `transport@nexlidemo.test` | `NexliDemo@2026` | Routes, vehicles |
| Chief Warden | `hostel@nexlidemo.test` | `NexliDemo@2026` | Hostel blocks/rooms/allocation |
| Librarian | `librarian@nexlidemo.test` | `NexliDemo@2026` | Catalog, circulation |
| Nurse | `nurse@nexlidemo.test` | `NexliDemo@2026` | Medical records |
| Child Protection Officer | `cpo@nexlidemo.test` | `NexliDemo@2026` | POCSO/grievances (confidential) |
| IT Admin | `itadmin@nexlidemo.test` | `NexliDemo@2026` | Users/settings; can manage delegations |
| Student | `student@nexlidemo.test` | `NexliDemo@2026` | Read-only student portal |
| Parent | `+91 99999 00001` (OTP) | — | Children = first 2 students |

> **Roles not seeded** (front desk/security, canteen manager, estate manager, special educator, DPO, sports/arts teacher): test those modules either as **Super Admin** (operates everything) or use the **Delegation** feature to grant a seeded staff member temporary access — that's also the best way to test delegation end-to-end. (Accounts can also operate Facility as a secondary owner.)

### The mental model you're verifying
- **Owners operate, leadership reviews.** Each operational module has an owning role that performs daily actions; Principal/VP see the same module in **review mode** (a "Review mode — operated by …" banner) with read/oversight + approvals. If leadership can click create/edit/mark on a daily operation, that's a **bug**.
- **Approvals** route through the right people (expense → VP/Principal; events → Principal/VP; HPC → Principal/VP).
- **Tenant isolation:** a school user only ever sees their own school's data.

---

## 1. Testing order (recommended)

1. **Auth** — log in as each role; confirm the right nav + dashboard.
2. **Super Admin** — schools, subscriptions, plans, users, settings.
3. **SIS** — students list/detail/admissions.
4. **Daily academics** — attendance, homework, assessments, timetable.
5. **Finance** — fees collection, expense requisition→approval, payroll.
6. **Operations** — transport, hostel, medical, library, visitor, canteen, facility.
7. **Approvals & governance** — events approval, HPC approval, delegation, schedule config.
8. **Parent + Student portals.**
9. **Mobile pass** (see §5).

---

## 2. Per-role test plans

For each role: log in → confirm the **nav** matches the role → run the workflows → check **expected outcome**.

### Super Admin (`yashveersr4@gmail.com`)
- **Responsibilities:** manage schools, subscriptions, plans, platform users, feature flags, audit.
- **Workflows:**
  - **Schools → open "Nexli Demo Public School":** view detail, edit profile, toggle feature flags.
  - **Subscriptions:** filter by status; confirm counts/MRR; change a school's subscription (renew/suspend/resume).
  - **Plans → create a plan** (sample below); edit it; confirm it appears in the pricing grid.
  - **Users & Roles:** browse platform users.
  - **Audit Logs:** confirm your recent actions appear.
- **Expected:** every list has loading→data (or a clear empty state); status badges are consistent between the Schools list, Subscriptions, and Dashboard; no school data leaks across tenants.

### Principal (`principal@nexlidemo.test`) — leadership / review
- **Responsibilities:** oversight + approvals; does **not** perform daily operations.
- **Workflows:**
  - **Dashboard:** command-center KPIs, attendance/fee donuts, enrolment bars, trends.
  - **Attendance / Homework / Library / Medical / Canteen / Transport / Hostel:** open each → you should see a **Review mode** banner and read-only overview, **no** mark/issue/record buttons.
  - **Approve:** Expense requisitions (submitted), Events (requested), HPC (submitted) → Approve/Reject.
  - **Delegation:** grant a substitute temporary access (see §4 Delegation).
  - **Staff Attendance → Schedule settings:** configure school timings.
- **Expected:** review banners present; approval actions available; operate actions hidden.

### VP Admin (`admin@nexlidemo.test`)
- Like Principal for the admin domain (fees/expense/HR/transport/facility/compliance). Can **approve** expense, **manage delegations**, **configure schedule**.

### Academic Coordinator (`coordinator@nexlidemo.test`)
- **Operates:** academics (subjects/timetable), **events** (create → goes to Principal/VP approval).
- **Workflow:** create an event → confirm it lands as **Pending approval** (not auto-published).

### Class Teacher (`teacher@nexlidemo.test`) — owns 6A
- **Operates:** mark **attendance** for 6A; assign **homework**; request an event (teacher path).
- **Expected:** can mark attendance for their section; sees their classes; cannot reach finance/HR operate screens.

### Subject Teacher (`subteacher@nexlidemo.test`)
- **Operates:** create **assessments** + enter marks; assign homework.

### Chief Accountant (`accounts@nexlidemo.test`)
- **Operates:** **Fees** (collect payment, generate receipt, assign fees), **Expense** (vendors, POs, expenses), **Facility** (secondary owner).
- **Approves:** is also an operate-level signer on requisitions.

### HR Manager (`hr@nexlidemo.test`)
- **Operates:** **Staff Attendance** (manual/kiosk/OTP), **Payroll** (salary structures, runs), HR records.
- **Configures:** schedule & attendance timings. **Manages delegations.**

### Transport Manager / Chief Warden / Librarian / Nurse / CPO / IT Admin
- Each owns its module (transport / hostel / library / medical / safeguarding / users+settings). Verify they can operate their own module and see review/empty states elsewhere.

### Student (`student@nexlidemo.test`)
- Read-only: timetable, attendance, assignments, exams, progress card, fees, library, calendar. **Nothing editable.**

### Parent (`+91 99999 00001`, OTP)
- Read-only across 2 children: attendance, academics, assignments, exams, progress card, fees, transport, notices, calendar, PTM. Verify **child switching** works and only their children show.

---

## 3. Per-module test plans (create / edit / approve / review + sample data)

> For each: **C**=create, **E**=edit, **A**=approve, **R**=review. "Expected" = the system behavior to verify.

### Students (Academic Coordinator / Front Desk; Principal reviews)
- **C** Add student — _Aarav Sharma, Grade 6, Section A, DOB 2014-05-12, Gender M, Father "Rakesh Sharma", phone +91 90000 11111_.
- **E** Edit the student's section/contact.
- **R** Principal sees the list/profile read-only.
- **Expected:** list scrolls smoothly (100+ students), filters by grade/section work; empty-state copy says "No students match your filters" when a filter excludes all; profile tabs load.

### Admissions
- **C** New enquiry → _"Ishita Verma", Grade 7, parent phone +91 90000 22222_.
- **E** Advance stage: enquiry → application → offer. **Then use the "Admit" action** to convert to a student.
- **Expected:** the generic "Advance stage" stops at **offer**; reaching **admitted** requires the **Admit** action, which creates a student record (no admitted application without a student).

### Attendance (Class/Subject teacher; leadership reviews)
- **C/E** As `teacher@`, mark 6A: set a few Absent/Late/**Half-day**/Leave, Save.
- **R** As `principal@`, open Attendance → review banner, overview only.
- **Expected:** all five statuses are selectable; summary counts update; saves offline-tolerant; parent/student see the same day; half-day weights at 0.5 in summaries.

### Staff Attendance (HR/Reception; leadership reviews; schedule = leadership+HR)
- **Schedule settings** (as `hr@` or `principal@`): set _School start 08:00, Late cutoff 08:15, Half-day cutoff 11:00, Grace 5 min, Lunch 12:30–13:10, add Break "Short break" 10:30–10:45_. Save.
- **Manual** (as `hr@`): pick today, mark staff, Save.
- **Device kiosk:** search a staff name → Check In → confirm; status reflects late/half-day per your cutoffs + grace.
- **OTP kiosk:** enter a staff member's mobile (must match a staff profile's phone) → OTP → Check In. The reception session must **stay logged in** (you remain `hr@`, not signed out).
- **Expected:** one shared record per `staff_id+date`; first check-in wins; check-out doesn't downgrade; method shown; the **kiosk never logs the operator out**.

### Homework (teachers; leadership reviews)
- **C** _"Algebra worksheet — Ch.3", Maths, 6A, due +3 days, max marks 20_.
- **E** Edit due date; **R** leadership sees completion monitoring, not an assign button.
- **Expected:** max-marks accepts a number and saves; students/parents see the assignment.

### Class Assessments (Gradebook) & Examinations
- **Assessments (C):** _"Unit Test 2 — Science", 6A, max 25, date today_; enter marks; publish.
- **Examinations:** create a **datesheet** ("Create datesheet" → add subject papers); check Planning + Analytics tabs; generate admit cards/results.
- **Expected:** the Gradebook ("Class Assessments") vs Examinations distinction is clear; marks entry totals correctly; published results visible to student/parent.

### HPC (Holistic Progress Card) — approval workflow
- **C** As a teacher/coordinator: draft an HPC card for a student → **Submit**.
- **A** As `principal@`: Approve (publishes) or Return with a note.
- **R** Parent/student see **only approved** cards.
- **Expected:** draft→submit→approve/return states; bulk export/print; unapproved cards hidden from families.

### Fees & Finance (Accounts; leadership reviews)
- **R** Overview KPIs (collection, outstanding, ageing).
- **Assign fees** to a student from their ledger — confirm the **"Net payable" matches the actual invoice** (not the annualised figure).
- **Collect payment (C):** _Cash ₹5,000 against an unpaid invoice_ → receipt number generated; invoice paid/due/status updates atomically.
- **Expected:** receipt numbers are unique & sequential; paid+due = net; status flips unpaid→partial→paid.

### Expense & Procurement (any staff raise; Accounts operate; VP/Principal approve)
- **Configure approval (as `accounts@`/admin):** Settings tab → add a rule _"≤ ₹10,000 → VP Admin"_ and _"> ₹10,000 → Principal"_.
- **C (any staff, e.g. `teacher@`):** raise a **requisition** — _"Science lab consumables", Dept Science, items: Beakers ×10 @ ₹150, Gloves ×5 @ ₹200_ → Submit.
- **A (approver):** open it → **Request clarification** (note) → as requester **Edit** items + **Answer & resubmit** → as approver **Approve**.
- Also test **Reject** and **Return for modification** (requester gets an **Edit** button, can change items, resubmit).
- **PO:** from an approved requisition → Create purchase order → receive goods (GRN) → record expense.
- **Expected:** routing rule shown matches the amount; the 4 approver actions all work; **returned/clarification requisitions are editable** then resubmittable; nothing hardcoded (empty rules = single-step).

### Payroll (HR/Accounts; leadership reviews)
- **C** Define a salary structure for a staff member; create a payroll **run** for the month → generate payslips → finalize.
- **Expected:** gross/deductions/net compute; leadership lands on the **Runs review** view, not management.

### Transport / Hostel / Medical / Library / Visitor / Canteen / Facility
- **Transport** (`transport@`): add a route + stops + vehicle; map renders.
- **Hostel** (`hostel@`): add a block/room; allocate a student.
- **Medical** (`nurse@`): **C** a health record / clinic visit; **E** it (confirm edit doesn't corrupt the record's school scoping).
- **Library** (`librarian@`): add a catalog title; issue a book to a student; return it.
- **Visitor** (Super Admin or delegate): register a gate visitor; issue a pass; check out.
- **Canteen** (Super Admin or delegate): create a menu with dishes — **leave calories blank on one dish** and confirm it **saves** (no "undefined" write error).
- **Facility** (`accounts@` secondary, or Super Admin): add an asset; raise a maintenance request (any staff can raise); approve/assign.
- **Expected:** each owner operates; leadership sees review banners; all create/edit flows persist and survive a refresh.

### Events & Activities — approval workflow
- **Owner path** (`coordinator@`): create event _"Annual Sports Day", Sports, date +14 days, venue Ground_ → status **Pending approval**.
- **Teacher path** (`teacher@`): **Request an event** _"Class 6A Science Fair"_ → goes to the same queue.
- **Approve** (`principal@`): Pending approval tab → Approve (publishes) or Reject (note).
- **Expected:** non-approved events are **not** visible to students/parents; approver queue shows counts; approved → appears in the public calendar.

### Compliance / UDISE / RTE / Safeguarding / Consent / SMC
- **Compliance:** add a deadline; mark filed.
- **UDISE:** verify aggregation (grade×gender, social category, PTR); CSV export.
- **RTE:** add an application; run the lottery; advance a reimbursement claim. (Reopening a rejected app should **not** show a phantom lottery rank.)
- **Safeguarding** (`cpo@`): confidential POCSO/grievance register — confirm only CPO/DPO can see it.
- **Consent:** record grant/deny/withdraw.
- **SMC:** add a meeting with minutes; budget utilization bars.

### Communication & Messaging
- **Circulars:** post an announcement; mark one **Emergency** → confirm it **sorts to the top** of staff and parent/student inboxes even without "Pin".
- **Messages:** start a 1:1 thread with another staff member; confirm unread badges + real-time delivery.

### Reports / Analytics / Insights / Alumni / SPED
- **Reports:** academic + financial analytics charts; **Report builder** → pick entity → columns → CSV export.
- **Alumni** (`coordinator@`/front desk, or Super Admin): add an alumnus; mentorship board. (Leadership sees review mode — **read-only**.)
- **SPED** (Super Admin or delegate): create an IEP with goals; therapy log.
- **AI Insights:** confirm surfaces render under the "coming soon" overlay (intentional, not a bug).

---

## 4. Delegation (temporary cover) — test end-to-end

1. As `principal@` (or `admin@`/`hr@`/`itadmin@`) → **Delegation**.
2. **Grant** → delegate **Library** to `coordinator@` (Neha Kulkarni), reason _"Librarian on medical leave"_, duration **1 week**.
3. Log in as `coordinator@` → **Library now appears in the nav** and **operate actions are enabled** (issue/return), even though this role normally can't.
4. Back as `principal@` → **Revoke** the delegation → `coordinator@` loses Library operate access on next load.
- **Expected:** grant requires a reason; appears under "Active delegations" with the window + grantor; audit entries written; revoke moves it to History.

---

## 5. Mobile testing (320 → 430px especially)

Test in DevTools device mode (iPhone SE 375px, and 320px "Galaxy Fold" width). Watch for overflow, overlap, tap-target size, and the bottom nav + "More" sheet.

**Screens that deserve extra attention:**
- **Kiosks** (Staff Attendance device + OTP) — must look great on a tablet/phone; big tap targets.
- **Attendance marking** — the 5-status segmented control at ≤360px (should wrap, not overflow).
- **Schedule settings** — the breaks editor grid collapses to 2 columns on narrow screens.
- **Expense requisition** — item rows + the live total.
- **Fees collect payment** & **Student ledger** — number/amount alignment.
- **Tables everywhere** (students, payments, requisition items) — should switch to card lists or scroll, not clip.
- **Modals** — become bottom sheets under 480px (delegation grant, approval dialogs).
- **Dashboard** — KPI band + donuts/bars reflow to one column.
- **Timetable / datesheet grids** — horizontal scroll, no layout break.

---

## 6. Review checklist

For **each screen**, verify:
- [ ] **Loading** state (skeleton/spinner) shows before data.
- [ ] **Empty** state has a helpful message (not a blank panel) when there's no data / filters exclude all.
- [ ] **Error** state is graceful (no crash) if a read fails.
- [ ] **Purpose is clear** — the page says what it's for / what to do.
- [ ] **Right role operates**, leadership reviews (review banner present where expected).
- [ ] **Create / edit persists** and survives a refresh.
- [ ] **Approval actions** appear only for approvers, and move the item through its states.
- [ ] **Nav** only shows links the role can use; every link routes (no dead/blank route).
- [ ] **Mobile:** no overlap/overflow/clipping at 320–430px; tap targets ≥ ~40px.
- [ ] **Money** formatted as ₹ and arithmetic is correct.

**Success looks like:** the owning role can complete the workflow start-to-finish; leadership can review/approve but not operate; data shows correctly to students/parents only when it should; the UI is calm and legible on a phone.

**Treat as a bug:**
- Leadership can perform a daily **operate** action (mark/issue/record/collect) directly.
- An approval can be bypassed, or an item publishes to parents/students before approval.
- A create/edit silently fails, throws, or loses data on refresh.
- A receipt/number duplicates, or paid+due ≠ net.
- A list shows another school's data.
- A blank screen with no loading/empty/error; a nav link that 404s or shows "Forbidden" for a role that should have it.
- Layout overlap/overflow/clipped content on mobile.
- A form rejects valid input or accepts clearly invalid input (e.g. end time before start time).

---

## 7. Known limitations (not bugs — expected in this phase)

- **AI surfaces** are intentionally behind a "coming soon" overlay (no AI provider wired).
- **File/image uploads** (bills, document vault, QR) accept a **URL** for now ("upload coming soon").
- **DB-level permission enforcement** is deferred to **P9** — ownership/delegation is enforced in the **UI** during this review phase. (Don't treat "I could write directly via the console" as an app bug.)
- **Delegation auto-expiry** updates on next load/snapshot, not on a live countdown.
- **Impersonation** (Super Admin → school) is a documented seam, not yet a UI flow.
- Some owner roles (front desk, canteen/estate manager, special educator, DPO) aren't seeded — operate those modules as **Super Admin** or via **Delegation**.
