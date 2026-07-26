# NEXLI — FIREBASE SETUP (required before implementation)

This is the exact backend configuration NEXLI needs. The spec (§14) makes Firebase + ImageKit **binding architectural decisions**, so this is not optional or open-ended. Follow the steps, then give me the items in **§7 "What I need from you."** I will not write application code until this is approved and the core credentials are in place.

---

## 0. ADDENDUM — CONFIRMED FREE-TIER OPERATING MODE (approved 2026-06-06)

> Build is **approved and underway**. The sections below (Blaze, MFA, etc.) describe the *full* target; this addendum records the **confirmed free-tier-first reality** for the initial build. Everything paid is architected-for but **not required now**.

- **Project:** `nexli-erp` · **Firestore region:** India (user-selected) — **confirmed**.
  - *Region clarification:* the Firestore region is **data residency + best in-region latency only**. It does **not** restrict who can use the app. Schools in **Mumbai, Delhi, Bangalore, Chennai, Hyderabad, Pune, anywhere in India (or abroad)** all work normally. `asia-south1` (Mumbai) gives the lowest latency across India.
- **Plan: Spark (free).** No Blaze now. Stay within free quotas; upgrade to Blaze later for scale + advanced features.
- **Auth:** Email/Password (staff) + **Phone OTP (parents)** enabled. **SMS MFA NOT enabled** (paid) — architecture is MFA-ready; enable later with zero redesign. No Identity Platform upgrade required now.
- **RBAC without custom claims (free-tier):** custom claims require server-side (Admin SDK/Functions). For now, role/`schoolId`/scope/permissions live in a **protected Firestore profile doc** (`/userIndex/{uid}` + `/schools/{id}/members/{uid}`) that the user **cannot self-edit**, and **Firestore security rules enforce RBAC + tenant isolation via `get()` lookups**. Custom-claims mirroring becomes a later Cloud Functions performance optimization. Multi-tenant isolation is fully enforced at the rules layer either way.
- **Cloud Functions: none deployed now.** Clean integration points + local Admin scripts (run with your CLI login) for bootstrapping. Deferred to Functions later: claims mirroring, secure admin password reset, account disable on subscription suspend, bulk-import processing, scheduled jobs (fee/compliance reminders), emergency fan-out, ImageKit upload signing, UDISE+ compile, AI batch.
- **User provisioning (free-tier):** authorized staff create accounts via the **secondary Firebase Auth app instance** pattern (creates the account + sets initial password **without** logging the admin out). Parents use **phone OTP → no password**.
- **Password policy (your requirement):** students & parents **cannot** change their own passwords. Only authorized roles (**School Coordinator, Computer Science HOD, School Administrator, Principal, IT Admin**) hold the `user.password.manage` permission. Parents have no password (OTP). Student password reset = local Admin script now → Cloud Function later.
- **Payments (your requirement): NO gateway.** Schools upload **QR code image(s) + bank account details**; Accounts staff manage them on dedicated settings pages; parents **view methods and pay manually offline**; staff record payments + issue receipts. Seam preserved for Razorpay/Stripe/UPI + auto-reconciliation later.
- **Notifications (your requirement): in-app only.** Real-time in-app notification center + Announcements + Notice Board + Parent Communication. **No WhatsApp/SMS/paid providers.** A professional info card marks where future channels will appear. (FCM web push = later, free but needs server send.)
- **Images:** ImageKit for profile photos **and payment QR codes**, stored as URLs. **Still needed (non-blocking):** ImageKit **URL endpoint + public key**, plus a **free** upload-signing endpoint (Cloudflare Workers / Vercel free tier — avoids Blaze). Until configured: reference-accurate **initials-on-gradient avatars** + the full upload UI built behind a config flag, activating instantly once keys are set.
- **Maps/GPS (free stack):** **Leaflet + OpenStreetMap** tiles (no API key) for display; bus live location via the driver/conductor **PWA geolocation** → Firestore real-time → parent sees marker live. Free. *Limitations:* OSM tile fair-use policy, no free turn-by-turn routing/precise ETA (use straight-line estimate now, OpenRouteService free tier later), GPS accuracy/battery depend on device. Seam preserved for Google Maps Platform / dedicated GPS hardware later.
- **Continuity/recovery system:** auto-maintained context/resume checkpoints (build-phase history now archived under `docs/archive/continuity/`; see `NEXLI_BUILD_PLAN.md` §22 in `docs/archive/planning/`).

**Still needed from you (non-blocking — provide when ready):** ImageKit URL endpoint + public key; later: reCAPTCHA site key (App Check), and Blaze + provider creds when we scale.

---

## 1. Create the Firebase project

