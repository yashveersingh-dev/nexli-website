# NEXLI — Phase A Fix Plan (the 3 big data-safety dangers)

**Date:** 2026-06-16
**Status:** PLAN ONLY — no code has been changed for any of this. Read it, then approve before I start.
**Source:** the 3 Critical issues in `AUDIT_REPORT.md` (§3 C1–C3), re-verified against the live code.

This document explains, for each of the three dangers: what is wrong and why it's dangerous, exactly what I'd change, which files and screens it touches, how risky the change is and what could break, and roughly how big a job it is. At the end is the order I'd do them in.

> One important link between #1 and #2: the access rules (#1) for **marks/exams/report cards** can't be fully tightened until the data is reshaped (#2). So those two are done together for the academics part. Everything else in #1 is independent.

---

## Danger 1 — The access rules are wide open

### What's wrong & why it's dangerous
Every school's data lives under `schools/{schoolId}/…`. The database is protected by one rule file (`Web/firestore.rules`). It correctly isolates schools from each other and locks down the most sensitive collections (medical, counselling, POCSO/child-protection, grievances, the staff directory, settings, audit log). **But the catch-all rule at the bottom (`firestore.rules` lines ~176–188) says: any active member of a school can READ any collection that isn't on the locked list, and any staff member can WRITE them.**

In plain terms, today a logged-in **parent or student** can read — straight from the database, bypassing the screens — things like:
- every family's **fee invoices and payments**,
- every staff member's **salary structure and payslips**,
- every student's **marks, exam results, attendance**,
- **students' personal records** (including Aadhaar / address / guardians),
- **consent records, IEP/special-education plans, therapy logs**.

And any staff member (even a bus driver or canteen worker) can **write** to most of those. This is a serious privacy breach and, for Indian schools, a direct **DPDP Act** (data-protection) violation. It is the single most important thing to fix before any real school's data goes in.

> Note: the screens (the UI) already hide most of this correctly — what's being tested right now is the UI. The hole is at the **database** layer underneath. UI hiding is not a security boundary.

### Exactly what I'd change
Rewrite the catch-all so that instead of "any member can read everything not explicitly locked," each sensitive collection gets its **own rule** with a **role allowlist** plus **"own-record"** access for families. Concretely, add explicit rules for:

