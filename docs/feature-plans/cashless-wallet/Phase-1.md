# Cashless Wallet — Phase 1: Ledger + Spend-Limit Engine + POS (Offline-Buildable)

## BLOCKED vs BUILDABLE-NOW

### Exact external dependency (BLOCKED for live use)
- **A payment gateway / RBI-authorised payment aggregator** — **Razorpay / Cashfree / PayU** (or similar) with a merchant account + API keys, for the **money-in leg** (parent top-ups via UPI/card/netbanking), **UPI Autopay** e-mandates (auto-reload), refunds, and **vendor payouts/split settlement** (e.g. Razorpay Route). No real money can move until this account + keys exist.
- **A webhook endpoint** for payment success/failure callbacks — needs server-side compute; **Firebase Spark cannot host it (Cloud Functions = Blaze).** Gateway-hosted checkout + a Blaze webhook (or gateway polling) is required for the live money leg.
- **(Compliance)** Confirm the **closed-loop wallet** stays outside RBI PPI licensing (spend only at the school's own merchants); the money-in leg still rides the licensed PA. This is a setup/legal dependency, not code.

### Why it is blocked
Real top-ups require a live, regulated payment gateway. We will **never simulate a fake successful payment** that credits a real wallet. Until keys exist, top-ups route through a **`MockPaymentProvider`** that produces a clearly-labelled simulated/test credit (test-mode only, no real money).

### Buildable NOW, fully offline
- The complete **double-entry wallet ledger** (immutable transactions, derived balance, refunds/reversals, adjustments, statements, reconciliation logic).
- The full **spend-control / limit engine** (daily/weekly/category/time-window/merchant/item rules) with **real-time allow-deny evaluation** — pure, deterministic, unit-testable.
- The **POS / cashier app** (cart → rule check → deduct → receipt) with an **offline queue + later sync**, identifying students by QR/manual ID now (RFID/face later via IoT module).
- Parent top-up UI + auto-reload config (running against `MockPaymentProvider`).
- Spend notifications (composed; delivered via comms/WhatsApp module, possibly mock).
- A `PaymentProvider` abstraction so going live = adding `RazorpayProvider`, no ledger/POS changes.

---

## Phase 1 scope

### Data model (Firestore, under `schools/{schoolId}/`)
```
schools/{schoolId}/wallets/{studentId}
  balanceCache, currency:'INR', status('active'|'frozen'|'closed')
  lowBalanceThreshold, autoReload{enabled, threshold, amount, mandateRef}
  // balanceCache is derived/verified from ledger; ledger is source of truth
schools/{schoolId}/wallets/{studentId}/ledger/{entryId}    // IMMUTABLE double-entry
  type('topup'|'spend'|'refund'|'reversal'|'adjustment')
  amount, direction('credit'|'debit'), balanceAfter
  merchantId?, category?, items[]?, reason, actorId, refTxnId?
  idempotencyKey, source('mock'|'razorpay'|'pos'|'admin'), ts
schools/{schoolId}/spendRules/{studentId}
  dailyLimit, weeklyLimit, categoryLimits{}, allowedCategories[], blockedItems[]
  timeWindows[], merchantAllowlist[], allergyFlags[]
schools/{schoolId}/merchants/{merchantId}
  name, type('canteen'|'library'|'events'|'store'), menu[]{itemId,name,price,category,allergens[]}
  payoutAccountRef, active
schools/{schoolId}/posTransactions/{posTxnId}     // POS-side, syncs to ledger
  merchantId, studentId, cart[], total, decision('allowed'|'denied'), denyReason?
  status('queued'|'synced'|'failed'), offlineCreatedAt, syncedAt
```

### Spend-limit engine (pure, offline)
- `wallet/rules/evaluatePurchase.ts` — pure function: (cart, spendRules, today's spend, balance, current time) → `{allowed, denyReason, breakdown}`. Enforced at POS *before* debit. Deterministic + unit-testable.
- Ledger writes use an `idempotencyKey` + atomic balance update (transaction) to prevent double-spend/double-credit.

### Screens
1. **POS / Cashier app** — student lookup (QR/manual), cart, real-time allow-deny with reason, deduct, receipt; offline-queue indicator + sync status.
2. **Parent Wallet** — balance, statement, top-up (mock), set spend limits/categories/time-windows/allergy flags, auto-reload config, low-balance alert toggle.
3. **Student view** — own balance + recent spends (age-appropriate).
4. **Admin Wallet Ops** — ledger explorer, refunds/reversals/adjustments (reason required), reconciliation (ledger vs POS), merchant + menu management.

### Integration seam
- `wallet/PaymentProvider.ts`: `createTopupOrder() | verifyPayment() | createMandate() | refund() | payout()`. Phase 1 = `MockPaymentProvider` (test-mode credit only). Live = `RazorpayProvider` (Phase 3).
- Student identification pluggable: QR/manual now; RFID/face via IoT module later (same `resolveStudent()` seam).
- Spend notifications emit to the comms/WhatsApp module.

### Role gating (data-driven roles)
- `wallet.pos.operate` (cashier/merchant staff — only their merchant), `wallet.parent` (parent — own child only), `wallet.student.view` (student — own balance), `wallet.admin` (finance — ledger ops/reconciliation/merchants).
- Ledger is append-only in security rules (no edits/deletes); reversals create new entries. All scoped by `schoolId`.

### Phase 1 acceptance
A parent sets a ₹50/day canteen limit and a peanut-allergy block, top-ups via the mock provider; at the POS the cashier scans the student, a blocked item is denied with a reason, an allowed cart deducts and prints a receipt; the offline queue syncs to an immutable ledger that reconciles — all with zero real money.
