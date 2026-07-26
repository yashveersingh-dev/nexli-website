import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { Badge } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import { Select } from '@/components/form';
import { ConfirmModal } from '@/components/Modal';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { formatDate, formatRelative } from '@/lib/format';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useExeatPasses, updateExeat, type Actor } from '@/features/ops/data';
import { EXEAT_TYPE_OPTIONS, EXEAT_STATUS_META } from '@/features/ops/meta';
import type { ExeatPass, ExeatStatus } from '@/types/ops';

const typeLabel = (t: string) => EXEAT_TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t;
const time = (t?: number) => (t ? new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—');

/** A pass is overdue when it's out, not returned, and now is past expectedReturn. */
const isOverdue = (e: ExeatPass, now: number) => e.status === 'out' && !e.returnedAt && e.expectedReturn != null && now > e.expectedReturn;
/** Effective status for display (derives `overdue` without mutating the record). */
const effectiveStatus = (e: ExeatPass, now: number): ExeatStatus => (isOverdue(e, now) ? 'overdue' : e.status);

const FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All passes' },
  { value: 'requested', label: 'Requested' },
  { value: 'approved', label: 'Approved' },
  { value: 'out', label: 'Out' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'returned', label: 'Returned' },
  { value: 'rejected', label: 'Rejected' },
];

export function ExeatTab() {
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const canWrite = useOwnership('hostel').canOperate;
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };
  const { data: passes, loading } = useExeatPasses(schoolId);

  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const [reject, setReject] = useState<ExeatPass | null>(null);

  // Tick every 30s so overdue badges update live without a reload.
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const overdueCount = useMemo(() => passes.filter((e) => isOverdue(e, now)).length, [passes, now]);

  const rows = useMemo(() => {
    return passes
      .filter((e) => (filter ? effectiveStatus(e, now) === filter : true))
      .sort((a, b) => {
        const rank = (e: ExeatPass) => (isOverdue(e, now) ? 0 : e.status === 'out' ? 1 : e.status === 'requested' ? 2 : e.status === 'approved' ? 3 : 4);
        return rank(a) - rank(b) || (b.createdAt ?? 0) - (a.createdAt ?? 0);
      });
  }, [passes, filter, now]);

  const act = async (e: ExeatPass, patch: Partial<ExeatPass>, msg: string) => {
    if (!schoolId) return;
    setBusy(true);
    try { await updateExeat(schoolId, e.id, patch, actor); toast.success(msg, e.studentName); }
    catch { toast.error('Could not update'); } finally { setBusy(false); }
  };

  const confirmReject = async () => {
    if (!reject) return;
    await act(reject, { status: 'rejected' }, 'Exeat rejected');
    setReject(null);
  };

  return (
    <div>
      {overdueCount > 0 && (
        <div className="ops-sos" role="alert">
          <span className="ops-sos__icon"><Icon name="alert-triangle" size={20} /></span>
          <div>
            <div className="ops-sos__title">{overdueCount} overdue {overdueCount === 1 ? 'boarder' : 'boarders'}</div>
            <div className="ops-sos__meta">A boarder is past their expected return and not yet back. Contact the guardian and escalate.</div>
          </div>
        </div>
      )}

      <div className="nx-toolbar">
        <Select className="nx-toolbar__filter" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by status"
          options={FILTERS} />
        <span style={{ flex: 1 }} />
        {canWrite && <Button variant="gold" leftIcon="plus" onClick={() => navigate('/hostel/exeat/new')}>Request exeat</Button>}
      </div>

      {loading ? (
        <Skeleton height={200} />
      ) : rows.length === 0 ? (
        <Panel><EmptyState icon="calendar" title={filter ? 'No matching passes' : 'No exeat passes'}
          message={filter ? 'Try a different status filter.' : canWrite ? 'Request an exeat to start the approval workflow.' : 'Exeat passes will appear here.'} /></Panel>
      ) : (
        <div className="grid g-2">
          {rows.map((e) => {
            const eff = effectiveStatus(e, now);
            const overdue = eff === 'overdue';
            return (
              <Panel key={e.id} className={overdue ? 'hostel-exeat--overdue' : undefined}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700 }}>{e.studentName}</span>
                      <Badge variant={EXEAT_STATUS_META[eff].variant}>{EXEAT_STATUS_META[eff].label}</Badge>
                      {overdue && <Badge variant="danger">Overdue</Badge>}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 3 }}>
                      {typeLabel(e.type)}{e.blockName ? ` · ${e.blockName}` : ''}{e.destination ? ` · ${e.destination}` : ''}
                    </div>
                    {e.reason && <div style={{ fontSize: 12.5, marginTop: 3 }}>{e.reason}</div>}
                    <div style={{ fontSize: 11.5, color: overdue ? 'var(--danger)' : 'var(--text-muted)', marginTop: 4 }}>
                      {e.expectedReturn ? <>Expected back {formatDate(e.expectedReturn)} · {time(e.expectedReturn)}{overdue ? ` · ${formatRelative(e.expectedReturn)}` : ''}</> : 'No return time set'}
                      {e.returnedAt ? ` · returned ${formatDate(e.returnedAt)} ${time(e.returnedAt)}` : ''}
                    </div>
                    {(e.guardianName || e.guardianPhone) && (
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>Guardian: {e.guardianName ?? '—'}{e.guardianPhone ? ` · ${e.guardianPhone}` : ''}</div>
                    )}
                  </div>
                </div>

                {canWrite && e.status !== 'returned' && e.status !== 'rejected' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    {e.status === 'requested' && <>
                      <Button variant="gold" size="sm" leftIcon="check" loading={busy} onClick={() => act(e, { status: 'approved', approvedByName: member?.name }, 'Exeat approved')}>Approve</Button>
                      <Button variant="ghost" size="sm" leftIcon="x" disabled={busy} onClick={() => setReject(e)}>Reject</Button>
                    </>}
                    {e.status === 'approved' && (
                      <Button variant="gold" size="sm" leftIcon="external-link" loading={busy} onClick={() => act(e, { status: 'out', outAt: Date.now() }, 'Marked out')}>Mark out</Button>
                    )}
                    {e.status === 'out' && (
                      <Button variant={overdue ? 'danger' : 'gold'} size="sm" leftIcon="check-circle" loading={busy} onClick={() => act(e, { status: 'returned', returnedAt: Date.now() }, 'Marked returned')}>Mark returned</Button>
                    )}
                  </div>
                )}
              </Panel>
            );
          })}
        </div>
      )}

      <ConfirmModal open={!!reject} onClose={() => setReject(null)} onConfirm={confirmReject} tone="danger" loading={busy}
        title="Reject exeat?" message={reject ? `${reject.studentName}'s request will be rejected.` : ''} confirmLabel="Reject" />
    </div>
  );
}