| Collection(s) | Who can READ | Who can WRITE |
|---|---|---|
| `fee_invoices`, `fee_payments`, `fee_structures`, `fee_heads`, `finance_settings`, `finance_counters` | Accounts (`chief_accountant`, `accounts_clerk`) + leadership; **own** (parent: the invoice's `studentId` is in their `childStudentIds`; student: it's their `studentId`) | Accounts + leadership |
| `payroll_runs`, `payslips`, `salary_structures` | `hr_manager`, `chief_accountant`, `principal`, `vp_admin` (+ a staff member's own payslip, later) | same |
| `students` | Staff (not parents/students broadly) + **own** (parent's children / the student themselves) | Academic/admin staff |
| `attendance` / `attendance_days` | Staff + **own** (parent/student) | Teaching staff |
| `assessment_results`, `assessments`, `exam_results`, `grades` | Teaching staff + leadership; families read **their own** results via the per-student docs from Danger 2 | Teaching staff |
| `iep_plans`, `therapy_logs` | `special_educator`, `counselor`, `principal` | same |
| `consent_records` | `dpo`, `consent_officer`, `principal`, `vp_admin` | same |
| `hostel` leave / roll-call / incident docs | warden roles + leadership | same |

The "deny everything else by default" base stays. This is **additive** — every document already carries `schoolId`, `studentId`, `sectionId`, etc., so no data has to move; we're only adding rules that read those existing fields. The client query hooks that fetch these collections also need to **filter by the user's own id** so their queries are allowed (most parent/student hooks already do this; I'd verify each one as I go).

After the rules are written, **you deploy them** (`firebase deploy --only firestore:rules` — I can't deploy to your project) and we test with the Firebase emulator first.

### Files & screens it touches
- **Main file:** `Web/firestore.rules` (almost all the work is here).
- `Web/firestore.indexes.json` — add a couple of composite indexes if any newly-required filtered query needs one (most are single-field and need none).
- Verify (and occasionally adjust) the client read hooks so their queries match the new rules: `features/finance/data.ts`, `features/school/data.ts`, `features/daily/data.ts`, `features/analytics/data.ts`, and the parent/student "My…" pages. These are small filter additions, not rewrites.

### How risky & what could break
**Risk: HIGH (of accidentally breaking legitimate access), but low risk of making things less safe.** The danger is *over*-tightening: a rule that's too strict will make a screen show "couldn't load" or empty for a role that should see the data (e.g., a coordinator, a cross-section teacher, a dashboard that totals fees). 
- **Mitigation:** test every role in the Firebase **emulator** before deploying — at minimum: principal, a class teacher (their section vs another section), VP-admin, accountant, HR, nurse, bus driver, parent, student. Deploy in a quiet window. Keep the current rules saved so we can roll back in seconds if a screen breaks.
- Nothing is *deleted* or *moved*, so a rollback fully restores the prior behaviour.

### Size
**Medium–Large — about 1.5–2 days**, most of it careful emulator testing across roles (the rule-writing itself is maybe half a day).

---

## Danger 2 — A whole class's marks sit in one place

### What's wrong & why it's dangerous
Class assessment marks are stored as **one document per assessment that contains every student's marks** — the field is `entries: { [studentId]: mark }` (`Web/src/types/daily.ts:56`, written/read in `features/daily/data.ts:69–72`). When a student or parent opens "my marks," the app downloads **that whole document**, i.e. **every classmate's marks and absence flags**, and then hides the others in the browser.

The same "fetch everyone, hide in the browser" pattern exists in a few more places:
- **Exam results** — `useExamResults` (`features/daily/data.ts:99–100`) pulls **all** students' results for an exam; the child view filters client-side.
- **Holistic Progress Cards** and **event registrations** (`features/analytics/data.ts:42, 101`) — fetched unscoped, so other children's names/marks reach the device.
- **Parent/student attendance** (`MyAttendancePage.tsx:15`) and the **circulars inbox** (`InboxPage.tsx:18`) download the whole school's records and filter locally.

Why it's dangerous: even if we fix the access rules (Danger 1), **the data still arrives on the device** because it's bundled together or fetched in bulk. Rules can't unscramble a document that mixes many students' data into one. So this needs a **data-shape change**, not just a rules change.

### Exactly what I'd change
1. **Split class assessment marks into one document per student.** New collection (e.g. `assessment_marks`) with one doc per student per assessment (id = `assessmentId_studentId`, fields: `assessmentId`, `studentId`, `sectionId`, the mark, etc.). 
   - The teacher's marks-entry screen writes one small doc per student (in a single batch — also fixes the "all-or-nothing" concern).
   - The student/parent screen reads **only their own** doc(s) (`where studentId == me`).
   - The teacher/gradebook screen reads all docs for an assessment (`where assessmentId == …`).
   - Keep a small `assessments` doc for the assessment's config (title, max marks, etc.).
2. **Scope the bulk read-queries** so families fetch only their own rows:
   - Exam results: add a family hook that queries `where studentId in [myChildren]` (staff keep the by-exam query).
   - HPC cards: the hook already supports a `studentId` filter — make the family pages pass it.
   - Event registrations: family pages query by their own `participantId` instead of the whole collection.
   - Parent/student attendance + circulars: query by the child's section / the intended audience instead of the whole school.
3. **Migrate existing data** (the marks already stored the old way) with a one-off script. For the demo school this is trivial — we can just re-seed.

After this, the academics rules from Danger 1 can be tightened to "families read only their own result docs."

### Files & screens it touches
- `Web/src/types/daily.ts` (the `AssessmentResult` shape) and `Web/src/features/daily/data.ts` (assessment read/write hooks).
- Gradebook: `features/gradebook/*` (especially `MarksEntryPage.tsx` and the list).
- Family/read screens: `features/studentportal/StudentAcademicsPage.tsx`, `features/examinations/*` (`ChildExams`, `MyExaminationsPage`), `features/hpc/*` (`MyHpcPage`, `HpcCardView`), `features/events/StudentEventsPage.tsx`, `features/attendance/MyAttendancePage.tsx`, `features/communication/InboxPage.tsx`.
- A one-off migration script in `Web/scripts/` (and/or re-seed the demo).

### How risky & what could break
**Risk: MEDIUM–HIGH.** This changes how marks are saved and read, so the things most likely to break are **marks entry**, **report cards**, and the **student academics** view. 
- **Mitigation:** do it behind a clear test: teacher enters marks → confirm a student sees only their own and a report card still renders correctly → confirm a second student can't see the first's marks. Keep the old read path working until the new one is verified. Because existing marks need migrating, I'd run the migration on a copy/the demo first.

### Size
**Medium — about 1.5–2 days** (the assessment redesign + migration is the bulk; the other scoped-query fixes are small, an hour or two total).

---

## Danger 3 — Nothing stops strangers creating accounts / running up the bill

### What's wrong & why it's dangerous
Two related gaps:
1. **No App Check.** `Web/src/lib/firebase.ts` never turns on Firebase **App Check**. App Check is the feature that proves a request is coming from *your* app. Without it, anyone who copies the public Firebase config (it ships inside the app's JavaScript — that's normal and unavoidable) can talk to your database and login system directly with scripts.
2. **Open sign-up.** Firebase email/password sign-up is **on by default**, so a stranger can create login accounts at will. They'd land on a "no access" screen (no profile), but each attempt still **creates an auth account and consumes quota**, and combined with #1 they can hammer the database within whatever the rules allow.

Why it's dangerous: this is an **abuse and cost** risk — someone could create thousands of junk accounts or fire large numbers of reads/writes, exhausting your free-tier quota (taking the app down) or running up a bill once you're on the paid plan.

### Exactly what I'd change
1. **Turn on App Check with reCAPTCHA:**
   - Register the web app for App Check in the Firebase console (reCAPTCHA v3 — you create a site key; takes a few minutes).
   - Add `initializeAppCheck(...)` with the reCAPTCHA provider in `Web/src/lib/firebase.ts`, reading a new `VITE_RECAPTCHA_SITE_KEY` from `.env`.
   - Roll out in **"monitor" mode first** (App Check watches traffic without blocking), confirm legitimate requests carry valid tokens, **then switch Firestore (and Authentication) to "Enforce."** Enforcing blocks anything that isn't your real app.
2. **Reduce sign-up abuse:**
   - With App Check enforced on Authentication, script-driven sign-ups from outside your app are blocked. The app's own account-creation (the "secondary app" trick in `provisioning.ts`) still works because it *is* your app.
   - Fully disabling public self-sign-up cleanly is a later step that belongs with moving account creation to a **Cloud Function** (needs the paid Blaze plan; the seam for this already exists in `provisioning.ts`). For now App Check enforcement is the main protection.
3. **Backstops:** set a **budget alert** and keep an eye on Firestore usage in the console.

### Files & screens it touches
- `Web/src/lib/firebase.ts` (add App Check init — a few lines).
- `Web/.env` and `Web/.env.example` (add `VITE_RECAPTCHA_SITE_KEY`).
- Console only: register App Check + reCAPTCHA, then flip enforcement on. No screen/UI changes.
- A **debug token** for local development (so `localhost` keeps working while App Check is on) — a one-time console step I'll walk you through.

### How risky & what could break
**Risk: MEDIUM.** If App Check is enforced before tokens are flowing correctly, **every** database/login request is rejected and the app shows a blank/error state for everyone. 
- **Mitigation:** this is exactly why App Check has a **monitor phase** — we run in monitor mode, confirm in the console that requests are passing App Check, and only then enforce. Set up the localhost debug token first so your own testing isn't blocked. Easy to turn enforcement back off if anything looks wrong.

### Size
**Small–Medium — about half a day of code/config**, plus a short monitor period (a day or two of watching the console) before enforcing.

---

## The order I'd do them in

1. **Danger 1 — rules for everything EXCEPT academics** (fees, payroll, HR, students, attendance, consent, IEP/therapy, hostel). Biggest, fastest risk reduction; additive; no data migration; nothing else depends on it. *(~1 day incl. emulator tests.)*
2. **Danger 2 — reshape marks into per-student docs + scope the family read-queries** (exams, HPC, events, attendance, circulars). *(~1.5–2 days.)*
3. **Danger 1 (finish) — academics rules** on top of the new per-student shape, so families read only their own results. *(~half a day.)*
4. **Danger 3 — App Check** (monitor → enforce) + budget alert. Can actually start in parallel/monitor mode early, but **enforce last**, once everything else is stable, so a misconfiguration doesn't mask other testing. *(~half a day + monitor period.)*

Throughout: test each change in the **Firebase emulator** against the role matrix (principal, teacher cross-section, VP-admin, accountant, HR, nurse, bus driver, parent, student) before you deploy to the live project.

## What I'll need from you when we start
- **You run the deploys** (`firebase deploy --only firestore:rules` / `…:firestore:indexes`) — I can't deploy to your project; I'll prepare everything and tell you the exact command.
- A **reCAPTCHA site key** (you create it in the Google/Firebase console) for App Check, and a few **console clicks** to register App Check and flip enforcement (I'll give step-by-step instructions).
- A green light to **re-seed or migrate the demo marks** for Danger 2.

## What this plan deliberately does NOT do
- It does not add new features. It only makes existing data safe.
- It does not change anything outside the three dangers (the other audit findings — scalability/pagination, the fake live-GPS map, etc. — are separate, later work).
- It does not require the paid Blaze plan, except the optional "move account creation to a Cloud Function" hardening noted under Danger 3, which can come later.
