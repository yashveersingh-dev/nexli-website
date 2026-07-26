import {
  addDoc, collection, deleteDoc, deleteField, doc, getDoc, getDocs, orderBy, query, runTransaction,
  serverTimestamp, setDoc, updateDoc, where, writeBatch, limit as fsLimit, type FieldValue, type QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { tenantCol, tenantDoc, useCollection, useDocument } from '@/lib/db';
import { writeAuditEvent, type AuditAction } from '@/lib/audit';
import type {
  FeeHead, FeeStructure, FeeInvoice, FeePayment, FeeRefund, FinanceSettings, InvoiceStatus, ConcessionLine,
  Requisition, RequisitionStatus, Vendor, PurchaseOrder, GoodsReceipt, Expense,
  ExpenseSettings, ApprovalRule,
  SalaryStructure, PayrollRun, PayrollRunStatus, Payslip,
} from '@/types/finance';
// Pure finance maths live in the Firebase-free `./calc` module (testable in the
// node vitest env without initializing Firestore). Re-exported so existing
// `@/features/finance/data` imports of these keep working unchanged.
import { statusFor, refundOutcome, reconcileSummary, outstandingTotal } from './calc';
export { statusFor, refundOutcome, reconcileSummary, outstandingTotal };
export type { ReconcileSummary } from './calc';

/**
 * Shared Finance (P5) data layer. Tenant-scoped collections under
 * `schools/{schoolId}/…`. All finance modules (fees, expense & procurement,
 * payroll) read/write through here. `schoolId` from `useSession()`;
 * `actor = { uid, name }`. Money is whole INR rupees.
 */
export interface Actor { uid: string; name?: string }

/* `updateIn`/`stripUndefined` drops `undefined` fields, so a plain `undefined`
 * will NOT clear a stored field. To actually remove one (e.g. clear
 * `submittedAt` on a payroll Return, or a stale clarification note), pass
 * Firestore's `deleteField()` sentinel — it survives the strip and deletes. */
type Clearable<T> = { [K in keyof T]?: T[K] | FieldValue };

function stripUndefined<T extends object>(o: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined) out[k as keyof T] = v as T[keyof T];
  return out;
}

export async function createIn<T extends object>(schoolId: string, sub: string, data: T, actor: Actor, audit?: { action: AuditAction; targetType?: string; summary?: string }): Promise<string> {
  const ref = await addDoc(tenantCol(schoolId, sub), { ...stripUndefined(data), schoolId, createdAt: Date.now(), createdBy: actor.uid, serverCreatedAt: serverTimestamp(), version: 1 });
  if (audit) void writeAuditEvent({ action: audit.action, schoolId, actor, targetType: audit.targetType, targetId: ref.id, summary: audit.summary });
  return ref.id;
}
export async function setIn<T extends object>(schoolId: string, sub: string, id: string, data: T, actor: Actor, audit?: { action: AuditAction; targetType?: string; summary?: string }): Promise<void> {
  await setDoc(tenantDoc(schoolId, sub, id), { ...stripUndefined(data), schoolId, lastModifiedAt: Date.now(), lastModifiedBy: actor.uid }, { merge: true });
  if (audit) void writeAuditEvent({ action: audit.action, schoolId, actor, targetType: audit.targetType, targetId: id, summary: audit.summary });
}
export async function updateIn<T extends object>(schoolId: string, sub: string, id: string, patch: Partial<T>, actor: Actor, audit?: { action: AuditAction; targetType?: string; summary?: string }): Promise<void> {
  await updateDoc(tenantDoc(schoolId, sub, id), { ...stripUndefined(patch), lastModifiedAt: Date.now(), lastModifiedBy: actor.uid });
  if (audit) void writeAuditEvent({ action: audit.action, schoolId, actor, targetType: audit.targetType, targetId: id, summary: audit.summary });
}
export async function removeIn(schoolId: string, sub: string, id: string, actor: Actor, audit?: { action: AuditAction; targetType?: string }): Promise<void> {
  await deleteDoc(tenantDoc(schoolId, sub, id));
  if (audit) void writeAuditEvent({ action: audit.action, schoolId, actor, targetType: audit.targetType, targetId: id });
}

const pad = (n: number, w = 4) => String(n).padStart(w, '0');

/* ============================ Fees ============================ */

export function useFeeHeads(schoolId?: string) {
  return useCollection<FeeHead>(schoolId ? tenantCol(schoolId, 'fee_heads') : null, [schoolId]);
}
export const createFeeHead = (s: string, d: Omit<FeeHead, 'id'>, a: Actor) => createIn(s, 'fee_heads', d, a, { action: 'fee.head_created', targetType: 'fee_head', summary: d.name });
export const updateFeeHead = (s: string, id: string, p: Partial<FeeHead>, a: Actor) => updateIn(s, 'fee_heads', id, p, a, { action: 'fee.updated', targetType: 'fee_head' });
export const deleteFeeHead = (s: string, id: string, a: Actor) => removeIn(s, 'fee_heads', id, a, { action: 'fee.head_deleted', targetType: 'fee_head' });

