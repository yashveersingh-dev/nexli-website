# Phase 2 — Parent Mandate Experience, Pre-Debit Notifications & Dunning (buildable now, offline)

> Builds the parent-facing AutoPay experience and the trust/communication layer. All flows run on the offline mandate/ledger from Phase 1; no live charging.

---

## Recap of blocking
- Real mandate **registration** and **debits** stay ⛔ blocked (gateway account + keys + server). In this phase, "Set up AutoPay" opens an **offline simulation** that creates a `source:'mock'` mandate so the *experience and downstream logic* can be tested — clearly labelled **"Demo mode — no real bank mandate is created."** No real bank/UPI call is made or faked.
- Notifications are delivered via the existing in-app **communication** module (offline-real), not via a paid SMS/WhatsApp gateway (that's a separate blocked module).

## Part A — Parent mandate experience (`parent`, `student` audiences)
Extend `features/fees` `MyFeesPage.tsx`:
- **"Auto-pay my fees"** card — recommends **UPI AutoPay** for sub-₹15k monthly/term fees, **eNACH** for large/annual, with a one-line "why".
- **Mandate health** — active mandates, rail, cap, next-debit date, status pill; pause/resume/revoke (offline state changes in Phase 2).
- **Upcoming auto-debits timeline** — what will be debited and when (computed from active mandates + open invoices).
- **Failed-payment self-heal** — if a mandate is `expired`/`revoked`, a "re-authorise" CTA (offline simulation now; real link when live).
- Adult students see their own; guardians see only their child (reuse `features/family` scoping).

## Part B — Pre-debit notifications (RBI-aligned, offline delivery)
- **≥24h pre-debit notice** generated for every scheduled auto-debit and delivered through `features/communication` (in-app + the school's existing notice pipeline). Recorded so the audit shows the parent was notified.
- Notice content: amount, invoice/heads, debit date, "how to pause".
- Modeled as `schools/{id}/debit_notices/{noticeId}` `{ mandateId, invoiceIds[], amount, debitOn, notifiedAt, channel }`.

## Part C — Dunning / smart retry ladder
- Drive the Phase-1 `dunningPlan()` output into actual reminder records + an escalating ladder: failed debit → retry day 2 / day 4 / day 7 → fall back to "pay manually" link → flag to finance.
- **Dunning board** for finance: who's in which step, next action, one-click "send reminder" (in-app) and "mark resolved".
- Mandate-expiry nudges: mandates within N days of `endsOn` get a renewal reminder.

## Part D — Receipts & ledger close-out
- On a reconciled (offline-applied) payment, auto-issue the receipt (`ReceiptDoc.tsx`) and update the student ledger (`StudentLedgerPage.tsx`) — these already exist; we just wire the reconciliation result into them.

## Role gating
- Parent/student surfaces gated by audience + child scoping.
- Dunning board + reminder sending = `fees.edit`; write-offs / waivers = `fees.approve`.
- Pre-debit notice templates editable by finance + communication admins.

## Definition of done (Phase 2)
- A parent can run the AutoPay setup in demo mode and see a `source:'mock'` mandate + an upcoming-debit timeline.
- Every scheduled debit produces a ≥24h pre-debit notice in the communication module, recorded for audit.
- A failed sample debit walks the dunning ladder and produces reminder records and a finance board entry.
- All demo/offline states are explicitly labelled; no real bank mandate or charge is created or simulated as "real".
