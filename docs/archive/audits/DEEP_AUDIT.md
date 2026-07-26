# NEXLI — Deep Adversarial Audit (Phase 1)

_2026-06-14 · build green @603, tsc clean. Critical analysis (architect / security / principal / owner / CBSE-admin / designer / QA lenses) across every module + the shared architecture spine. "Green build ≠ correct."_

## A) Issues FIXED this pass (~21; objectively-wrong, surgical, in-folder)

### Security / privacy / confidentiality (the dangerous ones)
1. **CRITICAL — Cross-class data leakage.** RBAC lets a *scoped* grant (`students.read.section`, `gradebook.read.subject`) satisfy the *unscoped* nav permission "because the page further scopes" — but only **attendance** actually scoped. A class/subject teacher could open **every** section's students (incl. Aadhaar/address/guardians), assessments, marks, and homework. **Fixed:** new `academics/shared.ts` `useScopedSectionIds` (scope = `member.sectionIds` ∪ sections where `classTeacherUid===uid`) applied to students/gradebook/homework lists + create forms + **deep-link guards**; reviewers/coordinators/leadership stay broad. (Root cause is the RBAC inference → real fix is Firestore rules, see §C.)
2. **P1 — Messaging escalation queue leaked confidential threads.** `tierForRole` defaulted *every* non-leadership role to `teacher`, so nurse/accountant/librarian/security saw every teacher-tier escalation (parent-grievance threads). **Fixed:** `tierForRole`→`null` for non-handling roles + `handlesEscalations` gate.
3. **P2 — POCSO / Grievance / IEP detail routes** gated write but not read (deep-linkable confidential case files). **Fixed:** explicit `pocso.read`/`iep.read` self-gates (defense-in-depth; rules remain authoritative).

### Money / data integrity
4. **CRITICAL — Payment revived a cancelled invoice.** `recordPayment` recomputed status with `statusFor()` (only unpaid/partial/paid), flipping a **cancelled** (written-off) invoice back to paid/partial and corrupting the ledger. **Fixed:** skip invoice update when `status==='cancelled'` (receipt still recorded).
5. **HIGH — Library copy counts non-transactional** (oversell / negative / >total on double-return). **Fixed:** `runTransaction` issue/return (`library/shared.ts`).
6. **HIGH — ESI rounded with `Math.round`** (ESIC Reg 40 requires round-UP). **Fixed:** `Math.ceil`.
7. **HIGH — Manual staff-attendance clobbered kiosk punches** (wrote the whole roster as `present`/`manual`). **Fixed:** only write changed rows.
8. **MED — Consent grant/withdraw timestamp restamped on every edit** (DPDP: legally-meaningful date moved on unrelated edits). **Fixed:** stamp only on a real state transition.
9. **Platform:** `deletedAt` never cleared on reactivation (terminated→reactivated stayed "pending deletion"); Activate-from-expired was a no-op (recomputed back to expired); MRR plan-join was case-sensitive. **All fixed.**

