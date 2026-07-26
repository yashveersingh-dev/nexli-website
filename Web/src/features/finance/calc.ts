/**
 * Pure finance maths — NO Firebase imports, so it is unit-testable in isolation
 * (the vitest config runs in a plain `node` env and `data.ts` initializes Firestore
 * at import). All money is whole INR rupees. `data.ts` re-exports everything here so
 * existing `@/features/finance/data` imports keep working unchanged.
 */
import type { InvoiceStatus, FeePayment, FeeInvoice } from '@/types/finance';

/** Invoice status from its net + paid amounts (net 0 = fully conceded → paid). */
export function statusFor(net: number, paid: number): InvoiceStatus {
  // net === 0 means the invoice has been fully conceded/waived; treat as paid.
  if (net === 0 || (paid >= net && net > 0)) return 'paid';
  if (paid > 0) return 'partial';
  return 'unpaid';
}

/**
 * Refund maths: given an invoice's net + amount already paid and a requested
 * refund, return the clamped refund and the resulting paid/due/status. The refund
 * can never exceed `paidBefore` (you can't refund money never collected) nor drop
 * paid below 0; `dueAfter` and `status` are re-derived so a full refund correctly
 * flips a `paid` invoice back to unpaid/partial.
 */
export function refundOutcome(
  net: number,
  paidBefore: number,
  requested: number,
): { applied: number; paidAfter: number; dueAfter: number; status: InvoiceStatus } {
  const paid0 = Math.max(0, paidBefore);
  const applied = Math.min(Math.max(0, requested), paid0);
  const paidAfter = Math.max(0, paid0 - applied);
  const dueAfter = Math.max(0, net - paidAfter);
  return { applied, paidAfter, dueAfter, status: statusFor(net, paidAfter) };
}

export interface ReconcileSummary {
  /** Cleared collections in the period (excludes bounced/refunded). */
  collected: number;
  /** Collections booked against an invoice (`invoiceId` set). */
  matched: number;
  /** Collections with no linked invoice (general/advance receipts). */
  unmatched: number;
  /** Count of cleared receipts in the period. */
  receipts: number;
  matchedCount: number;
  unmatchedCount: number;
  /** Pending (uncleared) collections in the period (cheques in clearing etc.). */
  pending: number;
  pendingCount: number;
  /** Bounced receipts in the period. */
  bounced: number;
  bouncedCount: number;
}

/**
 * Pure period reconciliation over a set of payments. "Matched" = receipts linked to
 * an invoice; "unmatched" = receipts with no `invoiceId` (general/advance money that
 * still needs allocating). Only `cleared` receipts count toward collected/matched/
 * unmatched; pending and bounced are tallied separately. Refunds are tracked
 * separately (`fee_refunds`) so a `refunded` payment status is ignored here.
 */
export function reconcileSummary(payments: Pick<FeePayment, 'amount' | 'status' | 'invoiceId'>[]): ReconcileSummary {
  const s: ReconcileSummary = {
    collected: 0, matched: 0, unmatched: 0, receipts: 0, matchedCount: 0, unmatchedCount: 0,
    pending: 0, pendingCount: 0, bounced: 0, bouncedCount: 0,
  };
  for (const p of payments) {
    const amt = p.amount || 0;
    if (p.status === 'pending') { s.pending += amt; s.pendingCount++; continue; }
    if (p.status === 'bounced') { s.bounced += amt; s.bouncedCount++; continue; }
    if (p.status === 'refunded') continue;
    s.collected += amt;
    s.receipts++;
    if (p.invoiceId) { s.matched += amt; s.matchedCount++; }
    else { s.unmatched += amt; s.unmatchedCount++; }
  }
  return s;
}

/** Sum the outstanding (due) across a set of invoices, ignoring cancelled. Pure. */
export function outstandingTotal(invoices: Pick<FeeInvoice, 'netAmount' | 'paidAmount' | 'status'>[]): number {
  let due = 0;
  for (const i of invoices) {
    if (i.status === 'cancelled') continue;
    due += Math.max(0, (i.netAmount ?? 0) - (i.paidAmount ?? 0));
  }
  return due;
}
