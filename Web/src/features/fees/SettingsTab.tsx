import { useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { Field, Input, Textarea } from '@/components/form';
import { InfoCard, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useFinanceSettings, saveFinanceSettings, type Actor } from '@/features/finance/data';
import { PaymentInfoCard } from './PaymentInfoCard';
import type { FinanceSettings } from '@/types/finance';

const EMPTY: FinanceSettings = { receiptPrefix: 'RC', upiId: '', payeeName: '', bankName: '', accountNo: '', ifsc: '', branch: '', qrImageUrl: '', notes: '' };

export function SettingsTab() {
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const canWrite = useOwnership('fees').canOperate;
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };
  const { data: saved, loading } = useFinanceSettings(schoolId);

  const [form, setForm] = useState<FinanceSettings>(EMPTY);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (saved) setForm({ ...EMPTY, ...saved }); }, [saved]);

  const set = (k: keyof FinanceSettings) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!schoolId) return;
    setBusy(true);
    try {
      await saveFinanceSettings(schoolId, { ...form, bounceCharge: Number(form.bounceCharge) || 0 }, actor);
      toast.success('Payment settings saved');
    } catch { toast.error('Could not save settings'); } finally { setBusy(false); }
  };

  if (loading) return <Skeleton height={320} />;

  return (
    <div className="grid g-2">
      <div>
        <Panel title="Payment details" sub="Shown to parents on their fee page and printed on receipts.">
          <Field label="Receipt prefix" hint="Used in receipt numbers, e.g. RC-2026-0001">
            <Input value={form.receiptPrefix ?? ''} onChange={set('receiptPrefix')} placeholder="RC" disabled={!canWrite} maxLength={8} />
          </Field>
          <div className="grid g-2">
            <Field label="UPI ID" optional><Input value={form.upiId ?? ''} onChange={set('upiId')} placeholder="school@upi" disabled={!canWrite} /></Field>
            <Field label="Payee name" optional><Input value={form.payeeName ?? ''} onChange={set('payeeName')} placeholder="School name" disabled={!canWrite} /></Field>
          </div>
          <div className="grid g-2">
            <Field label="Bank name" optional><Input value={form.bankName ?? ''} onChange={set('bankName')} disabled={!canWrite} /></Field>
            <Field label="Branch" optional><Input value={form.branch ?? ''} onChange={set('branch')} disabled={!canWrite} /></Field>
          </div>
          <div className="grid g-2">
            <Field label="Account number" optional><Input value={form.accountNo ?? ''} onChange={set('accountNo')} inputMode="numeric" disabled={!canWrite} /></Field>
            <Field label="IFSC" optional><Input value={form.ifsc ?? ''} onChange={set('ifsc')} disabled={!canWrite} /></Field>
          </div>
          <Field label="Payment QR image URL" optional hint="Paste a hosted image URL (ImageKit upload coming soon).">
            <Input value={form.qrImageUrl ?? ''} onChange={set('qrImageUrl')} placeholder="https://…" disabled={!canWrite} />
          </Field>
          <Field label="Notes for parents" optional>
            <Textarea value={form.notes ?? ''} onChange={set('notes')} rows={2} placeholder="e.g. Mention the student's admission number in the UPI remark." disabled={!canWrite} />
          </Field>
          {canWrite ? (
            <div style={{ marginTop: 12 }}>
              <Button variant="gold" leftIcon="check" loading={busy} onClick={submit}>Save settings</Button>
            </div>
          ) : (
            <InfoCard icon="lock" title="View only">You don't have permission to edit payment settings.</InfoCard>
          )}
        </Panel>
      </div>

      <div>
        <PaymentInfoCard settings={form} />
        <InfoCard icon="info" title="Manual reconciliation">
          NEXLI records payments manually (no payment gateway on the free tier). Parents pay via the UPI/bank details above and your accounts team records each receipt.
        </InfoCard>
      </div>
    </div>
  );
}