export function useFeeStructures(schoolId?: string) {
  return useCollection<FeeStructure>(schoolId ? tenantCol(schoolId, 'fee_structures') : null, [schoolId]);
}
export function useFeeStructure(schoolId?: string, id?: string) {
  return useDocument<FeeStructure>(schoolId && id ? tenantDoc(schoolId, 'fee_structures', id) : null);
}
export const createFeeStructure = (s: string, d: Omit<FeeStructure, 'id'>, a: Actor) => createIn(s, 'fee_structures', d, a, { action: 'fee.structure_created', targetType: 'fee_structure', summary: d.name });
export const updateFeeStructure = (s: string, id: string, p: Partial<FeeStructure>, a: Actor) => updateIn(s, 'fee_structures', id, p, a, { action: 'fee.updated', targetType: 'fee_structure' });
export const deleteFeeStructure = (s: string, id: string, a: Actor) => removeIn(s, 'fee_structures', id, a, { action: 'fee.structure_deleted', targetType: 'fee_structure' });

export function useInvoices(schoolId?: string, studentId?: string) {
  return useCollection<FeeInvoice>(
    schoolId ? (studentId ? query(tenantCol(schoolId, 'fee_invoices'), where('studentId', '==', studentId)) : tenantCol(schoolId, 'fee_invoices')) : null,
    [schoolId, studentId],
  );
}
export function useInvoice(schoolId?: string, id?: string) {
  return useDocument<FeeInvoice>(schoolId && id ? tenantDoc(schoolId, 'fee_invoices', id) : null);
}

/**
 * Invoices scoped to one academic year (`where('academicYear','==',year)`) — the
 * realistic working set for a fee-ledger screen, avoiding a full `fee_invoices`
 * read across every prior year. When `academicYear` is undefined this falls back to
 * the full collection (identical to `useInvoices`) so callers that don't yet know
 * the year keep working unchanged. Per-year billed/paid/due stays correct.
 */
export function useInvoicesByYear(schoolId?: string, academicYear?: string) {
  return useCollection<FeeInvoice>(
    schoolId ? (academicYear ? query(tenantCol(schoolId, 'fee_invoices'), where('academicYear', '==', academicYear)) : tenantCol(schoolId, 'fee_invoices')) : null,
    [schoolId, academicYear],
  );
}
export const createInvoice = (s: string, d: Omit<FeeInvoice, 'id'>, a: Actor) => createIn(s, 'fee_invoices', d, a, { action: 'fee.invoice_created', targetType: 'fee_invoice', summary: `${d.studentName} · ${d.title}` });
export const updateInvoice = (s: string, id: string, p: Partial<FeeInvoice>, a: Actor) => updateIn(s, 'fee_invoices', id, p, a, { action: 'fee.updated', targetType: 'fee_invoice' });

/**
 * Cancel an invoice — but ONLY when nothing has been collected against it.
 * Cancelling drops the invoice from `studentDue`, so cancelling one that already
 * carries payments would orphan those receipts (the money becomes invisible /
 * un-reconcilable). Reading the invoice in a transaction guarantees we decide on
 * the current `paidAmount`, not a stale UI snapshot. If a paid invoice truly must
 * be voided, record a refund first (settling `paidAmount` back to 0).
 */
export async function cancelInvoice(s: string, id: string, a: Actor): Promise<void> {
  const ref = tenantDoc(s, 'fee_invoices', id);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('This invoice no longer exists.');
    const inv = snap.data() as FeeInvoice;
    if (inv.status === 'cancelled') return; // idempotent
    if ((inv.paidAmount ?? 0) > 0) {
      throw new Error('This invoice has payments recorded against it and cannot be cancelled. Refund the collected amount first, then cancel.');
    }
    tx.update(ref, { status: 'cancelled' as InvoiceStatus, lastModifiedAt: Date.now(), lastModifiedBy: a.uid });
  });
  void writeAuditEvent({ action: 'fee.invoice_cancelled', schoolId: s, actor: a, targetType: 'fee_invoice', targetId: id });
}

/**
 * Apply a concession line to an invoice atomically. Two cashiers conceding the
 * same invoice at once would otherwise each read a stale `concessions` array and
 * overwrite the other (losing a line) or push the net below zero. The transaction
 * re-reads the CURRENT invoice, appends to its live concessions, caps the line at
 * the remaining concedable gross, recomputes net (floored at 0) and re-derives
 * paid/due/status from the live `paidAmount`. Returns the new net amount.
 */
export async function applyConcession(
  s: string,
  invoiceId: string,
  line: ConcessionLine,
  a: Actor,
): Promise<number> {
  if ((line.amount ?? 0) <= 0) throw new Error('Concession amount must be positive.');
  const ref = tenantDoc(s, 'fee_invoices', invoiceId);
  const net = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('This invoice no longer exists.');
    const inv = snap.data() as FeeInvoice;
    if (inv.status === 'cancelled') throw new Error('This invoice is cancelled — concessions cannot be applied.');
    const gross = inv.grossAmount ?? 0;
    const existing = inv.concessions ?? [];
    const usedConcession = existing.reduce((sum, c) => sum + (c.amount || 0), 0);
    // Cap against the concedable gross still remaining (current, not a UI snapshot).
    const remaining = Math.max(0, gross - usedConcession);
    if (line.amount > remaining) {
      throw new Error(`Concession of ₹${line.amount} exceeds the ₹${remaining} still concedable on this invoice.`);
    }
    const concessions = [...existing, line];
    const concessionAmount = usedConcession + line.amount;
    const netAmount = Math.max(0, gross - concessionAmount);
    const paid = inv.paidAmount ?? 0;
    tx.update(ref, {
      concessions, grossAmount: gross, concessionAmount, netAmount,
      dueAmount: Math.max(0, netAmount - paid), status: statusFor(netAmount, paid),
      lastModifiedAt: Date.now(), lastModifiedBy: a.uid,
    });
    return netAmount;
  });
  void writeAuditEvent({ action: 'fee.updated', schoolId: s, actor: a, targetType: 'fee_invoice', targetId: invoiceId, summary: `Concession ₹${line.amount}` });
  return net;
}

