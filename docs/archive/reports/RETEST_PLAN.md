# NEXLI — Focused Re-Test Plan

**Date:** 2026-06-18 · **Device:** your phone (same as the original test) · **App:** http://localhost:5173

This plan covers **only what was fixed, changed, or newly built** since the original
`TEST_RESULTS.md` report. Anything that was already working and untouched is **not** repeated
here — if it isn't listed, you don't need to re-test it.

**How to use:** log in as the role named in each step (use your demo account for that role — the
example emails in brackets are the ones from the original test run; any account with that role works).
Log out between roles. ✅ = what you should see if the fix worked. Live security ruleset for this round
is `fa68c528-7134-4bbc-9776-5e4ebf30e21d`.

> Note on empty data: the demo tenant has students & staff but **no** seeded marks, attendance,
> homework, fees, portfolio or career entries. So many new screens will correctly show a **friendly
> empty state** — that is a PASS. The fixes below are about pages **loading the right thing / showing
> the right menu / computing correctly**, not about having data.

---

## GROUP A — Access & menu fixes (log in, check the menu + try the action)

**A1. Certificate Generator — now reaches the right roles (and only them).** *(headline fix)*
- Log in as **Head of Department** [pari.bajaj28], **Vice Principal (Admin)** [anvi.bajaj12],
  **Registrar** [diya.patel18], **Admissions Officer** [prisha.bajaj76], **Academic Coordinator** [advik.gupta19], **Principal** [advik.chauhan7].
  - ✅ Each sees **“Certificates”** in the menu → open it → the **Issue** tab shows an active **“Issue & print”** button (NOT a “View only” lock).
- Log in as **School Nurse** [gauri.malhotra142], **Head Librarian** [advik.gupta187], **Bus Conductor** [advik.trivedi277], **Cashier** [pari.bajaj100].
  - ✅ **No “Certificates”** item in the menu at all.
- Log in as a **Parent** [ayaan.bose302] and a **Student** [samar.chopra333].
  - ✅ **No “Certificates”** item (the old dead link that went to an “in build” stub is gone).

**A2. Counselling workspace — was a 404.**
- Log in as **School Counselor** [pari.malhotra118] and **Guidance Counselor** [advik.das121].
  - ✅ **“Counselling”** opens a real workspace (no “Page not found”).

**A3. Career Guidance — visible to the right people.**
- **School Counselor / Guidance Counselor** → ✅ see **“Career Guidance”**; opening it shows the cohort/insights view.
- **School Nurse** / **Accounts Clerk** [advik.gupta91] → ✅ do **NOT** see “Career Guidance”.
- **Student** → ✅ sees **“Career Guidance”** and can start the assessment.

**A4. Governance roles no longer over-granted.**
- Log in as **Chairman** [advik.das1], **Trustee** [riya.patel2], **School Board Representative** [advik.trivedi133].
  - ✅ Menu does **NOT** contain **“Human Resources”** or **“Payroll”** (they keep Students/Fees view, Reports, Compliance, etc.).

**A5. Alumni no longer leaks Staff Attendance.**
- Log in as **Alumni** [daksh.banerjee901].
  - ✅ Menu is only: Dashboard, Alumni Network, Events, Communication. **No “Staff Attendance”.**

**A6. Admissions Receptionist can reach Admissions.**
- Log in as **Admissions Receptionist** [advik.chauhan295].
  - ✅ **“Admissions”** appears in the menu and opens the pipeline.

**A7. DPO can reach Grievances.**
- Log in as **Data Protection Officer** [gauri.patel106].
  - ✅ **“Child Protection”** appears → open it → the **Grievances** tab is usable. (There should be **no POCSO case** content — DPO gets the grievances side only.)

**A8. Security stub is gone.**
- Log in as **Security Supervisor** [advik.gupta259] and **CCTV Administrator** [gauri.bajaj268].
  - ✅ No broken **“Security — in build”** page in the menu (Visitor & Gate / Communication remain for the relevant roles).

---

## GROUP B — Newly built modules (do the full flow)

**B1. Certificate issue + register.** Role: any A1 issuer (e.g. **Registrar**).
- Certificates → **Issue** → pick type (Bonafide) + a student → **Issue & print**.
  - ✅ A print preview opens with the school name + a **serial number**; a success toast shows the serial.
  - ✅ **Register** tab lists the issued certificate; **Re-print** re-opens it.

**B2. Question Paper Generator.** Role: **Exam Controller** [advik.chauhan31] or **Subject Teacher** [advik.gupta163].
- “Question Papers” → load the **sample questions** (button on the empty bank) → create/choose a **blueprint** → **generate** a paper → open the **preview**.
  - ✅ Paper builds with the right marks/sections; **answer key** is visible to staff only; print preview opens.

**B3. Report Cards.** Role: **Exam Controller** or **Academic Coordinator** *(these can now generate — previously blocked)*.
- “Report Cards” → **Generate** → pick a class + grading scheme.
  - ✅ Cards compute %/grade from existing marks; an **unmarked** card shows “no marks recorded yet” and **does NOT** print “Result: Fail / 0%”.
