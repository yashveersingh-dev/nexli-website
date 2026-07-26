# UPI AutoPay / eNACH e-Mandates + Fee Auto-Reconciliation — Research

_Module folder: `upi-autopay-reconciliation/`. Status: ⛔ **Blocked** (payment gateway account + keys) — but the entire reconciliation ledger, mandate registry, settlement matching, and dunning/retry logic are buildable now, fully offline, with sample data. See `Phase-1.md` for the split._

---

## 1. The two ways to auto-collect recurring fees in India

| | **UPI AutoPay** | **eNACH (e-mandate)** |
|---|---|---|
| Rail | UPI / NPCI | NACH / NPCI (bank account debit) |
| Setup | **Instant** — parent approves once with UPI PIN, mandate live immediately | **Slower** — bank verification, can take a few days |
| Caps | Frictionless under ₹15,000; up to ₹1 lakh for specified categories with additional auth | Higher ceilings, set per mandate |
| Best for | Most school fees (monthly/term, < ₹15k) | Large/annual fees, parents without UPI |
| Auth | UPI PIN per mandate; **pre-debit notification** then auto-debit | Bank netbanking/debit-card/Aadhaar mandate registration |

A world-class school-fee product **offers both** and recommends the right one per parent (UPI AutoPay for most, eNACH for high-value/annual). Both are **recurring mandates** with the same lifecycle, so we model them with one unified `mandate` concept and a `rail` discriminator.

## 2. Mandate lifecycle (drives our state machine)
`created → pending_auth → active → (paused) → revoked / expired`, plus per-cycle debits:
`debit_scheduled → pre_debit_notified → debit_initiated → success | failed → (retry)`.

Every transition arrives as a **gateway webhook** (mandate created, authenticated, debit success, debit failed, mandate cancelled/expired). The reconciliation engine is *driven by* these webhooks. Webhook handling needs a server endpoint — see the blocker note.

## 3. End-to-end auto-reconciliation — what it must do (the hard part, and it's buildable offline)
Reconciliation = matching **money that actually arrived** (gateway settlement reports + webhooks) against **what we billed** (Nexli invoices), and closing the loop automatically:

1. **Ingest** payment/settlement events (webhook events live; **CSV settlement file offline**).
2. **Match** each payment to an invoice (`schools/{id}/fees/.../invoices`) by a carried reference (order id / mandate id / our `feeReference`).
3. **Apply** the payment: increment `paidAmount`, recompute `status` (`paid`/`partial`), write a receipt — reusing the existing `studentDue()` logic in `Web/src/features/fees/feeSchema.ts`.
4. **Handle the awkward reality:**
   - **Partial / over / under payment** (parent pays a round number).
   - **Multiple invoices, one debit** (a term debit covering several heads).
   - **One invoice, multiple debits** (instalments).
   - **Late settlement** (money lands T+1/T+2 — payment exists before the bank settles).
   - **Gateway fee / MDR** deducted before settlement — billed ≠ settled; track gross vs net.
   - **Refunds & chargebacks** — reverse the application, reopen the invoice.
   - **Duplicate webhooks** — idempotency on gateway event id.
5. **Auto-close** matched invoices; **flag unmatched** payments into an exception queue for a human.
6. **Dunning / retry** — failed debit → retry schedule + reminder; mandate expiring → renewal nudge.
7. **Daily reconciliation report** — billed vs collected vs settled vs in-exception, signed off by finance.

The matching engine, exception queue, partial-payment logic, refund reversal, idempotency, and dunning schedule are **pure logic over Firestore data** — all buildable now and testable with sample webhook/settlement JSON+CSV. Only the *source of truth events* are blocked.

## 4. The real APIs / standards (named)
- **Razorpay** (representative; Cashfree/PayU/Easebuzz are equivalents) —
  - **UPI AutoPay** via the Recurring Payments S2S API: create customer → create order with `method:'upi'` + `token`/mandate details → authorisation payment → recurring charge. Secure approval link for the parent.
  - **eNACH** via the same recurring-payments surface (`method:'nach'` / e-mandate registration).
  - **Webhooks** for every lifecycle event: `subscription.*`, `payment.captured`, `payment.failed`, `refund.processed`, mandate auth/cancel. Signed with a webhook secret (HMAC) — **verify the signature server-side**.
  - **Settlement report API / file** — daily settlement (gross, MDR, GST, net, UTR) for true reconciliation.
