# Phase 3 — The eSign Integration Seam (SignProvider interface + go-live)

> Builds the abstraction so a real, legally-valid eSign provider drops in without touching the DMS or the workflow engine. Ships offline behind a mock provider. Going live = an ESP/ASP agreement + keys + a server proxy + a flag flip — never faked.

---

## ⛔ What stays blocked after Phase 3 (named)
- **ESP/ASP agreement** with an empanelled ESP (**eMudhra / C-DAC / Protean**) or a paid aggregator (**Leegality / Signzy / Setu / Digio / SignDesk**), and an **ASP id**.
- **Production eSign API keys**; per-signature transactions are **paid**.
- **Server proxy** to build the document hash and exchange the **PKCS7 / PKCS7pdf** signature (CCA eSign API v3.x) — needs **Cloud Functions on Firebase Blaze (paid)**; **Spark cannot host it** (hard infra blocker).
- **DSC** signing — physical USB token + CA-issued certificate for the authorised signatory.

## The seam (this is the buildable deliverable)
`features/documents/integration/`:

```
interface SignProvider {
  prepare(docId, versionId): { documentHash, fields };       // OFFLINE — hashing works now
  // LIVE-ONLY: legally-valid signing
  initiateAadhaarESign(signRequestId, signerId): Promise<{ redirectUrl }>;
  completeAadhaarESign(callbackPayload): Promise<{ pkcs7, certSerial, authRef }>;
  initiateDsc(signRequestId, signerId): Promise<{ tokenChallenge }>;
  // OFFLINE — always available
  recordWetSignature(signRequestId, signerId, uploadedVersionId): void;
  recordDemoSignature(signRequestId, signerId): void;        // stamped NON-LEGAL
  buildAuditCertificate(signRequestId): AuditCertificate;    // works for all methods
}
```

- **`MockSignProvider`** (default): `prepare`, `recordWetSignature`, `recordDemoSignature`, `buildAuditCertificate` fully work; the Aadhaar/DSC methods throw `ESignNotConfiguredError` → UI shows the honest "connect an eSign provider" state. **No fake OTP screen that pretends to be UIDAI.**
- **`EmudhraSignProvider` / aggregator provider** (future): real CCA eSign v3.x calls behind a **Cloud Function proxy** (ASP keys + the Aadhaar-adjacent exchange never in the client bundle; only the document **hash** leaves, per spec).
- Selected via **feature flag** `schools/{id}/settings/feature_flags.eSignProvider = 'mock' | 'emudhra' | 'leegality' | …` (default `'mock'`), using `lib/featureFlags.ts` + `schoolFlagsRef`.

## Why the workflow engine doesn't change going live
The Phase-2 engine routes signers and assembles a completed package from a `signed` event + an evidence artifact. Whether the artifact is a scanned wet copy, a demo acknowledgement, or a real **PKCS7** signature, the routing, status, reminders, bulk send, and audit-certificate assembly are **identical**. Going live only changes how one signer's `signed` event is produced and what artifact it carries.

## Go-live runbook (documented, not executed)
1. Sign an ESP/ASP agreement (eMudhra/C-DAC/Protean) or onboard a paid aggregator; complete KYC; obtain ASP id + production keys.
2. Upgrade Firebase to **Blaze**; deploy the Cloud Function proxy (hash-build + PKCS7 exchange + callback).
3. Store keys server-side only; register the eSign callback URL.
4. Map signer methods: external parents/vendors → **Aadhaar eSign (OTP)**; authorised signatory → **DSC**.
5. Flip `eSignProvider` for the tenant from `'mock'` to the live provider.
6. Sign one test document end-to-end; verify the returned PKCS7pdf self-verifies and the audit certificate records the cert serial + auth reference.

## Role gating & safety
- Flag flip = Super Admin / school IT admin only.
- Only the document **hash** ever leaves the server; the file bytes and any Aadhaar data are not exposed to the client.
- Every signature event + the resulting certificate logged to the tenant audit log.
- Legally-valid documents are immutable once `esigned` (new changes require a new version + new signing).

## Definition of done (Phase 3)
- The DMS and workflow engine call `SignProvider`, never a concrete eSign client.
- Default mock provider: wet + demo + audit-certificate all work; Aadhaar/DSC show the honest "not connected" state.
- Go-live runbook is complete enough that the ESP agreement + keys + Blaze + flag flip is the only remaining work; the offline DMS and wet-signature path remain valuable with no integration at all.
