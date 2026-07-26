# SSO + Open API — Phase 2: Live Google/Microsoft SSO + Roster Sync (BLOCKED — needs OAuth apps)

## Gate
Requires **registered OAuth apps + admin consent**: a **Google Cloud OAuth client** (Sign-In + Classroom API scopes) and/or a **Microsoft Entra ID app registration** (client id/secret, tenant id), plus the school's Workspace/365 admin enabling them. SAML needs the IdP's metadata. Live roster sync also needs the SIS/LMS **OneRoster endpoint + OAuth2 client-credentials** or Classroom/SDS API access. Do not build the live handshake until credentials exist.

## Scope
1. Implement `GoogleIdP` / `MicrosoftIdP` / `SamlIdP` (+ generic `OidcIdP`) behind the Phase 1 `IdentityProvider` interface — real OIDC/OAuth code flow, token validation, claim → role mapping, JIT provisioning, account linking, sign-out propagation, domain restriction.
2. Live roster sources behind `RosterSource`: **OneRoster 1.2** (REST, OAuth2 client-credentials) + **Google Classroom** + **Microsoft SDS**; delta sync, conflict resolution, deactivate-on-leave, scheduled + on-demand, run logs.
3. MFA passthrough; multi-tenant IdP mapping (each school its own domain/tenant).

## Data model additions
```
schools/{schoolId}/identityProviders/{idpId}
  clientId, tenantId, jwksUri, scopes[], discoveryUrl, status('connected'|'error')
schools/{schoolId}/rosterSyncs/{syncId}
  endpoint, oauthTokenRef, lastDeltaCursor, scheduleCron
```

## Integration seam
- Pure provider swap — Phase 1 SSO UI + roster engine unchanged; the diff/preview/logs already built simply run against live data.
- Token exchange/validation server-side where required (Blaze if a confidential client secret must be protected); secrets in secret config, never client bundle.

## Role gating
- `integrations.idp.manage` / `integrations.roster.manage` (admin) to connect and run live syncs.

## Acceptance
Staff/students sign in with real Google/Microsoft accounts with correct role mapping; a live OneRoster/Classroom sync updates the directory through the exact engine + logs built in Phase 1.
