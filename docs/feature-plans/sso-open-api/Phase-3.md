# SSO + Open API — Phase 3: Live Public API, Webhooks & LTI 1.3 (BLOCKED — needs hosted server / Blaze)

## Gate
Requires a **hosted OAuth/token + API server and webhook dispatcher** — **Firebase Blaze** (Cloud Functions/Cloud Run) or equivalent — to issue/validate OAuth 2.0 tokens, sign JWTs (JWKS), enforce rate limits, and deliver signed webhooks with retries. **LTI 1.3** additionally needs JWKS hosting + per-platform/tool key registration. Cannot run on Spark. Do not build the live endpoints until Blaze (or equivalent) is provisioned.

## Scope
1. Implement the live `ApiGateway` behind the Phase 1 interface — versioned REST `/v1`, OAuth2 (client-credentials + auth-code), scoped keys, pagination, idempotency keys, rate limits, OpenAPI 3 served, sandbox/test mode preserved.
2. Implement the live `webhooks/Dispatcher` — real signed (HMAC) delivery, retry/backoff, delivery logs + replay, all reusing the Phase 1 state machine.
3. **LTI 1.3** — act as Platform and/or Tool: OIDC third-party-initiated login, JWT/JWKS, deep linking, NRPS, AGS grade passback; tool registry + key management.
4. Per-app consent screens, token revocation, key rotation, full audit of API calls + token issuance.
5. (Roadmap) Caliper/xAPI emission; India targets — DigiLocker/APAAR/SDMS connectors.

## Data model additions
```
platformApps/{appId} + schools/{schoolId}/installedIntegrations  // reused
schools/{schoolId}/ltiRegistrations/{regId}
  role('platform'|'tool'), issuer, clientId, deploymentId, jwksUri, deepLink, agsEnabled
schools/{schoolId}/apiAuditLogs/{logId}
  clientId, endpoint, scopeUsed, status, ts
```

## Integration seam
- Pure swap from the in-app sandbox to the Blaze-hosted gateway/dispatcher; the developer portal, webhook UI, marketplace, and OpenAPI spec from Phase 1 are unchanged.
- Tenant isolation: every token bound to `schoolId`; least-privilege scopes enforced server-side.

## Role gating
- `integrations.api.manage`, `integrations.lti.manage` (admin); third-party apps act only within granted scopes + tenant.

## Acceptance
An external app authenticates via real OAuth, calls `/v1` within scope + rate limits, and receives signed webhooks with retries; an LTI 1.3 tool launches from Nexli with NRPS + AGS grade passback — all through the surfaces designed in Phase 1.
