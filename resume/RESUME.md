# NEXLI — Resume (where we are, what's next)

_Zero-context handoff: a brand-new session can read this top-to-bottom and pick up exactly where things stand. For "what Nexli is," read `context/CONTEXT.md`. For the full change log, read `BUILD_PROGRESS.md`. For the owner action list, read `docs/LAUNCH_RUNBOOK.md`._

_Last updated: 2026-06-19, after the pre-launch audit remediation + code-ceiling polish pass._

---

## Current state (in short)
Nexli is a **built, working, multi-tenant school ERP** (installable PWA) — React 19 + TypeScript (strict) + Vite 6 + Tailwind v4 + Firebase (Auth + Firestore), on the **free Spark tier**. The app at `Web/` compiles clean and is green on every gate:

- **`tsc --noEmit` → 0 errors** · **`vite build` → OK** · **`npm test` (Vitest) → 234/234** · **Firestore rules emulator → 249/0**.

Two formal pre-launch audits (`docs/archive/audits/phase3-audit-1.md` = 3.7/10, `docs/archive/audits/phase3-audit-2.md` = 2.7/10) were **systematically remediated** over three rounds, then a final code-polish pass. Self-assessed launch-readiness moved **2.7 → ~6.9/10**, which is at/near the **honest code ceiling (~7.5)** — the remaining gap to 10 is **owner-only external actions**, not unwritten code (see "Pending" below).

**The product is now safe to demo and architecturally close to pilot-ready; the blockers left are external (Blaze, payment gateway, key rotation, legal review), captured in `docs/LAUNCH_RUNBOOK.md`.**

## What was done in the remediation (high level — see BUILD_PROGRESS.md for detail)
- **Security & rules:** closed privilege-escalation (`grantedPermissions` self-write), the messaging/POCSO read leak (`conversations`/`messages` now participant-only), cross-tenant `userIndex` write, and ~19 unguarded collections; CSP/HSTS/security headers; `sourcemap:false`; App Check seam (env-gated); clear IndexedDB on logout; crypto OTP; certificate XSS; per-counselor counseling scoping; parent-write rules with field-pinning; `fee_refunds` gated. Rules tests **145 → 249**.
- **Legal/compliance:** India-specific **DRAFT** legal docs in `legal/` (Privacy Policy, ToS, DPA, Parent Consent — DPDP/POCSO/RTE/CBSE aware, lawyer review pending); POCSO 24-hour reporting SLA + atomic case numbers; DPDP **consent gate now hard-blocks** processing of an active student without recorded consent; data-erasure + breach-notification registers.
- **Data integrity / money:** atomic counters (admission/TC/POCSO), atomic admit, RTE lottery (CSPRNG + batch), hostel/canteen/payroll/concession/refund all transactional; payslip locked after finalization; LOP recomputes ESI/PT; `cancelInvoice`/overpayment guarded; Tally XML + EPF/ESI/TDS exports; GST tax-invoice generation.
- **Product honesty:** removed all fabricated AI data → honest "Coming Soon"; real library fine computation; transport map honest empty state; append-only backup log.
- **Performance:** scoped the big unbounded reads (attendance, invoices) to windows/filters; composite indexes added.
- **Features built (pure-code):** board-exam import + viewer, substitute-teacher conflict-check, staff CSV import, parent leave requests, PTM scheduling (transactional booking), UDISE+ infrastructure fields, CBSE TC Appendix-V, refunds + reconciliation, GST-seller & library fine-rate config, IEP progress-log.
- **UX/infra:** route-level error boundaries + monitoring seam; WCAG contrast fix; light/outdoor theme (toggle + tokens; shell done); session-context split; `/healthz`; Hindi i18n infra + shell wiring; **74 → 234 Vitest tests**; **GitHub Actions CI**; `docs/LAUNCH_RUNBOOK.md`.

