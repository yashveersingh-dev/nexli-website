# Cashless Wallet — Phase 3: Live Payment Gateway + Payouts (BLOCKED — needs PA account)

## Gate
Requires an **RBI-authorised payment aggregator account + API keys** (Razorpay / Cashfree / PayU): live checkout for top-ups (UPI/card/netbanking), **UPI Autopay e-mandates** for auto-reload/allowance (≤₹15k/txn without extra auth), **refunds**, and **vendor payouts / split settlement** (e.g. Razorpay Route). Also requires a **public HTTPS payment webhook** → **Firebase Blaze** (Cloud Functions/Run) or gateway polling. **Confirm closed-loop status keeps the wallet outside RBI PPI licensing** (legal sign-off). Do not enable live money until all exist. `MockPaymentProvider` stands in until then.

## Scope
1. Implement `RazorpayProvider` (and/or Cashfree/PayU) behind the Phase 1 `PaymentProvider` interface — real top-up orders, server-side payment verification (signature), webhook handler (success/failure/refund), **idempotent** ledger credit (no double-credit on webhook retries).
2. **UPI Autopay mandates** for auto-reload + scheduled allowance; pre-debit notifications per RBI.
3. **Vendor payouts / split settlement** to canteen and other merchants; reconcile against the Phase 2 three-way recon.
4. Refund-to-source for unused balance (graduation/withdrawal) within closed-loop rules.
5. Live cost handling (UPI 0% MDR; cards ~2%) surfaced in settlement reports.

## Data model additions
```
schools/{schoolId}/paymentConfig (singleton)
  gateway, keyIdRef, keySecretRef, webhookSecretRef, routeEnabled, mode('test'|'live')
schools/{schoolId}/wallets/{studentId}/ledger/{entryId}
  gatewayPaymentId, gatewayOrderId, mandateRef, settlementId   // populated on live entries
schools/{schoolId}/mandates/{mandateId}
  studentId, type('autoreload'|'allowance'), maxAmount, status, gatewayMandateRef
```

## Integration seam
- Pure provider swap — Phase 1 POS + ledger and Phase 2 recon/settlement/notifications are unchanged; only `paymentConfig.mode` flips `test` → `live`.
- Webhook verifies signature; credits are idempotent on `idempotencyKey`/`gatewayPaymentId`; secrets in server/secret config, never client bundle; per-tenant routing by account → `schoolId`.

## Role gating
- `wallet.payments.configure` (super-admin/finance) to connect the gateway and flip to live.

## Acceptance
A parent tops up with real UPI, the webhook idempotently credits the ledger, auto-reload fires via UPI Autopay, a canteen vendor receives a real split payout, and everything reconciles three-way — with no rewrites to the POS/ledger/recon built in Phases 1–2.