1. Go to the [Firebase console](https://console.firebase.google.com) and **Add project** (e.g., `nexli-prod`). Optionally also `nexli-dev` for development (recommended: separate dev + prod projects so test data never touches production).
2. Enable Google Analytics (optional; useful for product metrics).
3. **Upgrade to the Blaze plan (pay-as-you-go).** This is **required** for: Cloud Functions, outbound network calls from Functions (ImageKit/SMS/WhatsApp/payment), Cloud Scheduler (compliance/fee cron jobs), Task Queues (bulk import/payroll), and phone-auth/MFA at volume. Blaze has a generous free tier; set a **budget alert** to stay in control.

---

## 2. Firestore database (⚠️ region is permanent)

1. **Build → Firestore Database → Create database.**
2. **Mode:** Native.
3. **Location:** an **India region — `asia-south1` (Mumbai)** (or `asia-south2` Delhi). This is **mandatory for DPDP Act data-localization** and **cannot be changed later**. Choosing a non-India region would be a compliance violation per spec §10.3.
4. Start in **locked mode** (deny all). I will deploy the real security rules (`firestore.rules`) and composite indexes (`firestore.indexes.json`).

---

## 3. Authentication

**Build → Authentication → Get started**, then enable:
1. **Email/Password** — primary method for staff/admin.
2. **Phone** — OTP sign-in for parents (and the second factor for MFA). Phone auth needs Blaze + reCAPTCHA/app verification; budget for SMS costs.
3. **(Optional, later)** Google + Microsoft SSO — for schools on Google Workspace / M365 (spec §10.1).
4. **Multi-Factor Authentication (SMS second factor)** — enforced for **Super Admin, Principal, IT Admin, Chief Accountant** (spec §10.1, §14). MFA requires upgrading Authentication to **Google Cloud Identity Platform (GCIP)** in the console (one click; it stays Firebase-compatible). Confirm you're OK enabling this.
5. **Authorized domains** — add the dev domain (`localhost`) and your eventual production domain.

**Custom claims (RBAC):** roles live in Firebase Auth custom claims — `{ role, schoolId, scope, perms }` — and drive Firestore rules. `super_admin` is assignable **only by the project owner** via a one-time bootstrap (see §6).

---

## 4. Cloud Functions

1. **Build → Functions → Get started** (Blaze required).
2. Default region: **`asia-south1`** to keep data + compute in India.
3. Runtime: Node.js (latest LTS), TypeScript. I will scaffold and deploy these (spec §14.1): bulk student import, attendance 75% monitor, fee reminders (cron), compliance alerts (cron 90/60/30/7-day), payroll batch, TC clearance orchestration, subscription lifecycle, emergency broadcast fan-out, import error-report generation, auth account management on suspend/resume, UDISE+ compilation (annual), AI batch (dropout/defaulter) if approved.
4. Functions hold all secrets (ImageKit private key, SMS/WhatsApp/email/payment keys) via **`firebase functions:secrets:set`** — never in client code.

---

## 5. Firebase Hosting + App Check

1. **Build → Hosting → Get started** (recommended host for the PWA; India CDN; integrates with Functions). *(If you'd rather host on Vercel, say so — both work; Firebase Hosting is the default.)*
2. **App Check** — **Build → App Check** → register the Web app with **reCAPTCHA v3** (or reCAPTCHA Enterprise). Enforce App Check on Firestore + Functions to block abuse. You'll create a **reCAPTCHA site key** (Google Cloud → reCAPTCHA) and give it to me for the client; the secret stays in the console.

---

## 6. Register the Web app + bootstrap the first Super Admin

1. **Project settings → General → Your apps → Add app → Web (`</>`)**, nickname `nexli-web`. Copy the **Firebase web config** object (the 6–7 public fields). This goes into the client `.env` (safe to expose; protected by App Check + rules).
2. **First Super Admin bootstrap** (one-time): after the first account is created, the `super_admin` custom claim must be set by the project owner. Two safe options — **no service-account JSON needs to be pasted into chat**:
   - **(Preferred)** You run `firebase login` and `gcloud auth application-default login` in this terminal (use the `!` prefix in the prompt for interactive login), and I run a small Admin script using your local credentials to set the claim.
   - **(Alt)** You run the script yourself; I provide it.

---

## 7. WHAT I NEED FROM YOU (to start implementation)

**Blocking (needed to wire the app to your backend):**
1. **Firebase Web config** — the object from §6.1: `apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId` (+ `measurementId` if present). *(Safe to paste here.)*
2. **Confirm Firestore region** is `asia-south1` (or another India region).
3. **Confirm Blaze plan** is enabled.
4. **Confirm MFA/Identity Platform** is OK to enable (§3.4).
5. **Deploy method** — either: **(a)** you run `firebase login` in this session so I can deploy rules/functions via the Firebase CLI; or **(b)** you'll run deploys yourself and I prepare everything.
6. **ImageKit account** (spec §14.2) — sign up at imagekit.io and provide: **URL endpoint** + **public key** (safe to paste). The **private key** should be set by you via `firebase functions:secrets:set IMAGEKIT_PRIVATE_KEY` (don't paste secrets in chat if avoidable).

**Soon (for App Check + auth hardening):**
7. **reCAPTCHA site key** for App Check (§5).

**Phase-2 integrations (NOT blocking the core build — provide when we reach those modules):**
8. **SMS provider** (e.g., MSG91 / Twilio) — for OTP fallback, absence/fee/emergency alerts.
9. **WhatsApp Business API** — primary parent delivery channel (spec §5, §9.3).
10. **Email** (e.g., SendGrid / Resend / Amazon SES) — welcome, receipts, reports.
11. **Payment gateway** (e.g., Razorpay / PayU) — online fee payment (spec §3.1).
12. **Maps / GPS** (Google Maps Platform) — live transport tracking (spec §7.1).

> **Security note:** never paste service-account JSON keys, ImageKit/payment **private** keys, or API secrets directly in chat. Public web config and public keys are fine. Secrets go into Functions secrets / the console. I'll always prefer the option that keeps secrets out of the transcript.

---

## 8. What I will produce on approval (no app code until then)

`firebase.json`, `.firebaserc`, `firestore.rules`, `firestore.indexes.json`, the `functions/` workspace, the client `.env.example`, App Check init, the Super Admin bootstrap script, and the auth/RBAC + Firestore data layer — then I begin the staged build in `NEXLI_BUILD_PLAN.md` §20 _(archived under `docs/archive/planning/`)_.

---

*Once §7 (blocking items 1–6) is in place and you approve the stack decisions in chat, I'll start with P0 (Foundation) and move continuously through the build.*
