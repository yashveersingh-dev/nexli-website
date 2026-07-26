# Cashless Wallet — Phase 2: Merchant Modules, Notifications & Reconciliation (Offline-Buildable)

Buildable offline against the Phase 1 ledger + `MockPaymentProvider`. Goes live with the gateway (Phase 3).

## Scope
1. **Merchant modules** — Canteen (menu/breaks/queue), Library (fines, deposits, book charges — links to library module), Events (trip/ticket payments + headcount), Stationery store. Per-merchant menu/price/stock + payout account setup.
2. **Spend notifications & insights** — per-spend, top-up, low-balance, limit-hit alerts to parent (via comms/WhatsApp module); weekly spend summary; healthy-eating nudges; spend-by-category insights.
3. **Reconciliation & settlement (logic only, no real payout yet)** — ledger vs POS vs (mock) gateway three-way reconciliation; mismatch alerts; end-of-day reports; merchant settlement statements + float tracking; GST/tax handling on the report side.
4. **Refund / dispute workflow** — parent-raised disputes, admin investigation, reversal entries with audit trail, refund-to-source (mock).
5. **Scheduled allowance** — weekly pocket-money credit config (executes against mock provider until live mandates exist).

## Data model additions
```
schools/{schoolId}/walletNotifications/{notifId}
  studentId, type('spend'|'topup'|'lowbalance'|'limithit'), payload, channel, status, ts
schools/{schoolId}/settlements/{settlementId}
  merchantId, period, grossSpend, refunds, netPayout, status, reconStatus
schools/{schoolId}/walletDisputes/{disputeId}
  studentId, ledgerEntryId, raisedBy, reason, status('open'|'resolved'|'rejected'), resolutionRef
schools/{schoolId}/reconRuns/{runId}
  period, ledgerTotal, posTotal, gatewayTotal, mismatches[], status
```

## Screens
- **Canteen/Library/Events/Store** merchant consoles, **Spend Insights** (parent), **Reconciliation Dashboard** (finance), **Disputes** queue, **Settlement** statements, **Allowance** config.

## Integration seam
- Reconciliation reads ledger + POS + the mock gateway feed; the live gateway feed (Phase 3) plugs into the same three-way recon with no UI change.
- Library/Events charges originate in those modules and post immutable ledger entries via a shared `postLedgerEntry()` helper.

## Role gating
- `wallet.merchant.manage` (per-merchant staff), `wallet.recon` / `wallet.settlement` (finance), `wallet.dispute.resolve` (finance/admin), parent sees own child's insights only.

## Acceptance
Canteen/library/events post spends that reconcile three-way; parents get per-spend alerts + a weekly summary; a dispute creates a reversal with audit; settlement statements + float reports generate — all offline.
