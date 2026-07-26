# SSO + Open API — Phase 1: Identity Model + API Surface Design + Sandbox (Offline-Buildable)

## BLOCKED vs BUILDABLE-NOW

### Exact external dependency (BLOCKED for live use)
- **Paid/registered OAuth apps & IdP credentials** — Google Cloud OAuth client (Google Sign-In + Classroom API), **Microsoft Entra ID app registration** (client id/secret/tenant), and any SAML IdP metadata. These require Google/Microsoft developer/admin accounts and per-tenant admin consent. Live SSO is impossible without them.
- **A hosted token/OAuth server + webhook dispatcher** for the public API — issuing/validating OAuth 2.0 tokens, signing JWTs (JWKS), and dispatching signed webhooks needs server-side compute. **Firebase Spark cannot host this; the public API + webhook delivery require Firebase Blaze (Cloud Functions/Run).**
- **OneRoster/LTI/SDS endpoints** of the school's existing SIS/LMS + their client credentials — external systems we don't control.

### Why it is blocked
Real SSO and a real public API require registered OAuth apps + a hosted auth/token server we cannot run on Spark. We will **never fake an IdP handshake or mint fake tokens against a real provider.** Until credentials + Blaze exist, SSO runs in **`MockIdentityProvider`** mode and the API runs as a **local sandbox** (in-app simulated token issuance + webhook dispatch logged to an outbox, no real network).

### Buildable NOW, fully offline
- **Federated identity data model** (link local accounts to external subjects; role mapping from claims).
- **SSO UI** (Sign-in-with-Google/Microsoft buttons + JIT-provisioning + account-linking flow) wired to `MockIdentityProvider`.
- **Roster-sync engine** (mapping rules, delta diff, dry-run preview, conflict resolution, run logs) against sample OneRoster CSV / sample Classroom JSON.
- **Public API design** — OpenAPI 3 spec, resource schemas, scopes, pagination, idempotency, rate-limit rules — plus an **in-app sandbox** that serves the API locally with simulated OAuth tokens.
- **Webhook engine** — subscriptions, signed payload format (HMAC), retry/backoff state machine, delivery log — dispatching to a **mock sink** (logged outbox).
- **Developer portal + marketplace UI** with sandbox keys.

---

## Phase 1 scope

### Data model (Firestore, under `schools/{schoolId}/` + a tenant-scoped platform area)
```
schools/{schoolId}/identityProviders/{idpId}
  type('google'|'microsoft'|'saml'|'oidc'), domain, clientIdRef, status, roleClaimMap{}
schools/{schoolId}/users/{userId}
  ...existing... + federatedIds[]{provider, subject, linkedAt}
schools/{schoolId}/rosterSyncs/{syncId}
  source('oneroster'|'classroom'|'sds'|'clever'), mappingRules, schedule
  lastRunAt, lastResult{added,updated,deactivated,errors[]}, mode('dryrun'|'live')
schools/{schoolId}/apiClients/{clientId}
  name, type('server'|'user'), scopes[], secretRef, status, rateLimit, createdBy
schools/{schoolId}/webhookSubscriptions/{subId}
  events[], targetUrl, secretRef, active, failureCount
schools/{schoolId}/webhookDeliveries/{deliveryId}
  subId, event, payloadHash, status('queued'|'delivered'|'failed'), attempts, nextRetryAt
schools/{schoolId}/installedIntegrations/{integrationId}
  appId, config, status, installedBy
platformApps/{appId}            // marketplace catalogue (cross-tenant, read-only to tenants)
  name, category, scopesRequested[], oauthType, listingMeta
```

### Screens
1. **SSO / Identity** — connect IdP (mock), sign-in buttons, account-linking, role-claim mapping.
2. **Roster Sync** — source config, mapping rules, dry-run diff preview, run logs/errors.
3. **Developer Portal** — register API client, pick scopes, sandbox keys, usage/logs, OpenAPI docs viewer.
4. **Webhooks** — subscriptions, event picker, delivery log + replay.
5. **Integration Marketplace** — catalogue, install/configure/uninstall, status.

### Integration seam
- `auth/IdentityProvider.ts`: `beginLogin() | handleCallback() | mapClaims()`. Phase 1 = `MockIdentityProvider`; live = `GoogleIdP`/`MicrosoftIdP`/`SamlIdP` (Phase 2).
- `api/ApiGateway` + `webhooks/Dispatcher` defined as interfaces; Phase 1 runs an in-app sandbox + mock webhook sink; live = Blaze-hosted gateway/dispatcher (Phase 3).
- Roster engine is a pure diff/mapping module consuming a `RosterSource` (sample files now; live OneRoster/Classroom later).

### Role gating (data-driven roles)
- `integrations.idp.manage`, `integrations.roster.manage`, `integrations.api.manage`, `integrations.marketplace.manage` — admin/super-admin only.
- Every API client/token bound to a single `schoolId`; scopes least-privilege; all issuance audit-logged.

### Phase 1 acceptance
Admin "connects" Google via the mock IdP and signs in with JIT-provisioning + role mapping; runs a dry-run OneRoster import from a sample CSV showing a diff; registers a sandbox API client and calls the local API; subscribes a webhook and sees a signed delivery in the log — all offline.
