import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KPICard } from '@/components/KPICard';
import { Panel } from '@/components/Panel';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import { ConfirmModal } from '@/components/Modal';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useVisitors, updateVisitor } from '@/features/ops/data';
import { VISITOR_PURPOSE_OPTIONS } from '@/features/ops/meta';
import type { VisitorLog } from '@/types/ops';

const isToday = (t?: number) => {
  if (!t) return false;
  const d = new Date(t); const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
};
const time = (t?: number) => (t ? new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—');
const purposeLabel = (v: string) => VISITOR_PURPOSE_OPTIONS.find((o) => o.value === v)?.label ?? v;

export function GateRegisterTab() {
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const canWrite = useOwnership('visitor').canOperate;
  const { data: visitors, loading } = useVisitors(schoolId);
  const [checkout, setCheckout] = useState<VisitorLog | null>(null);
  const [busy, setBusy] = useState(false);

  const onPremises = useMemo(() => visitors.filter((v) => v.status === 'in').sort((a, b) => (b.inAt ?? 0) - (a.inAt ?? 0)), [visitors]);
  const stats = useMemo(() => {
    const todays = visitors.filter((v) => isToday(v.inAt));
    return { onPremises: onPremises.length, todayTotal: todays.length, checkedOut: todays.filter((v) => v.status === 'out').length };
  }, [visitors, onPremises]);

  const doCheckout = async () => {
    if (!schoolId || !checkout) return;
    setBusy(true);
    try { await updateVisitor(schoolId, checkout.id, { status: 'out', outAt: Date.now() }, { uid: uid ?? 'unknown', name: member?.name }); toast.success('Checked out', checkout.name); setCheckout(null); }
    catch { toast.error('Could not check out'); } finally { setBusy(false); }
  };

  return (
    <div>
      <div className="kpi-grid">
        <KPICard icon="users" label="On premises" count={stats.onPremises} format="us" subColor={stats.onPremises ? 'var(--gold)' : undefined} />
        <KPICard icon="user-plus" label="Today's visitors" count={stats.todayTotal} format="us" />
        <KPICard icon="check-circle" label="Checked out today" count={stats.checkedOut} format="us" />
      </div>

      <div className="nx-toolbar" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, flex: 1 }}>Visitors currently inside the campus.</p>
        {canWrite && <Button variant="gold" leftIcon="user-plus" onClick={() => navigate('/visitor/new')}>Check in visitor</Button>}
      </div>

      {loading ? (
        <Skeleton height={200} />
      ) : onPremises.length === 0 ? (
        <Panel><EmptyState icon="shield-check" title="No visitors on premises" message={canWrite ? 'Check in a visitor to issue a gate pass.' : 'Active visitors will appear here.'} /></Panel>
      ) : (
        <div className="grid g-2">
          {onPremises.map((v) => (
            <Panel key={v.id}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700 }}>{v.name}</span>
                    <Badge variant="success">In</Badge>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 3 }}>
                    {purposeLabel(v.purpose)}{v.whomToMeet ? ` · meeting ${v.whomToMeet}` : ''} · since {time(v.inAt)}
                  </div>
                  {v.passNo && <div style={{ fontSize: 11.5, color: 'var(--gold)', marginTop: 3, letterSpacing: '0.04em' }}>{v.passNo}</div>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <Button variant="subtle" size="sm" leftIcon="external-link" onClick={() => navigate(`/visitor/${v.id}`)}>Pass</Button>
                {canWrite && <Button variant="ghost" size="sm" leftIcon="check-circle" onClick={() => setCheckout(v)}>Check out</Button>}
              </div>
            </Panel>
          ))}
        </div>
      )}

      <ConfirmModal open={!!checkout} onClose={() => setCheckout(null)} onConfirm={doCheckout} tone="gold" loading={busy}
        title="Check out visitor?" message={checkout ? `Mark ${checkout.name} as checked out now?` : ''} confirmLabel="Check out" />

      {onPremises.length > 0 && <p className="fin-noprint" style={{ marginTop: 12, fontSize: 11.5, color: 'var(--text-muted)', display: 'flex', gap: 6, alignItems: 'center' }}><Icon name="info" size={13} /> Visitors not checked out by end of day are flagged in the full log.</p>}
    </div>
  );
}
