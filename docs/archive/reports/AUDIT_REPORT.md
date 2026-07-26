# NEXLI — Independent Audit Report

**Date:** 2026-06-16
**Auditor:** Claude (read-only code audit — nothing was changed)
**Scope:** The whole repository, with deepest focus on the `Web/` app (the only built app)
**Method:** Read the three planning docs + the project's own status/audit docs, verified the TypeScript build (`tsc` passes), read the security/auth/data spine directly, and ran **6 parallel verification agents** across all ~50 feature modules. The crux security findings were then re-verified by hand at the source. I did **not** run the app in a browser or against a live Firebase backend (see §5).

> A note on trust: NEXLI's own internal docs (`Web/context/`, `Web/docs/DEEP_AUDIT.md`) are unusually detailed and honest. This report **independently verifies** their claims against the real code rather than repeating them — and it confirms most of them, while adding several gaps the internal docs missed.

---

## 1. Simple summary (plain language)

**What it is.** NEXLI is a genuinely large, real, and well-organised web app — not a fake or a shell. There are about **467 code files and ~61,000 lines** covering ~50 modules (students, fees, attendance, exams, payroll, transport, hostel, compliance, a Super-Admin layer, and more). It compiles cleanly. The architecture is thoughtful and consistent. Whoever built it (you + Claude) did a lot of solid work.

**But is it finished and ready to sell? No — not yet.** The honest picture:

- The app has **never actually been switched on properly.** The security rules were written but **never deployed**, the login providers were never turned on in Firebase, and the only working user accounts are 16 demo accounts created by a script. So nobody has ever used it as a real, secured product.
- It has **serious privacy holes.** As built today, a parent or student who knows a little about browsers could read **other families' fees, other children's marks, staff salaries, medical and child-protection data**. This isn't hypothetical — it's how the data is currently stored and fetched. (Your own notes already flagged this and put the fix "on hold.") This alone makes it **not sellable** until fixed, and under India's DPDP data-protection law it's a legal risk.
- A real school **can't onboard its own people** through the app. There's no screen for a Principal to create logins for teachers, parents, or students. Only the demo (seeded by a script) has working accounts.
- It **won't scale.** Almost every list screen quietly downloads the *entire* collection (every student, every invoice, every attendance record) every time it opens. Fine for the 100-student demo; it will get slow and expensive with thousands of students or many schools.
- Several features **look finished but aren't:** the transport "live GPS map" has no live data at all, parents/students can't reach the messaging feature, and a few student-portal screens are static placeholders.

**How close to selling?** Think of it as a strong **70–80% feature-complete prototype** that is roughly **40–50% of the way to a sellable product.** The remaining work is not "add more features" — it's **harden what exists**: lock down the data, let schools create users, make it scale, and finish a handful of fake/half features. Realistically that's a focused **~3–6 weeks of one engineer's work** before a careful pilot with **one** friendly school, and more before selling widely.