- Then log in as a **Parent**/**Student** → **“Report Card”**.
  - ✅ Only their **own, published** card shows (nothing if none is published yet).

**B4. Gamified dashboard.** Role: **Student**.
- Open **“Rewards”**.
  - ✅ Shows XP / level / badges / streaks. A student with no activity sees a friendly “start earning” state — **no “NaN”, no crash, no stuck spinner.**

**B5. Skills Passport.** Roles: **Student**, then **Class Teacher** [gauri.bose160].
- Student → **“Skills Passport”** → add an achievement → ✅ it saves as **“submitted.”** ✅ The student has **no** way to mark it “verified.”
- Class Teacher → **“Skills Passport”** → ✅ can **verify** the student’s submitted item.

**B6. Career assessment.** Role: **Student**.
- “Career Guidance” → take the RIASEC + aptitude questions → submit.
  - ✅ Get a results profile (interest code + stream/career suggestions); **“Retake”** starts a fresh attempt.

**B7. Rankings.** Role: **HOD** / **Exam Controller** / **Principal**.
- “Rankings” → ✅ marks **and** attendance leaderboards with school/grade/section scopes (empty + honest message if no marks recorded).

---

## GROUP C — Family / student portal pages that used to come up blank *(important)*

These pages previously tried to read the whole student list (which the security rules block for
families), so they showed a misleading “account not linked / nothing to show.” They now fetch the
linked child correctly.

**C1. Parent** [ayaan.bose302]: open **Attendance**, **Assignments**, **Examinations**, **Progress Card**.
- ✅ Each page loads showing **the child’s section/name** (with an honest “nothing recorded yet” if there’s no data) — **not** a “your account isn’t linked” message.

**C2. Student** [samar.chopra333]: open the same four (**Attendance / Assignments / Examinations / Progress Card**).
- ✅ Each loads the student’s own context (empty-but-correct if no data).

**C3. Circulars to a grade/section.** Parent or Student → **Communication / Notices**.
- ✅ A circular targeted at their grade or section now appears (previously these silently never showed for families).

---

## GROUP D — Finance figure consistency

**D1. Outstanding dues agree across screens.** *(was: dashboard ₹0 vs others ₹1.46L)*
- Compare the **“Outstanding dues”** figure on: **Principal/Chairman dashboard**, the **Finance Manager** [gauri.patel34] **Fees → Overview**, and a **Student’s profile → Fees** panel.
  - ✅ The three figures **agree**. (If no fee data is seeded, all three show ₹0 — still consistent. If you record an invoice + part-payment, all three should show the same balance.)

---

## GROUP E — Data-correctness fixes

**E1. Report-card print on an empty card** — see B3 (no “Fail/0%” on an unmarked card).

**E2. Transport vehicle document dates.** Role: **Transport Manager** [advik.gupta67].
- Transport → **Vehicles** → open a vehicle that has fitness/insurance/PUC/permit **expiry dates** → edit & save.
  - ✅ The dates show correctly and **don’t shift by one day** after saving (was an IST timezone bug).

**E3. Student event audience.** Role: **Student**.
- Open **Events**.
  - ✅ Only events for students / their grade / whole-school appear — **no** staff-only or parent-only events, and they can’t register for those.

---

## GROUP F — Role labels & mobile polish (from the original report)

**F1. Modal Save button reachable on phone.** Role: **Head Librarian** [advik.gupta187].
- Library → **Add Book** → fill the form.
  - ✅ The **Save** button is reachable without the modal cutting it off (pinned footer); saving works.

**F2. No big empty dark area** at the bottom of pages (check a few dashboards/lists). ✅ Content fills or ends cleanly.

**F3. Student-leader titles show.** Roles: **Prefect / Head Student** [shaurya.bose301], **House / Sports Captain** [nirvaan.kapoor829].
- ✅ The drawer/header shows their **position** (Prefect / House Captain), not just “Student.”

**F4. Academic Coordinator tier shows.** Roles: **Senior** [advik.gupta19], **Junior** [prisha.malhotra22], **Associate** [advik.das25].
- ✅ The role label reflects the **tier** (Senior / Junior / Associate), not a bare “Academic Coordinator.”

**F5. Attendance widget empty state.** Roles: **Student** / **Parent** dashboard.
- ✅ With no attendance recorded, the widget shows a clear “no attendance recorded yet” message — **not** a lone dash or a stuck loading spinner.

---

## Covered by automated tests (not separately phone-testable)

These are server-rule hardenings verified by the emulator rules suite (**145 checks, 0 failures**) — no
visible menu change, listed so you know they’re done:
- Question bank / papers / blueprints readable by **exam staff only** (PET/arts/lab/etc. can’t pull answer keys even via the API).
- Career assessments readable/editable by **counselling staff + the student’s own** only (not every staff member).
- Certificate register + serial counters writable by **authorized issuers only**.
- `/safeguarding/*` POCSO sub-pages can’t be opened by a direct URL by someone without the permission.
- `consent_purposes` catalogue: any member can read it; only consent staff can edit it.

---

### Quick triage if something looks off
- A menu item missing for a role that should have it → tell me the role; it’s a permission-grant tweak.
- A page shows a raw error (not a friendly empty state) → note the role + page; likely a data-shape edge case.
- Anything in GROUP A/C behaving like the old bug → that’s a regression; send the role + screen and I’ll fix it.