export function usePayments(schoolId?: string, studentId?: string) {
  return useCollection<FeePayment>(
    schoolId ? (studentId ? query(tenantCol(schoolId, 'fee_payments'), where('studentId', '==', studentId)) : tenantCol(schoolId, 'fee_payments')) : null,
    [schoolId, studentId],
  );
}
export function usePayment(schoolId?: string, id?: string) {
  return useDocument<FeePayment>(schoolId && id ? tenantDoc(schoolId, 'fee_payments', id) : null);
}

/**
 * Open (unsettled) invoices only — `status in (unpaid, partial, overdue)`. Fully
 * paid and cancelled invoices contribute 0 to outstanding and never make a student
 * a defaulter, so excluding them server-side does NOT change Outstanding/Defaulter
 * totals while avoiding a full `fee_invoices` read (paid/cancelled invoices, the
 * bulk over time, are never fetched). Use for collection dashboards.
 */
export function useOpenInvoices(schoolId?: string) {
  return useCollection<FeeInvoice>(
    schoolId ? query(tenantCol(schoolId, 'fee_invoices'), where('status', 'in', ['unpaid', 'partial', 'overdue'] as InvoiceStatus[])) : null,
    [schoolId],
  );
}

/**
 * Payments on/after a cutoff timestamp (`paidAt >= since`). Scopes the collected
 * KPIs (today / this month) to the period they actually display instead of reading
 * the whole payment history. `since` is epoch-ms; the listener re-subscribes when it
 * changes (keep it stable, e.g. start-of-month, not Date.now()).
 */
export function usePaymentsSince(schoolId?: string, since?: number) {
  return useCollection<FeePayment>(
    schoolId && since != null ? query(tenantCol(schoolId, 'fee_payments'), where('paidAt', '>=', since)) : null,
    [schoolId, since],
  );
}

/** Most-recent payments (newest first, capped). Bounded read for "recent activity" lists. */
export function useRecentPayments(schoolId?: string, max = 6) {
  return useCollection<FeePayment>(
    schoolId ? query(tenantCol(schoolId, 'fee_payments'), orderBy('paidAt', 'desc'), fsLimit(max)) : null,
    [schoolId, max],
  );
}

/**
 * Payments within a half-open period `[from, to)` (`paidAt >= from && < to`).
 * Scopes a reconciliation view to one month/term instead of the whole history.
 * Both bounds are epoch-ms; keep them stable (derived from the selected period) so
 * the listener doesn't thrash.
 */
export function usePaymentsBetween(schoolId?: string, from?: number, to?: number) {
  return useCollection<FeePayment>(
    schoolId && from != null && to != null
      ? query(tenantCol(schoolId, 'fee_payments'), where('paidAt', '>=', from), where('paidAt', '<', to))
      : null,
    [schoolId, from, to],
  );
}

export interface RecordPaymentInput {
  studentId: string;
  studentName: string;
  admissionNo?: string;
  invoiceId?: string;
  invoiceTitle?: string;
  amount: number;
  method: FeePayment['method'];
  reference?: string;
  bankName?: string;
  paidAt: number;
  status?: FeePayment['status'];
  note?: string;
  receiptPrefix?: string;
}

/**
 * Records a manual payment atomically: increments the receipt counter, writes the
 * payment with a unique receipt number, and (when linked) updates the invoice's
 * paid/due/status — all in a single transaction so totals never drift.
 */
export async function recordPayment(schoolId: string, input: RecordPaymentInput, actor: Actor): Promise<{ id: string; receiptNo: string }> {
  if (input.amount <= 0) throw new Error(`Payment amount must be positive (got ${input.amount}).`);
  const counterRef = tenantDoc(schoolId, 'finance_counters', 'receipt');
  const paymentRef = doc(collection(db, `schools/${schoolId}/fee_payments`));
  const year = new Date(input.paidAt).getFullYear();
  const prefix = (input.receiptPrefix || 'RC').replace(/[^A-Za-z0-9-]/g, '');

  const receiptNo = await runTransaction(db, async (tx) => {
    const counterSnap = await tx.get(counterRef);
    const next = ((counterSnap.data()?.value as number | undefined) ?? 0) + 1;
    const rcpt = `${prefix}-${year}-${pad(next)}`;

    let invoicePatch: { ref: ReturnType<typeof tenantDoc>; data: Record<string, unknown> } | null = null;
    if (input.invoiceId) {
      const invRef = tenantDoc(schoolId, 'fee_invoices', input.invoiceId);
      const invSnap = await tx.get(invRef);
      if (invSnap.exists()) {
        const inv = invSnap.data() as FeeInvoice;
        // Never re-open a cancelled invoice: `statusFor` only ever returns
        // unpaid/partial/paid, so applying it here would silently revive a
        // cancelled demand. Record the receipt, but leave the invoice untouched.
        if (inv.status !== 'cancelled') {
          const net = inv.netAmount ?? 0;
          const alreadyPaid = inv.paidAmount ?? 0;
          // Overpayment guard (authoritative — the UI guard can be bypassed by a
          // race or direct API call). Read-in-transaction means `alreadyPaid` is
          // current, so cumulative paid can never exceed the invoice net. There is
          // no advance/credit-balance ledger, so reject rather than silently
          // booking the excess against this demand.
          const due = Math.max(0, net - alreadyPaid);
          if (input.amount > due) {
            throw new Error(`Payment of ₹${input.amount} exceeds the ₹${due} still due on this invoice. Reduce the amount or record it as a general payment.`);
          }
          const paid = alreadyPaid + input.amount;
          invoicePatch = {
            ref: invRef,
            data: { paidAmount: paid, dueAmount: Math.max(0, net - paid), status: statusFor(net, paid), lastModifiedAt: Date.now(), lastModifiedBy: actor.uid },
          };
        }
      }
    }

    tx.set(counterRef, { value: next, schoolId }, { merge: true });
    tx.set(paymentRef, stripUndefined({
      receiptNo: rcpt,
      studentId: input.studentId,
      studentName: input.studentName,
      admissionNo: input.admissionNo,
      invoiceId: input.invoiceId,
      invoiceTitle: input.invoiceTitle,
      amount: input.amount,
      method: input.method,
      reference: input.reference,
      bankName: input.bankName,
      paidAt: input.paidAt,
      status: input.status ?? 'cleared',
      note: input.note,
      recordedByUid: actor.uid,
      recordedByName: actor.name,
      schoolId,
      createdAt: Date.now(),
      createdBy: actor.uid,
      version: 1,
    }));
    if (invoicePatch) tx.update(invoicePatch.ref, invoicePatch.data);
    return rcpt;
  });

  void writeAuditEvent({ action: 'fee.payment_recorded', schoolId, actor, targetType: 'fee_payment', targetId: paymentRef.id, summary: `${receiptNo} · ${input.studentName} · ₹${input.amount}` });
  return { id: paymentRef.id, receiptNo };
}

