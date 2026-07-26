import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Panel } from '@/components/Panel';
import { ConfirmModal } from '@/components/Modal';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { formatDate } from '@/lib/format';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useVisitor, updateVisitor } from '@/features/ops/data';
import { VISITOR_STATUS_META, VISITOR_PURPOSE_OPTIONS, ID_TYPE_OPTIONS } from '@/features/ops/meta';

const purposeLabel = (v: string) => VISITOR_PURPOSE_OPTIONS.find((o) => o.value === v)?.label ?? v;
const idLabel = (v?: string) => ID_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? v;
const time = (t?: number) => (t ? new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—');

export function VisitorPassPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const { data: v, loading } = useVisitor(schoolId, id);
  const [checkout, setCheckout] = useState(false);
  const [busy, setBusy] = useState(false);
  const canWrite = useOwnership('visitor').canOperate;

  if (loading) return <div className="nx-page"><Skeleton height={64} /><Skeleton height={320} /></div>;
  if (!v) {
    return <div className="nx-page"><Panel><EmptyState icon="user" title="Visitor not found" action={<Button variant="subtle" onClick={() => navigate('/visitor')}>Back to gate</Button>} /></Panel></div>;
  }

  const doCheckout = async () => {
    if (!schoolId) return;
    setBusy(true);
    try {
      await updateVisitor(schoolId, v.id, { status: 'out', outAt: Date.now() }, { uid: uid ?? 'unknown', name: member?.name });
      toast.success('Visitor checked out', v.name);
      setCheckout(false);
    } catch { toast.error('Could not check out'); } finally { setBusy(false); }
  };

  return (
    <div className="nx-page">
      <div className="nx-page__head fin-noprint">
        <Button variant="ghost" size="sm" leftIcon="chevron-left" onClick={() => navigate('/visitor')}>Gate register</Button>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" leftIcon="download" onClick={() => window.print()}>Print pass</Button>
          {canWrite && v.status === 'in' && <Button variant="gold" leftIcon="check-circle" onClick={() => setCheckout(true)}>Check out</Button>}
        </div>
      </div>

      <div className="ops-pass fin-print">
        <div className="ops-pass__no">{v.passNo ?? 'GATE PASS'}</div>
        <div className="ops-pass__name">{v.name}</div>
        <Badge variant={VISITOR_STATUS_META[v.status].variant}>{VISITOR_STATUS_META[v.status].label}</Badge>
        {v.otp && v.status === 'in' && (
          <>
            <div className="ops-pass__otp" aria-label={`Verification OTP ${v.otp}`}>{v.otp}</div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Share this OTP with the host to verify the visitor.</p>
          </>
        )}
        <div className="fin-kv-list" style={{ gap: 6, marginTop: 14, textAlign: 'left' }}>
          <div className="nx-kv"><span className="nx-kv__k">Purpose</span><span className="nx-kv__v">{purposeLabel(v.purpose)}</span></div>
          {v.whomToMeet && <div className="nx-kv"><span className="nx-kv__k">Meeting</span><span className="nx-kv__v">{v.whomToMeet}</span></div>}
          {v.company && <div className="nx-kv"><span className="nx-kv__k">Company</span><span className="nx-kv__v">{v.company}</span></div>}
          {v.phone && <div className="nx-kv"><span className="nx-kv__k">Mobile</span><span className="nx-kv__v">{v.phone}</span></div>}
          {(v.partySize ?? 1) > 1 && <div className="nx-kv"><span className="nx-kv__k">Party size</span><span className="nx-kv__v">{v.partySize}</span></div>}
          {v.idType && <div className="nx-kv"><span className="nx-kv__k">ID</span><span className="nx-kv__v">{idLabel(v.idType)}{v.idLast4 ? ` ••••${v.idLast4}` : ''}</span></div>}
          {v.vehicleNo && <div className="nx-kv"><span className="nx-kv__k">Vehicle</span><span className="nx-kv__v">{v.vehicleNo}</span></div>}
          <div className="nx-kv"><span className="nx-kv__k">In</span><span className="nx-kv__v">{v.inAt ? `${formatDate(v.inAt)} · ${time(v.inAt)}` : '—'}</span></div>
          {v.outAt && <div className="nx-kv"><span className="nx-kv__k">Out</span><span className="nx-kv__v">{formatDate(v.outAt)} · {time(v.outAt)}</span></div>}
          {v.gateName && <div className="nx-kv"><span className="nx-kv__k">Logged by</span><span className="nx-kv__v">{v.gateName}</span></div>}
        </div>
      </div>

      <ConfirmModal open={checkout} onClose={() => setCheckout(false)} onConfirm={doCheckout} tone="gold" loading={busy}
        title="Check out visitor?" message={`Mark ${v.name} as checked out now?`} confirmLabel="Check out" />
    </div>
  );
}
