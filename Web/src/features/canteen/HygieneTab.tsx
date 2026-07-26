import { useMemo, useState } from 'react';
import { KPICard } from '@/components/KPICard';
import { Panel } from '@/components/Panel';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { Field, Input, Textarea, Toggle } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { formatDate } from '@/lib/format';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useCanteenInspections, createInspection, type Actor } from '@/features/ops/data';
import type { CanteenInspection } from '@/types/ops';

const scoreTone = (s?: number): { variant: 'success' | 'warning' | 'danger'; label: string } => {
  if (s == null) return { variant: 'warning', label: '—' };
  if (s >= 80) return { variant: 'success', label: `${s}/100` };
  if (s >= 60) return { variant: 'warning', label: `${s}/100` };
  return { variant: 'danger', label: `${s}/100` };
};

export function HygieneTab() {
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const canWrite = useOwnership('canteen').canOperate;
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };
  const { data: inspections, loading, error } = useCanteenInspections(schoolId);

  const [open, setOpen] = useState(false);
  const [dateStr, setDateStr] = useState(new Date().toISOString().slice(0, 10));
  const [inspector, setInspector] = useState('');
  const [compliant, setCompliant] = useState(true);
  const [score, setScore] = useState('');
  const [findings, setFindings] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [busy, setBusy] = useState(false);

  const scoreNum = Number(score);
  const scoreValid = score.trim() === '' || (Number.isFinite(scoreNum) && scoreNum >= 0 && scoreNum <= 100);

  const { rows, latest, complianceRate } = useMemo(() => {
    const sorted = inspections.slice().sort((a, b) => (b.date ?? 0) - (a.date ?? 0));
    const withFlag = inspections.filter((i) => i.fssaiCompliant != null);
    const rate = withFlag.length ? Math.round((withFlag.filter((i) => i.fssaiCompliant).length / withFlag.length) * 100) : 0;
    return { rows: sorted, latest: sorted[0], complianceRate: rate };
  }, [inspections]);

  const reset = () => {
    setDateStr(new Date().toISOString().slice(0, 10)); setInspector(''); setCompliant(true);
    setScore(''); setFindings(''); setActionTaken('');
  };

  const submit = async () => {
    if (!schoolId || !scoreValid) return;
    setBusy(true);
    try {
      await createInspection(schoolId, {
        schoolId,
        date: new Date(`${dateStr}T00:00:00`).getTime() || Date.now(),
        inspector: inspector.trim() || undefined,
        fssaiCompliant: compliant,
        hygieneScore: score.trim() !== '' ? Math.round(scoreNum) : undefined,
        findings: findings.trim() || undefined,
        actionTaken: actionTaken.trim() || undefined,
      }, actor);
      toast.success('Inspection logged');
      setOpen(false);
      reset();
    } catch {
      toast.error('Could not save');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="kpi-grid">
        <KPICard icon="shield-check" label="FSSAI compliance" count={complianceRate} format="plain" suffix="%"
          subColor={complianceRate >= 80 ? 'var(--success)' : complianceRate ? 'var(--warning)' : undefined} sub={rows.length ? `${rows.length} inspection${rows.length === 1 ? '' : 's'}` : 'No inspections yet'} />
        <KPICard icon="award" label="Latest hygiene score" value={latest?.hygieneScore != null ? `${latest.hygieneScore}/100` : '—'} />
      </div>

      <div className="nx-toolbar" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, flex: 1 }}>FSSAI compliance and kitchen hygiene inspections.</p>
        {canWrite && <Button variant="gold" leftIcon="plus" onClick={() => { reset(); setOpen(true); }}>Log inspection</Button>}
      </div>

      {error ? (
        <Panel><EmptyState icon="alert-triangle" title="Couldn't load inspections" message="Please try again." /></Panel>
      ) : loading ? (
        <Skeleton height={180} />
      ) : rows.length === 0 ? (
        <Panel><EmptyState icon="shield-check" title="No inspections yet" message={canWrite ? 'Log a hygiene / FSSAI inspection to start the record.' : 'Inspection records will appear here.'} /></Panel>
      ) : (
        <div className="cant-list" style={{ gap: 10 }}>
          {rows.map((ins) => (
            <InspectionCard key={ins.id} ins={ins} />
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => !busy && setOpen(false)} icon="shield-check" tone="gold" title="Log inspection" size="md" dismissible={!busy}
        footer={<>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
          <Button variant="gold" leftIcon="check" loading={busy} disabled={!scoreValid} onClick={submit}>Save</Button>
        </>}>
        <div className="cant-modal-grid">
          <Field label="Date"><Input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} /></Field>
          <Field label="Inspector" optional><Input value={inspector} onChange={(e) => setInspector(e.target.value)} placeholder="Name / authority" /></Field>
        </div>
        <Field label="FSSAI status">
          <Toggle checked={compliant} onChange={setCompliant} label={compliant ? 'Compliant' : 'Non-compliant'} />
        </Field>
        <Field label="Hygiene score" optional hint="0–100" error={!scoreValid ? 'Enter a score 0–100' : undefined}>
          <Input type="number" inputMode="numeric" value={score} onChange={(e) => setScore(e.target.value)} min={0} max={100} placeholder="e.g. 85" invalid={!scoreValid} />
        </Field>
        <Field label="Findings" optional><Textarea value={findings} onChange={(e) => setFindings(e.target.value)} rows={2} placeholder="Observations from the inspection" /></Field>
        <Field label="Action taken" optional><Textarea value={actionTaken} onChange={(e) => setActionTaken(e.target.value)} rows={2} placeholder="Corrective actions" /></Field>
      </Modal>
    </div>
  );
}

function InspectionCard({ ins }: { ins: CanteenInspection }) {
  const tone = scoreTone(ins.hygieneScore);
  return (
    <Panel>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600 }}>{ins.date ? formatDate(ins.date) : '—'}</span>
            {ins.fssaiCompliant != null && (
              <Badge variant={ins.fssaiCompliant ? 'success' : 'danger'}>
                {ins.fssaiCompliant ? 'FSSAI compliant' : 'Non-compliant'}
              </Badge>
            )}
            {ins.hygieneScore != null && <Badge variant={tone.variant}>Hygiene {tone.label}</Badge>}
          </div>
          {ins.inspector && <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 3 }}>Inspector: {ins.inspector}</div>}
        </div>
        <span className="cant-mealicon" aria-hidden="true" style={{ color: ins.fssaiCompliant === false ? 'var(--danger)' : 'var(--gold)' }}>
          <Icon name={ins.fssaiCompliant === false ? 'alert-triangle' : 'shield-check'} size={16} />
        </span>
      </div>
      {(ins.findings || ins.actionTaken) && (
        <div className="cant-list" style={{ gap: 4, marginTop: 10 }}>
          {ins.findings && <div className="nx-kv"><span className="nx-kv__k">Findings</span><span className="nx-kv__v" style={{ textAlign: 'right' }}>{ins.findings}</span></div>}
          {ins.actionTaken && <div className="nx-kv"><span className="nx-kv__k">Action</span><span className="nx-kv__v" style={{ textAlign: 'right' }}>{ins.actionTaken}</span></div>}
        </div>
      )}
    </Panel>
  );
}
