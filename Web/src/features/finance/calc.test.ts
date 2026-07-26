import { describe, it, expect } from 'vitest';
import { statusFor, refundOutcome, reconcileSummary, outstandingTotal } from './calc';
import type { FeePayment, FeeInvoice } from '@/types/finance';

/**
 * Pure finance-maths tests (refund clamping + status re-derivation, period
 * reconciliation, outstanding aggregation). These import ONLY `./calc` (no
 * Firebase), so they run in the plain node vitest env.
 */

describe('statusFor', () => {
  it('is paid when net is fully covered', () => {
    expect(statusFor(1000, 1000)).toBe('paid');
    expect(statusFor(1000, 1500)).toBe('paid'); // overpaid still paid
  });
  it('is partial when something but not all is paid', () => {
    expect(statusFor(1000, 400)).toBe('partial');
  });
  it('is unpaid when nothing is paid', () => {
    expect(statusFor(1000, 0)).toBe('unpaid');
  });
  it('treats a fully-conceded (net 0) invoice as paid', () => {
    expect(statusFor(0, 0)).toBe('paid');
  });
});

describe('refundOutcome — clamping', () => {
  it('refunds within what was paid and re-derives a partial balance', () => {
    // net 1000, paid 1000, refund 300 → paid 700, due 300, partial.
    const r = refundOutcome(1000, 1000, 300);
    expect(r.applied).toBe(300);
    expect(r.paidAfter).toBe(700);
    expect(r.dueAfter).toBe(300);
    expect(r.status).toBe('partial');
  });

  it('a full refund flips a paid invoice back to unpaid', () => {
    const r = refundOutcome(1000, 1000, 1000);
    expect(r.applied).toBe(1000);
    expect(r.paidAfter).toBe(0);
    expect(r.dueAfter).toBe(1000);
    expect(r.status).toBe('unpaid');
  });

  it('never refunds more than was paid (clamps to paidBefore)', () => {
    // Only 400 collected; a 1000 request can only refund 400.
    const r = refundOutcome(1000, 400, 1000);
    expect(r.applied).toBe(400);
    expect(r.paidAfter).toBe(0);
    expect(r.dueAfter).toBe(1000);
    expect(r.status).toBe('unpaid');
  });

  it('never drives paid below zero and ignores a negative request', () => {
    const r = refundOutcome(1000, 500, -200);
    expect(r.applied).toBe(0);
    expect(r.paidAfter).toBe(500);
    expect(r.dueAfter).toBe(500);
    expect(r.status).toBe('partial');
  });

  it('refunding against a net-0 (fully conceded but paid) invoice clears the payment', () => {
    // Edge: net 0, paid 200 (e.g. an overpay on a waived invoice) → refund 200.
    const r = refundOutcome(0, 200, 200);
    expect(r.applied).toBe(200);
    expect(r.paidAfter).toBe(0);
    expect(r.dueAfter).toBe(0);
    expect(r.status).toBe('paid'); // net 0 is always 'paid'
  });
});

/* --------------------------- Reconciliation --------------------------- */

function pay(over: Partial<Pick<FeePayment, 'amount' | 'status' | 'invoiceId'>>): Pick<FeePayment, 'amount' | 'status' | 'invoiceId'> {
  return { amount: over.amount ?? 0, status: over.status ?? 'cleared', invoiceId: over.invoiceId };
}

describe('reconcileSummary', () => {
  it('splits cleared receipts into matched (has invoice) and unmatched (none)', () => {
    const s = reconcileSummary([
      pay({ amount: 1000, status: 'cleared', invoiceId: 'inv1' }),
      pay({ amount: 500, status: 'cleared', invoiceId: 'inv2' }),
      pay({ amount: 300, status: 'cleared' }), // unmatched / general
    ]);
    expect(s.collected).toBe(1800);
    expect(s.matched).toBe(1500);
    expect(s.unmatched).toBe(300);
    expect(s.receipts).toBe(3);
    expect(s.matchedCount).toBe(2);
    expect(s.unmatchedCount).toBe(1);
  });

  it('tallies pending and bounced separately and excludes them from collected', () => {
    const s = reconcileSummary([
      pay({ amount: 1000, status: 'cleared', invoiceId: 'inv1' }),
      pay({ amount: 800, status: 'pending', invoiceId: 'inv2' }),
      pay({ amount: 200, status: 'bounced', invoiceId: 'inv3' }),
    ]);
    expect(s.collected).toBe(1000);
    expect(s.pending).toBe(800);
    expect(s.pendingCount).toBe(1);
    expect(s.bounced).toBe(200);
    expect(s.bouncedCount).toBe(1);
  });

  it('ignores refunded payments entirely (refunds are tracked separately)', () => {
    const s = reconcileSummary([
      pay({ amount: 1000, status: 'cleared', invoiceId: 'inv1' }),
      pay({ amount: 1000, status: 'refunded', invoiceId: 'inv1' }),
    ]);
    expect(s.collected).toBe(1000);
    expect(s.receipts).toBe(1);
  });

  it('is all-zero for no payments', () => {
    const s = reconcileSummary([]);
    expect(s).toEqual({
      collected: 0, matched: 0, unmatched: 0, receipts: 0, matchedCount: 0, unmatchedCount: 0,
      pending: 0, pendingCount: 0, bounced: 0, bouncedCount: 0,
    });
  });
});

describe('outstandingTotal', () => {
  function inv(over: Partial<Pick<FeeInvoice, 'netAmount' | 'paidAmount' | 'status'>>): Pick<FeeInvoice, 'netAmount' | 'paidAmount' | 'status'> {
    return { netAmount: over.netAmount ?? 0, paidAmount: over.paidAmount ?? 0, status: over.status ?? 'unpaid' };
  }

  it('sums net − paid across invoices, never negative', () => {
    expect(outstandingTotal([
      inv({ netAmount: 1000, paidAmount: 400, status: 'partial' }),
      inv({ netAmount: 500, paidAmount: 500, status: 'paid' }), // 0 due
      inv({ netAmount: 800, paidAmount: 1000, status: 'paid' }), // overpaid → 0, not negative
    ])).toBe(600);
  });

  it('ignores cancelled invoices', () => {
    expect(outstandingTotal([
      inv({ netAmount: 1000, paidAmount: 0, status: 'cancelled' }),
      inv({ netAmount: 700, paidAmount: 200, status: 'partial' }),
    ])).toBe(500);
  });
});