**The other folders:** `Android/` and `Ios/` are **completely empty** (the plan was to wrap the web app with Capacitor later — that hasn't started). `reference/` holds the original **HTML/CSS design mock-ups** (the visual target). All real work is in `Web/`.

---

## 2. Feature status

Labels: **Done** = the feature's core flow really works end-to-end against the database in the demo · **Half-done** = partly built, key pieces dead/unwired or read-only · **Broken** = present but won't actually work · **Missing** = planned but absent/just a stub.

> ⚠️ Important: "Done" here means *the feature does its job in the seeded demo*. **Nearly every "Done" feature is still subject to the system-wide security and scalability problems in §3** (data leaks, no pagination). So "Done" ≠ "production-ready."

### Platform / Super-Admin layer
| Module | Status | Notes (evidence) |
|---|---|---|
| Super-Admin dashboard | Done | Live KPIs from real counters |
| School registry + 360° detail | Done | Real CRUD |
| Onboarding wizard (create school + Principal) | Done | Creates school + provisions Principal via secondary auth app (`SchoolWizard.tsx:168`) |
| Subscription lifecycle (activate/pause/suspend/…) | Done | Writes status + reason + audit (`platform/data.ts:206`) |
| Plans & pricing | Done | Real CRUD |
| Feature flags (global + per-school) | Done | Writes to both flag docs |
| Platform announcements / audit / activities | Done | Real, append-only audit |
| Platform analytics | **Half-done** | Some KPIs hardcoded `"—"` (`AnalyticsPage.tsx`) |
| System health | **Half-done** | Static service list; all KPI tiles hardcoded `"—"` (`SystemHealthPage.tsx`) |
| School impersonation (support) | **Missing** | Refs/audit types exist but **no UI, no session, no writes** — your own tracker says "10%" |

### Foundation / Auth / Access
| Module | Status | Notes |
|---|---|---|
| Design system + UI kit + forms | Done | Substantial, consistent |
| Staff email/password login | Done | `auth.ts` (providers not enabled in console) |
| Parent phone-OTP login | **Half-done** | Sign-in works, but no flow creates/links a parent's profile on first login (`auth.ts` + `SessionProvider` → "no profile") |
| RBAC (roles → permissions, UI gating) | Done | `rbac.ts` — but UI-only (see §3) |
| Multi-role + delegation + ownership model | Done (UI) | `ownership.ts`; delegation expiry is client-side only |
| **In-app user provisioning (staff/parent/student)** | **Missing** | `provisionStaffMember` is only ever called for the Principal during onboarding — no school-side "add user" flow |
| Firestore security rules | **Half-done / not deployed** | Written (`firestore.rules`) but coarse and **never deployed** |
| i18n (12 Indian languages) | **Missing** | Only English exists (`locales/en/` only) — scaffold only |
| PWA install (icons/manifest) | **Half-done** | Manifest references icon PNGs that **don't exist** (`public/icons/` empty) |

### Students & Academics
| Module | Status | Notes |
|---|---|---|
| Student profiles (list/360/add/edit) | Done | Real CRUD with guardians |
| CSV student import | **Half-done** | Works but writes one-by-one, no batch/rollback on failure |
| Transfer Certificate workflow | **Half-done** | Issuing a TC **never marks the student inactive** (`TCDetailPage.tsx`) |
| Admissions pipeline → admit | Done | Admit really creates a Student |
| Academic structure (grades/sections/subjects/houses/rooms) | Done | Real CRUD |
| Timetable + substitutions | Done | Persists |
| HR / staff records + leave | **Half-done** | Profiles + leave work; **no way to delete staff**; staff profile ≠ login account |
| Library (catalogue + issue/return) | Done | Correctly uses transactions for copy counts |
| Gradebook (marks + publish) | **Broken (privacy)** | Whole class's marks in one doc; "publish" gate is UI-only (§3 #2) |
| Examinations (datesheet/results/report card) | **Half-done** | Results work, but report "card" is rendered from raw result docs; results query leaks peers (§3 #2) |
| NEP HPC report card | **Half-done** | Built, but card query not scoped to the child |

### Daily / Communication / Dashboards / Student portal
| Module | Status | Notes |
|---|---|---|
| Attendance (mark roster, 75% overview) | Done | Real writes; staff view good |
| Parent/student attendance view | **Half-done** | Downloads the **whole school's** attendance, filters in the browser |
| Staff attendance (manual/kiosk/OTP) | Done | One write path; settings persist |
| Announcements / circulars (compose + inbox) | **Half-done** | Inbox downloads **all** circulars, filters client-side |
| Messaging (parent ↔ teacher chat) | **Half-done** | Backend fully built, but **parents & students have no way to open it** (no nav entry) |
| Principal / Teacher dashboards | Done | Live KPIs |
| Parent / Student dashboards | **Half-done** | Use the whole-school attendance fetch |
| Student portal: profile/timetable/academics/calendar/achievements | Done | Read-only, scoped |
| Student portal: wellness, support | **Half-done** | Static placeholder content, no real data/write path |

### Finance & Payroll
| Module | Status | Notes |
|---|---|---|
| Fees: heads, structures, ledger, concessions | Done | Real CRUD |
| Fee payments + receipts | Done | **Correctly atomic** receipt numbering (transaction) |
| Parent/student fee view (QR/bank how-to-pay) | Done | Properly scoped to the child |
| Expense & procurement (req→PO→GRN) | **Half-done** | Chain broken at last link (`Expense.poId` never set); expense approval has no separation of duties |
| Payroll (structures, runs, PF/ESI/PT/TDS, payslips) | **Half-done** | Works, but **submitter can approve their own run** (no `submittedByUid`) |

### Operations & Safety
| Module | Status | Notes |
|---|---|---|
| Visitor & gate (register/check-in/pass/blacklist) | **Half-done** | Works, but OTP is guessable (`Math.random`) and blacklist only *warns*, never blocks |
| Transport: routes/vehicles/bus-attendance/SOS | Done | These persist |
| Transport: **live GPS map** | **Broken** | `saveVehiclePosition` is **dead code, never called**; no location feed — map shows static stops, "live vehicles" always 0 |
| Hostel: blocks/rooms/allocation/rollcall/exeat | **Half-done** | Room occupancy never updated; unconfigured warden sees **all** blocks; Exeat vs GatePass duplicated |
| Medical / clinic / immunization | Done | Correctly uses the restricted collections; list tabs lack a UI permission gate |
| Canteen (menu/headcount/feedback) | **Half-done** | Headcount can double-count |
| Facility (assets/maintenance tickets) | Done | Persists; ticket numbers collision-prone |

### Compliance / Governance / Special / Analytics / IT
| Module | Status | Notes |
|---|---|---|
| Compliance calendar + document vault | Done | Real |
| UDISE+ reporting | Done | **Live** aggregation from real data + CSV export |
| RTE applications + lottery + reimbursement | Done | Genuine Fisher-Yates lottery (no batch on apply) |
| Safeguarding (POCSO + grievances) | Done | Correctly uses restricted collections |
| Consent (DPDP) | **Half-done** | Works, but `consent_records` sits under the loose rule (sensitive data exposed) |
| SMC portal | Done | Real; correct 75%-parent check |
| Special Education (IEP/therapy/CWSN) | **Half-done** | Works, but `iep_plans`/`therapy_logs` exposed under the loose rule |
| Events + registrations | **Half-done** | Registration list leaks all participants' names to students (§3) |
| Alumni | Done | Real CRUD (flag-gated) |
| Analytics & reports (+ CSV) | Done | Live data + export; AI panels behind the intended "coming soon" overlay |
| AI Insights hub | Done *(by design)* | Real UI behind `AILockedOverlay` — provider-less is intentional, not a bug |
| IT Administration | Done | Real CRUD; ticket numbers collision-prone |
| Delegation (temporary access) | **Half-done** | Expiry enforced only in the browser, bypassable |

---

## 3. Problems found (worst first)

### 🔴 CRITICAL — fix before any real data or any sale

**C1. Anyone in a school can read almost everything (security rules too loose + never deployed).**
*Where:* `Web/firestore.rules:176-188` (the catch-all rule) — and the rules aren't deployed at all.
The default rule lets **any active member** (including a parent or student) read **every** collection that isn't explicitly restricted: `fee_invoices`, `fee_payments`, `payroll_runs`, `salary_structures`, `students` (incl. Aadhaar/address), `staff` (incl. PAN), `attendance`, marks, `consent_records`, `iep_plans`, `therapy_logs`. Any staff member (even a bus driver) can *write* most of them. This is the single biggest issue. Your own `DEEP_AUDIT.md §F` designed the fix but it's **0% done and on hold.** *Severity: Critical (privacy/DPDP legal risk).*

**C2. Peers' private data is sent to the browser regardless of rules (data is shaped wrong).**
Even perfect rules won't fully fix this, because the data is *stored and queried* so that other people's data arrives in the user's browser:
- `types/daily.ts:56` — a class's marks are **all stored in one document** (`AssessmentResult.entries: Record<studentId, mark>`). A student opening their result downloads everyone's.
- `features/daily/data.ts:100` — `useExamResults` fetches **all** students' exam results for an exam, then filters in the browser.
- `features/analytics/data.ts:42,101` — HPC cards and event registrations fetched unscoped → all children's names/marks reach the student.
- `MyAttendancePage.tsx:15`, `InboxPage.tsx:18` — parent/student views download the **whole school's** attendance / all circulars.
*Fix needs both rules **and** a data-model change (per-student docs + scoped queries). Severity: Critical.*

**C3. No abuse protection: App Check missing + open sign-up.**
*Where:* `lib/firebase.ts` (no `initializeAppCheck` anywhere), `lib/provisioning.ts`.
There is no App Check, and Firebase email/password sign-up is open by default. Anyone with the public API key (it's in the shipped JS) can create accounts and hammer your database — running up Firestore costs and quota. *Severity: Critical for production.*

### 🟠 HIGH — blocks real-world use / serious correctness

**H1. A school can't create its own users.**
*Where:* `provisionStaffMember` is only called in `platform/data.ts` + `SchoolWizard.tsx` (for the Principal). There is **no in-app screen** for a Principal/IT/HR to create logins for teachers, accountants, parents, or students. The HR "Add Staff" form makes a *profile*, not an *account*. The 16 working demo logins exist only because a script created them. **Without this, no real school can use the product.** *Severity: High.*

**H2. Payroll has no separation of duties.**
*Where:* `finance/data.ts:332`, `RunDetailPage.tsx:102`. The run never records who submitted it (`submittedByUid`), so one person can generate, submit, **and approve** their own payroll run. Same weakness on expense approval (`ExpensesTab.tsx:56`). *Severity: High (financial control).*

**H3. The "live GPS map" is fake.**
*Where:* `ops/data.ts:93` — `saveVehiclePosition` exists but is **never called**, and nothing reads device location. The flagship transport feature shows static stops and a permanent "0 live vehicles." Presenting it as live is misleading to buyers. *Severity: High.*

**H4. Parents & students can't reach Messaging.**
*Where:* `app/nav.ts:86,106`, `registerModules.ts:57`. The messaging backend is fully built, but it's registered for staff only — there's no nav entry for parents/students. This breaks the spec's #1 parent-communication promise. *Severity: High (and an easy fix).*

**H5. Everything reads the whole collection (won't scale).**
*Where:* `lib/db.ts` `useCollection` has no limit, and essentially **no list screen adds one** (only ~5 export helpers and messaging use a cap). Lists of students, invoices, payments, attendance, circulars, events, visitors all stream the entire collection live. On the free tier this blows read quotas and gets slow with realistic data. *Severity: High at scale.*

**H6. Suspending a school doesn't actually stop access.**
*Where:* `SessionProvider.tsx` / rules — no check on subscription/suspension status. A suspended/expired school's users keep full access. *Severity: High (you can't enforce payment).*

**H7. Transfer Certificate doesn't update the student.**
*Where:* `TCDetailPage.tsx:44`. After a TC is issued, the student stays `active` forever. *Severity: High (data integrity).*

**H8. Plans are linked to schools by *name*, not a stable ID.**
*Where:* `platform/data.ts:144` (`plan: planMeta?.name`). Renaming or deleting a plan silently breaks revenue (MRR) and limits for every school on it. *Severity: High (revenue correctness).*

### 🟡 MEDIUM
- **M1. Hostel:** room occupancy never updated (always stale); an unconfigured warden falls through to see **all** blocks (`scope.ts:57`). *(Med-High — scope leak.)*
- **M2. Visitor OTP** uses `Math.random()` (guessable, 9,000 values) and the **blacklist only warns**, never blocks check-in (`visitorSchema.ts:34`, `VisitorCheckInPage.tsx:103`).
- **M3. Collision-prone numbering:** visitor pass #, ticket #, asset #, expense/PO/GRN # are all "count + 1" computed in the browser — two users at once get duplicates. Only the fee **receipt** number is done correctly (atomic). 
- **M4. Delegation expiry** is enforced only in the browser — a delegate can keep access after expiry via direct database calls (`delegation.ts:44`).
- **M5. "Publish" gate is UI-only** — students can read unpublished marks the moment a teacher saves (`MarksEntryPage.tsx`, no rule).
- **M6. Sensitive collections under the loose rule:** `consent_records`, `iep_plans`, `therapy_logs` (subset of C1, but specifically called out by the code itself).
- **M7. Dead `subscriptions` collection** — written on every lifecycle change, never read (wasted writes) (`db.ts:29`, `platform/data.ts`).
- **M8. No automated tests at all** (the plan promised tests per phase) and **no ESLint** configured. For an app handling money + child data, this is a real risk.
- **M9. Bulk operations aren't atomic:** CSV import and the RTE lottery fire many individual writes with no batch/rollback — a mid-way failure leaves half-applied data.
- **M10. Composite indexes mostly missing** (`firestore.indexes.json` has only 2). Once you add filtered/sorted queries, they'll fail at runtime until indexes are added.
- **M11. Half-built surfaces:** platform Analytics & System Health show hardcoded `"—"`; student portal Wellness/Support are static; no real `report_cards`; no `deleteStaff`; library fines are shown but can never be entered.
- **M12. Payroll LOP** doesn't reduce the PF/ESI base, which can over-deduct PF in heavy unpaid-leave months; PF base excludes DA (a policy choice to confirm — your B4).

### 🟢 LOW
- **L1. Secrets on disk:** `Web/serviceAccount.json` (Firebase admin key) and `Web/.env` (real config) exist locally. They're correctly **git-ignored** and this isn't a git repo, so it's not leaked — just handle with care; never commit or paste them.
- **L2. Minor inconsistency:** permission strings `users.manage` vs `user.manage` both appear; the temp-password generator's final shuffle is biased (cosmetic).
- **L3. PWA icons missing** (`public/icons/` empty) — install/maskable icon will be broken and the build warns. *(Quick win.)*
- **L4. ~11 business decisions (B1–B11)** are documented in `DEEP_AUDIT.md` but unresolved (refunds UI, exam-publish approver, exeat vs gatepass, datesheet clash detection, etc.).

---

## 4. What to do next (ordered — quick wins & most important first)

**Immediate quick wins (hours, high value):**
1. **Wire Messaging into parent/student nav** (H4) — backend is done; this is a tiny change.
2. **Add the PWA icons** (L3) and link a stable `planId` instead of plan name (H8).
3. **Record `submittedByUid` + block submitter == approver** for payroll & expenses (H2) — small, high-trust fix.

**Phase A — Lock down the data (do before ANY real school data; mostly already designed in `DEEP_AUDIT.md §F`):**
4. **Tighten and deploy `firestore.rules`** — per-collection role allowlists + strict "own-record" scoping for parents/students (C1). You run `firebase deploy --only firestore:rules` and test with the emulator.
5. **Fix the data-shape leaks** (C2): split `AssessmentResult` into per-student docs (or mask), and scope the exam/HPC/event/attendance/circular queries by `studentId`/`childStudentIds`/audience. Add the matching composite indexes (M10).
6. **Enable App Check (reCAPTCHA) and close open sign-up** (C3).
7. **Enforce subscription/suspension** at the data layer so suspended schools lose access (H6).

**Phase B — Make it usable by a real school:**
8. **Build in-app user provisioning** (H1): screens for Principal/IT/HR to create staff/parent/student logins (reuse the existing `provisionStaffMember`), plus a parent phone-OTP linking flow on first login.

**Phase C — Correctness & integrity:**
9. Replace browser-side numbering with atomic counters everywhere (M3); make CSV import + RTE lottery batched/atomic (M9).
10. TC marks student inactive (H7); enforce the publish gate in rules (M5); hostel warden default-deny + occupancy upkeep (M1); visitor OTP → crypto + hard-block blacklist (M2); finish the expense→PO link (E in §3).

**Phase D — Scale:**
11. Add `limit()`/pagination to all list screens; switch parent/student/dashboard views to scoped queries (H5). Plan server-side aggregation for big numbers once you move to the paid Blaze tier.

**Phase E — Finish & polish:**
12. Make the transport map actually live (driver-device geolocation → `saveVehiclePosition`) or clearly label it "not live yet" (H3).
13. Fill the shells: real metrics (or honest "coming soon") for platform Analytics/Health; student Wellness/Support; impersonation flow; `deleteStaff`; library fines; report cards (M11).
14. Add a test suite — start with **security-rules emulator tests** and **money/payroll unit tests** — and turn on ESLint (M8).
15. Do the 9-width responsive/accessibility QA that was planned but never run; resolve business decisions B1–B11 (L4); add the regional-language packs if multilingual is a selling point (i18n is English-only today).

**Then:** pilot with **one** friendly school on real (small) data before any wider sale.

---

## 5. Things I'm not sure about (honest caveats)

- **I did not run the app.** This was a read-only code audit; the login providers aren't enabled and the rules aren't deployed, so I couldn't exercise it live. That means **runtime behaviour, the actual offline/PWA experience, and the visual/responsive quality ("flawless 320→1920px, 60fps") are unverified.** The planned 9-width screenshot QA was never done (the docs say so), so the headline UX claim is essentially untested. This is a meaningful gap — some "Done" features could still misbehave at runtime.
- **Breadth vs. depth.** I read the spine and the highest-risk areas closely and used 6 agents to verify the ~50 modules with file/line evidence, but I did not deep-test all 467 files. A few **Half-done vs Done** calls could shift on hands-on testing; treat the table as a strong guide, not gospel.
- **Parent onboarding flow.** I found no code that links a parent's profile on first phone-OTP login, so I rated it "Half-done/Missing." It's possible a flow exists somewhere I didn't trace — worth a direct check.
- **The "603 modules, build green" figure** in your notes refers to **bundler chunks**, not features — it confirms the code *compiles*, which I verified (`tsc` passes), but it says nothing about whether features *work*. Don't read it as "603 things are done."
- **`serviceAccount.json`** — I deliberately did **not** open it (to avoid exposing a private key); I'm assuming it's a real admin key based on your notes.
- **Severity is my judgement.** I weighted privacy/child-data/money issues highest, consistent with what selling a school product to Indian schools (DPDP, POCSO) requires. Reasonable people might rank a few mid-tier items differently.
- **Good news worth repeating:** the foundation is genuinely strong — clean architecture, consistent patterns, atomic fee receipts, correct use of the restricted medical/POCSO collections, honest internal documentation, and a real (if loose) security-rules file. The work ahead is **hardening, not rebuilding.**
