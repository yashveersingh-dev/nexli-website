import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Panel } from '@/components/Panel';
import { Modal, ConfirmModal } from '@/components/Modal';
import { Field, Input, Select, Textarea, DatePicker } from '@/components/form';
import { EmptyState, Skeleton, InfoCard } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { formatINR, formatDate } from '@/lib/format';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useStudents } from '@/features/school/data';
import {
  useInvoices, usePayments, useRefunds, useFeeStructures, createInvoice, cancelInvoice, applyConcession, recordRefund, type Actor,
} from '@/features/finance/data';
import { INVOICE_STATUS_META, STUDENT_FEE_CATEGORY_META, CONCESSION_TYPE_OPTIONS, PAYMENT_METHOD_META, REFUND_METHOD_OPTIONS } from '@/features/finance/meta';
import { studentDue, invoiceTotals } from './feeSchema';
import type { FeeInvoice, ConcessionLine, ConcessionType, InvoiceLine, RefundMethod } from '@/types/finance';

const today = () => new Date().toISOString().slice(0, 10);

export function StudentLedgerPage() {
  const { studentId = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const canWrite = useOwnership('fees').canOperate;
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };

  const { data: students, loading: sLoading } = useStudents(schoolId);
  const student = students.find((s) => s.id === studentId);
  const { data: invoices, loading: iLoading } = useInvoices(schoolId, studentId);
  const { data: payments, loading: pLoading } = usePayments(schoolId, studentId);
  const { data: refunds } = useRefunds(schoolId, studentId);
  const { data: structures } = useFeeStructures(schoolId);

  const [assignOpen, setAssignOpen] = useState(false);
  const [concessionFor, setConcessionFor] = useState<FeeInvoice | null>(null);
  const [cancelFor, setCancelFor] = useState<FeeInvoice | null>(null);
  const [refundFor, setRefundFor] = useState<FeeInvoice | null>(null);
  const [busy, setBusy] = useState(false);

  const totals = useMemo(() => studentDue(invoices), [invoices]);
  const refundedTotal = useMemo(() => refunds.reduce((s, r) => s + (r.amount || 0), 0), [refunds]);
  const sortedInvoices = useMemo(() => [...invoices].sort((a, b) => (b.issuedDate ?? 0) - (a.issuedDate ?? 0)), [invoices]);
  const sortedPayments = useMemo(() => [...payments].sort((a, b) => b.paidAt - a.paidAt), [payments]);
  const sortedRefunds = useMemo(() => [...refunds].sort((a, b) => b.refundedAt - a.refundedAt), [refunds]);

  if (sLoading) {
    return <div className="nx-page"><Skeleton height={64} /><Skeleton height={240} /></div>;
  }
  if (!student) {
    return (
      <div className="nx-page">
        <Panel><EmptyState icon="users" title="Student not found" message="This student may have been removed." action={<Button variant="subtle" onClick={() => navigate('/fees')}>Back to fees</Button>} /></Panel>
      </div>
    );
  }

  const cat = (student as { feeCategory?: keyof typeof STUDENT_FEE_CATEGORY_META }).feeCategory;

  const doCancel = async () => {
    if (!schoolId || !cancelFor) return;
    setBusy(true);
    try { await cancelInvoice(schoolId, cancelFor.id, actor); toast.success('Invoice cancelled'); setCancelFor(null); }
    catch (e) { toast.error('Could not cancel', e instanceof Error ? e.message : undefined); } finally { setBusy(false); }
  };

  return (
    <div className="nx-page">
      <Button variant="ghost" size="sm" leftIcon="chevron-left" onClick={() => navigate('/fees')}>Fees</Button>

      <Panel>
        <div className="nx-detail__head">
          <Avatar name={student.fullName} src={student.photoUrl} size={52} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1 className="nx-page__title" style={{ marginBottom: 2 }}>{student.fullName}</h1>
            <p className="nx-page__sub" style={{ margin: 0 }}>
              {[student.gradeName, student.sectionName].filter(Boolean).join(' · ')}
              {student.admissionNo ? ` · ${student.admissionNo}` : ''}
            </p>
          </div>
          {cat && STUDENT_FEE_CATEGORY_META[cat] && <Badge variant={STUDENT_FEE_CATEGORY_META[cat].variant}>{STUDENT_FEE_CATEGORY_META[cat].label}</Badge>}
        </div>
      </Panel>

      <div className="fin-summary">
        <div className="fin-summary__card"><div className="fin-summary__label">Billed</div><div className="fin-summary__value">{formatINR(totals.billed)}</div></div>
        <div className="fin-summary__card"><div className="fin-summary__label">Paid</div><div className="fin-summary__value" style={{ color: 'var(--success)' }}>{formatINR(totals.paid)}</div></div>
        <div className="fin-summary__card"><div className="fin-summary__label">Outstanding</div><div className="fin-summary__value" style={{ color: totals.due > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>{formatINR(totals.due)}</div></div>
      </div>

      {canWrite && (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <Button variant="gold" leftIcon="wallet" onClick={() => navigate(`/fees/students/${studentId}/pay`)}>Collect payment</Button>
            <Button variant="subtle" leftIcon="plus" onClick={() => setAssignOpen(true)}>Assign fees</Button>
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '0 2px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="file-text" size={13} aria-hidden="true" />
            Collecting a payment generates a numbered receipt and updates the invoice's paid, due and status automatically.
          </p>
        </>
      )}

      <StatusLegend />

      <Panel title="Invoices" sub={sortedInvoices.length ? `${sortedInvoices.length}` : undefined}>
        {iLoading ? <Skeleton height={120} /> : sortedInvoices.length === 0 ? (
          <EmptyState icon="file-text" title="No fees assigned yet" message={canWrite ? 'Use “Assign fees” to bill this student from a fee structure.' : 'No invoices for this student.'} />
        ) : (
          <div className="fin-kv-list" style={{ gap: 10 }}>
            {sortedInvoices.map((inv) => {
              const due = Math.max(0, inv.netAmount - inv.paidAmount);
              const overdue = inv.status !== 'paid' && inv.status !== 'cancelled' && inv.dueDate != null && Date.now() > inv.dueDate;
              return (
                <div key={inv.id} className="fin-invrow">
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="fin-invrow__title">{inv.title}</div>
                    <div className="fin-invrow__meta">
                      {formatINR(inv.netAmount)}{inv.concessionAmount > 0 ? ` · concession ${formatINR(inv.concessionAmount)}` : ''}
                      {inv.dueDate ? <> · <span style={overdue ? { color: 'var(--danger)', fontWeight: 600 } : undefined}>due {formatDate(inv.dueDate)}</span></> : null}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <Badge variant={overdue ? 'danger' : INVOICE_STATUS_META[inv.status].variant}>{overdue ? 'Overdue' : INVOICE_STATUS_META[inv.status].label}</Badge>
                    {due > 0 && inv.status !== 'cancelled' && <div className="fin-amount fin-amount--due" style={{ fontSize: 13, marginTop: 3 }}>{formatINR(due)} due</div>}
                  </div>
                  {canWrite && inv.status !== 'cancelled' && (
                    <div className="fin-invrow__actions">
                      <Button variant="ghost" size="sm" leftIcon="award" aria-label="Add concession" onClick={() => setConcessionFor(inv)} />
                      {/* Refund is available only once money has been collected (paid > 0):
                          it reduces paidAmount and re-derives the invoice status. */}
                      {(inv.paidAmount ?? 0) > 0 && (
                        <Button variant="ghost" size="sm" leftIcon="refresh" aria-label="Record refund" onClick={() => setRefundFor(inv)} />
                      )}
                      {/* A paid/partly-paid invoice can't be cancelled (it would orphan
                          the receipts); hide the action so it never fails confusingly. */}
                      {(inv.paidAmount ?? 0) === 0 && (
                        <Button variant="ghost" size="sm" leftIcon="minus-circle" aria-label="Cancel invoice" onClick={() => setCancelFor(inv)} />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <Panel title="Payment history" sub="Receipts">
        {pLoading ? <Skeleton height={100} /> : sortedPayments.length === 0 ? (
          <EmptyState icon="wallet" title="No payments yet"
            message={canWrite ? 'Use “Collect payment” above to record one — each payment gets a numbered receipt you can print.' : 'Recorded payments and their receipts will appear here.'} />
        ) : (
          <div className="fin-kv-list" style={{ gap: 0 }}>
            {sortedPayments.map((p) => (
              <Link key={p.id} to={`/fees/receipt/${p.id}`} className="nx-noticerow">
                <span className="nx-noticerow__icon is-normal"><Icon name={PAYMENT_METHOD_META[p.method]?.icon ?? 'wallet'} size={15} /></span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="nx-noticerow__title">{p.receiptNo}</div>
                  <div className="nx-noticerow__time">{formatDate(p.paidAt)} · {PAYMENT_METHOD_META[p.method]?.label}</div>
                </div>
                <span className="fin-amount fin-amount--paid">{formatINR(p.amount)}</span>
              </Link>
            ))}
          </div>
        )}
      </Panel>

      {sortedRefunds.length > 0 && (
        <Panel title="Refunds" sub={refundedTotal > 0 ? `${formatINR(refundedTotal)} refunded` : undefined}>
          <div className="fin-kv-list" style={{ gap: 0 }}>
            {sortedRefunds.map((r) => (
              <div key={r.id} className="nx-noticerow" style={{ cursor: 'default' }}>
                <span className="nx-noticerow__icon is-normal"><Icon name="refresh" size={15} /></span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="nx-noticerow__title">{r.refundNo}</div>
                  <div className="nx-noticerow__time">{formatDate(r.refundedAt)} · {r.reason}</div>
                </div>
                <span className="fin-amount fin-amount--due">−{formatINR(r.amount)}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <AssignFeesModal open={assignOpen} onClose={() => setAssignOpen(false)} schoolId={schoolId} actor={actor}
        student={student} structures={structures} />
      <ConcessionModal invoice={concessionFor} onClose={() => setConcessionFor(null)} schoolId={schoolId} actor={actor} />
      <RefundModal invoice={refundFor} onClose={() => setRefundFor(null)} schoolId={schoolId} actor={actor}
        student={student} />
      <ConfirmModal open={!!cancelFor} onClose={() => setCancelFor(null)} onConfirm={doCancel} tone="danger" loading={busy}
        title="Cancel this invoice?" message={`"${cancelFor?.title}" will be marked cancelled and excluded from dues.`} confirmLabel="Cancel invoice" />
    </div>
  );
}

/* ---------------- Invoice status legend (what each badge means) ---------------- */
function StatusLegend() {
  const rows: { status: keyof typeof INVOICE_STATUS_META; meaning: string }[] = [
    { status: 'unpaid', meaning: 'No payment recorded yet — the full amount is outstanding.' },
    { status: 'partial', meaning: 'Some payment recorded — a balance is still due.' },
    { status: 'paid', meaning: 'Fully settled — nothing left to collect.' },
  ];
  return (
    <Panel title="Invoice status" sub="Legend">
      <div className="fin-legend">
        {rows.map((r) => (
          <div className="fin-legend__row" key={r.status}>
            <Badge variant={INVOICE_STATUS_META[r.status].variant}>{INVOICE_STATUS_META[r.status].label}</Badge>
            <span>{r.meaning}</span>
          </div>
        ))}
        <div className="fin-legend__row">
          <Badge variant="danger">Overdue</Badge>
          <span>Unpaid or partial past its due date — outstanding amount still applies.</span>
        </div>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '10px 2px 0' }}>
        Recording a payment moves an invoice unpaid → partial → paid and reduces its <strong>outstanding</strong> (billed − paid).
      </p>
    </Panel>
  );
}

/* ---------------- Assign fees (generate an invoice from a structure) ---------------- */
function AssignFeesModal({ open, onClose, schoolId, actor, student, structures }: {
  open: boolean; onClose: () => void; schoolId?: string; actor: Actor;
  student: { id: string; fullName: string; admissionNo?: string; gradeId?: string; gradeName?: string; sectionName?: string }; structures: ReturnType<typeof useFeeStructures>['data'];
}) {
  const toast = useToast();
  const { school } = useSession();
  const year = school?.currentAcademicYear ?? String(new Date().getFullYear());
  const applicable = structures.filter((s) => s.active !== false && (!s.gradeId || s.gradeId === student.gradeId));
  const [structureId, setStructureId] = useState('');
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [busy, setBusy] = useState(false);

  const structure = structures.find((s) => s.id === structureId);
  // Invoice bills the structure's raw line amounts (one installment); the
  // structure `total` is the *annualised* figure, so it must NOT be shown as the
  // amount payable here or the invoice net would never match what's promised.
  const billable = structure ? invoiceTotals(structure.items.map((it) => ({ headId: it.headId, headName: it.headName, category: it.category, amount: it.amount })), []).netAmount : 0;

  const onPick = (id: string) => {
    setStructureId(id);
    const s = structures.find((x) => x.id === id);
    if (s) setTitle(`${s.name} · ${s.academicYear}`);
  };

  const submit = async () => {
    if (!schoolId || !structure) return;
    setBusy(true);
    try {
      const lines: InvoiceLine[] = structure.items.map((it) => ({ headId: it.headId, headName: it.headName, category: it.category, amount: it.amount }));
      const { grossAmount, netAmount } = invoiceTotals(lines, []);
      await createInvoice(schoolId, {
        schoolId, studentId: student.id, studentName: student.fullName, admissionNo: student.admissionNo,
        gradeId: student.gradeId, gradeName: student.gradeName, sectionName: student.sectionName,
        academicYear: structure.academicYear || year, structureId: structure.id,
        title: title.trim() || `${structure.name} · ${structure.academicYear}`,
        lines, concessions: [], grossAmount, concessionAmount: 0, netAmount,
        paidAmount: 0, dueAmount: netAmount, status: 'unpaid',
        issuedDate: Date.now(), dueDate: dueDate ? new Date(`${dueDate}T00:00:00`).getTime() : undefined,
      }, actor);
      toast.success('Fees assigned', title.trim());
      onClose(); setStructureId(''); setTitle(''); setDueDate('');
    } catch { toast.error('Could not assign fees'); } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} icon="plus" tone="gold" title="Assign fees" size="md"
      footer={<>
        <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="gold" leftIcon="check" loading={busy} disabled={!structure} onClick={submit}>Generate invoice</Button>
      </>}>
      {applicable.length === 0 ? (
        <EmptyState icon="credit-card" title="No applicable structures" message="Create a fee structure for this grade first (Structures tab)." />
      ) : (
        <>
          <Field label="Fee structure" required>
            <Select value={structureId} onChange={(e) => onPick(e.target.value)} placeholder="Select a structure"
              options={applicable.map((s) => ({ value: s.id, label: `${s.name} — ${formatINR(s.total)}/yr` }))} />
          </Field>
          <Field label="Invoice title" required><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Annual fees · 2025-26" /></Field>
          <Field label="Due date" optional><DatePicker value={dueDate} onChange={(e) => setDueDate(e.target.value)} min={today()} /></Field>
          {structure && <InfoCard icon="info" title={`Net payable ${formatINR(billable)}`}>This raises one invoice for the structure's listed amounts. Record partial payments any time; concessions can be added after.</InfoCard>}
        </>
      )}
    </Modal>
  );
}

/* ---------------- Add concession to an invoice ---------------- */
function ConcessionModal({ invoice, onClose, schoolId, actor }: { invoice: FeeInvoice | null; onClose: () => void; schoolId?: string; actor: Actor }) {
  const toast = useToast();
  const { member } = useSession();
  const [type, setType] = useState<ConcessionType>('need_based');
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!schoolId || !invoice) return;
    const amt = Number(amount) || 0;
    // Cap against the remaining concedable gross (not against the remaining due):
    // this prevents total concessions from exceeding grossAmount.
    const maxAllowed = Math.max(0, invoice.grossAmount - (invoice.concessionAmount ?? 0));
    if (amt <= 0) { toast.error('Enter a concession amount'); return; }
    if (amt > maxAllowed) { toast.error('Too high', `Concession can't exceed the ${formatINR(maxAllowed)} remaining on this invoice.`); return; }
    setBusy(true);
    try {
      const line: ConcessionLine = { type, reason: reason.trim() || CONCESSION_TYPE_OPTIONS.find((o) => o.value === type)?.label || 'Concession', amount: amt, approvedByUid: actor.uid, approvedByName: member?.name, approvedAt: Date.now() };
      // Atomic: re-reads the live invoice, caps + floors net at 0, so concurrent
      // concessions can't be lost or push the net below zero.
      await applyConcession(schoolId, invoice.id, line, actor);
      toast.success('Concession applied', formatINR(amt));
      onClose(); setReason(''); setAmount(''); setType('need_based');
    } catch (e) { toast.error('Could not apply concession', e instanceof Error ? e.message : undefined); } finally { setBusy(false); }
  };

  return (
    <Modal open={!!invoice} onClose={onClose} icon="award" tone="gold" title="Add concession" size="md"
      footer={<>
        <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="gold" leftIcon="check" loading={busy} onClick={submit}>Apply concession</Button>
      </>}>
      {invoice && (
        <>
          <InfoCard icon="info" title={invoice.title}>Net payable {formatINR(invoice.netAmount)} · {formatINR(Math.max(0, invoice.netAmount - invoice.paidAmount))} due</InfoCard>
          <Field label="Type" required>
            <Select value={type} onChange={(e) => setType(e.target.value as ConcessionType)} options={CONCESSION_TYPE_OPTIONS} />
          </Field>
          <Field label="Amount (₹)" required><Input type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" /></Field>
          <Field label="Reason / approval note" optional><Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Need-based concession approved by Principal" /></Field>
        </>
      )}
    </Modal>
  );
}

/* ---------------- Record a refund against an invoice ---------------- */
function RefundModal({ invoice, onClose, schoolId, actor, student }: {
  invoice: FeeInvoice | null; onClose: () => void; schoolId?: string; actor: Actor;
  student: { id: string; fullName: string; admissionNo?: string };
}) {
  const toast = useToast();
  const [method, setMethod] = useState<RefundMethod>('cash');
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);

  // Cap at what's actually been collected — you can't refund more than was paid.
  const refundable = invoice ? Math.max(0, invoice.paidAmount ?? 0) : 0;

  const submit = async () => {
    if (!schoolId || !invoice) return;
    const amt = Number(amount) || 0;
    if (amt <= 0) { toast.error('Enter a refund amount'); return; }
    if (amt > refundable) { toast.error('Too high', `Refund can't exceed the ${formatINR(refundable)} collected on this invoice.`); return; }
    if (!reason.trim()) { toast.error('Enter a refund reason'); return; }
    setBusy(true);
    try {
      // Atomic: re-reads the live invoice, clamps the refund to the current paid
      // amount and re-derives paid/due/status so concurrent refunds stay correct.
      const { applied } = await recordRefund(schoolId, {
        studentId: student.id, studentName: student.fullName, admissionNo: student.admissionNo,
        invoiceId: invoice.id, invoiceTitle: invoice.title,
        amount: amt, method, reason: reason.trim(), reference: reference.trim() || undefined,
        refundedAt: Date.now(),
      }, actor);
      toast.success('Refund recorded', formatINR(applied));
      onClose(); setReason(''); setAmount(''); setReference(''); setMethod('cash');
    } catch (e) { toast.error('Could not record refund', e instanceof Error ? e.message : undefined); } finally { setBusy(false); }
  };

  return (
    <Modal open={!!invoice} onClose={onClose} icon="refresh" tone="gold" title="Record refund" size="md"
      footer={<>
        <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="gold" leftIcon="check" loading={busy} onClick={submit}>Record refund</Button>
      </>}>
      {invoice && (
        <>
          <InfoCard icon="info" title={invoice.title}>{formatINR(refundable)} collected · refundable up to this amount</InfoCard>
          <Field label="Amount (₹)" required><Input type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" /></Field>
          <Field label="Method" required>
            <Select value={method} onChange={(e) => setMethod(e.target.value as RefundMethod)} options={REFUND_METHOD_OPTIONS} />
          </Field>
          <Field label="Reference" optional hint="Cheque no / UPI ref / transfer id"><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional" /></Field>
          <Field label="Reason" required><Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="e.g. Withdrawal — pro-rata tuition refund approved by Principal" /></Field>
        </>
      )}
    </Modal>
  );
}
