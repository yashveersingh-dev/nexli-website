import { useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { Field, Input } from '@/components/form';
import { InfoCard, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { formatINR } from '@/lib/format';
import type { Actor } from '@/features/daily/data';
import { useLibrarySettings, saveLibrarySettings, finePerDay } from './data';
import { DEFAULT_FINE_PER_DAY } from './fines';

/** Library settings: per-school overdue fine rate (and default loan period). */
export function SettingsTab() {
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const canWrite = useOwnership('library').canOperate;
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };
  const { data: saved, loading } = useLibrarySettings(schoolId);

  const [fine, setFine] = useState('');
  const [loanDays, setLoanDays] = useState('');
  const [busy, setBusy] = useState(false);

  // Hydrate the inputs from the saved doc (effective rate falls back to the default).
  useEffect(() => {
    if (saved) {
      setFine(saved.finePerDay != null ? String(saved.finePerDay) : '');
      setLoanDays(saved.loanPeriodDays != null ? String(saved.loanPeriodDays) : '');
    }
  }, [saved]);

  const effectiveRate = finePerDay(saved);

  const submit = async () => {
    if (!schoolId) return;
    const fineNum = fine.trim() === '' ? DEFAULT_FINE_PER_DAY : Number(fine);
    if (Number.isNaN(fineNum) || fineNum < 0) { toast.error('Enter a valid fine rate', 'Use 0 or a positive number.'); return; }
    const loanNum = loanDays.trim() === '' ? undefined : Number(loanDays);
    if (loanNum != null && (Number.isNaN(loanNum) || loanNum < 0)) { toast.error('Enter a valid loan period'); return; }
    setBusy(true);
    try {
      await saveLibrarySettings(schoolId, { finePerDay: fineNum, loanPeriodDays: loanNum }, actor);
      toast.success('Library settings saved');
    } catch { toast.error('Could not save settings'); } finally { setBusy(false); }
  };

  if (loading) return <Skeleton height={240} />;

  return (
    <div className="grid g-2">
      <div>
        <Panel title="Overdue fines" sub="Applied to overdue loans without a stored fine.">
          <Field label="Fine per day (₹)" hint={`Default ${formatINR(DEFAULT_FINE_PER_DAY)} when left blank. Use 0 to disable fines.`}>
            <Input type="text" inputMode="numeric" value={fine} onChange={(e) => setFine(e.target.value)} placeholder={String(DEFAULT_FINE_PER_DAY)} disabled={!canWrite} maxLength={6} />
          </Field>
          <Field label="Default loan period (days)" optional hint="Informational — the issue screen defaults to 14 days.">
            <Input type="text" inputMode="numeric" value={loanDays} onChange={(e) => setLoanDays(e.target.value)} placeholder="14" disabled={!canWrite} maxLength={4} />
          </Field>
          {canWrite ? (
            <div style={{ marginTop: 12 }}>
              <Button variant="gold" leftIcon="check" loading={busy} onClick={submit}>Save settings</Button>
            </div>
          ) : (
            <InfoCard icon="lock" title="View only">You don't have permission to edit library settings.</InfoCard>
          )}
        </Panel>
      </div>

      <div>
        <InfoCard icon="info" title="How fines are computed">
          A loan's fine is days overdue × the rate above ({formatINR(effectiveRate)}/day currently). If a fine has
          been recorded on a specific loan (e.g. settled on return), that stored value takes precedence over the
          computed one.
        </InfoCard>
      </div>
    </div>
  );
}
