# Phase 3 — The Integration Seam (provider interface + Mock providers, go-live ready)

> Builds the abstraction that lets the real government/DigiLocker integrations drop in later **without touching any screen**. Ships entirely offline behind a mock provider. Going live = registering, getting keys, and swapping the provider — gated by a feature flag, never faked.

---

## ⛔ What stays blocked after Phase 3 (named)
- **DigiLocker Issuer API v1.13** live endpoints — needs **API Setu issuer registration**, allotted **org id + docType(s)**, **production keys**.
- **Authorized Partner API v2.0 + MeriPehchaan SSO** (pull-at-admission) — needs partner client registration + consent grant.
- **APAAR minting & Aadhaar eKYC** — happens on **UDISE+**; Nexli never gets a mint API. We orchestrate around the portal.
- **ABC / NAD credit push** — UGC/NSDL/CDSL onboarding.

## The seam (this is the buildable deliverable)
Define one provider interface in `features/apaar/integration/`:

```
interface ApaarIntegration {
  // DigiLocker Issuer side (push our issued docs out)
  previewIssuerPayload(doc: IssuedDocument): IssuerPayloadPreview;   // offline, always available
  pushToDigiLocker(docId): Promise<PushResult>;                      // LIVE-ONLY

  // Partner/pull side (verify at admission)
  pullFromDigiLocker(consentToken, docType): Promise<PulledDoc[]>;   // LIVE-ONLY

  // APAAR status sync (CSV now; portal-scrape/API never — manual reconcile stays the path)
  reconcileFromUdiseExport(csv): ReconcileResult;                    // offline, always available
}
```

- **`MockApaarProvider`** (default, offline): `preview*` and `reconcileFromUdiseExport` fully work; the LIVE-ONLY methods throw a typed `IntegrationNotConfiguredError` that the UI renders as the "Preview only — connect a DigiLocker issuer account to enable" state. **No mock HTTP that imitates DigiLocker.**
- **`DigiLockerProvider`** (future): real Issuer/Partner calls. Behind a Cloud-Function/server proxy because keys + Aadhaar-adjacent flows must never sit in the React bundle. (Note: live push needs a server component — outside Firebase Spark's no-egress reality, so this is doubly blocked until plan + keys exist.)
- Selection via a **feature flag**: `schools/{id}/settings/feature_flags.apaarIntegration = 'mock' | 'live'`. Default `'mock'`. Reuses the existing `lib/featureFlags.ts` + `schoolFlagsRef` pattern.

## Go-live runbook (documented, not executed)
1. Register the school/board as a **DigiLocker Issuer** on API Setu; obtain org id + docType(s).
2. Map each Nexli `docCategory` → allotted `docType` in `settings/apaar`.
3. Provision production keys into the server proxy (never the client).
4. (For pull) register a MeriPehchaan SSO client; wire the consent redirect.
5. Flip `apaarIntegration` to `'live'` for that tenant.
6. Smoke-test with one document; verify it appears in a test DigiLocker account.

## Role gating & safety
- Flipping the flag to `'live'` = Super Admin / school IT admin only.
- All push/pull actions write to the tenant audit log with the consent token reference (never the Aadhaar number).
- Aadhaar number never leaves the server proxy; the client only ever sees masked refs + the verified boolean.

## Definition of done (Phase 3)
- Every screen calls the provider interface, not a concrete client.
- With the default mock provider, all offline features work and all live features show the honest "not connected" state.
- The go-live runbook is complete enough that a flag flip + key provisioning is the only remaining work once approvals land.
