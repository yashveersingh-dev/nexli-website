# NEXLI — Launch Runbook (owner-only operations)

This is the **operations checklist for the paid / external / console-only items the
code has deliberately stubbed**. The application is built so each item is a clean
*seam*: it is a no-op until you supply a key or flip a switch, so nothing below can
break local dev or an unconfigured build. Every step here is something only the
project owner (Yashveer) can do — it needs billing, console access, or a third-party
account.

- **Firebase project id:** `nexli-erp` (see `Web/.firebaserc`).
- **Region:** Firestore is in an India region (DPDP data-residency requirement).
- **Do this roughly in order.** §1–§4 are launch-blocking; §5–§7 are strongly
  recommended before onboarding real schools; §8 is decisions still owed.

> Convention: replace `nexli-erp` and bucket names with your real values. Shell
> commands assume the [gcloud CLI](https://cloud.google.com/sdk/docs/install) and
> [Firebase CLI](https://firebase.google.com/docs/cli) are installed and you have
> run `gcloud auth login` and `firebase login`.

---

## 1. Rotate the Firebase Admin service-account key  (do FIRST)

The Admin SDK private key (used by `Web/scripts/*.mjs` bootstrap/seed) grants full
project access. Rotate it before launch and any time it may have been exposed. The
key file is already gitignored (`*firebase-adminsdk*.json`, `serviceAccount*.json` —
see `Web/.gitignore`) so it is never committed, but the file on disk must still be a
freshly issued one.

1. Firebase Console → **Project settings → Service accounts** tab.
2. Click **Generate new private key** → **Generate key**. A JSON file downloads.
3. Save it **outside the repo** (or at a gitignored path) and point your local env at
   it — e.g. `export GOOGLE_APPLICATION_CREDENTIALS=/secure/path/nexli-erp-adminsdk.json`
   (or whatever path `Web/scripts/bootstrap.mjs` expects).
4. **Delete the old key:** same screen → *Manage service account permissions* opens
   the Google Cloud console → **IAM & Admin → Service Accounts →**
   `firebase-adminsdk-...@nexli-erp.iam.gserviceaccount.com` → **Keys** tab → delete
   the previous key id.
5. Confirm the old key is dead: re-run `npm run bootstrap` (or any admin script) with
   only the new key present and verify it still works; with the old file it must fail.

**Never** paste this JSON into client code, CI logs, or `.env` files that ship to the
browser. It is server-only.

---

## 2. Upgrade Firebase Spark → Blaze + set a billing budget

The app currently targets the **Spark (free)** tier. Several launch items require
**Blaze (pay-as-you-go)**:

- **App Check** enforcement (§4) and **scheduled / managed backups** (§3) are
  Blaze-only.
- Spark has hard **daily caps** (e.g. 50k document reads/day) that a single active
  school will blow through; on Spark, hitting the cap returns errors until midnight
  PT — unacceptable for a production ERP.
- Cloud Scheduler + Firestore export (§3) bill on Blaze.

Steps:

1. Firebase Console → **⚙ → Usage and billing → Details & settings → Modify plan →
   Blaze**. Attach (or create) a Google Cloud billing account.
2. **Set budget alerts so Blaze can't surprise you.** Google Cloud Console →
   **Billing → Budgets & alerts → Create budget**, scoped to the `nexli-erp` project:
   - Suggested thresholds for a small pilot (tune to your scale, in ₹):
     - Budget amount: **₹2,000 / month** to start.
     - Alert thresholds: **50% (₹1,000), 90% (₹1,800), 100% (₹2,000), 120% (₹2,400)**.
   - Add your email (and any co-owner) as recipients. Budgets **alert**, they do not
     auto-stop spend — treat 100% as "investigate today".
3. Keep Firestore in the India region; verify you are not accidentally provisioning
   resources in a US region (egress/data-residency).

---

## 3. Daily Firestore backup to Google Cloud Storage

Automated, off-site backups (disaster recovery / accidental-delete protection).
Requires Blaze (§2).

### One-time bucket setup
```bash
# A dedicated, region-matched bucket (use your Firestore region, e.g. asia-south1).
gsutil mb -p nexli-erp -l asia-south1 gs://nexli-erp-backups

# Lifecycle: auto-delete exports older than 30 days (cost control).
cat > /tmp/lifecycle.json <<'JSON'
{ "rule": [ { "action": {"type": "Delete"}, "condition": {"age": 30} } ] }
JSON
gsutil lifecycle set /tmp/lifecycle.json gs://nexli-erp-backups

# Let the Firestore service agent write to the bucket.
PROJECT_NUMBER=$(gcloud projects describe nexli-erp --format='value(projectNumber)')
gsutil iam ch \
  serviceAccount:service-${PROJECT_NUMBER}@gcp-sa-firestore.iam.gserviceaccount.com:roles/storage.admin \
  gs://nexli-erp-backups
```

### Manual export (verify it works before scheduling)
```bash
gcloud firestore export gs://nexli-erp-backups/$(date +%Y-%m-%d) --project=nexli-erp
```

### Schedule it daily (Cloud Scheduler → Firestore export)
The portable approach is a Cloud Scheduler HTTP job hitting the Firestore
`exportDocuments` REST endpoint with an OAuth token from a backup service account.

```bash
gcloud services enable cloudscheduler.googleapis.com firestore.googleapis.com --project=nexli-erp

# Service account the scheduler runs as, with export rights.
gcloud iam service-accounts create firestore-backup --project=nexli-erp \
  --display-name="Firestore scheduled backup"
gcloud projects add-iam-policy-binding nexli-erp \
  --member="serviceAccount:firestore-backup@nexli-erp.iam.gserviceaccount.com" \
  --role="roles/datastore.importExportAdmin"

# Daily 02:00 IST job. {bucket} path is timestamped by Scheduler's templating.
gcloud scheduler jobs create http nexli-firestore-daily-backup \
  --project=nexli-erp --location=asia-south1 \
  --schedule="0 2 * * *" --time-zone="Asia/Kolkata" \
  --uri="https://firestore.googleapis.com/v1/projects/nexli-erp/databases/(default):exportDocuments" \
  --http-method=POST \
  --oauth-service-account-email="firestore-backup@nexli-erp.iam.gserviceaccount.com" \
  --headers="Content-Type=application/json" \
  --message-body='{"outputUriPrefix":"gs://nexli-erp-backups/scheduled"}'
```

> Alternative: Firestore Console → **Backups** offers managed scheduled backups with
> a retention window (also Blaze). Either is fine; pick one and document which.
> **Test a restore** at least once: `gcloud firestore import gs://nexli-erp-backups/<path>`
> into a throwaway project. An untested backup is not a backup.

---

## 4. Enable App Check (reCAPTCHA v3)

App Check attests that Firestore/Auth traffic comes from *your* app, not a stolen Web
API key. **Code seam:** `Web/src/lib/firebase.ts` already initializes App Check **only
when** `VITE_RECAPTCHA_SITE_KEY` is set (see the `initializeAppCheck(...)` block). It
is a no-op without a key, so this is purely an ops + console task.

1. Create a reCAPTCHA v3 site key for your hosting domain(s):
   [Google reCAPTCHA admin](https://www.google.com/recaptcha/admin) → register a
   **v3** site → add `nexli-erp.web.app`, `nexli-erp.firebaseapp.com`, and your custom
   domain → copy the **site key** (public).
2. Put it in the build env: set `VITE_RECAPTCHA_SITE_KEY=<site key>` in `Web/.env`
   (it is documented in `Web/.env.example`). Rebuild/redeploy so the client embeds it.
3. Firebase Console → **App Check** → register the **Web app** with the **reCAPTCHA
   v3** provider, pasting the matching **secret** key.
4. **Enforce gradually:** App Check → *APIs* → enable enforcement for **Cloud
   Firestore** and **Authentication**. Watch the "verified vs. unverified requests"
   metrics for a day or two *before* turning enforcement fully on, so legitimate
   traffic isn't blocked. Until enforcement is enabled this is a no-op.
5. CSP note: the reCAPTCHA script loads from Google. If you see CSP violations after
   enabling, the hosting CSP (`Web/firebase.json`, §6) may need
   `https://www.google.com` / `https://www.gstatic.com` added to `script-src` /
   `frame-src`. Verify against the console (§6).

---

## 5. Error monitoring (Sentry or equivalent)

**Code seam:** `Web/src/lib/monitoring.ts` exposes `captureException` /
`captureMessage` that are **no-ops unless `VITE_SENTRY_DSN` is set**. The SDK is
intentionally *not* imported (so the bundle stays clean until you opt in).

1. Create a project at [sentry.io](https://sentry.io) (free tier is fine to start) →
   platform **React** → copy the **DSN**.
2. `cd Web && npm i @sentry/react` (add the real dependency).
3. Set `VITE_SENTRY_DSN=<dsn>` in `Web/.env` (documented in `Web/.env.example`).
4. Wire `Web/src/lib/monitoring.ts`: replace the `TODO(NEEDS YASHVEER)` blocks with
   the real calls and initialise once at startup —
   ```ts
   import * as Sentry from '@sentry/react';
   if (DSN) Sentry.init({ dsn: DSN, tracesSampleRate: 0.1 });
   // captureException(error, ctx) -> Sentry.captureException(error, { extra: ctx });
   // captureMessage(msg, ctx, level) -> Sentry.captureMessage(msg, { level, extra: ctx });
   ```
   `Sentry.init` belongs near app bootstrap (e.g. `Web/src/main.tsx`); the existing
   error boundary already calls `captureException`, so once wired it reports for real.
5. **CSP:** add the Sentry ingest host to `connect-src` in `Web/firebase.json` (e.g.
   `https://*.ingest.sentry.io` / `https://*.ingest.de.sentry.io`) or events will be
   blocked by the CSP. Redeploy and confirm an event arrives (Sentry → Issues).

---

## 6. Post-deploy CSP verification

`Web/firebase.json` ships a strict `Content-Security-Policy` (no `unsafe-eval`,
`object-src 'none'`, `frame-ancestors 'none'`, an allowlisted `connect-src`, etc.).
After **every** deploy that changes third-party usage:

1. Open the deployed site, DevTools → **Console**, and click through the major flows
   (login, dashboard, fees, payroll, reports, maps/transport).
2. Treat any `Refused to … because it violates the Content Security Policy directive`
   as a release blocker — either remove the offending external call or add the host to
   the **correct** directive (`connect-src` for XHR/fetch/websocket, `script-src` for
   scripts, `img-src` for images, `frame-src` for iframes). Keep the allowlist tight.
3. Known external surfaces already allowed: Google APIs / Firestore / Identity Toolkit
   / Secure Token (`connect-src`), OpenStreetMap tiles (`img-src`). New integrations
   (App Check §4, Sentry §5, payments §8) each need their host added here.
4. Re-verify the security headers after deploy (e.g.
   `curl -sI https://nexli-erp.web.app | grep -i content-security-policy`) to confirm
   Hosting is actually serving them.

---

## 7. Pre-launch smoke checklist

- [ ] `cd Web && npm ci && npm run typecheck && npm test && npm run build` is green
      (this is exactly what CI `.github/workflows/ci.yml` enforces).
- [ ] `npm run test:rules` passes against the Firestore emulator (rules job in CI).
- [ ] Service-account key rotated (§1); old key deleted.
- [ ] Blaze enabled + budget alerts live (§2).
- [ ] First Firestore backup exported **and** a test restore done (§3).
- [ ] App Check key set; enforcement observed then enabled (§4).
- [ ] Sentry DSN set, SDK wired, a test event received (§5).
- [ ] CSP clean on the deployed site across all major flows (§6).

---

## 8. Decisions still owed (product / legal — your call)

These aren't code bugs; they're choices the build is waiting on. Each has a clean
seam already in place.

- **AI "Coming Soon" — delete vs. keep.** The `ai` feature flag defaults **OFF**
  (`Web/src/lib/featureFlags.ts`, marked `premium` + `externalIntegration`) and AI
  surfaces sit behind an `AILockedOverlay`. Decide whether to (a) keep the locked
  "Coming Soon" affordances as a roadmap signal, or (b) hide them entirely until an
  LLM provider + budget is chosen. No model/provider is wired today — picking one is a
  separate, costed project.
- **Google Analytics — remove vs. keep.** **None is currently wired.** There is no
  `getAnalytics()` / `gtag` in the app; `VITE_FIREBASE_MEASUREMENT_ID` exists in the
  Firebase config object but is unused at runtime. Decide explicitly: either leave it
  absent (privacy-friendly, simplest under DPDP), or, if you want product analytics,
  choose a tool, wire it, **and** add its host to the CSP `connect-src` + update the
  privacy policy + parent-consent docs (§8 legal).
- **Payment gateway (Razorpay) for fee collection.** The `online_payments` flag is
  OFF; fee collection is **manual** today (UPI QR + bank transfer, recorded by hand —
  see `Web/src/types/finance.ts`). To go live with online fees: create a Razorpay
  account + KYC, wire create-order/verify-signature (server-side — a Cloud Function on
  Blaze, never client-side secret), add Razorpay hosts to the CSP, and turn on the
  flag. This is a costed integration with settlement/refund/reconciliation flows.
- **Parent-notification provider (SMS / WhatsApp / FCM push).** Flags `sms`,
  `whatsapp`, `push_notifications` are OFF (`externalIntegration`). Choose providers
  (e.g. an SMS gateway / WhatsApp Business API / Firebase Cloud Messaging for web
  push), provision accounts + sender IDs / templates (WhatsApp templates need Meta
  approval; SMS sender IDs need DLT registration in India), wire the senders, then
  enable the flags. Each needs its endpoint host in the CSP `connect-src`.
- **CBSE Transfer Certificate — Appendix-V field set.** The TC generator should match
  the official **CBSE Appendix-V** TC field list (admission/withdrawal dates, last
  exam & result, working days, fees-clearance, conduct, etc.). Confirm the exact
  current Appendix-V schema with CBSE and reconcile the generated TC against it before
  issuing real certificates.
- **Legal review of the drafted `legal/` docs.** `legal/PrivacyPolicy.md`,
  `legal/TermsOfService.md`, `legal/DataProcessingAgreement.md`, and
  `legal/ParentConsent.md` are **drafts**. Have an Indian lawyer review them for DPDP
  Act 2023 compliance (children's data / verifiable parental consent, data-fiduciary
  obligations, breach notification) and your commercial terms **before** onboarding
  paying schools or collecting any student/parent data. Update them if you add
  analytics or third-party processors (above).
```