- **NPCI UPI 2.0 AutoPay** — the underlying rail (pre-debit notification mandate, ₹15k frictionless threshold, interoperability across PSP apps).
- **NACH / eNACH (NPCI)** — the bank-debit rail.
- **RBI rules** — pre-debit notification (≥24h) for recurring debits; AFA (additional factor of auth) thresholds. The product must respect the notification + cap rules.

**The BLOCKER:** going live needs (a) a **registered, KYC-verified merchant account** with a gateway (PAN/GST/bank proof + activation), (b) **production API keys + webhook secret**, and (c) a **server endpoint** to receive signed webhooks and run charges (cannot be the React PWA; cannot run on Firebase **Spark** free tier without Cloud Functions on a paid Blaze plan). All three are paid/approval-gated. Until then: full offline ledger + mock events.

## 5. Pooled "world's-best" feature list (the bar — beat the standalone fee-collection products)
1. **One-tap mandate setup** for parents; auto-recommend UPI AutoPay vs eNACH by fee size.
2. **Mandate registry** — every parent's active mandates, caps, next-debit date, rail, status, pause/resume/revoke.
3. **Pre-debit notification** to parents (≥24h before) — compliance + trust.
4. **Smart retry / dunning ladder** — failed debit → retry on day 2/4/7 + escalating reminders, then fall back to manual.
5. **Auto-reconciliation engine** — match-on-arrival, exception queue, partial/over/under handling, refund reversal, idempotent event processing.
6. **Gross-vs-net tracking** — MDR/GST/gateway fee captured so finance sees true collection.
7. **Daily reconciliation dashboard** — billed / collected / settled / pending / exceptions; finance sign-off; export.
8. **Auto-receipt** on successful settled payment (reuse `ReceiptDoc.tsx`).
9. **Parent fee timeline** — upcoming auto-debits, history, mandate health, "update mandate" nudges.
10. **Failed-payment self-heal** — link to re-authorise an expired/revoked mandate.
11. **Multi-channel fallback** — if no mandate, still allow one-off pay link; reconcile both the same way.
12. **Audit & dispute trail** — every event, match decision, and reversal logged.

**What makes it easy for users:**
- Parent sets up **once**; fees just get paid; they get a heads-up before each debit and a receipt after.
- Finance never hand-matches a bank statement again — the **exception queue is the only thing they touch**, and it's small.
- Everything ties back to the invoices finance already understands (no parallel money system).

## 6. How this maps onto existing Nexli
- **Reuse `features/fees`** end-to-end: invoices, `studentDue()`, `invoiceTotals()`, `ReceiptDoc.tsx`, `StudentLedgerPage.tsx`. The new module **feeds** the existing fee ledger — it does not replace it.
- Tenant-scoped collections under `schools/{schoolId}/…` via `tenantCol`/`tenantDoc`.
- RBAC: extend the existing `fees` module key (view/create/edit/approve/export). Finance roles operate; leadership reviews (`lib/ownership.ts`).
- Audiences: `staff` (finance/accountant), `parent`/`student` (mandate + timeline).
- Feature flag for mock vs live via `schoolFlagsRef` + `lib/featureFlags.ts`.

## 7. Sources
- [Razorpay — UPI AutoPay vs eNACH (2026)](https://razorpay.com/blog/upi-autopay-vs-enach-comparison/)
- [Razorpay — UPI AutoPay product](https://razorpay.com/upi-autopay/)
- [Razorpay Docs — UPI Autopay (S2S recurring)](https://razorpay.com/docs/payments/payment-gateway/s2s-integration/recurring-payments/upi/)
- [Razorpay — UPI Payment API guide](https://razorpay.com/blog/upi-payment-api-guide)
- [Razorpay — Master Recurring Payments with UPI 2.0 Autopay (2026)](https://razorpay.com/blog/master-recurring-payments-upi-autopay-guide/)
- [FintechPrimitives — Setting up eNACH/UPI-AutoPay mandates](https://docs.fintechprimitives.com/payments/managing-eNACH/)
