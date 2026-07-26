import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { Field, Input, Select, DatePicker, Textarea } from '@/components/form';
import { EmptyState, Skeleton, InfoCard } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { formatINR } from '@/lib/format';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useStudents } from '@/features/school/data';
import { useInvoices, useFinanceSettings, recordPayment, type Actor } from '@/features/finance/data';
import { PAYMENT_METHOD_OPTIONS } from '@/features/finance/meta';
import { studentDue } from './feeSchema';
import type { PaymentMethod } from '@/types/finance';

const today = () => new Date().toISOString().slice(0, 10);

export function CollectPaymentPage() {
  const { studentId = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const canWrite = useOwnership('fees').canOperate;
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };

  const { data: students, loading: sLoading } = useStudents(schoolId);
  const student = students.find((s) => s.id === studentId);
  const { data: invoices, loading: iLoading } = useInvoices(schoolId, studentId);
  const { data: settings } = useFinanceSettings(schoolId);

  const openInvoices = useMemo(
    () => invoices.filter((i) => i.status !== 'cancelled' && Math.max(0, i.netAmount - i.paidAmount) > 0).sort((a, b) => (a.issuedDate ?? 0) - (b.issuedDate ?? 0)),
    [invoices],
  );
  const totals = useMemo(() => studentDue(invoices), [invoices]);

  const [invoiceId, setInvoiceId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [reference, setReference] = useState('');
  const [bankName, setBankName] = useState('');
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  // Default to the oldest open invoice + its due amount.
  // Also clear a stale selection when the previously-selected invoice is no longer open
  // (e.g. it was just fully paid via another session or real-time update).
  useEffect(() => {
    const stillOpen = invoiceId ? openInvoices.some((i) => i.id === invoiceId) : false;
    if (!invoiceId || !stillOpen) {
      const first = openInvoices[0];
      setInvoiceId(first?.id ?? '');
      setAmount(first ? String(Math.max(0, first.netAmount - first.paidAmount)) : '');
    }
  }, [openInvoices, invoiceId]);

  const selected = invoices.find((i) => i.id === invoiceId);
  const selectedDue = selected ? Math.max(0, selected.netAmount - selected.paidAmount) : 0;
  const amt = Number(amount) || 0;
  const needsRef = method === 'cheque' || method === 'dd' || method === 'upi' || method === 'bank_transfer';

  if (!canWrite) {
    return <div className="nx-page"><Panel><EmptyState icon="lock" title="Not allowed" message="Recording payments is handled by Accounts. You can review collection from the Fees overview." /></Panel></div>;
  }
  if (sLoading) return <div className="nx-page"><Skeleton height={64} /><Skeleton height={280} /></div>;
  if (!student) {
    return <div className="nx-page"><Panel><EmptyState icon="users" title="Student not found" action={<Button variant="subtle" onClick={() => navigate('/fees')}>Back to fees</Button>} /></Panel></div>;
  }

  const submit = async () => {
    if (!schoolId) return;
    if (amt <= 0) { toast.error('Enter an amount'); return; }
    if (selected && amt > selectedDue) { toast.error('Too high', `Amount exceeds the ${formatINR(selectedDue)} due on this invoice.`); return; }
    setBusy(true);
    try {
      const { id } = await recordPayment(schoolId, {
        studentId: student.id, studentName: student.fullName, admissionNo: student.admissionNo,
        invoiceId: invoiceId || undefined, invoiceTitle: selected?.title,
        amount: amt, method, reference: reference.trim() || undefined, bankName: bankName.trim() || undefined,
        paidAt: new Date(`${date}T00:00:00`).getTime(), note: note.trim() || undefined,
        receiptPrefix: settings?.receiptPrefix,
      }, actor);
      toast.success('Payment recorded', `${formatINR(amt)} · receipt generated`);
      navigate(`/fees/receipt/${id}`, { state: { justCreated: true } });
    } catch (e) {
      // Surface the data-layer guard message (e.g. overpayment rejected by the
      // transaction) instead of a generic error, so the cashier knows what to fix.
      toast.error('Could not record payment', e instanceof Error ? e.message : 'Please try again.');
    } finally { setBusy(false); }
  };

  return (
    <div className="nx-page">
      <Button variant="ghost" size="sm" leftIcon="chevron-left" onClick={() => navigate(`/fees/students/${studentId}`)}>{student.fullName}</Button>

      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Collect payment</h1>
          <p className="nx-page__sub">{student.fullName}{student.admissionNo ? ` · ${student.admissionNo}` : ''} · {formatINR(totals.due)} outstanding</p>
        </div>
      </div>

      <InfoCard icon="file-text" title="Collecting a payment generates a receipt">
        Record the amount below. NEXLI auto-assigns a numbered receipt, updates the invoice's paid/due amount and status, and opens the printable receipt next.
      </InfoCard>

      <Panel>
        {iLoading ? <Skeleton height={120} /> : (
          <>
            <Field label="Against invoice" hint={openInvoices.length === 0 ? 'No open invoices — this will be recorded as an advance/general payment.' : undefined}>
              <Select value={invoiceId} onChange={(e) => { setInvoiceId(e.target.value); const inv = invoices.find((i) => i.id === e.target.value); if (inv) setAmount(String(Math.max(0, inv.netAmount - inv.paidAmount))); }}
                placeholder="General / advance payment"
                options={openInvoices.map((i) => ({ value: i.id, label: `${i.title} — ${formatINR(Math.max(0, i.netAmount - i.paidAmount))} due` }))} />
            </Field>

            <div className="grid g-2">
              <Field label="Amount (₹)" required hint={selected ? `Due: ${formatINR(selectedDue)}` : undefined}>
                <Input type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" autoFocus />
              </Field>
              <Field label="Date" required><DatePicker value={date} onChange={(e) => setDate(e.target.value)} max={today()} /></Field>
            </div>

            <div className="grid g-2">
              <Field label="Method" required>
                <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} options={PAYMENT_METHOD_OPTIONS} />
              </Field>
              <Field label={method === 'cheque' || method === 'dd' ? 'Cheque / DD no.' : 'Reference / txn id'} required={needsRef} optional={!needsRef}>
                <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder={method === 'upi' ? 'UPI ref' : method === 'cheque' ? '000123' : 'Reference'} />
              </Field>
            </div>

            {(method === 'cheque' || method === 'dd' || method === 'bank_transfer') && (
              <Field label="Bank name" optional><Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Drawee bank" /></Field>
            )}

            <Field label="Note" optional><Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Optional remark for this receipt" /></Field>

            {amt > 0 && <InfoCard icon="wallet" title={`Receiving ${formatINR(amt)}`}>A unique receipt will be generated and the invoice updated automatically.</InfoCard>}
          </>
        )}
      </Panel>

      <div className="nx-savebar">
        <div className="nx-savebar__inner">
          <div className="nx-savebar__left"><span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{selected ? selected.title : 'General payment'}</span></div>
          <div className="nx-savebar__right">
            <Button variant="ghost" onClick={() => navigate(`/fees/students/${studentId}`)} disabled={busy}>Cancel</Button>
            <Button variant="gold" leftIcon="check" loading={busy} disabled={amt <= 0} onClick={submit}>Collect &amp; generate receipt</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
