# NEXLI — Billing & Pricing Review (code vs. the new size-based rule)

**Date:** 2026-06-16
**Scope:** Read-only review of the current code against the confirmed pricing rule (charge by student-count band; all features on every plan; AI a separate paid add-on; founding schools get a custom price). **No billing/plan/pricing/permission code was changed** — this is a report. The two plan documents *were* updated (Part 1).

---

## Verdict in one paragraph

The good news: the running app **does not lock features behind plans** — feature availability is driven entirely by feature flags, and the plan a school is on has no effect on what works. The hard news: the app **does not yet price by student-count bands at all.** Today a school is put on one of four flat-priced tiers (Starter/Growth/Professional/Enterprise) by hand, and the student count is shown but never drives the price. There is **no** band model, **no** automatic band-crossing, **no** custom/founding price, and **no** real billing/payment system (fees are manual/offline). The student count that *would* feed size-based billing is also **inflated by students who left**, because issuing a Transfer Certificate never marks the student as gone. So: features are already "unlocked" the way you want, but the whole **size-based pricing engine still has to be built**.

---

## What needs work — most important first (with effort)

1. **Build the size-band pricing engine** (covers Q2 + Q4). Define the bands, a price per band, and derive a school's band automatically from its live *active* student count. **Effort: LARGE.** This is the heart of the new model and doesn't exist today.
2. **Remove the leftover "features per plan" scaffolding** (Q1) so plans genuinely carry no features. **Effort: SMALL (~half day).** Quick, and required by the rule.
3. **Add a per-school custom/founding price** (Q5). **Effort: SMALL (~½–1 day).** You need this now for your first 5 schools.
4. **Stop counting students who left** — flip a student's status when a TC is issued / they graduate, so the billable count is correct (Q3). **Effort: SMALL–MEDIUM.** Directly affects the bill amount.
5. **Model AI as a separate paid add-on** with its own price/billing line (Q6). The on/off switch already exists and is correctly separate from the plan; the *billing* part is missing. **Effort: SMALL–MEDIUM.** Future.
6. **(Context, larger/later)** There is **no billing or payment system yet** — fees are recorded manually/offline (no gateway). True part-period **proration** and automatic charging when a school crosses a band (part of Q4) will need a real billing/payment integration (likely the paid Blaze tier + a gateway). **Effort: LARGE, later.**

---

## Answers to your six questions

### 1. Does any feature get locked or hidden based on which plan a school is on?
**Functionally, no — and that already matches your new rule.** What a school can use is decided by **feature flags**, resolved as `DEFAULT ◀ global ◀ per-school` (`Web/src/lib/featureFlags.ts:62`). **The plan is not part of that resolution at all.** New schools get their module switches from a fixed default map (`SchoolWizard` → `initialState().modules = defaultModuleMap()`, `Web/src/features/platform/schools/SchoolWizard.tsx:80`), **not** from the chosen plan. So moving a school between plans changes nothing about its features.