## ⛔ Pending — NEEDS YASHVEER (external accounts / paid services / decisions / human review)
**These are the real launch blockers now. None are code I can write. Full step-by-step in `docs/LAUNCH_RUNBOOK.md`.**
1. **Rotate the Firebase Admin service-account key** (`Web/serviceAccount.json` — gitignored & untracked, but a key existed on disk). Firebase Console → generate new, delete old.
2. **Upgrade Firebase Spark → Blaze** + set ₹ budget alerts. (Spark's daily read cap is a hard wall; App Check enforcement + scheduled backups need Blaze.)
3. **App Check** — create a reCAPTCHA v3 site key → set `VITE_RECAPTCHA_SITE_KEY` → enforce in Console. (Code seam ready in `src/lib/firebase.ts`.)
4. **Sentry (or equivalent) DSN** → set `VITE_SENTRY_DSN` + `npm i @sentry/react`. (Seam ready in `src/lib/monitoring.ts`.)
5. **Payment gateway (Razorpay)** for online fee collection — the #1 commercial feature; no code can collect money without it.
6. **Parent-notification provider** (FCM / SMS like MSG91 / WhatsApp Business) — account + keys.
7. **Lawyer review** of the four `legal/` drafts + appoint a **DPO**; fill the GST seller GSTIN and verify the CBSE TC Appendix-V field labels.
8. **Daily Firestore backup to GCS** (needs Blaze; `gcloud` commands in the runbook) and **budget alerts**.
9. **CA/auditor sign-off** on the payroll (PF/ESI/TDS) and GST calculations.

## 🟡 Remaining pure-code headroom (optional, large/mechanical — NOT done)
Everything specifically requested is done; these are the two big sweeps that would push UX from ~7.5 toward its 9.0 code-ceiling but are substantial mechanical jobs, not "polish":
- **Full light-mode hex cleanup across all ~55 feature CSS files** (shell + shared components are done; per-feature hardcoded hex still won't fully adapt in light mode — dark is unchanged/default so nothing is broken).
- **Full i18n string extraction across all modules** (i18next infra + shell/nav are wired with EN + accurate Hindi; per-feature UI strings + ~100 nav labels still need extraction to `t()` keys, and **professional Hindi translation is external**).

## ➡️ Next phase (per owner)
**Build the dedicated Nexli marketing website.** Deliberately OUT of scope for the app and skipped here: public API documentation, the public-facing Privacy/Terms page (the `legal/` drafts feed it later), and a self-serve trial signup flow. (A blog knowledge base is already being scaffolded under `Web/Blog/` by a separate process — leave it alone.)

## How to run, test, verify
- **Run the app:** in `Web/` → `npm run dev` → open the printed URL (usually http://localhost:5173/). Theme toggle + EN/हिंदी toggle are in the account sheet. Health check: `/healthz`.
- **Build (typecheck + prod):** `npm run build` (exit 0 = green).
- **Unit tests:** `npm test` (Vitest, 234 tests). Watch mode: `npm run test:watch`.
- **Firestore rules tests:** `npm run test:rules` — **requires JDK 21+**. The system default Java is 1.8 (too old for firebase-tools 15); use the Android Studio JBR:
  ```
  cd Web && JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" PATH="$JAVA_HOME/bin:$PATH" npm run test:rules
  ```
  Expect `PASS: 249  FAIL: 0`.
- **Demo accounts:** `NEXLI_TEST_PLAN.md` (root) — ~930 seeded accounts, shared password. **Never touch the owner Super Admin `yashveersr4@gmail.com` or the demo/seed data.**
- **Spark quota note:** heavy click-through can hit the free daily limit (looks like errors, isn't a bug) — test in batches, or do task #2 above (Blaze).

## Key docs map
- `README.md` — top-level **folder map + doc index** (start here for navigation).
- `docs/LAUNCH_RUNBOOK.md` — **owner action runbook** for every external item above (exact steps/commands).
- `BUILD_PROGRESS.md` — full dated change log (the remediation rounds are the last three sections).
- `legal/` — the four DRAFT legal documents (lawyer-review banner at the top of each).
- `docs/archive/audits/phase3-audit-1.md`, `phase3-audit-2.md` — the original audit reports that drove all of this.
- `NEXLI_PRICING.md` — finalized pricing (reference; the GST invoice generator pulls amounts from subscription data, not from here).
- `.github/workflows/ci.yml` — CI (typecheck → vitest → build; separate JDK-21 rules-test job). Activates on push once the repo is on GitHub Actions.