export function updatePayment(s: string, id: string, p: Partial<FeePayment>, a: Actor) {
  return updateIn(s, 'fee_payments', id, p, a, { action: 'fee.updated', targetType: 'fee_payment' });
}

/* ---------------------------- Refunds ---------------------------- */

export function useRefunds(schoolId?: string, studentId?: string) {
  return useCollection<FeeRefund>(
    schoolId ? (studentId ? query(tenantCol(schoolId, 'fee_refunds'), where('studentId', '==', studentId)) : tenantCol(schoolId, 'fee_refunds')) : null,
    [schoolId, studentId],
  );
}

export interface RecordRefundInput {
  studentId: string;
  studentName: string;
  admissionNo?: string;
  /** When set, the refund reduces this invoice's paidAmount and re-derives status. */
  invoiceId?: string;
  invoiceTitle?: string;
  paymentId?: string;
  receiptNo?: string;
  amount: number;
  method: FeeRefund['method'];
  reason: string;
  reference?: string;
  refundedAt: number;
  note?: string;
  refundPrefix?: string;
}

/**
 * Record a refund atomically (mirrors `recordPayment`). In ONE transaction it
 * increments a refund counter for a unique refund number, writes the `fee_refunds`
 * record, and — when linked to an invoice — reduces that invoice's `paidAmount`
 * (clamped so it never goes below 0 and the refund never exceeds what was actually
 * collected) and re-derives due/status via `refundOutcome`. Reading the invoice
 * inside the transaction means the cap is against the CURRENT paid amount, so two
 * concurrent refunds can't together refund more than was paid. Returns the new id
 * + refund number and the amount actually applied (after clamping).
 */
export async function recordRefund(schoolId: string, input: RecordRefundInput, actor: Actor): Promise<{ id: string; refundNo: string; applied: number }> {
  if (input.amount <= 0) throw new Error(`Refund amount must be positive (got ${input.amount}).`);
  if (!input.reason.trim()) throw new Error('A refund reason is required.');
  const counterRef = tenantDoc(schoolId, 'finance_counters', 'refund');
  const refundRef = doc(collection(db, `schools/${schoolId}/fee_refunds`));
  const year = new Date(input.refundedAt).getFullYear();
  const prefix = (input.refundPrefix || 'RF').replace(/[^A-Za-z0-9-]/g, '');

  const result = await runTransaction(db, async (tx) => {
    const counterSnap = await tx.get(counterRef);
    const next = ((counterSnap.data()?.value as number | undefined) ?? 0) + 1;
    const refundNo = `${prefix}-${year}-${pad(next)}`;

    let applied = input.amount;
    let invoicePatch: { ref: ReturnType<typeof tenantDoc>; data: Record<string, unknown> } | null = null;
    if (input.invoiceId) {
      const invRef = tenantDoc(schoolId, 'fee_invoices', input.invoiceId);
      const invSnap = await tx.get(invRef);
      if (!invSnap.exists()) throw new Error('The linked invoice no longer exists.');
      const inv = invSnap.data() as FeeInvoice;
      const net = inv.netAmount ?? 0;
      const paid = inv.paidAmount ?? 0;
      if (paid <= 0) throw new Error('Nothing has been collected on this invoice, so there is nothing to refund.');
      if (input.amount > paid) {
        throw new Error(`Refund of ₹${input.amount} exceeds the ₹${paid} collected on this invoice.`);
      }
      const outcome = refundOutcome(net, paid, input.amount);
      applied = outcome.applied;
      invoicePatch = {
        ref: invRef,
        data: { paidAmount: outcome.paidAfter, dueAmount: outcome.dueAfter, status: outcome.status, lastModifiedAt: Date.now(), lastModifiedBy: actor.uid },
      };
    }

    tx.set(counterRef, { value: next, schoolId }, { merge: true });
    tx.set(refundRef, stripUndefined({
      refundNo,
      studentId: input.studentId,
      studentName: input.studentName,
      admissionNo: input.admissionNo,
      invoiceId: input.invoiceId,
      invoiceTitle: input.invoiceTitle,
      paymentId: input.paymentId,
      receiptNo: input.receiptNo,
      amount: applied,
      method: input.method,
      reason: input.reason.trim(),
      reference: input.reference,
      refundedAt: input.refundedAt,
      refundedByUid: actor.uid,
      refundedByName: actor.name,
      note: input.note,
      schoolId,
      createdAt: Date.now(),
      createdBy: actor.uid,
      version: 1,
    }));
    if (invoicePatch) tx.update(invoicePatch.ref, invoicePatch.data);
    return { refundNo, applied };
  });

  void writeAuditEvent({ action: 'fee.refund_recorded', schoolId, actor, targetType: 'fee_refund', targetId: refundRef.id, summary: `${result.refundNo} · ${input.studentName} · ₹${result.applied}` });
  return { id: refundRef.id, ...result };
}