### Workflow realism / governance
10. **HIGH — Requisition raiser could approve their own request.** **Fixed:** `canDecide = (isApprover||canOperate) && !isRaiser`.
11. **HIGH — Hostel block-scope was fragile name-matching** + roll-call ignored scope entirely (warden A could overwrite block B's night roll-call). **Fixed:** id-based `member.blockId`; roll-call dropdown scoped.
12. Transport disruption could be closed with students unsupervised → gated on the supervised-checklist + parent-notify nudge.
13. Clinic visit `sent_home` didn't prompt guardian contact → now escalates. Hostel health-incident escalation dead-condition → fixed. Canteen headcount double-count → warning.
14. **P3 — SMC parent-majority** flagged compliant at 50%; RTE §21(b) requires **75%** + parents only. **Fixed.**
15. Fees Overview had no error state (read failure showed ₹0 KPIs) → added.

## B) NEEDS BUSINESS DECISION (documented, not changed)
| # | Item | Recommendation |
|---|------|----------------|
| B1 | **Plan↔school linkage is by NAME, not id** — renaming/deleting a plan silently breaks MRR/limits for every school on it. | Add stable `planId` to `School` (+ wizard/edit). |
| B2 | **Who may PUBLISH exam results?** Currently `exams.write` (coordinator/HOD). `examinations.approvers=[principal,vp_academic]` exists but is unused. | Gate publish on `useOwnership('examinations').isApprover` (Principal = Centre Superintendent). |
| B3 | **Who ISSUES a Transfer Certificate?** Currently `students.write` (class teacher/coordinator). A TC is a Principal-signed legal doc. | Gate issue on an approver/leadership check. |
| B4 | **PF wage base excludes DA** (`meta.ts` uses `min(basic,15000)`). EPF Act basic = Basic+DA. | Decide: PF base = `basic+da` (cap 15k)? |
| B5 | **Payroll/expense self-approval** — submitter can approve own run if multi-role (no `submittedByUid` recorded). | Add `PayrollRun.submittedByUid`, enforce submitter≠approver. |
| B6 | **Subscription grace period** — a school 1 day late flips straight to `expired` (data-entry locked). | Add a configurable grace window. |
| B7 | **Refund / credit-note flow** missing (payments have a `refunded` status but no UI). | Decide if needed for launch. |
| B8 | **RTE lottery** ranks the combined pool with no per-grade 25%-seat cap. | Confirm allotment is manual downstream, or add per-grade seat draw. |
| B9 | **Exeat vs GatePass** — two divergent hostel outing workflows. | Deprecate `ExeatPass` in favour of GatePass. |
| B10 | **Expense→PO→GRN→expense chain broken at last link** (`Expense.poId` never set; no PO selector) — can't trace spend to PO, can double-record. | Add PO-linkage selector. |
| B11 | **Datesheet clash detection** absent (two papers, same grade/time). | Add a soft clash warning. |

## C) SHARED-FILE / P9 (rules + schema) flags
- **#1 architectural finding — UI scoping is NOT a security boundary.** Confidentiality currently relies on the UI scoping reads. **Firestore security rules (P9) must enforce per-tenant + per-section/role read scoping.** Concrete leaks the UI can't fix: **student portal `assessment_results`** docs embed every classmate's marks (peers' marks reach the browser); **`event_registrations`** expose all registrant names. Fix server-side (per-student result docs or field masking + rules). Verify `firestore.rules` actually restricts `pocso`/`grievances`/`iep_plans`/`therapy_logs`/`consent_records`/payroll as the code comments assert.
- **Type additions** (deferred): `School.planId` (B1), `PayrollRun.submittedByUid` (B5), `Expense.poId` selector (B10), `HostelBlock.wardenUid` + `ExeatPass.blockId` (B9/B11), `homework.read.section`/`write.section` scoping in rbac (tighten the inference root cause).
- **Dead `subscriptions` mirror collection** — written by lifecycle code, never read (write amplification + non-atomic drift). Wire a reader or drop.
- **Non-atomic multi-doc writes** (school lifecycle, admissions admit, TC issue) + **client-side doc numbering** (ticket/asset/passNo/reqNo max+1 collision-prone) — the receipt counter (`runTransaction`) is the correct pattern to extend on Blaze.
- **Scalability:** full-collection client reads (students, invoices, payments, schools, events) need pagination/aggregation before large/multi-school scale.

## D) Spine notes (already-known constraints, documented)
- Multi-role = additive permission union (no deny-rules); single-role NEVER boundaries are enforced by *not granting* (e.g. accountant has no `reports.read`). Acceptable.
- Delegation expiry is client-side (needs reload/snapshot to drop); secondary-role changes apply on next sign-in. Acceptable for the UI-enforcement phase.

---

## E) Phase 2 — LLM Council outcome (2026-06-14) → `council-report-20260614.html` / `council-transcript-20260614.md`
Ran the `llm-council.md` method (5 advisors → anonymized peer review → chairman). **Consensus + my verification of `firestore.rules`:** rules DO exist (deny-by-default, tenant-isolated, strict allowlists on medical/counseling/POCSO/grievances/members/settings/audit) — so "no security" was overstated. **But the coarse default rule (`isActiveMember` read / `isStaff` write) exposes everything NOT on `isRestrictedCollection`** — i.e. **fees, payroll, salary_structures, assessment_results, students(Aadhaar), staff(PAN), iep_plans, therapy_logs, consent_records, attendance** — to any active member (incl. parents/students). Real DPDP gap; UI scoping is not a boundary. Data model carries `schoolId`/`studentId`/`sectionId`/`staffId` ⇒ fix is **additive rules, not a migration**.

## F) Phase 3 — QUEUED corrections (owner: do AFTER role-by-role testing; owner chose "hold, strict own-record")
1. **Tighten `firestore.rules`** — extend `isRestrictedCollection` + add explicit matches with role allowlists + **strict own-record** scoping:
   - **Fees** (`fee_invoices`,`fee_payments`,`fee_structures`,`fee_heads`,`finance_settings`,`finance_counters`): read = Accounts (`chief_accountant`,`accounts_clerk`) + leadership; **own** (parent: `resource.data.studentId in memberData(sid).childStudentIds`; student: `memberData(sid).studentId == resource.data.studentId`). write = Accounts + leadership.
   - **Payroll** (`payroll_runs`,`payslips`,`salary_structures`): read/write = `hr_manager`,`chief_accountant`,`principal`,`vp_admin` (+ staff own payslip later).
   - **Academics** (`assessment_results`,`assessments`,`grades`): read = academic/teaching staff + leadership (student/parent results via the per-student doc, item 2). write = teaching staff.
   - **SIS** (`students`): read = staff (NOT parent/student broadly) + own (parent childStudentIds / student studentId). write = academic/admin staff.
   - **HR** (`staff`): read = HR + leadership + own. write = HR + leadership.
   - **Sensitive** (`iep_plans`,`therapy_logs` → special_educator/counselor/principal; `consent_records` → dpo/consent_officer/principal/vp_admin).
   - **Attendance** (`attendance`): read = staff + own (parent/student); write = teaching staff.
   - **Hostel** (`hostel_*` leave/rollcall/incident): warden roles + leadership.
   - NOTE: list queries must be constrained to match (parent/student hooks already filter by their `studentId` — verify on implement). Then **`firebase deploy --only firestore:rules`** (owner runs) + **emulator-test** roles (teacher-cross-section / parent / accountant / driver) before resuming.
2. **Per-student doc leaks** (rules can't fix the doc shape): `assessment_results` embeds every classmate's marks; `event_registrations` expose all names → split to per-student result docs / mask `entries`.
3. **Parent/student Messages entry point** — recipient policy already exists; wire the parent/student Messages UI + nav (spec §7 #1 promise: "message your class teacher first").
4. **Nav clarity** — "Communication" → "Notices/Circulars"; surface "Messages (Chat)"; clarify the 3 marks tabs (Class Assessments / Examinations / HPC).
5. **Spec reconciliation** — annotate `NEXLI_MASTER_SPECIFICATION.md` §10 where it assumes Blaze (Cloud-Function account suspension, enforced MFA, SMS fan-out) vs the Spark build.
- Logged, NOT queued (feature-ish, per "no feature expansion"): split AI panels into computed-now (deterministic at-risk/defaulter/pacing signals) vs provider-later.
