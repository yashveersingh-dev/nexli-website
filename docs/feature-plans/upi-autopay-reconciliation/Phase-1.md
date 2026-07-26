# Phase 1 — Reconciliation Ledger & Mandate Registry (buildable now, fully offline)

> Build inside Nexli `Web/`, tenant-scoped under `schools/{schoolId}/…`, feeding the existing `features/fees` invoice ledger. No code is written by this plan — this is the spec.

---

## ⛔ BLOCKED vs ✅ BUILDABLE-NOW (read first)

### ⛔ BLOCKED — needs a paid account / key / server (NEVER fake a live link)
| Capability | Exact dependency that blocks it |
|---|---|
| **Registering a real UPI AutoPay / eNACH mandate** | A **KYC-activated merchant account** with a gateway (**Razorpay / Cashfree / PayU / Easebuzz**) + **production API keys**. |
| **Receiving live debit / settlement webhooks** | A **server endpoint** with the gateway **webhook secret** (HMAC verify). Cannot run in the React PWA; needs **Cloud Functions on Firebase Blaze (paid)** — Spark free tier has no server egress. |
| **Actually charging a card/UPI/bank** | Above account + RBI-compliant pre-debit notification pipeline. |
| **Pulling the daily settlement file via API** | Gateway settlement API + production keys. |

**Rule:** the "Set up AutoPay", "Charge now", and "Connect gateway" buttons ship **disabled** with an honest "Connect a payment gateway to enable" state. We **never** stand up a mock server pretending to be Razorpay. Offline testing uses **imported sample JSON/CSV files**, clearly labelled as samples.

### ✅ BUILDABLE NOW — fully offline, the genuinely hard + valuable parts
1. **Mandate registry** data model + screens (status, rail, caps, next-debit — all manually/sample-seeded).
2. **Reconciliation ledger** — the matching engine (payment → invoice), partial/over/under handling, refund reversal, idempotency. Pure logic over Firestore.
3. **Settlement-file importer** — ingest a real gateway settlement **CSV** the school downloads from their gateway dashboard (this is a file, not an API), reconcile against invoices.
4. **Exception queue** — unmatched payments + manual match UI.
5. **Dunning / retry schedule** — pure scheduling logic + reminder records (delivery is offline/in-app for now).
6. **Daily reconciliation dashboard** + finance sign-off + export.
7. **Auto-receipt** generation on a reconciled payment (reuse `ReceiptDoc.tsx`).
8. **Gross-vs-net (MDR/GST)** tracking fields.

The integration seam (Phase 3) is a **`PaymentProvider` interface with a `MockPaymentProvider`** that replays imported sample events — so the real gateway drops in later untouched.

---

## Goal of Phase 1
Build the reconciliation **brain** and the mandate registry **shell** so that the moment a gateway is connected, money matches itself. Validate entirely with sample data.

## Data model (under `schools/{schoolId}/…`)

`schools/{id}/mandates/{mandateId}`:
```
{
  studentId, payerMemberId,            // the parent
  rail: 'upi_autopay' | 'enach',
  gatewayRef: string | null,           // gateway's mandate/token id (null offline)
  maxAmount: number, frequency: 'monthly'|'term'|'annual',
  status: 'created'|'pending_auth'|'active'|'paused'|'revoked'|'expired',
  nextDebitOn: 'YYYY-MM-DD' | null,
  startsOn, endsOn,
  source: 'mock' | 'live',             // never blank-faked; sample mandates marked 'mock'
  createdAt, createdBy, updatedAt
}
```

`schools/{id}/payment_events/{eventId}` — the raw event stream (idempotency lives here):
```
{
  gatewayEventId: string,              // unique — dedupe key
  type: 'debit_success'|'debit_failed'|'mandate_authenticated'|'mandate_revoked'|'refund'|'chargeback',
  mandateId | null, amount, currency:'INR',
  feeReference: string | null,         // our carried invoice/order ref
  occurredAt, ingestedAt,
  source: 'mock_import' | 'live_webhook',
  raw: object,                          // verbatim payload (sample or real)
  processed: boolean, processingResult: 'matched'|'partial'|'exception'|'duplicate'|null
}
```

`schools/{id}/settlements/{settlementId}` — settlement batches (gross/MDR/GST/net/UTR):
```
{ batchDate, utr, grossAmount, mdr, gst, netAmount, eventIds[], importedFrom:'csv', importedBy, importedAt }
```

`schools/{id}/recon_exceptions/{excId}`:
```
{ paymentEventId, reason:'no_match'|'amount_mismatch'|'ambiguous'|'orphan_refund',
  candidateInvoiceIds[], resolvedInvoiceId|null, status:'open'|'resolved'|'ignored',
  resolvedBy, resolvedAt, note }
```

`schools/{id}/dunning/{studentId}` — retry/reminder ladder state per outstanding cycle.

**Invoices stay in the existing `features/fees` store** — reconciliation only *updates* `paidAmount`/`status` and writes receipts there.

## The reconciliation engine (pure, offline — `recon.ts`)
Mirrors `feeSchema.ts` style (pure functions, Zod for imported rows):
- `matchEvent(event, openInvoices): MatchDecision` — by `feeReference`, then mandate→student→oldest-open-invoice, then amount heuristics.
- `applyPayment(invoice, amount): InvoicePatch` — partial/full; reuse `invoiceTotals()` + `studentDue()` from `Web/src/features/fees/feeSchema.ts`.
- `reversePayment(refundEvent)` — undo a prior application, reopen the invoice, log it.
- `isDuplicate(event)` — dedupe on `gatewayEventId`.
- `dunningPlan(invoice, failedAt)` — returns retry dates + reminder schedule.
- `dailyReconSummary(date)` — billed / collected / settled / in-exception.

## Screens (staff — finance audience)
**Reconciliation Hub** (`features/payments`), tabbed like `FeesHub`:
- **Dashboard** — billed vs collected vs settled vs exceptions; sign-off button.
- **Mandates** — registry table; create-sample mandate (offline); pause/resume/revoke (offline state only).
- **Events** — the payment-event stream; "Import sample events (JSON)" and "Import settlement CSV".
- **Exceptions** — the queue; manual match → applies to the chosen invoice.
- **Receipts** — auto-generated receipts (reuse `ReceiptDoc.tsx`).

## Role gating
- Extend the existing **`fees`** module key (no new key needed): finance/accountant operate (`create`/`edit`/`approve`), leadership review (`view`/`export`) per `lib/ownership.ts`.
- Exception resolution + daily sign-off require `fees.approve`.
- Register: `registerModule('staff', 'payments', lazy(() => import('@/features/payments/routes')))`.

## Definition of done (Phase 1)
- Importing a sample settlement CSV + sample event JSON correctly matches, applies, and closes demo invoices, with partials and one deliberate exception landing in the queue.
- A refund sample correctly reverses and reopens an invoice.
- Duplicate events are ignored.
- Daily dashboard reconciles to the rupee against the sample data; finance can sign off.
- All gateway buttons disabled with the honest "connect a gateway" state — zero live calls.