export function useFinanceSettings(schoolId?: string) {
  return useDocument<FinanceSettings & { id: string }>(schoolId ? tenantDoc(schoolId, 'finance_settings', 'main') : null);
}
export const saveFinanceSettings = (s: string, d: FinanceSettings, a: Actor) => setIn(s, 'finance_settings', 'main', d, a, { action: 'settings.changed', targetType: 'finance_settings' });

/* ==================== Expense & procurement ==================== */

export function useRequisitions(schoolId?: string) {
  return useCollection<Requisition>(schoolId ? tenantCol(schoolId, 'requisitions') : null, [schoolId]);
}
export function useRequisition(schoolId?: string, id?: string) {
  return useDocument<Requisition>(schoolId && id ? tenantDoc(schoolId, 'requisitions', id) : null);
}
export const createRequisition = (s: string, d: Omit<Requisition, 'id'>, a: Actor) => createIn(s, 'requisitions', d, a, { action: 'requisition.created', targetType: 'requisition', summary: d.title });
export const updateRequisition = (s: string, id: string, p: Partial<Requisition>, a: Actor) => updateIn(s, 'requisitions', id, p, a, { action: 'requisition.updated', targetType: 'requisition' });
export const deleteRequisition = (s: string, id: string, a: Actor) => removeIn(s, 'requisitions', id, a, { action: 'requisition.deleted', targetType: 'requisition' });

/* ---- Requisition approval workflow (configurable per school) ----
 * The four approver actions stamp the deciding member + time + a note onto the
 * requisition and move it to the matching status. Each writes its own audit
 * event. `clearClarification` is used when a returned/clarification request is
 * answered, so a stale note never lingers. */
export type RequisitionDecision = 'approve' | 'reject' | 'clarify' | 'return';

const DECISION_STATUS: Record<RequisitionDecision, RequisitionStatus> = {
  approve: 'approved',
  reject: 'rejected',
  clarify: 'clarification_requested',
  return: 'returned',
};

const DECISION_AUDIT: Record<RequisitionDecision, AuditAction> = {
  approve: 'requisition.approved',
  reject: 'requisition.rejected',
  clarify: 'requisition.clarification_requested',
  return: 'requisition.returned',
};

/**
 * Apply an approver decision to a requisition. Stamps the decider/time/note and
 * (for clarify) the outstanding question; approve/reject clear any open question.
 */
export function decideRequisition(
  s: string, id: string, decision: RequisitionDecision, note: string, a: Actor,
): Promise<void> {
  const trimmed = note.trim();
  // `updateIn` strips `undefined`, so use `deleteField()` to actually clear a
  // stored note (otherwise a stale clarification would linger after approval).
  const patch: Clearable<Requisition> = {
    status: DECISION_STATUS[decision],
    approverUid: a.uid,
    approverName: a.name,
    decidedByName: a.name,
    decidedAt: Date.now(),
    approvalNote: trimmed || deleteField(),
    decisionNote: trimmed || deleteField(),
    // Only a clarify request keeps an outstanding question; others resolve it.
    clarificationNote: decision === 'clarify' ? (trimmed || deleteField()) : deleteField(),
  };
  return updateIn(s, 'requisitions', id, patch as Partial<Requisition>, a, { action: DECISION_AUDIT[decision], targetType: 'requisition' });
}

export function useExpenseSettings(schoolId?: string) {
  return useDocument<ExpenseSettings & { id: string }>(schoolId ? tenantDoc(schoolId, 'expense_settings', 'main') : null);
}
export const saveExpenseSettings = (s: string, d: ExpenseSettings, a: Actor) => setIn(s, 'expense_settings', 'main', d, a, { action: 'settings.changed', targetType: 'expense_settings' });

/**
 * Pick the approval rule that applies to a given estimated total. Rules are
 * matched in order; a rule with no min/max acts as a catch-all. Returns null
 * when no rule matches (e.g. empty config → simple single-step approval).
 */
export function matchApprovalRule(rules: ApprovalRule[] | undefined, estTotal: number): ApprovalRule | null {
  if (!rules?.length) return null;
  for (const r of rules) {
    const minOk = r.minAmount == null || estTotal >= r.minAmount;
    const maxOk = r.maxAmount == null || estTotal <= r.maxAmount;
    if (minOk && maxOk) return r;
  }
  return null;
}

export function useVendors(schoolId?: string) {
  return useCollection<Vendor>(schoolId ? tenantCol(schoolId, 'vendors') : null, [schoolId]);
}
export const createVendor = (s: string, d: Omit<Vendor, 'id'>, a: Actor) => createIn(s, 'vendors', d, a, { action: 'vendor.created', targetType: 'vendor', summary: d.name });
export const updateVendor = (s: string, id: string, p: Partial<Vendor>, a: Actor) => updateIn(s, 'vendors', id, p, a, { action: 'vendor.updated', targetType: 'vendor' });
export const deleteVendor = (s: string, id: string, a: Actor) => removeIn(s, 'vendors', id, a, { action: 'vendor.deleted', targetType: 'vendor' });

