# Cashless Campus Wallet — Research

> Pooled "world-best" feature set for a closed-loop campus wallet (canteen, library, events, stationery) with parent top-up + spend controls, tailored to India. Benchmarks: school-canteen cashless systems (Spriggy/Australia, ParentPay/UK, MyKidsSpending, LINQ Connect/US), campus prepaid cards (Transact/Blackboard), Indian fee/wallet stacks on Razorpay/PayU/Cashfree, RBI PPI norms.

## 1. Wallet & ledger core
- Per-student **closed-loop wallet** (usable only inside campus merchants) with an auditable **double-entry ledger** — every paisa traceable; balance derived from immutable transactions, never edited in place.
- Multiple sub-wallets/purses optional (canteen vs library-fines vs events) or one wallet with category controls.
- Opening balance, top-ups (credits), spends (debits), refunds/reversals, adjustments — each an immutable entry with reason + actor.
- Statements (parent + admin), reconciliation against POS, end-of-day settlement reports.

## 2. Parent top-up
- Top-up via UPI/card/netbanking (payment gateway); auto-reload when balance < threshold (RBI e-mandate/UPI Autopay, ≤₹15k/txn without extra auth); scheduled allowance (weekly pocket money).
- Top-up confirmation + receipt; minimum/maximum top-up; failed-payment handling + idempotency (no double credit).
- Refund unused balance back to source (graduation/withdrawal) per closed-loop rules.

## 3. Spend controls (the parent-love feature)
- **Daily/weekly spend limit** per student; per-category limits (e.g. ₹50/day canteen).
- **Allow/deny categories or specific items** (e.g. block junk food, allow only veg, allergy blocklist).
- **Time-of-day windows** (canteen only during breaks); merchant allowlist.
- **Item-level rules** (allergen flags, age-restricted items); low-balance alerts to parent.
- Real-time enforcement at point-of-sale — a denied purchase is blocked, not just reported.

## 4. Point-of-sale / acceptance
- Identify student at till via **RFID/NFC card, QR code, or face** (ties to IoT module); fast tap-to-pay queue flow.
- Cashier/POS app: cart, apply rules, deduct, print/SMS receipt; offline-tolerant queue with later sync (canteen Wi-Fi is flaky).
- Library: fines, deposits, book-related charges; Events: ticket/trip payments; Stationery store.
- Merchant onboarding, menu/price management, stock optional.

## 5. Notifications & visibility
- Parent push/WhatsApp on every spend + top-up + low balance + limit hit ("Aarav spent ₹40 at canteen, balance ₹160").
- Spend insights: where/what/when, healthy-eating nudges, weekly summary.
- Student view (age-appropriate): own balance + recent spends.

## 6. Admin, reconciliation & finance
- Merchant settlement (canteen vendor payouts), float management, refunds, dispute handling.
- Reconciliation: wallet ledger vs gateway vs POS; mismatch alerts; audit trail of every adjustment.
- Reports: revenue by merchant/category, top-up volume, outstanding balances, GST/tax handling.

## 7. Security, integrity & compliance
- Idempotent transactions, optimistic-locking/atomic balance updates (no race double-spend), reversal not deletion.
- **RBI Prepaid Payment Instrument (PPI)** considerations: a true open/semi-closed PPI needs RBI authorisation; a **closed-loop** campus wallet (spend only at the school's own merchants, run by the school) typically falls outside PPI licensing — but money movement still rides a licensed payment aggregator. Document this boundary clearly.
- KYC-lite, balance caps, DPDP Act 2023 for minors, parental consent, no lending/interest.

## 8. UX principles
- Parent: top-up in 2 taps, set limits once, get reassuring per-spend alerts.
- Cashier: tap → instant allow/deny → done in seconds (queue speed is everything).
- Student: never embarrassed at the till; clear "blocked" reason shown to cashier discreetly.

## 9. India-specific notes
- **UPI is king** — UPI top-ups (0% MDR by RBI mandate) keep costs near-zero; UPI Autopay for auto-reload.
- Closed-loop avoids PPI licensing; partner with an RBI-authorised PA (Razorpay/Cashfree/PayU) for the money-in leg + vendor payouts (Razorpay Route / split settlements).
- Cash-light, not cash-less: keep a cash-deposit-at-office top-up path for families without digital payments.
- Flaky canteen connectivity → offline POS queue is essential.

## Sources
- [Razorpay — Payment Gateway Compliance 2026](https://razorpay.com/blog/payment-gateway-compliance/)
- [Razorpay — Subscriptions / UPI Autopay e-mandate (≤₹15k)](https://razorpay.com/blog/payment-gateway-support-for-subscription-businesses-key-considerations-in-2026)
- [Razorpay Review 2026 — RBI PA licenses (PA-O/PA-P/PA-CB)](https://productgrowth.in/tools/payments/razorpay/)
- [Razorpay Charges 2026 — UPI 0% MDR, cards ~2%](https://www.softwaresuggest.com/blog/razorpay-payment-gateway-charges/)
