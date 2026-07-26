# NEXLI — Checkpoint 2026-06-13 (Platform Completeness)

Canonical: `context/LATEST_CONTEXT.md`. This pass closes the Super-Admin capability gaps found in the platform audit, **before** P9 hardening. Build green @524 modules; dev boots clean (HTTP 200).

## What was completed (platform completeness, not hardening)

### 1. Subscription expiry + renewal lifecycle
- `SubscriptionStatus` += `'expired'`; `SubscriptionAction` += `'expire'`, `'renew'` (`types/models.ts`).
- `platform/meta.ts`: `SUBSCRIPTION_STATUS_META.expired` + `SUBSCRIPTION_ACTIONS.expire/renew`.
- `platform/data.ts`: `ACTION_TO_STATUS` (expire→expired, renew→active); `applySubscriptionAction` handles `renew` (extends `renewalDate` by one cycle via `nextRenewalDate`) and clears `deletedAt` on activate/resume/renew. New **`effectiveSubscriptionStatus(school)`** derives `expired` when `renewalDate`/`trialEndsAt` has lapsed (display + actions everywhere). New **`sweepExpiredSubscriptions(schools, actor)`** = free-tier billing job: persists `expired` for lapsed active/trial schools, run once when the Super Admin opens the dashboard.
- UI: `SchoolDetailPage` (effective badge + actions incl. renew/expire + "term lapsed" note), `SchoolsListPage` (Expired filter + effective badge), `AnalyticsPage` + `PlatformDashboard` (effective status in distributions + sweep on load).

### 2. School administrator lifecycle management
- New **`ManageAdminPanel.tsx`** on the school detail page (replaces the read-only admin block): **Provision login** (when none/failed at onboarding), **Reset password** (emails the admin via `sendStaffPasswordReset`), **Edit details**, **Replace admin**. Generates a temp password with regenerate.
- `platform/data.ts` helpers: `provisionSchoolAdmin` (creates the auth account via `provisionStaffMember` and **writes `adminUid` back**), `saveSchoolAdminDetails`, `resetSchoolAdminPassword`, `setSchoolAdminStatus` (suspend/reactivate member).
- `SchoolWizard` now **writes `adminUid` back** to the school after onboarding provisioning succeeds.

### 3. School usage tracking (free-tier, no Cloud Functions)
- `firestore.rules`: the `schools/{id}` update rule now lets **any active member write ONLY the telemetry fields** (`studentCount`, `staffCount`, `lastActiveAt`, `lastModifiedAt/By`) via `affectedKeys().hasOnly(...)`; full edits stay super-admin/leadership-only.
- New **`lib/usage.ts`** `touchSchoolUsage(schoolId, patch)` (best-effort, never throws) + `USAGE_HEARTBEAT_MS`.
- `AppLayout`: throttled `lastActiveAt` heartbeat (once/hour) for school sessions.
- `StaffDashboard`: recomputes `studentCount` (active) + `staffCount` from already-loaded data and writes when changed. So the platform's denormalized counts + last-active are now populated by real tenant activity.

### 4. School statistics completion
- `AnalyticsPage`: student/staff totals now live (via #3); added **estimated MRR / ARR / avg-revenue-per-school** computed from active schools × their plan price (monthly, or annual/12), with an honest note that precise billed revenue/churn still needs a billing event stream. Status distributions use `effectiveSubscriptionStatus`.

## Build/verify
- `tsc --noEmit` clean; `npm run build` green @524 modules; dev HTTP 200.
- Rules change is additive + safe (telemetry-only member writes) but, like the rest of `firestore.rules`, **still pending deploy** (owner `firebase login`).

## Known platform items still REMAINING (reported in the updated audit; not in the 4 named gaps)
- **School impersonation / "view as"** (§12.7, ~10%) — start/end audited session UI exists in the data model (`impersonation_sessions`, rules) but the session-scoping flow is not wired. Deferred (session-core change; flagged for review).
- **Subscription-status enforcement on tenants** — suspend/pause/expired now settable + shown, but not yet ENFORCED on the school app (login block / read-only). This is tenant-side gating that belongs to the **security/hardening** phase (the user deferred that).
- **School data export + permanent purge** — the terminate copy references a data export + post-retention purge; neither is built (purge needs a Cloud Function / Blaze).
- **Rules deploy** — `firestore.rules` (incl. the new telemetry rule) not yet deployed.

## Next
Owner reviews + tests the app. Then P9 — Hardening: tenant-side subscription enforcement, rules tightening (iep/therapy/consent/payroll restricts + deploy), 9-width screenshot QA, a11y/perf, PWA icons; optionally impersonation + data export.