export function usePurchaseOrders(schoolId?: string) {
  return useCollection<PurchaseOrder>(schoolId ? tenantCol(schoolId, 'purchase_orders') : null, [schoolId]);
}
export function usePurchaseOrder(schoolId?: string, id?: string) {
  return useDocument<PurchaseOrder>(schoolId && id ? tenantDoc(schoolId, 'purchase_orders', id) : null);
}
export const createPurchaseOrder = (s: string, d: Omit<PurchaseOrder, 'id'>, a: Actor) => createIn(s, 'purchase_orders', d, a, { action: 'po.created', targetType: 'purchase_order', summary: d.poNo });
export const updatePurchaseOrder = (s: string, id: string, p: Partial<PurchaseOrder>, a: Actor) => updateIn(s, 'purchase_orders', id, p, a, { action: 'po.updated', targetType: 'purchase_order' });
export const deletePurchaseOrder = (s: string, id: string, a: Actor) => removeIn(s, 'purchase_orders', id, a, { action: 'po.deleted', targetType: 'purchase_order' });

export function useGoodsReceipts(schoolId?: string, poId?: string) {
  return useCollection<GoodsReceipt>(
    schoolId ? (poId ? query(tenantCol(schoolId, 'goods_receipts'), where('poId', '==', poId)) : tenantCol(schoolId, 'goods_receipts')) : null,
    [schoolId, poId],
  );
}
export const createGoodsReceipt = (s: string, d: Omit<GoodsReceipt, 'id'>, a: Actor) => createIn(s, 'goods_receipts', d, a, { action: 'grn.created', targetType: 'goods_receipt', summary: d.grnNo });

/**
 * Record a goods receipt AND update its purchase order (per-line receivedQty +
 * status) in ONE atomic `writeBatch`. Previously these were two sequential writes,
 * so a failure after the GRN was created left the PO status/quantities stale
 * (received stock with the PO still showing "issued"). Returns the new GRN id.
 */
export async function recordGoodsReceipt(
  s: string,
  grn: Omit<GoodsReceipt, 'id'>,
  poId: string,
  poPatch: Partial<PurchaseOrder>,
  a: Actor,
): Promise<string> {
  const grnRef = doc(collection(db, `schools/${s}/goods_receipts`));
  const poRef = tenantDoc(s, 'purchase_orders', poId);
  const batch = writeBatch(db);
  batch.set(grnRef, { ...stripUndefined(grn), schoolId: s, createdAt: Date.now(), createdBy: a.uid, version: 1 });
  batch.update(poRef, { ...stripUndefined(poPatch), lastModifiedAt: Date.now(), lastModifiedBy: a.uid });
  await batch.commit();
  void writeAuditEvent({ action: 'grn.created', schoolId: s, actor: a, targetType: 'goods_receipt', targetId: grnRef.id, summary: grn.grnNo });
  return grnRef.id;
}

export function useExpenses(schoolId?: string) {
  return useCollection<Expense>(schoolId ? tenantCol(schoolId, 'expenses') : null, [schoolId]);
}
export const createExpense = (s: string, d: Omit<Expense, 'id'>, a: Actor) => createIn(s, 'expenses', d, a, { action: 'expense.recorded', targetType: 'expense', summary: `${d.description} · ₹${d.amount}` });
export const updateExpense = (s: string, id: string, p: Partial<Expense>, a: Actor) => updateIn(s, 'expenses', id, p, a, { action: 'expense.updated', targetType: 'expense' });
export const deleteExpense = (s: string, id: string, a: Actor) => removeIn(s, 'expenses', id, a, { action: 'expense.deleted', targetType: 'expense' });

/* ============================ Payroll ============================ */

export function useSalaryStructures(schoolId?: string) {
  return useCollection<SalaryStructure>(schoolId ? tenantCol(schoolId, 'salary_structures') : null, [schoolId]);
}
/** Salary structure doc id = staffId (one current structure per staff). */
export function useSalaryStructure(schoolId?: string, staffId?: string) {
  return useDocument<SalaryStructure>(schoolId && staffId ? tenantDoc(schoolId, 'salary_structures', staffId) : null);
}
export const saveSalaryStructure = (s: string, staffId: string, d: Omit<SalaryStructure, 'id'>, a: Actor) => setIn(s, 'salary_structures', staffId, d, a, { action: 'salary.structure_saved', targetType: 'salary_structure', summary: d.staffName });

export function usePayrollRuns(schoolId?: string) {
  return useCollection<PayrollRun>(schoolId ? tenantCol(schoolId, 'payroll_runs') : null, [schoolId]);
}
export function usePayrollRun(schoolId?: string, id?: string) {
  return useDocument<PayrollRun>(schoolId && id ? tenantDoc(schoolId, 'payroll_runs', id) : null);
}
/** Run doc id = `${year}-${mm}` (one run per month). */
export const payrollRunId = (year: number, month: number) => `${year}-${pad(month, 2)}`;
export const savePayrollRun = (s: string, id: string, d: Omit<PayrollRun, 'id'>, a: Actor) => setIn(s, 'payroll_runs', id, d, a, { action: 'payroll.run_saved', targetType: 'payroll_run', summary: d.label });
export const updatePayrollRun = (s: string, id: string, p: Partial<PayrollRun>, a: Actor) => updateIn(s, 'payroll_runs', id, p, a, { action: 'payroll.run_updated', targetType: 'payroll_run' });

