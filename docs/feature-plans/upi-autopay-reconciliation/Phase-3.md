# Phase 3 — The Gateway Integration Seam (PaymentProvider interface + go-live)

> Builds the abstraction so a real gateway drops in without touching screens or the reconciliation engine. Ships offline behind a mock provider. Going live = a paid merchant account + keys + a server proxy + a flag flip — never faked.

---

## ⛔ What stays blocked after Phase 3 (named)
- **Merchant account activation + production keys** at Razorpay / Cashfree / PayU / Easebuzz (PAN/GST/bank KYC).
- **Server webhook endpoint** with HMAC secret to receive signed gateway events — requires **Firebase Cloud Functions on the Blaze (paid) plan**; **Spark free tier cannot host it**. This is a hard infra blocker, independent of the gateway account.
- **Live charging / mandate registration** APIs (UPI AutoPay S2S, eNACH e-mandate).
- **Settlement API** auto-pull (offline CSV import remains available as the always-on fallback).

## The seam (this is the buildable deliverable)
`features/payments/integration/`:

```
interface PaymentProvider {
  // mandate lifecycle
  createMandate(input): Promise<{ approvalUrl, gatewayRef }>;   // LIVE-ONLY
  pauseMandate(ref): Promise<void>;                             // LIVE-ONLY
  revokeMandate(ref): Promise<void>;                            // LIVE-ONLY
  // charging
  scheduleDebit(mandateRef, amount, feeReference): Promise<void>; // LIVE-ONLY
  // ingestion (the part that also works offline)
  verifyWebhook(headers, body): VerifiedEvent;                  // LIVE-ONLY (server)
  importSettlementCsv(file): SettlementBatch;                   // OFFLINE — always available
  importSampleEvents(json): PaymentEvent[];                     // OFFLINE — always available
}
```

- **`MockPaymentProvider`** (default): the two `import*` methods fully work and feed the Phase-1 reconciliation engine; all LIVE-ONLY methods throw `GatewayNotConfiguredError` → UI shows the honest "connect a gateway" state. **No fake HTTP that imitates a gateway.**
- **`RazorpayProvider`** (future): real calls behind a **Cloud Function proxy** (keys + webhook verification never in the client bundle).
- Selected via **feature flag** `schools/{id}/settings/feature_flags.paymentGateway = 'mock' | 'razorpay' | 'cashfree' | …` (default `'mock'`), using the existing `lib/featureFlags.ts` + `schoolFlagsRef`.

## Why the engine doesn't change going live
The reconciliation engine (Phase 1) consumes a normalised `PaymentEvent`/`SettlementBatch`. Whether those arrive from an imported CSV (offline) or a verified webhook (live), the matching, partial handling, refunds, idempotency, dunning, and receipts are **identical code**. Going live only swaps the *event source*.

## Go-live runbook (documented, not executed)
1. Activate a merchant account (PAN/GST/bank KYC) with the chosen gateway; obtain production keys + webhook secret.
2. Upgrade Firebase to **Blaze**; deploy the Cloud Function webhook endpoint; register the URL with the gateway.
3. Store keys/secret in server-side config (never client).
4. Configure RBI pre-debit-notification lead time + AFA thresholds.
5. Flip `paymentGateway` for the tenant from `'mock'` to the live provider.
6. Run one ₹1 test mandate + debit + refund end-to-end; confirm it reconciles and a receipt is issued.

## Role gating & safety
- Flag flip = Super Admin / school IT admin only.
- Webhook handler verifies HMAC before trusting any event; unverified events are rejected and logged.
- All charges/refunds/mandate changes write to the tenant audit log.
- No card/UPI/bank credentials ever stored in Nexli — only gateway references.

## Definition of done (Phase 3)
- Every screen and the engine call `PaymentProvider`, not a concrete gateway client.
- Default mock provider: all reconciliation features work via imports; all live actions show the honest "not connected" state.
- Go-live runbook is complete enough that activation + keys + Blaze + flag flip is the only remaining work.
