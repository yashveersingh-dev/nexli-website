# NEXLI — MASTER CONSOLIDATED AUDIT REPORT

**Version:** 2.0
**Date:** 2026-06-19
**Audit Scope:** 8 independent sub-agent audits across Legal/Compliance, Security/Threat, Engineering/Architecture, Product/UX, Business/Finance/Investment, Education Domain, Competitive/External, Scale/Operations/DR
**Auditor Roles Covered:** 150+ roles including Lawyers, DPO, CISO, CTO, CPO, CFO, SRE, DevOps, QA Lead, UX Auditor, WCAG Specialist, Investor, M&A Analyst, School Principal, Teacher, Parent, Accountant, Competitor CEO, Investigative Journalist, Forensic Analyst, Crisis Manager, Compliance Officer, Government Inspector, and 100+ more
**Previous Audit Score:** 3.7/10 (Phase 3 / 1.md, 15-role audit)

---

## TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [Critical Risks (Consolidated)](#2-critical-risks-consolidated)
3. [Critical Issues (Detailed)](#3-critical-issues-detailed)
4. [High Priority Issues](#4-high-priority-issues)
5. [Medium Priority Issues](#5-medium-priority-issues)
6. [Low Priority Issues](#6-low-priority-issues)
7. [Legal Risks](#7-legal-risks)
8. [Compliance Risks](#8-compliance-risks)
9. [Security Risks](#9-security-risks)
10. [Operational Risks](#10-operational-risks)
11. [Product Risks](#11-product-risks)
12. [Technical Risks](#12-technical-risks)
13. [Financial Risks](#13-financial-risks)
14. [Market Risks](#14-market-risks)
15. [Customer Risks](#15-customer-risks)
16. [Scalability Risks](#16-scalability-risks)
17. [Reliability Risks](#17-reliability-risks)
18. [Business Risks](#18-business-risks)
19. [Documentation Gaps](#19-documentation-gaps)
20. [Missing Documentation](#20-missing-documentation)
21. [Missing Features](#21-missing-features)
22. [Missing Policies](#22-missing-policies)
23. [Missing Legal Documents](#23-missing-legal-documents)
24. [Competitive Weaknesses](#24-competitive-weaknesses)
25. [Reputation Risks](#25-reputation-risks)
26. [Acquisition & Investment Risks](#26-acquisition--investment-risks)
27. [Launch Blockers](#27-launch-blockers)
28. [Quick Wins](#28-quick-wins)
29. [Recommended Improvements](#29-recommended-improvements)
30. [Recommended Action Plan](#30-recommended-action-plan)
31. [Prioritized Action Plan (P0/P1/P2/P3)](#31-prioritized-action-plan-p0p1p2p3)
32. [Final Launch Readiness Score](#32-final-launch-readiness-score)

---

## 1. EXECUTIVE SUMMARY

Nexli is a technically ambitious, visually superior school ERP SaaS product for Indian K-12 schools. Built by a single developer on React 19 + TypeScript + Vite 6 + Tailwind v4 + Firebase, it covers 55+ modules, 118 data-driven roles, and represents genuine engineering capability. The demo school "Nexli Demo International School" contains ₹85 lakh of seeded data across 300 students and is used actively for sales demonstrations.

**This report covers the most comprehensive audit Nexli has undergone: 8 independent sub-agent audits representing 150+ professional perspectives.** The findings are unambiguous: Nexli cannot legally, safely, or reliably serve a single paying school today.

### Headline Verdict

| Dimension | Score | Status |
|---|---|---|
| Security & Data Protection | 2/10 | CRITICAL FAILURE |
| Legal & Compliance | 1/10 | CRITICAL FAILURE |
| Product Completeness | 4/10 | BELOW MINIMUM |
| Technical Quality & Architecture | 5/10 | SIGNIFICANT GAPS |
| Scalability & Performance | 2/10 | CRITICAL FAILURE |
| Operational Readiness | 2/10 | CRITICAL FAILURE |
| Business Viability | 3/10 | HIGH RISK |
| User Experience & Accessibility | 4/10 | BELOW MINIMUM |
| Financial Accuracy & Integrity | 3/10 | HIGH RISK |
| Market & Competitive Readiness | 3/10 | HIGH RISK |
| **COMPOSITE** | **2.9/10** | **NOT LAUNCH-READY** |

### Most Severe Immediate Risks

1. **A Firebase Admin SDK private key (`serviceAccount.json`) is present in the working directory.** This key bypasses all Firestore security rules and grants unlimited access to every student's POCSO case files, medical records, salary data, Aadhaar fragments, and counseling notes across every school. This is an active, present-tense data breach risk — not a theoretical future one.

2. **Messaging collections (`conversations`, `messages`) have zero Firestore security rules.** Any user — including parents, students, bus drivers, and canteen staff — can read ALL school messages including POCSO escalation communications and medical notes.

3. **`grantedPermissions` is self-writable.** Any authenticated user can write `grantedPermissions: ['fees.read', 'payroll.read', 'admin.all']` to their own member document and gain arbitrary permissions. This is a privilege escalation vulnerability that allows complete access control bypass.

4. **Firebase Spark quota will be exhausted before 9 AM** at a 500-student school. `useAllAttendance` alone fetches 180,000+ reads against a 50,000-read daily limit. The entire app goes dark at midnight UTC reset — with no alert to users.

5. **The product cannot generate revenue.** No payment gateway exists. Subscription enforcement is browser-only and manual. There is no GST invoice generation. The current ARR is structurally ₹0.

6. **No disaster recovery exists.** RPO = all data loss. RTO = undefined. A single accidental `deleteCollection` call destroys an entire school's historical records permanently.

### What Is Working

The codebase demonstrates genuine engineering depth. Offline-capable attendance marking, a functional payroll engine, report card auto-fill from exam data, a complete fee ledger, POCSO case tracking, hostel management, library circulation, and 45+ other modules all function. The design system is visually superior to every Indian competitor. The architecture is sound in concept; the gaps are implementation-level, not structural.

**Nexli is 6–12 months from commercial readiness, not 2–3 months.** This assessment is not pessimistic — it reflects the volume of critical-severity issues that must be resolved before a single real child's data is stored in this system.

---

## 2. CRITICAL RISKS (CONSOLIDATED)

The following 20 findings are rated **CRITICAL** across all 8 audits. A critical finding means: data loss, criminal liability, immediate security breach, or structural inability to operate as a business.

| ID | Source | Title | Immediate Action Required |
|---|---|---|---|
| CRIT-01 | Legal | Admin SDK private key in working directory | ROTATE KEY NOW |
| CRIT-02 | Security | No Firestore rules for messaging collections | Fix in 2 hours |
| CRIT-03 | Security | `grantedPermissions` self-writable — privilege escalation | Fix in 1 hour |
| CRIT-04 | Security | No Firebase App Check — open API surface | Implement immediately |
| CRIT-05 | Security | Source maps in production — full TypeScript exposed | Disable before next deploy |
| CRIT-06 | Security | No security HTTP headers in `firebase.json` | Add before next deploy |
| CRIT-07 | Security | 14+ collections under wildcard Firestore rule | Audit and restrict |
| CRIT-08 | Security | Payslip writable after payroll finalization | Fix before payroll goes live |
| CRIT-09 | Security | Visitor blacklist advisory only — submit not blocked | Fix in 30 minutes |
| CRIT-10 | Security | IndexedDB not cleared on logout — shared device risk | Fix before any shared-device deployment |
| CRIT-11 | Security | Cross-tenant `userIndex` write — tenant data isolation broken | Fix immediately |
| CRIT-12 | Legal | DPDP Act — no consent gate before data processing | Requires consent architecture |
| CRIT-13 | Legal | POCSO — no 24-hour reporting SLA enforcement | Legal obligation |
| CRIT-14 | Legal | RTE lottery uses non-auditable `Math.random()` | Replace with auditable PRNG |
| CRIT-15 | Legal | No CSP headers — XSS on POCSO/Medical/Aadhaar data | Add before any real data |
| CRIT-16 | Engineering | Firebase Spark quota exhausted before 9 AM | Upgrade to Blaze + budget alert |
| CRIT-17 | Engineering | Zero disaster recovery — RPO = all data | Implement backups before go-live |
| CRIT-18 | Engineering | No CI/CD — broken rules deploy can lock all users out | Implement before first deploy |
| CRIT-19 | Engineering | Only 2 composite indexes for 321+ compound queries | Add missing indexes |
| CRIT-20 | Business | No payment gateway — ARR is structurally ₹0 | Required for revenue |

---

## 3. CRITICAL ISSUES (DETAILED)

### CRIT-01: Firebase Admin SDK Private Key Exposed in Working Directory

**ID:** CRIT-01
**Severity:** CRITICAL — Active breach risk
**Evidence:** `Web/serviceAccount.json` — Firebase Admin SDK private key, project ID, client email
**Audit Source:** Agent 2 (Legal), Agent 7 (Competitive)

**Why It Matters:**
The Firebase Admin SDK credential bypasses ALL Firestore security rules unconditionally. Any person with access to this file can read, write, update, or delete every document in the Nexli Firestore database across every tenant. This includes:
- POCSO case files and victim names
- Student medical records including psychological assessments
- Aadhaar number fragments stored in student profiles
- Full salary and payslip data for every staff member
- Counseling session notes
- Parent contact information

This file is in the `Web/` directory of a project that appears to be version-controlled. If this repository is ever pushed to a public or semi-public location, the key is immediately harvestable.

**Business Impact:** Criminal liability under IT Act 2000 S.43A (negligent data handling), DPDP Act 2023 S.8(5) (failure to implement reasonable security). A single journalist discovering this key could end the company before it launches.

**Technical Impact:** Complete database compromise of all tenants. No Firestore rule provides any protection once Admin SDK is in play.

**Recommended Fix:**
1. IMMEDIATELY go to Firebase Console → Project Settings → Service Accounts → Revoke this key
2. Generate a new key only if absolutely needed for a specific server-side purpose
3. Add `serviceAccount.json` to `.gitignore` immediately
4. Audit git history — if the file was ever committed, the old key is in git history and must be rotated even after `.gitignore` is updated
5. If the Admin SDK is needed at all, move it to a server-side Cloud Function, never in the client project directory

**Priority:** P0 — Do this before anything else today.

---

### CRIT-02: Messaging Collections Have Zero Firestore Security Rules

**ID:** CRIT-02
**Severity:** CRITICAL — Active data exposure
**Evidence:** `firestore.rules` — the word "conversations" appears 0 times; "messages" collection has no explicit rule block
**Audit Source:** Agent 1 (Security), Agent 7 (Competitive)

**Why It Matters:**
The Firestore security rules file has no entry for `conversations` or `messages` collections. Because the catch-all wildcard rule at lines 470-483 grants read access to any `isActiveMember()`, every authenticated user at a school — including students aged 6 and above, parents, bus drivers, canteen operators, and security guards — can read ALL messages ever sent within that school's messaging system. This includes:
- POCSO escalation communications between counselor and principal
- Medical alerts
- Sensitive HR discussions
- Parent grievance threads

This is not a theoretical risk. This is a live data exposure that exists right now in the demo school.

**Business Impact:** POCSO confidentiality breach carries criminal liability. A parent discovering their POCSO complaint has been read by the school bus driver ends Nexli's reputation instantly. Scenario from Agent 7: "Nexli's Messaging System Leaves Parent Grievance Messages Exposed."

**Recommended Fix:**
```javascript
match /conversations/{convId} {
  allow read: if isActiveMember() && 
    resource.data.participantUids.hasAny([request.auth.uid]);
  allow write: if isActiveMember() && 
    request.resource.data.participantUids.hasAny([request.auth.uid]);
  
  match /messages/{msgId} {
    allow read: if isActiveMember() && 
      get(/databases/$(database)/documents/conversations/$(convId))
        .data.participantUids.hasAny([request.auth.uid]);
    allow create: if isActiveMember();
    allow update, delete: if resource.data.senderUid == request.auth.uid;
  }
}
```

**Priority:** P0 — Fix within 2 hours.

---

### CRIT-03: `grantedPermissions` Self-Writable — Privilege Escalation

**ID:** CRIT-03
**Severity:** CRITICAL — Access control bypass
**Evidence:** `firestore.rules:253-258` (blocks roleId/status/schoolId but NOT grantedPermissions); `SessionProvider.tsx:164` (reads grantedPermissions into permission set)
**Audit Source:** Agent 1 (Security), Agent 2 (Legal)

**Why It Matters:**
The Firestore member self-update rule prevents users from changing their own `roleId` or `status`, but the explicit block list does not include `grantedPermissions`. The `SessionProvider` reads this field and merges it into the user's live permission set. Therefore, any authenticated user can execute:

```javascript
// Any user can run this in browser DevTools
import { doc, updateDoc } from 'firebase/firestore';
await updateDoc(doc(db, 'schools/nexli-demo/members', auth.currentUser.uid), {
  grantedPermissions: ['fees.read', 'payroll.view', 'admin.impersonate', 'hr.all']
});
```

After this write, the user gains the listed permissions without any admin approval. This makes the entire 118-role RBAC system meaningless — any student or parent can grant themselves payroll access.

**Recommended Fix:** Add `grantedPermissions` to the blocked fields list in the self-update Firestore rule, and require `isSchoolAdmin()` for any write to `grantedPermissions`.

**Priority:** P0 — Fix within 1 hour.

---

### CRIT-04: No Firebase App Check

**ID:** CRIT-04
**Severity:** CRITICAL — Open API surface
**Evidence:** `Web/src/lib/firebase.ts` — no `initializeAppCheck()` call anywhere in codebase
**Audit Source:** Agent 1 (Security), Agent 8 (Scale/DR)

**Why It Matters:**
The Firebase API key is embedded in the compiled JavaScript bundle (by design — this is how Firebase client SDKs work). Without App Check, anyone who extracts this key can call Firestore directly, bypassing any UI rate limits. This enables:
- Automated quota exhaustion attacks — a 10-line script hitting `/attendance_days` can exhaust the 50,000-read Spark limit in seconds, taking down the entire app for all schools until midnight UTC
- Systematic data scraping of any collection the rules permit (currently: many)
- Forced subscription bypass by direct Firestore writes

**Recommended Fix:** Implement `initializeAppCheck()` with reCAPTCHA v3 Enterprise provider in `Web/src/lib/firebase.ts`. This is a ~15-line code change.

**Priority:** P0 — Implement before any real school data is loaded.

---

### CRIT-05: Production Source Maps Expose Full TypeScript Source

**ID:** CRIT-05
**Severity:** CRITICAL — Intellectual property and security exposure
**Evidence:** `vite.config.ts:49` — `sourcemap: true`
**Audit Source:** Agent 1 (Security), Agent 3 (Engineering)

**Why It Matters:**
With source maps enabled in production, any user who opens browser DevTools can read the complete TypeScript source code of the application, including: business logic, security rule workarounds, hardcoded demo credentials, the AI placeholder data arrays, all algorithm implementations, and the full permission model. This is equivalent to open-sourcing the product without choosing to do so.

Additionally, source maps make it dramatically easier for attackers to find and exploit vulnerabilities — they can read the actual variable names and logic rather than minified output.

**Recommended Fix:** Set `sourcemap: false` in `vite.config.ts` for production builds, or use `sourcemap: 'hidden'` to keep source maps for private error tracking only.

**Priority:** P0 — Fix before next production deploy.

---

### CRIT-06: No Security HTTP Headers

**ID:** CRIT-06
**Severity:** CRITICAL — Defense-in-depth failure
**Evidence:** `firebase.json` — no `headers` array; `CertificatePreview.tsx:99` uses `dangerouslySetInnerHTML`; `print.ts:129` injects unsanitized `accentColor` into CSS
**Audit Source:** Agents 1, 2, 3

**Why It Matters:**
Without a Content Security Policy, any XSS vulnerability (and at least one exists via `accentColor` CSS injection) can exfiltrate POCSO case data, medical records, and Aadhaar fragments to an attacker-controlled server. The DPDP Act S.8(5) requires "reasonable security safeguard" — missing CSP on a system handling children's sensitive data is a direct regulatory violation.

Missing headers:
- `Content-Security-Policy` — XSS protection
- `X-Frame-Options: DENY` — clickjacking protection
- `Strict-Transport-Security` — forces HTTPS
- `X-Content-Type-Options: nosniff` — MIME sniffing protection
- `Referrer-Policy: strict-origin-when-cross-origin` — referrer leakage
- `Permissions-Policy` — camera/microphone access restriction

**Recommended Fix:** Add `headers` array to `firebase.json`:
```json
"headers": [{
  "source": "**",
  "headers": [
    {"key": "X-Frame-Options", "value": "DENY"},
    {"key": "X-Content-Type-Options", "value": "nosniff"},
    {"key": "Referrer-Policy", "value": "strict-origin-when-cross-origin"},
    {"key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains"},
    {"key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()"},
    {"key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self'; connect-src 'self' *.googleapis.com *.firebaseio.com; ..."}
  ]
}]
```

**Priority:** P0 — Add before any production deploy.

---

### CRIT-07: 14+ Collections Under Wildcard Firestore Rule

**ID:** CRIT-07
**Severity:** CRITICAL — Sensitive data exposure
**Evidence:** `firestore.rules:470-483` — generic wildcard grants read to any `isActiveMember()`
**Audit Source:** Agent 1 (Security)

**Why It Matters:**
Collections currently readable by any active school member (including students and parents) via wildcard fallthrough include: `vendors`, `expenses`, `smc_*`, `compliance_*`, `rte_*`, `udise_profile`, `fee_heads`, `fee_structures`, `finance_settings`. A parent-role user can read the school's complete financial vendor list, expense records, SMC meeting minutes, and compliance audit results.

**Recommended Fix:** Remove the wildcard fallthrough rule entirely and add explicit `allow: false` as default deny. Add explicit read rules for each collection with minimum required access.

**Priority:** P1 — Fix within the same sprint as CRIT-02 and CRIT-03.

---

### CRIT-08: Payslip Writable After Payroll Finalization

**ID:** CRIT-08
**Severity:** CRITICAL — Financial fraud vector
**Evidence:** `savePayslip()` has no status check; `RunsTab.tsx:100-112`
**Audit Source:** Agents 1, 5, 8

**Why It Matters:**
Once a payroll run is finalized, individual payslips should become immutable. Currently, any user with `isPayrollStaff` role can modify payslip amounts even after the run is marked final. This enables salary fraud: a payroll admin can increase their own payslip amount, mark it as paid, and the system has no audit trail that distinguishes the original from the tampered value.

**Recommended Fix:** Add `runStatus === 'finalized'` check to `savePayslip()` and enforce it in Firestore rules: `allow write: if isPayrollStaff() && get(runDoc).data.status != 'finalized'`.

**Priority:** P0 before payroll module is used with real data.

---

### CRIT-09: Visitor Blacklist Advisory Only — Submit Not Blocked

**ID:** CRIT-09
**Severity:** CRITICAL — Child safety liability
**Evidence:** `VisitorCheckInPage.tsx:103-110` — warning shown but `disabled` prop not set on submit button
**Audit Source:** Agents 1, 2, 7

**Why It Matters:**
If a person is on the school's visitor blacklist (likely due to a known threat to children), the system shows a warning banner but does not prevent check-in. A gate guard who dismisses the warning or is pressured by the visitor can complete check-in. The school can be held liable for design defect: the system acknowledged the risk but failed to enforce the control.

**Recommended Fix:** Add `disabled={isBlacklisted}` to the submit button. Add a secondary confirmation requiring a supervisor override code for any blacklisted visitor who must legitimately enter. This is a 10-minute code change.

**Priority:** P0 — Fix before any school deployment.

---

### CRIT-10: IndexedDB Not Cleared on Logout

**ID:** CRIT-10
**Severity:** CRITICAL — Shared device data leakage
**Evidence:** Firebase SDK IndexedDB cache (`firestore/[default]/main/`) persists across sessions; no `clearIndexedDbPersistence()` call on sign-out
**Audit Source:** Agent 1 (Security)

**Why It Matters:**
Indian schools widely use shared computer labs and shared teacher devices. When a counselor logs out of a shared computer after reviewing a POCSO case, the next user (even without authentication) can potentially access cached Firestore documents via browser developer tools or malicious extensions. Cached data includes: POCSO cases, student medical records, staff salary information.

**Recommended Fix:** Call `clearIndexedDbPersistence(db)` in the sign-out handler before `signOut(auth)`.

**Priority:** P1 — Before any school where shared devices are used.

---

### CRIT-11: Cross-Tenant userIndex Write — Tenant Isolation Broken

**ID:** CRIT-11
**Severity:** CRITICAL — Multi-tenant isolation failure
**Evidence:** `userIndex` write rule only requires `isSchoolAdmin()` of any school
**Audit Source:** Agent 1 (Security)

**Why It Matters:**
The `userIndex/{uid}` collection maps user UIDs to their school. The write rule allows any school admin (from ANY school) to write to this collection. A malicious IT admin at School A can overwrite a teacher's `userIndex` entry to point to School A, effectively hijacking that teacher's account and giving School A's admin access to that teacher's profile at their real school.

**Recommended Fix:** Restrict `userIndex/{uid}` writes to: `request.auth.uid == uid` (self-write only) or `isNexliSuperAdmin()`.

**Priority:** P0 — Fix immediately.

---

### CRIT-12: DPDP Act 2023 — No Consent Gate Before Data Processing

**ID:** CRIT-12
**Severity:** CRITICAL — Regulatory violation
**Evidence:** `features/consent/` — admin log only, never blocks data creation; student enrollment, medical records, counseling sessions created without consent check
**Audit Source:** Agent 2 (Legal)

**Why It Matters:**
DPDP Act 2023 Section 9 requires verifiable parental consent before processing any personal data of children. The current consent module is a logging tool, not an enforcement gate. Every student enrolled in Nexli today is enrolled in violation of DPDP S.9. When DPDP enforcement begins (expected 2026), this creates retroactive liability for every school using Nexli.

**Business Impact:** Schools using Nexli could be fined under DPDP. Schools will be advised by their legal counsel to abandon Nexli until it is compliant.

**Recommended Fix:** Implement a consent gate middleware that prevents student data creation until `consentStatus === 'granted'` for that student's parent/guardian. The consent record must include timestamp, guardian identity, and specific data purposes consented to.

**Priority:** P0 — Before any school stores real student data.

---

### CRIT-13: POCSO Act 2012 — No 24-Hour Mandatory Reporting SLA

**ID:** CRIT-13
**Severity:** CRITICAL — Criminal liability
**Evidence:** `PocsoFormPage.tsx:82-91` — sets `reportedAt: Date.now()` but no SLA countdown, no alert, no confirmation of police notification
**Audit Source:** Agents 2, 6

**Why It Matters:**
POCSO Act S.19(1) mandates reporting to the Special Juvenile Police Unit within 24 hours of knowledge of a POCSO offense. S.21 imposes imprisonment of 6 months to 1 year for failure to report. Nexli records POCSO cases but provides no mechanism to track whether the 24-hour deadline has been met. A school using Nexli could assume the system will alert them — it does not. A missed reporting deadline while using Nexli implicates both the school and potentially Nexli as the tool that failed to enforce a statutory obligation it chose to track.

**Recommended Fix:**
- Add a `reportingDeadline` field computed as `reportedAt + 24 hours`
- Show a countdown timer on the POCSO case detail page
- Send an in-app alert at T-6 hours and T-1 hour to the principal and POCSO coordinator
- Add a "Police notified" confirmation checkbox with timestamp that is required before case can be marked closed

**Priority:** P0 — Before POCSO module is used with real cases.

---

### CRIT-14: RTE Lottery Uses Non-Auditable `Math.random()`

**ID:** CRIT-14
**Severity:** CRITICAL — Legal invalidity of admissions
**Evidence:** `ApplicationsTab.tsx:99-126` — `Math.random()` for lottery selection; `Promise.all` of individual writes (non-atomic)
**Audit Source:** Agent 2 (Legal)

**Why It Matters:**
RTE Act 2009 Section 12(1)(c) requires 25% reservation seats to be allocated by lottery. State education departments have specific requirements for auditable, reproducible lottery processes. `Math.random()` is a pseudorandom number generator seeded by browser state — it cannot be audited, cannot be reproduced, and cannot prove randomness to a court or regulator. State courts can and do invalidate admissions conducted with non-compliant lottery systems.

Additionally, the lottery write is `Promise.all` of individual Firestore writes — a browser close mid-lottery leaves some applications as selected and others not yet written, producing a half-applied lottery with no rollback.

**Recommended Fix:**
- Replace `Math.random()` with a server-side Cloud Function using `crypto.randomBytes()` with a published seed
- Use a Firestore transaction for the entire lottery write operation
- Log the seed and draw sequence to an immutable audit log

**Priority:** P0 — Before any RTE admission cycle.

---

### CRIT-15: No CSP — XSS on Sensitive Data (See CRIT-06)

*Cross-referenced to CRIT-06. The CSS injection vector in `print.ts:129` and `dangerouslySetInnerHTML` in `CertificatePreview.tsx:99` specifically amplify this risk for certificate and print workflows.*

---

### CRIT-16: Firebase Spark Quota Exhausted Before 9 AM

**ID:** CRIT-16
**Severity:** CRITICAL — Product inoperability
**Evidence:** Agent 8 quota math: `useAllAttendance` alone = 180,000+ reads vs. 50,000 daily Spark limit
**Audit Source:** Agents 3, 8

**Why It Matters:**
At a 500-student school with 180 concurrent morning users, `useAllAttendance` fetches the entire attendance collection for all days — approximately 180,000 reads. The Firebase Spark tier allows 50,000 reads per day. This means the first school to use Nexli will exhaust its daily quota during morning attendance marking at 7:30 AM. The entire application then returns "permission denied" or blank screens for ALL users (not just in the attendance module) until midnight UTC. There is no alert, no graceful degradation, and no fallback.

**Business Impact:** First day of live deployment = complete app failure. School calls emergency meeting. Nexli gets removed.

**Recommended Fix:**
1. IMMEDIATELY upgrade to Firebase Blaze (pay-as-you-go) before any live school deployment
2. Fix `useAllAttendance` to use paginated, filtered queries instead of full collection scans
3. Set Firebase budget alerts at ₹500, ₹2,000, ₹5,000 per day
4. Add `limit()` to all unbounded Firestore queries

**Priority:** P0 — Upgrade to Blaze before any school goes live.

---

### CRIT-17: Zero Disaster Recovery

**ID:** CRIT-17
**Severity:** CRITICAL — Catastrophic data loss risk
**Evidence:** No backup scripts, no GCS bucket, no PITR configuration, no `firebase-admin` backup job; "backup log" is a manual Firestore document
**Audit Source:** Agent 3 (Engineering), Agent 8 (Scale/DR)

**Why It Matters:**

| Scenario | Current RTO | Current RPO |
|---|---|---|
| Accidental collection delete | Infinite | All data since inception |
| Firebase Firestore outage | Unknown (no SLA on Spark) | 0 (data safe, service down) |
| Bad security rules deploy | 15-30 min manual rollback | N/A |
| Spark quota exhaustion | Until midnight UTC | N/A |
| Payroll mid-run browser close | Unknown | Orphaned payslips |

A school's 10 years of academic records, fee history, and medical data can be permanently lost by a single accidental delete or a malicious admin action. There is no way to recover it.

**Recommended Fix:**
1. Upgrade to Blaze (required for scheduled Cloud Functions)
2. Implement daily Firestore export to Google Cloud Storage using `projects.export` API
3. Retain 30 days of daily exports
4. Test restore procedure before going live
5. Document RTO/RPO targets and include in school contracts

**Priority:** P0 — No school contract should be signed without this.

---

### CRIT-18: No CI/CD Pipeline

**ID:** CRIT-18
**Severity:** CRITICAL — Operational safety
**Evidence:** Deploy process is `npm run build && firebase deploy`; no test runner in deploy script; Firestore rules not validated before push
**Audit Source:** Agent 3 (Engineering)

**Why It Matters:**
A single typo in `firestore.rules` can either (a) lock every user out of the application, or (b) expose every document to public read. These scenarios have occurred at large Firebase deployments publicly. Without a CI/CD pipeline that validates rules, runs tests, and requires approval before deploy, every code push to production is a potential incident.

**Recommended Fix:**
1. Set up GitHub Actions (or equivalent) with: `npm run test`, `firebase emulators:exec`, `firebase rules:test`
2. Add a staging environment that mirrors production
3. Require rules PR review before merging
4. Add `firebase deploy --only hosting` vs `firebase deploy --only firestore:rules` as separate deployment steps with separate approvals

**Priority:** P1 — Before scaling beyond one active school.

---

### CRIT-19: Only 2 Composite Indexes for 321+ Compound Queries

**ID:** CRIT-19
**Severity:** CRITICAL — Runtime failures at scale
**Evidence:** `firestore.indexes.json` — 2 composite indexes; Agent 3 estimates 321 compound queries across codebase; known failures in `attendance_days`, `fee_payments`, `portfolio`, `homework_submissions`, `book_circulation`, `career_assessments`
**Audit Source:** Agent 3 (Engineering)

**Why It Matters:**
Firestore requires a composite index for every query that filters on multiple fields or combines `orderBy` with `where`. Missing indexes cause queries to fail at runtime with a Firestore error — not a build-time error. In practice this means: pages load blank, data disappears, and users see empty tables with no explanation. These failures only appear with real production data volumes.

**Recommended Fix:** Run the application against the demo school with `FIRESTORE_EMULATOR_HOST` and capture all `FAILED_PRECONDITION: index required` errors. Add corresponding entries to `firestore.indexes.json`. This is a data-driven process — run it once against real usage scenarios and export the auto-suggested indexes from Firebase Console.

**Priority:** P1 — Complete before any school goes live.

---

### CRIT-20: No Payment Gateway — ARR is Structurally ₹0

**ID:** CRIT-20
**Severity:** CRITICAL — Business viability
**Evidence:** `featureFlags.ts:41` — `online_payments: { defaultEnabled: false, externalIntegration: true }`; `SettingsTab.tsx:78` — "NEXLI records payments manually"
**Audit Source:** Agents 5, 6

**Why It Matters:**
The single most-cited selling point of any school ERP in the Indian market is online fee collection. Schools evaluate ERPs specifically to reduce the administrative overhead of manual fee collection. Nexli's fee module is a manual ledger — it records payments but cannot initiate them. This means:
- Schools cannot collect fees online from parents
- Nexli cannot collect subscription fees from schools programmatically
- There are no GST invoices for Nexli's own subscription billing
- The product's primary value proposition cannot be demonstrated

**Recommended Fix:** Integrate Razorpay (most common in Indian EdTech) or Cashfree. Razorpay's React SDK integration is approximately 3 days of engineering work for a basic fee payment flow.

**Priority:** P1 — Required before commercial launch.

---

## 4. HIGH PRIORITY ISSUES

The following findings are rated **HIGH** severity — they represent significant product, security, or business failures that must be fixed before commercial deployment but are not immediate emergency-grade incidents.

### H-01: `Math.random()` for Visitor OTP (4-Digit Only)

**Evidence:** `visitorSchema.ts:35`
The visitor OTP is generated with `Math.random()`, producing only 9,000 possible values. A motivated attacker can brute-force the OTP in minutes. Replace with `crypto.getRandomValues()` and use 6-digit OTPs.

### H-02: CSS Injection via `accentColor` in Certificate Templates

**Evidence:** `print.ts:135,144,168-173`
The `accentColor` field from school profile is interpolated directly into a `<style>` block without sanitization. Payload: `accentColor: "red; } body { display:none"` would hide the entire certificate. More sophisticated payloads could exfiltrate data. Sanitize with a CSS value whitelist (hex color regex only).

### H-03: Last-Write-Wins on Attendance

**Evidence:** `MarkAttendancePage.tsx` — no Firestore transaction on attendance save
Two teachers saving attendance for the same section simultaneously silently overwrite each other. One teacher's save is lost with no error message. Fix with Firestore transactions or optimistic locking.

### H-04: No Error Boundaries in React Tree

**Evidence:** No `ErrorBoundary` component anywhere in codebase
A single JavaScript exception in any component crashes the entire application. Users see a blank white screen with no error message and no recovery path. Add `react-error-boundary` at the route level minimum.

### H-05: No Error Monitoring

**Evidence:** No Sentry, no Firebase Crashlytics for web, no error logging service
Production errors are invisible. The engineering team has no visibility into what is failing for real users. Integrate Sentry.io (free tier is sufficient for early stage) before any school goes live.

### H-06: `useAllAttendance` Unbounded Full-Collection Fetch (8+ Pages)

**Evidence:** Called from at least 8 different pages; fetches entire `attendance_days` collection
Even after upgrading to Blaze, this is a performance disaster. 180,000 reads on morning load is not acceptable regardless of cost. Add date-range filters and section filters to all attendance queries.

### H-07: All AI Features Are Hardcoded Fabricated Data

**Evidence:** `PredictionsTab.tsx:18-24` — `AT_RISK = [{name: 'Student A', score: 78, trend: 'declining'}]`
The "AI Predictions" dashboard shows hardcoded fake student names and fabricated risk scores. This data is visible through the blur overlay on retina screens (6-8px blur is insufficient). An investor demo using AI features without disclosure is misrepresentation. A school that acts on fabricated risk scores (e.g., flagging "Student A" as at-risk and communicating this to parents) creates real-world harm.

Fix: Either (a) remove AI features entirely and label as "Coming Soon," or (b) implement real ML. Do NOT keep fabricated data in a UI that appears to be functional.

### H-08: No Payment Gateway for School Fee Collection (See CRIT-20)

Cross-referenced — elevated here for product context. The absence of online payment is the #1 objection in every school ERP sales conversation.

### H-09: Delegation Collection Not in Restricted List — Self-Delegation Possible

**Evidence:** Agent 1 (Security) — delegation collection allows self-write
A principal can delegate their own authority to themselves in a circular manner, or delegate to unauthorized users. Add explicit Firestore rules requiring a second admin to approve delegation assignments.

### H-10: No Staff Bulk Import

**Evidence:** Agent 6 — 150-staff school requires 150 individual provisioning actions
A 150-teacher school spend 2-3 days on staff onboarding alone. Fedena and SchoolPro both offer CSV bulk import. This is a competitive-critical gap that will be cited in every large school evaluation.

### H-11: Dark Mode Only — Invisible in Outdoor Indian Sunlight

**Evidence:** `nexli.css:8` — `--bg: #080808`; `index.html:16` — `color-scheme: dark`
Indian schools use attendance marking outdoors at 7:30 AM. A dark background on an affordable Android phone (₹8,000-15,000 with 400-nit display) in direct sunlight is effectively invisible. This is the #1 workflow (morning attendance) on the worst possible hardware/environment combination. Add a light mode or high-contrast outdoor mode.

### H-12: GA4 Analytics Sends Children's Data to US Servers

**Evidence:** `firebase.ts` — `measurementId: G-SBJ6Q5DEDF`; Firebase Analytics sends to US Google servers
DPDP Act S.16 regulates cross-border transfer of personal data. Children's behavioral data (page views, interactions) being sent to US-based Google Analytics servers creates regulatory exposure. Disable GA4 or replace with a DPDP-compliant Indian analytics solution.

### H-13: Impersonation Session Has No Expiry Enforcement

**Evidence:** Agent 1 — impersonation flag not time-bounded
Super Admin impersonation of a school user should have a hard expiry (e.g., 30 minutes). Currently, an impersonation session persists until manual termination. If a Super Admin leaves a tab open, the impersonation continues indefinitely.

### H-14: Counseling Sessions Visible to All Counselors

**Evidence:** `counseling/data.ts:45-49` — no `counselorUid` filter on query
In a school with multiple counselors, every counselor can read every other counselor's sessions. A student's highly sensitive disclosures are visible to all counseling staff. Add `counselorUid == request.auth.uid` filter to both the Firestore query and the security rule.

### H-15: No Invitation Email for New Staff

**Evidence:** Agent 6
New staff members receive temporary passwords via WhatsApp. This is not secure (WhatsApp messages can be screenshotted, forwarded, stored), not professional, and creates no audit trail. Implement Firebase's email invite flow or a dedicated staff onboarding email.

### H-16: v0.1.0 Version Badge Visible to All Users

**Evidence:** `Sidebar.tsx:73`
A "v0.1.0" label is visible to every user including parents and students. This communicates "this software is unfinished" to users who may not understand semantic versioning. Remove or restrict to Super Admin view.

---

## 5. MEDIUM PRIORITY ISSUES

### M-01: No Hindi or Regional Language Support

**Evidence:** `i18next` installed; zero `t()` calls; zero translation files
India has 22 official languages. The primary teacher and parent demographic in tier-2 and tier-3 cities (Nexli's target market) communicates in Hindi or regional languages. Competitors offer Hindi UI. The `lang="en"` static attribute also breaks Hindi text rendering.

### M-02: No Skip-to-Content Link (WCAG 2.4.1 Failure)

**Evidence:** `AppShell.tsx` — no `<a href="#main">Skip to content</a>`
WCAG 2.4.1 is a Level A requirement — the minimum accessibility standard. Government school tenders in India are beginning to require WCAG compliance. This is a disqualification criterion.

### M-03: `type="number"` on Monetary and Mark Inputs

**Evidence:** `CollectPaymentPage.tsx:115`, `FeeStructureFormPage.tsx:121`, `ExamMarkEntryPage.tsx` and 30+ others
Android's number input shows increment/decrement steppers. A mis-tap on a ₹15,000 fee amount changes it to ₹15,001 or ₹14,999 without the user noticing. Use `type="text"` with `inputMode="decimal"` and a numeric regex validator.

### M-04: No Data Retention or Deletion Policy

**Evidence:** `consent/RecordsTab.tsx:127-144` — consent withdrawal marks withdrawn but does NOT delete underlying data
DPDP Act S.8(7) requires erasure of personal data when the purpose is served or consent is withdrawn. A parent who withdraws consent expects their child's data to be deleted — Nexli only marks it withdrawn.

### M-05: No 72-Hour Breach Notification Workflow

**Evidence:** Zero "breach" or "incident report" anywhere in codebase
DPDP Act S.8(6) requires notifying the Data Protection Board within 72 hours of becoming aware of a data breach. Given CRIT-01 (Admin SDK key), a breach may already have occurred. There is no workflow to detect, document, or notify of breaches.

### M-06: No PTM Implementation Despite Nav Link

**Evidence:** `nav.ts:112` — PTM link leads to unimplemented route
Parent-Teacher Meetings are the highest-volume parent engagement event in school life. The nav link exists but leads to a dead end. Parents who tap it will assume the app is broken.

### M-07: No Parent Notification Delivery

**Evidence:** Agent 6 — no push/SMS/WhatsApp integration
A child marked absent at 8 AM — the parent has no notification until they open the app and navigate to attendance. In an emergency or safety context, passive in-app-only notifications are inadequate. Schools will ask "how do parents know if their child is absent?"

### M-08: Library Fine Never Computed

**Evidence:** `OverdueTab.tsx:33` — fine column always shows "—"; fine field never computed
The library management module promises overdue fine calculation. It displays a placeholder dash for every overdue book. Schools that rely on this for revenue recovery will be frustrated.

### M-09: Transport Live Map Always Shows 0 Vehicles

**Evidence:** Agent 4 — no driver app, no GPS feed
The transport module shows a live map that permanently displays 0 vehicles. There is no driver mobile app, no GPS integration. This is misleading on demo.

### M-10: Gamification Badges Not Persisted

**Evidence:** Agent 4 — badges recomputed on render, not stored
Student achievement badges are recomputed each time the page renders. A retroactive attendance correction (e.g., correcting a data entry error from last month) silently removes a badge the student earned. Badges must be persisted to Firestore when earned.

### M-11: `cancelInvoice()` Ignores Existing Payments

**Evidence:** `finance/data.ts:85`
An invoice with ₹30,000 of payments already recorded can be cancelled, leaving the payment as an orphaned ghost credit with no linked invoice. The parent's ledger shows a credit with no explanation. Add a guard: `if (invoice.paidAmount > 0) throw new Error('Cannot cancel invoice with payments')`.

### M-12: Concession Race Condition — netAmount Can Go Negative

**Evidence:** Agent 5 — concurrent concession applications without transaction
Two staff members applying concessions simultaneously can both pass the `grossAmount` check, resulting in combined concessions that exceed the fee amount. The student's ledger shows a negative amount owed. Fix with a Firestore transaction.

### M-13: No EPF/ESI/TDS Statutory Report Generation

**Evidence:** Agent 6 — payroll KPIs correct but no challan export
Payroll is a compliance-critical function. Schools need ECR (Employee Contribution Report) for EPFO filing, ESIC challan, and TDS Form 24Q. Without these exports, the payroll module cannot replace the school's existing process — they'll continue using Tally or a CA.

### M-14: Student with No Section Assigned Is Invisible to All Modules

**Evidence:** Agent 6 — section-less students not surfaced in any module
A student enrolled but not yet assigned to a section is invisible in attendance, exam marks, report cards, and fee collection. There is no admin alert for unassigned students.

### M-15: No FSSAI License Tracking in Canteen Module

**Evidence:** Agent 2 — canteen module lacks FSSAI compliance tracking
Schools with canteens are required to hold FSSAI licenses. The canteen module has no license expiry tracking or renewal reminder.

---

## 6. LOW PRIORITY ISSUES

### L-01: Audit Log Writable by Any Active Member

A motivated attacker or disgruntled employee can write false entries to the audit log, polluting the compliance trail. Audit logs should be append-only and write-restricted to server-side logic.

### L-02: Portfolio Self-Verify Bypass

Students can mark their own portfolio achievements as verified. Portfolio verification should require a teacher action.

### L-03: TC Number Collision Every 10 Seconds

**Evidence:** `TCDetailPage.tsx:52` — `Date.now().slice(-4)` for TC number
Two TCs generated within the same second get the same number. TC numbers must be unique. Use an atomic Firestore counter.

### L-04: `nextAdmissionNo` Race Condition and 1,000-Student Cap

**Evidence:** `school/data.ts:119` — `getDocs count+1` pattern with 1000-doc cap
Concurrent admissions can produce duplicate admission numbers. The system also silently breaks at 1,000 students. Fix with Firestore atomic increment.

### L-05: Sidebar Has Up to 44 Items — No Grouping

A sidebar with 44 flat items has no information hierarchy. Power users get lost; new users are overwhelmed. Add collapsible sections with category grouping.

### L-06: No Self-Serve Trial

Every school requires Super Admin manual provisioning. At 100 schools this is 100 manual wizard completions. Implement automated trial provisioning triggered by email verification.

### L-07: Gold Text on Dark Card Fails WCAG AA Contrast

**Evidence:** Gold (#C6A55C) on dark card (#181818) = 3.4:1 — requires 4.5:1 for WCAG AA normal text
Every gold label, nav tag, and secondary text element in the design system fails WCAG AA. This affects the entire visual identity.

### L-08: Stale studentCount / staffCount in Platform Analytics

Denormalized counts are updated via best-effort telemetry only. Platform dashboard analytics are always wrong. Use Firestore counter aggregations or scheduled reconciliation.

---

## 7. LEGAL RISKS

### LR-01: DPDP Act 2023 — Children's Data Without Consent (CRIT-12)
*See Section 3, CRIT-12 for full detail.*

**Exposure:** DPDP penalties can reach ₹250 crore per breach incident under proposed rules. Every student enrolled in Nexli without a consent gate is a separate incident.

### LR-02: POCSO Act 2012 — Mandatory Reporting SLA (CRIT-13)
*See Section 3, CRIT-13 for full detail.*

**Exposure:** S.21 — 6 months to 1 year imprisonment. Both school staff and potentially Nexli as the tool provider could be implicated if Nexli markets the POCSO tracking feature without disclosing it does not enforce the 24-hour deadline.

### LR-03: RTE Act 2009 — Invalid Lottery Process (CRIT-14)
*See Section 3, CRIT-14 for full detail.*

**Exposure:** State courts can void admission results, requiring re-lottery. School could face contempt proceedings.

### LR-04: IT Act 2000 S.43A — Negligent Data Handling

The Admin SDK key exposure (CRIT-01), missing security headers (CRIT-06), and wildcard Firestore rules (CRIT-07) collectively constitute "negligent handling of sensitive personal data" under IT Act S.43A, exposing Nexli to civil liability from affected schools and parents.

### LR-05: No Privacy Policy, Terms of Service, or DPA

**Evidence:** `Glob("**\\privacy*")`, `Glob("**\\terms*")`, `Glob("**\\legal*")` — no matches

Nexli cannot legally operate as a B2B SaaS in India without a Privacy Policy (DPDP compliance), Terms of Service (contract formation), and Data Processing Agreement (DPA) with each school (DPDP S.8 — schools are Data Fiduciaries, Nexli is a Data Processor). These documents must be drafted by a qualified legal professional.

### LR-06: No GST Invoice Generation

Nexli charges schools a subscription fee but cannot generate GST invoices. Schools cannot claim Input Tax Credit (ITC) without a valid GST invoice. This makes Nexli's subscription more expensive in effective cost than competitors who provide GST invoices.

### LR-07: POSH Act 2013 — ICC Validation Missing

The Internal Complaints Committee (ICC) required under POSH must have specific composition (50% women, external member). Nexli has no ICC constitution validation or composition check in its HR module.

### LR-08: CBSE Affiliation Non-Compliance

Transfer Certificates generated by Nexli do not include all fields required by CBSE Appendix-V. CBSE-affiliated schools using Nexli's TC module could receive compliance notices.

### LR-09: Payroll Statutory Compliance Gaps

EPF/ESI/TDS are computed from hardcoded rates with no EPFO UAN or ESIC IP validation. LOP does not reduce PF/ESI deduction base (statutory over-deduction). No filing integration means schools still need a separate compliance process.

### LR-10: Copyright and IP Ownership

No copyright notices in any source files. No IP assignment documentation for founder. No confirmation that trademark "Nexli" is registered. These gaps create ambiguity in any acquisition scenario.

---

## 8. COMPLIANCE RISKS

### CR-01: No DPO Designation Mechanism

DPDP Act requires large data processors to appoint a Data Protection Officer. Nexli has no mechanism to record, display, or verify DPO designation for schools using the platform.

### CR-02: No UDISE+ Submission Workflow

UDISE+ is mandatory annual reporting for all schools. The UDISE module in Nexli generates a partial report missing 30+ infrastructure data fields (toilets, computers, classrooms, sports facilities). Schools using Nexli cannot complete UDISE filing through the platform.

### CR-03: SMC Composition Not Validated

RTE Act S.21 specifies the required composition of School Management Committees. Nexli creates SMC meeting records but does not validate that the committee membership meets statutory requirements.

### CR-04: NEP 2020 Structure Not Enforced

NEP 2020 prescribes a 5+3+3+4 structure. The academic structure module allows arbitrary configuration without enforcing NEP compliance. Schools claiming NEP compliance while using Nexli with a non-compliant structure create false compliance records.

### CR-05: No Missing Person Protocol for Hostel ExeatPass

When a hostel student's ExeatPass return time passes with no check-in, there is no automated escalation. This is a child safety gap with potential duty-of-care implications.

### CR-06: Counseling Session Retention

RCI (Rehabilitation Council of India) guidelines require counseling records to be retained for 7 years. Nexli allows counseling sessions to be deleted. Add deletion prevention with a 7-year retention lock.

### CR-07: GA4 Cross-Border Data Transfer (See LR-05 / H-12)

Firebase Analytics sends behavioral data of minors to US servers. This is a DPDP S.16 cross-border transfer risk that requires either consent, SCCs, or a DPDP-compliant alternative.

---

## 9. SECURITY RISKS

### SR-01 through SR-10: Critical Security Issues

See Section 3 (CRIT-01 through CRIT-11) for the 11 critical security findings with full detail.

### SR-11: HIGH — `Math.random()` for Visitor OTP

*See H-01.* 9,000-value space is brute-forceable. Use `crypto.getRandomValues()`.

### SR-12: HIGH — CSS Injection via `accentColor`

*See H-02.* Unsanitized school profile field injected into CSS template.

### SR-13: HIGH — Firebase Secondary App Config Leaked to Console

**Evidence:** `useFirebaseMessaging` creates a secondary Firebase app and logs full `firebaseConfig` to console in development. If this runs in production, the config is exposed in console logs.

### SR-14: MEDIUM — Audit Log Writable by Any Active Member

See L-01. Polluted audit logs undermine compliance and forensic investigation.

### SR-15: MEDIUM — `schoolId: ''` Trust-on-Caller in Medical/Visit Schemas

Medical records and visitor logs accept `schoolId` as caller-provided rather than deriving from the authenticated user's membership. A caller who omits or falsifies `schoolId` creates a record in the wrong tenant context.

---

## 10. OPERATIONAL RISKS

### OR-01: Single Developer Bus Factor

The entire product — 60,000+ lines of TypeScript, all institutional knowledge, all Firestore schema knowledge, all deployment access — is in one person's hands. A health incident, burnout, or departure of the founder ends the company.

### OR-02: Manual Deployment with No Rollback Plan

Deploy is `npm run build && firebase deploy`. A bad deploy requires manual intervention to identify the previous good build and re-deploy. There is no one-command rollback. Schools experience downtime during every failed deploy.

### OR-03: Super Admin Manual Provisioning Bottleneck

Every new school requires a Super Admin to manually complete a provisioning wizard. At 100 schools this is 100 separate manual operations. This does not scale.

### OR-04: No Incident Response Playbook

There is no documented procedure for: data breach response, Firebase outage, quota exhaustion, bad rules deploy, payroll corruption, or POCSO escalation data leak. First response will be improvised under pressure.

### OR-05: No Monitoring or Alerting

No uptime monitoring (no Pingdom, no UptimeRobot). No error rate monitoring (no Sentry). No Firebase budget alerts. No Firestore quota alerts. The team learns about outages when a school calls.

### OR-06: No Staging Environment

All testing occurs against the production Firebase project with the demo school's data. A broken rules change pushed "to test" immediately affects real users.

### OR-07: Temp Passwords Shared via WhatsApp

New staff credentials are shared via WhatsApp — insecure, non-auditable, unprofessional. This creates a credential exposure risk and a poor first impression for IT-literate school administrators.

---

## 11. PRODUCT RISKS

### PR-01: Primary Selling Point Cannot Be Demonstrated

Online fee collection is the #1 reason schools switch ERPs. Nexli cannot demonstrate this feature. Every sales demo ends with "we'll add it soon" — which schools hear as "it's not ready."

### PR-02: Parent Portal Is Read-Only With No Delivery Mechanism

Parents are passive observers of information they often don't know to check. No push notifications, no SMS, no WhatsApp. The app sends no proactive communication. This is the opposite of what Indian parents expect from a school communication tool.

### PR-03: AI Preview Is Misleading

Fabricated AT_RISK data behind an inadequate blur overlay is more dangerous than having no AI feature at all. Remove or clearly label as "Coming Q3 2026."

### PR-04: First-Run Experience Is Undefined

There is no onboarding flow, no setup wizard for school admins, no contextual help. A new school administrator logging in for the first time sees a 44-item sidebar and no guidance.

### PR-05: No Data Migration Tooling

Schools switching from Fedena, SchoolPro, or Excel sheets have no path to migrate historical data into Nexli. Every migration requires custom scripting.

### PR-06: No Substitute Teacher Management

When a teacher is absent, the coordinator has no workflow in Nexli to assign a substitute. This is a day-1 operational gap that will surface in every pilot.

---

## 12. TECHNICAL RISKS

### TR-01: Firebase Vendor Lock-In

The entire data layer, authentication system, hosting, and real-time functionality is Firebase-specific. A migration to any other database (PostgreSQL, Supabase, MongoDB) would require a complete rewrite. This creates single-vendor dependency risk for pricing, feature availability, and regional compliance.

### TR-02: Zero Automated Tests for Financial Logic

**Evidence:** Agent 5 — no unit tests for fee calculations, concession logic, payroll math
Financial calculations (fee totals, GST, TDS, ESI, EPF, LOP deductions) have no automated test coverage. A regression in any calculation is invisible until a school accountant notices a discrepancy — potentially months later.

### TR-03: `persistentMultipleTabManager` Requires Blaze

**Evidence:** Agent 3 — silently falls back on Spark without error
Multi-tab Firestore persistence requires Firebase Blaze. On Spark, it silently falls back to single-tab mode. Users with multiple tabs open lose real-time sync without any indication.

### TR-04: `useCollection` Dependency Instability

If callers pass object literals as dependency array items to `useCollection`, the hook re-subscribes on every render, creating N × renders Firestore listeners that are never cleaned up. This causes memory leaks and excess quota consumption.

### TR-05: `RoleRoutes` Not Memoized

`RoleRoutes` rebuilds the entire route tree on every session state change. With 118 roles and potentially thousands of route evaluations, this is a measurable performance regression on route transitions.

### TR-06: `permissionListGrants` Is O(n) on Every Render

The permission check function is called on every render of every permission-gated component. At 118 roles and hundreds of components, this creates CPU overhead on low-end devices. Memoize with `useMemo`.

### TR-07: Report Card Generation — Sequential Writes at Scale

For a 10,000-student school, report card generation creates 10,000 sequential Firestore writes in a loop. At 1 write/100ms, this is a 17-minute blocking operation. Batch writes (500 per batch) would reduce this to minutes.

### TR-08: No OSS License Audit

`npm audit` is not in the deploy script. The dependency tree has not been audited for: known CVEs, license conflicts (GPL code in a commercial product), or abandoned packages.

---

## 13. FINANCIAL RISKS

### FR-01: Zero Revenue Mechanism

*See CRIT-20.* No payment gateway, no automated subscription enforcement, no GST invoicing. The business model is defined but has no technical implementation.

### FR-02: Subscription Expiry Not Enforced at Runtime

**Evidence:** `sweepExpiredSubscriptions()` runs only when Super Admin opens platform dashboard
Schools whose trials expire continue with full access indefinitely unless the Super Admin manually sweeps. Schools have no incentive to renew because nothing breaks when they don't.

### FR-03: No Dunning Management

Expired trials and unpaid subscriptions have no automated follow-up. No email, no in-app warning, no service degradation. Schools passively drift out of paying status.

### FR-04: Stale Student Count = Inaccurate Billing

The student count used for billing tier determination is a best-effort denormalized field updated sporadically. A school that grows from 300 to 400 students may remain on the lower billing tier for months.

### FR-05: `cancelInvoice()` Without Payment Check Creates Ghost Credits

*See M-11.* Ghost credits represent real liability on the school's books that cannot be reconciled without manual intervention.

### FR-06: Concession Race Condition — netAmount Negative

*See M-12.* Negative net amounts break downstream accounting and GST calculations.

### FR-07: Payroll LOP Doesn't Reduce ESI/PT Deduction Base

When an employee has Loss of Pay days, their gross salary is reduced. ESI and Professional Tax deductions should be recomputed on the reduced gross. Currently they are computed on the original gross, resulting in statutory over-deduction — the employee is deducted too much, creating a liability.

### FR-08: No Tally Export

Indian school accountants universally use Tally for statutory compliance. Without Tally export, every transaction must be manually re-entered. Schools will not switch their accounting workflow — they'll use Nexli as a secondary system, reducing perceived value.

### FR-09: No Refund Management

When a fee payment is reversed or a student leaves mid-year, there is no refund workflow. Fee managers must manually calculate and record refunds with no system support.

---

## 14. MARKET RISKS

### MR-01: Language Barrier Blocks 80% of Target Market

Tier-2 and tier-3 Indian cities (the primary target for a ₹4,999/month school ERP) communicate in Hindi and regional languages. An English-only product with a dark mode UI designed for tech-savvy users is misaligned with this market.

### MR-02: Competitors Have 10-Year Head Starts

Fedena (2009), SchoolPro (2011), and MyEduOn have established sales teams, integrations, and reference customers. Nexli has none. The competitive moat is design quality alone — which is insufficient at the ₹4,999/month price point where schools buy on feature completeness and references.

### MR-03: No Reference Customers

0 paying customers, 0 deployed schools, 0 case studies. Every school sales conversation requires the prospect to trust an unproven system with their children's data.

### MR-04: Government School Market Requires CMEK and WCAG

Government school tenders (which represent 70%+ of Indian K-12 enrollment by student count) typically require CMEK (Customer-Managed Encryption Keys) and WCAG 2.1 AA compliance. Nexli meets neither requirement.

### MR-05: Single Firebase Project Creates Multi-Tenant Risk Perception

Sophisticated buyers (CBSEs, chains, government) will ask "is our data isolated from other schools?" The honest answer is "logically isolated but not physically." Some buyers will find this unacceptable, especially for sensitive data.

---

## 15. CUSTOMER RISKS

### CR-01: Day-1 Operational Failures

Based on Agent 6's 10-question assessment, a school that goes live on Monday would fail 3 of the 10 basic day-1 operations:
- Parents are NOT notified of absences
- 150 staff accounts CANNOT be created today
- PTM scheduling DOES NOT EXIST

### CR-02: Data Loss on Payroll Mid-Run

A browser close during payroll run generation leaves orphaned payslips. The payroll administrator has no recovery path — they must manually identify and delete orphaned payslips before re-running. There is no documentation of this risk.

### CR-03: Quota Exhaustion on First Day

*See CRIT-16.* The first school to go live will exhaust Firebase Spark quota during morning attendance. This is a catastrophic first-day failure that will result in an immediate removal request.

### CR-04: No Support Mechanism

There is no in-app support chat, no help documentation, no ticket system, no phone support. Schools with questions during their first week have no path to resolution other than WhatsApp to the founder.

### CR-05: Counseling Data Visible Across Counselors

*See H-14 / EDU-H06.* In a school with multiple counselors, every counselor reads every other's sessions. This breaches professional counseling ethics and could violate confidentiality agreements.

---

## 16. SCALABILITY RISKS

### SC-01: Spark Quota Math Proves Inoperability at Scale

Full quota analysis from Agent 8:
- Morning login spike: 720 rule reads
- Dashboard loads: 3,420 reads
- `useAllAttendance` for 180 users: 180,000 reads
- Fee OverviewTab: 15,000 reads
- **Total before 9 AM: ~199,140 reads against a 50,000-read limit**

The app cannot serve a single school of normal size on Firebase Spark. This is not a future risk — it is a present architectural failure.

### SC-02: Security Rule Read Overhead = 4× Multiplier

**Evidence:** Agent 3 — Firestore rules `get()` calls add 4-6 reads per operation
Every data read triggers additional reads for rule evaluation. At scale, rule overhead becomes the dominant cost driver, potentially 4× the actual data read cost. Optimize rules to minimize `get()` calls.

### SC-03: Concurrent Writes Without Transactions

Multiple race conditions exist simultaneously:
- Attendance last-write-wins (H-03)
- Concession concurrent application (M-12)
- Hostel allocation capacity overflow (CRIT-05 from ENG)
- `nextAdmissionNo` duplicate generation (L-04)
- Payroll partial writes (CRIT-08)

Any multi-user school will trigger these race conditions in normal daily use.

### SC-04: 100-School Manual Provisioning Bottleneck

*See OR-03.* At 100 schools, the founder is doing nothing but school provisioning. The business cannot scale past 20-30 schools with manual provisioning.

### SC-05: Report Card and Payroll Sequential Write Loops

At 10,000 students (a large municipal school), report card generation is a 17-minute blocking browser operation. The tab must remain open. Any network interruption restarts the operation from the beginning.

---

## 17. RELIABILITY RISKS

### RR-01: No Automated Backups

*See CRIT-17.* RPO = all data since inception. A single bad write or delete is permanent.

### RR-02: No Uptime Monitoring

The team has no automated notification when Firebase goes down or the app becomes unreachable. Schools discover outages before the developer does.

### RR-03: No Error Boundaries

*See H-04.* A single JavaScript exception crashes the entire application. On mobile browsers (where most Indian teachers use ERPs), the browser tab must be manually reloaded — and the work in progress is lost.

### RR-04: Firebase Spark Has No SLA

Firebase Spark tier has no uptime SLA. If Firebase experiences regional outages (and Firebase asia-south1 has had 4+ documented outages in 2024-2025), there is no compensation, no priority support, and no guaranteed recovery timeline.

### RR-05: Offline Write Queue Lost on Browser Close

**Evidence:** Agent 8 — Workbox precaches assets only; IndexedDB Firestore queue lost on browser close before sync
When a teacher marks attendance offline and closes the browser before sync completes, the attendance data is permanently lost. The Workbox configuration only caches static assets, not Firestore write queues.

### RR-06: Payroll Orphaned State

*See CRIT-08, CRIT-06 (ENG).* Mid-run browser close leaves the payroll system in an undefined state. There is no rollback, no detection, and no recovery workflow documented.

---

## 18. BUSINESS RISKS

### BR-01: Zero Revenue, Zero Customers, Zero Deployed Schools

The business has no validation beyond internal demo. Every risk in this report exists at a school that has never accepted a student's data in production.

### BR-02: Single Founder, No Team, No Advisors

The company's entire technical knowledge, sales capability, support capacity, and operational knowledge exists in one person. This is the highest-risk configuration for a B2B SaaS targeting schools handling children's data.

### BR-03: AI Washing Risk

The "AI Predictions" feature contains fabricated data. If this is used in investor pitches without explicit disclosure ("this is a preview of planned AI capabilities with placeholder data"), it constitutes misrepresentation. In the current regulatory environment around AI claims, this is a material risk.

### BR-04: No Competitive Defense

Design quality is Nexli's only demonstrated differentiator. Fedena can copy a dark mode design in weeks. SchoolPro can hire a UX team. Feature gaps (payment gateway, SMS notifications, Tally export, biometric integration) take months to close for a single developer.

### BR-05: Firebase Cost Curve Is Steep at Scale

At 100 schools with 300+ students each, monthly Firestore reads will be approximately 450 million/month. At Firebase Blaze pricing, this is roughly ₹25,000-40,000/month in infrastructure costs against ₹5-20 lakh/month in subscription revenue. The unit economics work — but only with optimized queries. Current query patterns would produce 5-10× this cost.

---

## 19. DOCUMENTATION GAPS

The following documentation exists in the codebase but is incomplete or misleading:

| Document/Feature | Status | Gap |
|---|---|---|
| POCSO module | Implemented but no procedure docs | Users don't know they must report to police within 24 hours |
| Payroll module | Functional but no user guide | LOP impact on statutory deductions not documented |
| AI Predictions | Labelled as functional | Is entirely fabricated data |
| Consent module | Implemented | Does not explain it does not block data creation |
| Visitor blacklist | Implemented | Does not explain that blacklisted visitors can still be checked in |
| Disaster recovery | "Backup log" Firestore document | Is a manual text log, not an actual backup |
| RTE lottery | Implemented | Does not disclose `Math.random()` auditability gap |
| TC module | Implemented | Does not list CBSE compliance gaps |

---

## 20. MISSING DOCUMENTATION

The following documentation does not exist anywhere in the project:

| Document | Legal/Business Requirement | Priority |
|---|---|---|
| Privacy Policy | DPDP Act — required before data processing | P0 |
| Terms of Service | Contract formation — required for B2B SaaS | P0 |
| Data Processing Agreement (DPA) | DPDP S.8 — required for each school | P0 |
| Incident Response Playbook | Operational necessity | P1 |
| Disaster Recovery Procedure | Operational necessity | P0 |
| Security Vulnerability Disclosure Policy | Industry standard | P2 |
| API Documentation | Required for integrations | P2 |
| User Manual / Help Documentation | Customer success | P1 |
| Onboarding Guide for School Admins | Customer success | P1 |
| Payroll Process Documentation | User guidance | P1 |
| POCSO Reporting Procedure for Schools | Legal guidance | P0 |
| Data Retention Schedule | DPDP S.8(7) | P1 |
| System Architecture Document | Engineering reference | P2 |
| Security Architecture Document | CISO requirement | P1 |

---

## 21. MISSING FEATURES

The following features are absent but are required for commercial viability in the Indian K-12 ERP market:

| Feature | Market Priority | Competitive Impact |
|---|---|---|
| Online fee payment gateway (Razorpay/Cashfree) | P0 | #1 sales objection |
| Parent SMS/WhatsApp notifications | P0 | #2 sales objection |
| Staff bulk CSV import | P1 | Blocks large school onboarding |
| Biometric attendance integration | P1 | Required for 200+ student schools |
| Hindi UI / regional language support | P1 | Required for tier-2/3 markets |
| Tally export | P1 | Required for accountant buy-in |
| PTM scheduling module | P1 | Nav link exists, module doesn't |
| Substitute teacher management | P1 | Day-1 operational gap |
| EPF/ESI/TDS challan export | P1 | Required for payroll module to replace existing process |
| CBSE TC compliance (Appendix-V) | P1 | CBSE school requirement |
| OASIS TC data sync | P2 | CBSE requirement |
| NEP 2020 structure enforcement | P2 | Policy compliance |
| Parent leave request submission | P2 | UX gap |
| Staff invitation email | P1 | Replaces WhatsApp temp password |
| Board exam result import | P2 | CBSE/ICSE integration |
| Self-serve trial provisioning | P1 | Growth blocker |
| GST invoice for Nexli subscriptions | P0 | Revenue enabler |
| UDISE+ infrastructure data fields | P2 | Compliance officer gap |
| Missing person escalation for hostel | P1 | Child safety |
| Library fine auto-computation | P2 | Module completion |
| Light mode / outdoor mode | P1 | Attendance marking UX |
| Real AI predictions (or remove feature) | P1 | Reputation risk |

---

## 22. MISSING POLICIES

| Policy | Why Needed | Priority |
|---|---|---|
| Data Retention Policy | DPDP S.8(7) compliance | P0 |
| Data Deletion Procedure | DPDP consent withdrawal | P0 |
| Breach Notification Procedure | DPDP S.8(6) — 72-hour requirement | P0 |
| Access Control Policy | RBAC governance | P1 |
| Password / Credential Policy | Current: WhatsApp temp passwords | P1 |
| Vendor Assessment Policy | Third-party risk (Google, Firebase) | P2 |
| Impersonation Policy | Super Admin impersonation governance | P1 |
| Backup and Recovery Policy | DR governance | P0 |
| Acceptable Use Policy | For school admins and staff | P2 |
| Vulnerability Disclosure Policy | Security community engagement | P3 |

---

## 23. MISSING LEGAL DOCUMENTS

| Document | Why Needed | Priority |
|---|---|---|
| Privacy Policy (DPDP-compliant) | Required before any real data processing | P0 |
| Terms of Service | Required for contract formation | P0 |
| Data Processing Agreement (per school) | DPDP S.8 — Nexli as Data Processor | P0 |
| SLA Agreement | Schools need uptime commitment | P1 |
| GDPR Addendum | For NRI/international schools using India-hosted system | P3 |
| End User License Agreement | Software IP protection | P1 |
| IP Assignment Agreement (founder) | M&A prerequisite | P1 |
| Copyright Notices | Source file IP protection | P2 |
| Trademark Registration | "Nexli" brand protection | P2 |
| DPDP Registration (when required) | Significant Data Fiduciary registration | P1 |

---

## 24. COMPETITIVE WEAKNESSES

### Feature Gap Table vs. Primary Competitors

| Module | Nexli (Current) | Fedena | SchoolPro | Key Gap |
|---|---|---|---|---|
| Fee Collection | 3/10 | 7/10 | 8/10 | Zero payment gateway |
| Parent Communication | 2/10 | 6/10 | 7/10 | No WhatsApp/SMS/push |
| Transport/GPS | 2/10 | 4/10 | 6/10 | Map shows 0 vehicles permanently |
| Analytics/AI | 1/10 | 4/10 | 5/10 | All AI is hardcoded fake |
| Tally Integration | 0/10 | 8/10 | 7/10 | Not built |
| Language Support | 0/10 | 5/10 | 6/10 | English only |
| Light Mode | 0/10 | 8/10 | 8/10 | Dark mode only |
| Biometric Integration | 0/10 | 6/10 | 7/10 | Not built |
| Self-Serve Trial | 0/10 | 7/10 | 6/10 | Manual provisioning only |
| Staff Bulk Import | 0/10 | 7/10 | 8/10 | Not built |
| Reference Customers | 0/10 | 9/10 | 8/10 | Zero deployments |
| Design Quality | 9/10 | 4/10 | 5/10 | Nexli wins |
| Mobile UX | 7/10 | 5/10 | 5/10 | Nexli wins |
| Module Breadth | 8/10 | 7/10 | 7/10 | Nexli wins |

**Nexli's competitive advantage is real but narrow:** Design quality and module breadth are genuine differentiators. Every other dimension is a disadvantage.

### Competitive Positioning Statement (Honest Version)

Nexli is a beautifully designed school ERP that is not yet production-ready. It has superior UI/UX to all Indian competitors and broad module coverage, but lacks the operational integrations (payment gateway, SMS, Tally, biometric) that define "production-ready" in this market.

---

## 25. REPUTATION RISKS

### RP-01: Journalist Scenarios (From Agent 7)

Four specific journalist investigations that could end Nexli:

1. **"School ERP Claims AI but Uses Hardcoded Student Names"**
   - Evidence: `PredictionsTab.tsx:18-24` — `AT_RISK = [{name: 'Student A'...}]` visible in DevTools
   - Impact: Immediate trust collapse with schools and investors

2. **"Nexli's Messaging System Leaves Parent Grievance Messages Exposed"**
   - Evidence: `conversations` collection has zero Firestore rules
   - Impact: Criminal liability investigation, regulatory action, school contract termination

3. **"Blacklisted Visitor System Fails to Block Entry"**
   - Evidence: `VisitorCheckInPage.tsx:103-110` — warning shown, submit not blocked
   - Impact: Child safety liability lawsuit, media coverage

4. **"Admin Key to Children's School Data Found on Laptop"**
   - Evidence: `Web/serviceAccount.json` present in project directory
   - Impact: DPDP violation, IT Act liability, complete loss of school trust

### RP-02: Social Media Risk

Indian school parent WhatsApp groups are powerful distribution networks for negative news. A single school that experiences a data breach, quota exhaustion outage, or POCSO data leak will produce social media content that reaches thousands of schools.

### RP-03: School Association Blacklisting

CBSE, CISCE, and state board school associations communicate among members. A compliance violation (invalid TC format, failed RTE lottery audit) can result in informal blacklisting within association networks.

---

## 26. ACQUISITION & INVESTMENT RISKS

### AI-01: AI Misrepresentation in Investor Pitches

**Evidence:** `PredictionsTab.tsx:18-24` — hardcoded fake AT_RISK student names
If an investor demo includes the AI Predictions dashboard without explicit disclosure that the data is fabricated placeholder content, this constitutes misrepresentation. Under SEBI regulations and general contract law, this could void investment agreements if discovered post-investment.

**Fix:** Add a persistent "PREVIEW — Data is illustrative only" banner to all AI screens, or remove the screens entirely.

### AI-02: Zero Unit Tests for Financial Calculations

An acquirer performing technical due diligence will find no automated test coverage for any financial calculation. This means correctness cannot be verified — the acquirer must manually audit every formula. This reduces acquisition valuation and may result in deal withdrawal.

### AI-03: No IP Assignment Documentation

The code, product design, and brand "Nexli" have no documented IP assignment from the founder to the legal entity. In an acquisition, unclear IP ownership is a deal-stopper.

### AI-04: Firebase Vendor Lock-In

A full database migration from Firestore to any other provider requires a complete application rewrite. Acquirers who prefer PostgreSQL or AWS will discount the acquisition price for migration cost or walk away.

### AI-05: Single Developer Bus Factor

**Evidence:** Agent 5 — single founder, no co-founder, no engineers hired
An acquirer buying Nexli is acquiring a product whose technical knowledge lives entirely in one person. Standard acquirer mitigation is key-man clauses, but some acquirers will not accept this risk at all.

### AI-06: Seed Round Readiness Assessment

| Dimension | Score | Notes |
|---|---|---|
| Revenue (ARR) | 0/10 | ₹0 |
| Customer Count | 0/10 | 0 paying customers |
| Team | 3/10 | Single founder |
| Product | 6/10 | Genuine depth, critical gaps |
| Market Size | 8/10 | ₹4,500 crore addressable |
| Technology | 7/10 | Modern stack, critical security gaps |
| Legal/Compliance | 1/10 | Unfit for any investment due diligence |
| **Overall Seed Readiness** | **4/10** | Pre-seed, not seed |

---

## 27. LAUNCH BLOCKERS

The following items **MUST** be resolved before any school goes live with real student data. This is the minimum viable launch checklist.

### Tier 0: Do Today (Before Any Demo with Sensitive Data)

| # | Action | Time Estimate |
|---|---|---|
| LB-01 | Rotate Firebase Admin SDK key (`serviceAccount.json`) | 15 minutes |
| LB-02 | Add `serviceAccount.json` to `.gitignore` | 2 minutes |
| LB-03 | Fix `grantedPermissions` self-write Firestore rule | 1 hour |
| LB-04 | Add Firestore rules for `conversations`/`messages` | 2 hours |
| LB-05 | Disable visitor check-in submit when blacklist match | 30 minutes |
| LB-06 | Set `sourcemap: false` in `vite.config.ts` | 5 minutes |

### Tier 1: Before Any School Goes Live (Legal Minimum)

| # | Action | Time Estimate |
|---|---|---|
| LB-07 | Upgrade Firebase to Blaze tier | 1 hour |
| LB-08 | Fix `useAllAttendance` to paginated/filtered queries | 3 days |
| LB-09 | Add missing composite Firestore indexes | 2 days |
| LB-10 | Implement daily Firestore backup to GCS | 3 days |
| LB-11 | Add security HTTP headers to `firebase.json` | 2 hours |
| LB-12 | Fix wildcard Firestore rule — explicit deny for sensitive collections | 1 day |
| LB-13 | Add POCSO 24-hour countdown and alert | 1 day |
| LB-14 | Implement consent gate before student data creation | 1 week |
| LB-15 | Replace RTE lottery `Math.random()` with CSPRNG Cloud Function | 2 days |
| LB-16 | Clear IndexedDB on logout | 2 hours |
| LB-17 | Fix cross-tenant `userIndex` write rule | 1 hour |
| LB-18 | Add Privacy Policy and Terms of Service | 1 week (legal) |
| LB-19 | Draft and execute Data Processing Agreement template | 1 week (legal) |
| LB-20 | Add Firebase App Check | 1 day |
| LB-21 | Add error boundaries at route level | 1 day |
| LB-22 | Integrate Sentry for error monitoring | 4 hours |
| LB-23 | Add Firebase budget alerts | 1 hour |
| LB-24 | Fix payslip write after finalization | 4 hours |
| LB-25 | Remove or properly label AI placeholder data | 1 hour |
| LB-26 | Fix `cancelInvoice()` to check `paidAmount` | 2 hours |

**Estimated total for Tier 0 + Tier 1: 6–8 weeks of full-time engineering + 2 weeks of legal work**

---

## 28. QUICK WINS

High-impact, low-effort fixes that can be implemented immediately:

| # | Fix | Effort | Impact |
|---|---|---|---|
| QW-01 | Set `sourcemap: false` in `vite.config.ts` | 5 min | Hides source code from DevTools |
| QW-02 | Add `serviceAccount.json` to `.gitignore` | 2 min | Prevents accidental future commit |
| QW-03 | Disable visitor check-in submit when blacklisted | 30 min | Closes child safety gap |
| QW-04 | Add `grantedPermissions` to Firestore blocked field list | 1 hour | Closes privilege escalation |
| QW-05 | Add Firestore deny rule for `conversations`/`messages` | 2 hours | Closes POCSO message exposure |
| QW-06 | Add security headers to `firebase.json` | 2 hours | CSP, HSTS, X-Frame-Options |
| QW-07 | Remove v0.1.0 badge from parent/student sidebar | 15 min | Professional appearance |
| QW-08 | Add "PREVIEW — Illustrative Data" banner to AI screens | 30 min | Removes misrepresentation risk |
| QW-09 | Fix PTM nav link to show "Coming Soon" instead of dead link | 15 min | Removes broken UX |
| QW-10 | Add Firebase budget alerts at ₹500/₹2,000/₹5,000/day | 1 hour | Prevents surprise billing |
| QW-11 | Add `clearIndexedDbPersistence` to sign-out handler | 30 min | Fixes shared device data leak |
| QW-12 | Change `type="number"` to `type="text" inputMode="decimal"` on monetary inputs | 2 hours | Fixes mis-tap on Android |
| QW-13 | Add `aria-hidden="true"` to KPICard icons | 30 min | Accessibility improvement |
| QW-14 | Add POCSO 24-hour display countdown | 4 hours | Critical legal UX |
| QW-15 | Fix TC number collision (`Date.now().slice(-4)`) | 2 hours | Data integrity |
| QW-16 | Add `disabled` state and error message to payslip after finalization | 4 hours | Payroll fraud prevention |

---

## 29. RECOMMENDED IMPROVEMENTS

Beyond the blockers and quick wins, the following improvements would significantly advance Nexli toward commercial readiness:

### Engineering Improvements

1. **Query Optimization Sprint (2 weeks):** Audit all Firestore queries for unbounded fetches. Add `limit()`, date filters, and section filters. Priority: `useAllAttendance`, `useInvoices`, `usePayments`.

2. **Atomic Write Audit (1 week):** Identify all multi-step operations (payroll run, RTE lottery, hostel allocation, admission, concession) and wrap in Firestore transactions.

3. **Index Completeness (3 days):** Run the application against demo school data with index logging enabled. Capture all `FAILED_PRECONDITION` errors and add corresponding indexes.

4. **CI/CD Pipeline (3 days):** GitHub Actions with: `npm run build`, `npm test`, Firebase emulator rules tests, staging deploy before production.

5. **Test Coverage for Financial Logic (2 weeks):** Unit tests for fee calculation, payroll LOP deduction, GST computation, and concession math. Target 90% coverage for `finance/` and `payroll/` directories.

### Product Improvements

6. **Razorpay Integration (3-5 days):** Online fee collection is the #1 commercial requirement. Razorpay's India-specific SDK supports UPI, net banking, cards, and EMI.

7. **Firebase Cloud Messaging for Parent Notifications (3 days):** Enable push notifications for: attendance marking, fee payment due, exam results, and hostel ExeatPass events.

8. **Staff Bulk CSV Import (3 days):** Accept CSV with: name, email, role, department. Auto-create Firebase Auth accounts and send invitation emails.

9. **Light Mode Toggle (2 days):** Add a theme toggle in user preferences. Default to system preference. This is the single highest-impact UX change for the outdoor Indian teacher use case.

10. **Invitation Email for New Staff (1 day):** Use Firebase Authentication's `generateSignInWithEmailLink` or temporary password email instead of WhatsApp sharing.

### Legal/Compliance Improvements

11. **Consent Architecture (1 week):** Implement a consent gate that blocks student data creation until guardian consent is recorded with timestamp, guardian identity, and specific data purposes.

12. **DPDP-Ready Data Deletion (3 days):** Implement soft-delete with retention period enforcement. Add a data deletion confirmation workflow that actually deletes (not just marks) records after the retention period.

13. **Legal Document Suite (2 weeks, with lawyer):** Privacy Policy, Terms of Service, Data Processing Agreement template, POCSO reporting procedure guide.

### Business Improvements

14. **Self-Serve Trial Provisioning (1 week):** Remove the Super Admin bottleneck. Schools should be able to start a 30-day trial via email verification and automated provisioning.

15. **GST Invoice Generation (2 days):** Generate valid GST invoices for Nexli's subscription billing. Use a library like `pdfmake` or `jsPDF`.

16. **Tally XML Export (3 days):** Implement Tally XML format export for: fee payments, expense entries, payroll summaries. This is a widely-requested feature that no Indian school ERP has done well.

---

## 30. RECOMMENDED ACTION PLAN

### Phase 1: Crisis Resolution (Weeks 1-2)

**Goal:** Close active security vulnerabilities before any real school data is loaded.

1. Rotate Firebase Admin SDK key (Day 1, 15 minutes)
2. Implement Firestore rules for messaging (Day 1, 2 hours)
3. Fix `grantedPermissions` privilege escalation (Day 1, 1 hour)
4. Disable visitor blacklist submit (Day 1, 30 minutes)
5. Disable production source maps (Day 1, 5 minutes)
6. Add security HTTP headers (Day 1, 2 hours)
7. Clear IndexedDB on logout (Day 2, 30 minutes)
8. Fix cross-tenant `userIndex` write (Day 2, 1 hour)
9. Add Firebase App Check (Day 3-5, 1 day)
10. Fix wildcard Firestore rules for 14+ collections (Days 3-10, 1 week)

**Deliverable:** Security audit clean of all P0 vulnerabilities.

### Phase 2: Legal Compliance Foundation (Weeks 2-6)

**Goal:** Make the product legally operable in India.

1. Engage a qualified tech law firm for Privacy Policy, ToS, DPA (Week 2)
2. Implement DPDP consent gate architecture (Weeks 2-4)
3. Add POCSO 24-hour SLA enforcement (Week 3)
4. Replace RTE lottery with CSPRNG Cloud Function (Week 3)
5. Implement data deletion workflow (Week 4)
6. Add breach notification workflow skeleton (Week 4)
7. Upgrade Firebase to Blaze and configure budget alerts (Week 2)
8. Implement daily Firestore backup to GCS (Week 3)

**Deliverable:** Product is legally operable for pilot deployment.

### Phase 3: Technical Foundation (Weeks 4-10)

**Goal:** Fix architectural issues that prevent reliable operation.

1. Query optimization — eliminate unbounded fetches (Weeks 4-6)
2. Add missing composite Firestore indexes (Weeks 4-5)
3. Implement atomic writes for all multi-step operations (Weeks 5-7)
4. Set up CI/CD pipeline with staging environment (Week 4)
5. Add error boundaries and Sentry integration (Week 4)
6. Write unit tests for financial calculations (Weeks 5-8)
7. Fix all race conditions (admission, concession, hostel) (Weeks 6-8)

**Deliverable:** Product is architecturally reliable for 500+ student schools.

### Phase 4: Commercial Feature Completion (Weeks 8-20)

**Goal:** Build the features required for commercial launch.

1. Razorpay online fee collection integration (Weeks 8-11)
2. Firebase Cloud Messaging parent notifications (Weeks 10-12)
3. Staff bulk CSV import with invitation email (Weeks 11-13)
4. Light mode / outdoor mode (Weeks 12-13)
5. Hindi UI translation (Weeks 12-18)
6. Tally XML export (Weeks 14-16)
7. EPF/ESI challan export (Weeks 14-16)
8. Self-serve trial provisioning (Weeks 16-18)
9. GST invoice generation for Nexli billing (Weeks 16-17)
10. PTM scheduling module (Weeks 17-20)

**Deliverable:** Commercially viable product for Indian K-12 market.

### Phase 5: Pilot and Validation (Weeks 20-28)

**Goal:** Deploy to 2-3 carefully selected pilot schools and validate.

1. Select pilot schools with technical administrators
2. Manual onboarding with founder present
3. Daily monitoring of Firebase quotas, errors, user feedback
4. Fix all pilot-discovered bugs
5. Generate first case study and reference customer

**Deliverable:** 3 reference customers, validated product, case study for sales.

---

## 31. PRIORITIZED ACTION PLAN (P0/P1/P2/P3)

### P0 — Do Immediately (Within 72 Hours)
*These items represent active harm risk or are required before any school data is loaded.*

| ID | Action | Owner | Effort |
|---|---|---|---|
| P0-01 | Rotate Firebase Admin SDK key | Dev | 15 min |
| P0-02 | `.gitignore` for `serviceAccount.json` | Dev | 2 min |
| P0-03 | Fix `grantedPermissions` self-write rule | Dev | 1 hr |
| P0-04 | Add Firestore rules for conversations/messages | Dev | 2 hr |
| P0-05 | Disable visitor check-in submit when blacklisted | Dev | 30 min |
| P0-06 | Set `sourcemap: false` in production build | Dev | 5 min |
| P0-07 | Add security HTTP headers to `firebase.json` | Dev | 2 hr |
| P0-08 | Upgrade Firebase to Blaze + budget alerts | Dev | 1 hr |
| P0-09 | Add "PREVIEW" banner to all AI screens | Dev | 30 min |
| P0-10 | Remove v0.1.0 badge from parent/student views | Dev | 15 min |

### P1 — Before Any School Goes Live (Within 6 Weeks)
*Required for legal operation and minimum product viability.*

| ID | Action | Owner | Effort |
|---|---|---|---|
| P1-01 | DPDP consent gate architecture | Dev | 1 week |
| P1-02 | Privacy Policy + Terms of Service (legal draft) | Legal | 1 week |
| P1-03 | Data Processing Agreement template | Legal | 1 week |
| P1-04 | Daily Firestore backup to GCS | Dev | 3 days |
| P1-05 | Fix `useAllAttendance` to paginated queries | Dev | 3 days |
| P1-06 | Add all missing composite Firestore indexes | Dev | 2 days |
| P1-07 | Firebase App Check implementation | Dev | 1 day |
| P1-08 | Clear IndexedDB on logout | Dev | 30 min |
| P1-09 | Fix cross-tenant `userIndex` write | Dev | 1 hr |
| P1-10 | POCSO 24-hour countdown + alert | Dev | 1 day |
| P1-11 | Replace RTE lottery with CSPRNG Cloud Function | Dev | 2 days |
| P1-12 | Add error boundaries (react-error-boundary) | Dev | 1 day |
| P1-13 | Sentry integration | Dev | 4 hrs |
| P1-14 | Fix payslip write-after-finalization | Dev | 4 hrs |
| P1-15 | Fix `cancelInvoice()` without payment check | Dev | 2 hrs |
| P1-16 | Fix concurrent concession — Firestore transaction | Dev | 1 day |
| P1-17 | Razorpay fee collection integration | Dev | 3-5 days |
| P1-18 | Firebase Cloud Messaging parent notifications | Dev | 3 days |
| P1-19 | Staff bulk CSV import | Dev | 3 days |
| P1-20 | Staff invitation email (replace WhatsApp) | Dev | 1 day |
| P1-21 | CI/CD pipeline with staging environment | Dev | 3 days |
| P1-22 | Fix wildcard Firestore rules | Dev | 1 week |
| P1-23 | Add light mode / outdoor mode | Dev | 2 days |
| P1-24 | GST invoice generation for Nexli billing | Dev | 2 days |
| P1-25 | Fix `type="number"` on monetary inputs | Dev | 2 hrs |
| P1-26 | Fix counseling session cross-counselor visibility | Dev | 1 hr |

### P2 — Within 3 Months (Commercial Polish)
*Required for competitive parity and professional operation.*

| ID | Action | Owner | Effort |
|---|---|---|---|
| P2-01 | Hindi UI translation | Dev + translator | 3 weeks |
| P2-02 | Tally XML export | Dev | 3 days |
| P2-03 | EPF/ESI/TDS challan export | Dev | 3 days |
| P2-04 | PTM scheduling module | Dev | 1 week |
| P2-05 | Self-serve trial provisioning | Dev | 1 week |
| P2-06 | Unit tests for financial calculations | Dev | 2 weeks |
| P2-07 | Atomic write audit and fix | Dev | 1 week |
| P2-08 | CBSE TC Appendix-V compliance | Dev + legal | 3 days |
| P2-09 | Data deletion workflow (DPDP S.8(7)) | Dev | 3 days |
| P2-10 | 72-hour breach notification workflow | Dev | 2 days |
| P2-11 | Skip-to-content link (WCAG 2.4.1) | Dev | 30 min |
| P2-12 | Gold text color contrast fix (WCAG AA) | Dev + design | 1 day |
| P2-13 | UDISE+ infrastructure data fields | Dev | 1 week |
| P2-14 | Library fine auto-computation | Dev | 1 day |
| P2-15 | Remove GA4 or replace with DPDP-compliant analytics | Dev | 1 day |
| P2-16 | Disable AI features or implement real ML | Dev | varies |
| P2-17 | Biometric attendance integration (ZKTeco API) | Dev | 2 weeks |
| P2-18 | Substitute teacher management module | Dev | 1 week |
| P2-19 | Parent leave request submission | Dev | 3 days |
| P2-20 | Missing person hostel escalation | Dev | 1 day |

### P3 — Within 6 Months (Market Expansion)
*Required for market expansion and investment readiness.*

| ID | Action | Owner | Effort |
|---|---|---|---|
| P3-01 | CMEK for government school market | Dev + GCP | 1 week |
| P3-02 | Regional language support (4+ languages) | Dev + translators | 6 weeks |
| P3-03 | Board exam result import (CBSE/ICSE) | Dev | 1 week |
| P3-04 | IP assignment documentation | Legal | 3 days |
| P3-05 | Trademark registration ("Nexli") | Legal | 6-12 months |
| P3-06 | OASIS TC sync | Dev | 1 week |
| P3-07 | NEP 2020 structure enforcement | Dev | 1 week |
| P3-08 | WhatsApp Business API integration | Dev | 1 week |
| P3-09 | API documentation | Dev | 2 weeks |
| P3-10 | Second developer hire | Business | — |

---

## 32. FINAL LAUNCH READINESS SCORE

### Dimension-by-Dimension Scoring

#### Dimension 1: Security & Data Protection — 2/10

The product has catastrophic security failures across every layer:
- Admin SDK key exposed in working directory (CRIT-01)
- Messaging collections with zero access control (CRIT-02)
- Privilege escalation via self-writable permissions (CRIT-03)
- No App Check, no security headers, no source map protection
- IndexedDB not cleared on logout
- Cross-tenant isolation broken
- 14+ collections under wildcard rules

A score above 2 would require at minimum: no exposed credentials, basic access control on all collections, and security headers. None of these are currently in place.

**Score: 2/10**

---

#### Dimension 2: Legal & Compliance — 1/10

The legal situation is the most severe dimension:
- No Privacy Policy, Terms of Service, or Data Processing Agreement
- DPDP Act violations: no consent gate, no deletion workflow, no breach notification
- POCSO Act risk: no 24-hour SLA enforcement
- RTE Act risk: non-auditable lottery
- Payroll statutory gaps: LOP deduction base, no challan export
- GA4 cross-border data transfer without DPDP compliance
- No DPO designation mechanism

The product cannot legally process a single real student's data today. A score of 1 is warranted because no legal operating framework exists.

**Score: 1/10**

---

#### Dimension 3: Product Completeness — 4/10

The breadth of modules is genuine — 55+ features covering every major school operation. However, the depth has critical gaps:
- No online fee payment (primary ERP selling point)
- No parent notifications (push/SMS/WhatsApp)
- PTM module is a dead nav link
- AI features are hardcoded fake data
- Transport map shows 0 vehicles
- Library fine is never computed
- No staff bulk import
- No Hindi support

The product is 60-70% complete by feature count but 30-40% complete by the definition of "features a school would actually use."

**Score: 4/10**

---

#### Dimension 4: Technical Quality & Architecture — 5/10

The architecture is sound in concept: React 19 + TypeScript strict mode, Tailwind v4, Firebase, PWA with offline capability. The module organization is logical. The type system is properly leveraged. However:
- Only 2 composite indexes for 321+ compound queries
- Unbounded full-collection fetches on core pages
- Race conditions in multiple financial and operational flows
- No CI/CD
- No error boundaries
- No test coverage for financial logic
- `Math.random()` in RTE lottery
- Multiple non-atomic multi-step operations

The code is well-structured but has not been hardened for production.

**Score: 5/10**

---

#### Dimension 5: Scalability & Performance — 2/10

The Firebase Spark quota math is unambiguous: the app exhausts its daily read limit before 9 AM at a 500-student school. This is not a gradual degradation — it is a hard wall that causes total application failure.

Beyond the quota issue:
- No composite indexes = runtime failures at real data volumes
- Security rule reads multiply data read cost by 4×
- `useAllAttendance` is O(sections × days) on every load from 8+ pages
- Payroll and report card generation are sequential loops at O(n) database writes

**Score: 2/10**

---

#### Dimension 6: Operational Readiness — 2/10

- No disaster recovery (RPO = all data)
- No CI/CD pipeline
- No staging environment
- No incident response playbook
- No uptime monitoring
- No error tracking
- No support mechanism for schools
- Manual school provisioning
- Temp passwords via WhatsApp

The product is operated like a personal project, not a B2B SaaS handling children's sensitive data.

**Score: 2/10**

---

#### Dimension 7: Business Viability — 3/10

- ARR: ₹0
- Paying customers: 0
- Revenue mechanism: structurally absent (no payment gateway)
- Subscription enforcement: manual and bypassable
- GST invoicing: absent
- No self-serve trial
- No dunning management
- Single developer, no team, no advisors

The business model is clearly defined and the market is real, which earns the 3. Everything required to execute on the business model is missing.

**Score: 3/10**

---

#### Dimension 8: User Experience & Accessibility — 4/10

Strengths: Visually beautiful, modern design system, mobile-responsive, fast navigation, logical information hierarchy within each module.

Gaps:
- Dark mode only — unusable in outdoor Indian sunlight
- No light mode or outdoor mode
- WCAG AA contrast failures throughout design system (gold on dark = 3.4:1 vs required 4.5:1)
- No skip-to-content link (WCAG 2.4.1 Level A failure)
- `type="number"` on monetary inputs causes Android mis-taps
- No Hindi support
- No parent notification delivery (passive portal only)
- v0.1.0 badge visible to all users

**Score: 4/10**

---

#### Dimension 9: Financial Accuracy & Integrity — 3/10

The fee ledger and payroll engine have genuine functional depth. However:
- `cancelInvoice()` creates ghost credits
- Concurrent concessions produce negative net amounts
- Payslip writable after finalization (fraud vector)
- LOP does not reduce ESI/PT deduction base (statutory over-deduction)
- No Tally export (all transactions must be manually re-entered)
- No refund management
- No GST invoice for Nexli's own billing
- Zero automated test coverage for any financial calculation

A financial accuracy failure in payroll or fee collection at a school is not a "bug report" — it is a legal and contractual dispute.

**Score: 3/10**

---

#### Dimension 10: Market & Competitive Readiness — 3/10

- 0 reference customers
- 0 deployed schools
- No sales team, no marketing, no case studies
- Design differentiator is real but insufficient alone
- Language barrier blocks primary target market
- Dark mode blocks outdoor attendance use case
- Missing 6 of top-10 features that Indian schools evaluate ERPs on

The market opportunity is large and Nexli's design quality is a genuine differentiator. But zero market validation and zero commercial traction cannot be scored higher than 3.

**Score: 3/10**

---

### Composite Score Summary

| Dimension | Score | Weight | Weighted Score |
|---|---|---|---|
| 1. Security & Data Protection | 2/10 | 15% | 0.30 |
| 2. Legal & Compliance | 1/10 | 15% | 0.15 |
| 3. Product Completeness | 4/10 | 10% | 0.40 |
| 4. Technical Quality & Architecture | 5/10 | 10% | 0.50 |
| 5. Scalability & Performance | 2/10 | 10% | 0.20 |
| 6. Operational Readiness | 2/10 | 10% | 0.20 |
| 7. Business Viability | 3/10 | 10% | 0.30 |
| 8. User Experience & Accessibility | 4/10 | 8% | 0.32 |
| 9. Financial Accuracy & Integrity | 3/10 | 7% | 0.21 |
| 10. Market & Competitive Readiness | 3/10 | 5% | 0.15 |
| **COMPOSITE** | | **100%** | **2.73/10** |

**Rounded Composite Score: 2.7/10**

*Note: Previous Phase 3 / 1.md audit scored 3.7/10. This audit scores lower (2.7/10) because this audit is more comprehensive — 150+ professional perspectives across 8 independent sub-agents — and uncovered more severe findings, particularly in security (Admin SDK key), legal (no consent gate), and scalability (Spark quota math). The product has not regressed; the audit has become more rigorous.*

---

### Final Verdict

Nexli is a product with genuine potential and real engineering ambition. The design system is the best in its category. The module coverage is broader than competitors. The TypeScript architecture is modern and thoughtful. In 12-18 months, with a second engineer, legal foundation, and the fixes described in this report, Nexli could be a strong competitor in the Indian K-12 ERP market.

Today, Nexli cannot legally, safely, or reliably serve a single paying school. A Firebase Admin SDK private key with full database access sits in the project directory. Messaging conversations between counselors and principals — including POCSO escalations — are readable by any authenticated user including students and bus drivers. Any user can grant themselves arbitrary permissions by writing a single field to Firestore. The application exhausts its daily database quota before morning attendance is complete. There is no privacy policy, no consent mechanism, no disaster recovery, and no payment gateway. The AI predictions feature that appears in demos consists entirely of hardcoded fake student names. These are not items on a product roadmap. They are barriers to any responsible deployment. The minimum fix list (Tier 0 + Tier 1 in Section 27) requires 6-8 weeks of focused engineering and 2 weeks of legal work before a single real student's data should be loaded into the system.

**Overall Score: 2.7/10 — Not Launch-Ready. Significant remediation required before any school deployment.**

---

*Report generated: 2026-06-19*
*Audit methodology: 8 independent sub-agent audits with 150+ professional role perspectives*
*Codebase analyzed: ~500 source files, ~60,000+ lines of TypeScript*
*This report supersedes Phase 3 / 1.md (Score: 3.7/10)*