/* ---- Payroll run approval workflow (ROLE_AUDIT §7c) ----
 * A run moves: draft → (HR/Accounts SUBMIT for approval) → awaiting approval
 * (still `draft` + `submittedAt`) → Principal/VP-Admin APPROVE (→ finalized) or
 * RETURN (→ draft, note kept) → Accounts DISBURSE / mark paid (→ paid). Each
 * action stamps its own fields + audit event. Pay totals are never touched. */

/** HR/Accounts submit a draft run for Principal/VP-Admin approval. Records the
 *  submitter so the same person can't later approve it (separation of duties). */
export const submitPayrollRun = (s: string, id: string, a: Actor) =>
  updateIn<PayrollRun>(s, 'payroll_runs', id, { submittedAt: Date.now(), submittedByUid: a.uid, submittedByName: a.name, approvalNote: deleteField() } as Clearable<PayrollRun> as Partial<PayrollRun>, a, { action: 'payroll.submitted', targetType: 'payroll_run' });

/**
 * Principal/VP-Admin approve a submitted run → finalized (ready to disburse).
 * Separation of duties: the person who submitted the run for approval may NOT
 * approve it — a different authorised approver must sign off. Enforced here (not
 * just in the UI) by reading the run and rejecting a self-approval.
 */
export async function approvePayrollRun(s: string, id: string, a: Actor, note?: string): Promise<void> {
  const ref = tenantDoc(s, 'payroll_runs', id);
  // Run the read + all guards + write inside one transaction so two approvers
  // can't both pass the status check and double-approve (or approve a run another
  // approver just finalized). The transaction re-reads on contention and retries.
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const run = snap.exists() ? (snap.data() as PayrollRun) : undefined;
    // Guard 1: the run must have been submitted before it can be approved.
    if (!run || !run.submittedAt) {
      throw new Error('This pay run has not been submitted for approval yet.');
    }
    // Guard 2: it must still be awaiting approval — block re-approving an already
    // finalized/paid run (the race this transaction is here to prevent).
    if (run.status !== 'draft') {
      throw new Error('This pay run has already been approved or paid.');
    }
    // Guard 3 (separation of duties): the person who submitted may NOT approve.
    if (run.submittedByUid && run.submittedByUid === a.uid) {
      throw new Error("You submitted this pay run, so you can't also approve it. Ask another authorised approver (Principal / VP-Admin) to approve.");
    }
    tx.update(ref, stripUndefined({
      status: 'finalized', finalizedAt: Date.now(),
      approvedByName: a.name, approvedAt: Date.now(), approvalNote: note?.trim() || deleteField(),
      lastModifiedAt: Date.now(), lastModifiedBy: a.uid,
    }));
  });
  void writeAuditEvent({ action: 'payroll.approved', schoolId: s, actor: a, targetType: 'payroll_run', targetId: id });
}

/** Principal/VP-Admin return a submitted run to draft with a reason. */
export const returnPayrollRun = (s: string, id: string, note: string, a: Actor) =>
  updateIn<PayrollRun>(s, 'payroll_runs', id, {
    status: 'draft', submittedAt: deleteField(), finalizedAt: deleteField(),
    approvedByName: deleteField(), approvedAt: deleteField(), approvalNote: note.trim() || deleteField(),
  } as Clearable<PayrollRun> as Partial<PayrollRun>, a, { action: 'payroll.returned', targetType: 'payroll_run' });

/**
 * Accounts disburse an approved (finalized) run → paid. Flips the run to `paid`
 * AND stamps every payslip `status: 'paid'` in atomic `writeBatch`es, so a partial
 * failure can't leave the run paid with half its payslips still 'generated' (the
 * old per-slip sequential loop could). Firestore caps a batch at 500 writes, so
 * the payslips are chunked; the run-status flip rides in the first batch.
 */
export async function markPayrollRunPaid(s: string, id: string, a: Actor): Promise<void> {
  const runRef = tenantDoc(s, 'payroll_runs', id);
  const runSnap = await getDoc(runRef);
  const run = runSnap.exists() ? (runSnap.data() as PayrollRun) : undefined;
  if (!run) throw new Error('This pay run no longer exists.');
  // Allow re-running when already 'paid' (idempotent) so a previous partial run
  // — run flipped to paid but a later payslip chunk failed — can finish marking
  // the remaining payslips. Only block runs that were never approved.
  if (run.status !== 'finalized' && run.status !== 'paid') {
    throw new Error('This pay run must be approved before it can be marked paid.');
  }

  // Only touch payslips that aren't already paid (keeps retries cheap + correct).
  const slipSnap = await getDocs(query(tenantCol(s, 'payslips'), where('runId', '==', id)));
  const slipRefs = slipSnap.docs.filter((d) => (d.data() as Payslip).status !== 'paid').map((d) => d.ref);

  const needsRunFlip = run.status !== 'paid';
  if (!needsRunFlip && slipRefs.length === 0) return; // nothing left to do

  // One write for the run flip + one per straggler payslip. Chunk under the
  // 500-op batch cap, keeping the run flip in the first batch.
  const RUN_STATUS = { status: 'paid' as PayrollRunStatus, paidAt: Date.now(), lastModifiedAt: Date.now(), lastModifiedBy: a.uid };
  const SLIP_STATUS = { status: 'paid' as Payslip['status'], lastModifiedAt: Date.now(), lastModifiedBy: a.uid };
  const CHUNK = 450; // headroom below 500
  let index = 0;
  let flipPending = needsRunFlip;
  // Loop while there are payslips left OR the run flip still needs its own batch.
  while (index < slipRefs.length || flipPending) {
    const batch = writeBatch(db);
    if (flipPending) { batch.update(runRef, RUN_STATUS); flipPending = false; }
    const slice = slipRefs.slice(index, index + CHUNK);
    for (const ref of slice) batch.update(ref, SLIP_STATUS);
    index += CHUNK;
    await batch.commit();
  }

  void writeAuditEvent({ action: 'payroll.paid', schoolId: s, actor: a, targetType: 'payroll_run', targetId: id });
}