**But there is leftover "features-per-plan" scaffolding that contradicts the rule and should be removed** (it's not wired to actually block anything today, but it strongly implies plans bundle different features, and someone could wire it up):
- `Plan.includedModules: string[]` — the data field that lists "which modules this plan includes" (`Web/src/types/models.ts:130`).
- The plan editor has a **module picker** for that field — `Web/src/features/platform/plans/PlanEditPage.tsx:177` (`<ModulePicker name="includedModules" />`), plus `planSchema.ts:24,53,79`.
- The plan cards **display per-plan modules** — `Web/src/features/platform/plans/PlansListPage.tsx:186`.
- Misleading wording: the "Activate" action says *"all modules enabled per plan"* — `Web/src/features/platform/meta.ts:29`.

**Effort to remove: SMALL (~half day)** — delete the field + the picker + the plan-card module list, and reword that one line.

### 2. How does the app decide a school's price right now?
**By a hand-picked plan tier with a flat price — not by student count or bands.** The seeded plans (`Web/src/features/platform/meta.ts:78–81`) are:

| Plan | Flat price/mo | "studentLimit" shown |
|---|---|---|
| Starter | ₹4,999 | 500 |
| Growth | ₹9,999 | 1,500 |
| Professional | ₹19,999 | 4,000 |
| Enterprise | ₹0 (custom) | 0 / unlimited |

Each plan carries a `studentLimit`, but that number is only **marketing text** ("Up to N students", `SchoolWizard.tsx:361`) — it does **not** set the price and is **not enforced** anywhere. Revenue (MRR) is just the sum of each active school's **assigned plan's flat price** (`Web/src/features/platform/analytics/AnalyticsPage.tsx:33–48` and `SubscriptionsOverviewPage.tsx:29–39, 66–78`, both via `resolveSchoolPlan`). The school's **actual student count is displayed but never used to compute price.**

So compared to your rule (≈9 bands, price auto-set from live count), the current model is 4 coarse hand-assigned tiers with flat prices. **Effort to convert: MEDIUM–LARGE.**

### 3. When the app counts a school's students for pricing, does it count only real, currently-enrolled students? Do leavers still get counted?
**The counting logic *does* filter to active students — but leavers are never marked inactive, so they still get counted.** Here's the chain:
- The billable count is `school.studentCount`, recomputed as **active-only**: `students.filter(s => s.status === 'active').length` (`Web/src/features/dashboards/StaffDashboard.tsx:51`), then written to the school record (`StaffDashboard.tsx:155` via `touchSchoolUsage`, `Web/src/lib/usage.ts`).
- The data model even has proper "left" statuses: `StudentStatus = 'active' | 'inactive' | 'transferred' | 'graduated' | 'left'` (`Web/src/types/sis.ts:6`).
- **The problem:** issuing a Transfer Certificate updates only the TC document — `updateTC(..., { status: 'issued', ... })` (`Web/src/features/students/tc/TCDetailPage.tsx:53`) — and **never calls `updateStudent`**, so the student stays `status: 'active'` forever. There's no graduation/rollover step either. So a student who has left **keeps being counted**, which (under size-based billing) **would inflate both the count and the bill.** The audit's finding is confirmed.
- Two extra cautions for billing: the count only refreshes when a staff member/principal happens to open the dashboard (it's not an always-current figure), and it's a client-written "telemetry" field, so it isn't a trustworthy billing source on its own.

**Effort: SMALL** to set the student's status to `transferred`/`left` when a TC is issued (and on graduation). **MEDIUM** to make the billable count an authoritative, always-current, server-verified number.

### 4. What happens when a school grows past a band line (e.g. 480 → 520)? Does it move bands and handle the part-period money?
**Nothing happens — none of this exists today.** There is no live-count→band mapping, no automatic price change when a school crosses a threshold, and no proration. The `studentLimit` isn't even enforced (you can add unlimited students on Starter — there's no guard in student creation or anywhere). A school's price changes **only if the Super Admin manually moves it to a different plan.** On top of that, there is **no billing or payment system at all** yet — fees are recorded manually/offline (no gateway, per the audit) — so "the money for the part-period" has nothing to run on.

**Effort: MEDIUM–LARGE** for auto-band-assignment from the live count (depends on #1 of the priority list). **The proration/auto-charge part is LARGE and later**, because it needs a real billing/payment integration that doesn't exist yet.

### 5. Is there already a way to give one specific school a custom price (founding schools)?
**No — it's missing.** A school is linked to a shared catalogue plan via `plan` / `planId` (`Web/src/types/models.ts`), but there is **no per-school price field** anywhere — nothing to override the band/plan price for one specific school. (The "Enterprise" template is priced `0`/"custom", but that's a shared plan, not a price attached to an individual school.) So today you cannot give your 5 founding schools a special price.

**Effort: SMALL (~½–1 day)** — add an optional custom-price field (e.g. `customPriceMonthly` / `customPriceAnnual`, or a small `billingOverride` object) on the School record, expose it in the onboarding wizard / school-edit screen, and make price resolution prefer it over the band price.

### 6. Is there a separate on/off switch for paid AI add-on features, kept apart from the size plan?
**The on/off switch exists and is correctly separate from the plan — but it is not yet modeled as a *paid add-on*.**
- The switch: feature flag **`ai`** (`Web/src/lib/featureFlags.ts:37`, marked `premium` + `externalIntegration`, default **off**), resolved per-school/global **independently of the plan**. The whole app already hides AI behind it (`AILockedOverlay` + `useFlag('ai')`). So "kept apart from the size plan" ✔.
- What's missing: there's **no billing concept** for it — no AI price, no separate billing line, no "AI add-on active/inactive" on the subscription record. So you can switch AI on, but you can't yet *charge separately* for it.

**Effort: SMALL–MEDIUM** — add an AI add-on price and an AI-add-on billing flag on the subscription/school record (the actual charging waits on the billing engine from #1/#6 above).

---

## Notes
- **Nothing above has been changed in code.** When you approve, I'd suggest doing the SMALL items (remove feature-matrix scaffolding, custom price, TC-marks-student-left) first as quick wins, then the LARGE band-pricing engine, with real proration/auto-charge last (it depends on adding a billing/payment system that doesn't exist today).
- **Doc housekeeping I noticed:** there are **two copies** of `NEXLI_MASTER_SPECIFICATION.md` (one at the repo root, one inside `Web/`). I updated **both** so they agree, but keeping two copies will keep causing drift — consider deleting one and pointing to the other.