export function usePayslips(schoolId?: string, runId?: string) {
  return useCollection<Payslip>(
    schoolId ? (runId ? query(tenantCol(schoolId, 'payslips'), where('runId', '==', runId)) : tenantCol(schoolId, 'payslips')) : null,
    [schoolId, runId],
  );
}
export function useStaffPayslips(schoolId?: string, staffId?: string) {
  return useCollection<Payslip>(
    schoolId && staffId ? query(tenantCol(schoolId, 'payslips'), where('staffId', '==', staffId)) : null,
    [schoolId, staffId],
  );
}
/** Payslip doc id = `${runId}_${staffId}`. */
export const payslipId = (runId: string, staffId: string) => `${runId}_${staffId}`;
export const savePayslip = (s: string, id: string, d: Omit<Payslip, 'id'>, a: Actor) => setIn(s, 'payslips', id, d, a, { action: 'payslip.generated', targetType: 'payslip', summary: `${d.staffName} · ${d.label}` });

/**
 * Edit a payslip ONLY while its run is still an editable draft. Once the run is
 * approved (`finalized`) or `paid`, its figures are locked — silently rewriting a
 * payslip after sign-off/disbursement is a fraud vector (gross/net could be
 * altered post-approval). The run status is read in the same transaction as the
 * write, so the gate can't be raced. Used for the Loss-of-Pay editor.
 */
export async function savePayslipGuarded(s: string, runId: string, staffId: string, d: Omit<Payslip, 'id'>, a: Actor): Promise<void> {
  const runRef = tenantDoc(s, 'payroll_runs', runId);
  const slipRef = tenantDoc(s, 'payslips', payslipId(runId, staffId));
  await runTransaction(db, async (tx) => {
    const runSnap = await tx.get(runRef);
    const run = runSnap.exists() ? (runSnap.data() as PayrollRun) : undefined;
    if (run && run.status !== 'draft') {
      throw new Error('This pay run has been approved/paid, so its payslips are locked and can no longer be edited.');
    }
    tx.set(slipRef, { ...stripUndefined(d), schoolId: s, lastModifiedAt: Date.now(), lastModifiedBy: a.uid }, { merge: true });
  });
  void writeAuditEvent({ action: 'payslip.generated', schoolId: s, actor: a, targetType: 'payslip', targetId: slipRef.id, summary: `${d.staffName} · ${d.label}` });
}

/**
 * Atomically generate a draft payroll run: writes the run doc AND every payslip
 * together. The OLD flow wrote payslips first in a loop and the run doc last, so a
 * mid-loop failure orphaned payslips with no run, and the run's totals could be
 * wrong on retry. Here the run doc (with final totals computed up-front) rides in
 * the FIRST batch, so the run always exists; payslip ids are deterministic
 * (`runId_staffId`), so re-running merges/overwrites cleanly (idempotent retry).
 * Firestore's 500-write batch cap is respected by chunking the payslips.
 *
 * `slips` is the already-computed list (id-less) from `computePayslip`, paired
 * with each staffId so the doc id can be derived.
 */
export async function generatePayrollRun(
  s: string,
  runId: string,
  run: Omit<PayrollRun, 'id'>,
  slips: { staffId: string; data: Omit<Payslip, 'id'> }[],
  a: Actor,
): Promise<void> {
  const runRef = tenantDoc(s, 'payroll_runs', runId);
  const runDoc = { ...stripUndefined(run), schoolId: s, lastModifiedAt: Date.now(), lastModifiedBy: a.uid };
  const stamp = { schoolId: s, createdAt: Date.now(), createdBy: a.uid, version: 1, lastModifiedAt: Date.now(), lastModifiedBy: a.uid };

  const CHUNK = 450; // headroom below the 500-op cap
  let index = 0;
  let isFirst = true;
  while (isFirst || index < slips.length) {
    const batch = writeBatch(db);
    // Run doc rides in the first batch so the run always exists for retries.
    if (isFirst) { batch.set(runRef, runDoc, { merge: true }); isFirst = false; }
    const slice = slips.slice(index, index + CHUNK);
    for (const sl of slice) {
      batch.set(tenantDoc(s, 'payslips', payslipId(runId, sl.staffId)), { ...stripUndefined(sl.data), ...stamp }, { merge: true });
    }
    index += CHUNK;
    await batch.commit();
  }

  void writeAuditEvent({ action: 'payroll.run_saved', schoolId: s, actor: a, targetType: 'payroll_run', targetId: runId, summary: run.label });
}

/* ---------------- one-shot ---------------- */
export async function financeQueryOnce<T>(schoolId: string, sub: string, ...c: QueryConstraint[]): Promise<T[]> {
  const snap = await getDocs(query(tenantCol(schoolId, sub), ...c, fsLimit(2000)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }) as T);
}
export { where, orderBy, getDoc, deleteField };
