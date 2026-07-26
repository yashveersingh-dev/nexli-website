import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { Badge } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import { KPICard } from '@/components/KPICard';
import { Select } from '@/components/form';
import { Modal, ConfirmModal } from '@/components/Modal';
import { EmptyState, Skeleton } from '@/components/feedback';
import { Textarea, Field } from '@/components/form';
import { useToast } from '@/components/Toast';
import { formatDate, formatRelative } from '@/lib/format';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useGatePasses, updateGatePass, notifyHostel, type Actor } from './data';
import { useHostelScope } from './scope';
import { GATEPASS_TYPE_META, GATEPASS_STATUS_META, GATEPASS_FILTERS } from './meta';
import type { GatePass, GatePassStatus } from '@/types/ops';

const typeLabel = (t: GatePass['type']) => GATEPASS_TYPE_META[t]?.label ?? t;
const time = (t?: number) => (t ? new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—');

/** A pass is overdue when it's out, not returned, and now is past expectedReturn. */
const isOverdue = (e: GatePass, now: number) => e.status === 'out' && !e.returnedAt && e.expectedReturn != null && now > e.expectedReturn;
const effectiveStatus = (e: GatePass, now: number): GatePassStatus => (isOverdue(e, now) ? 'overdue' : e.status);

const RANK: Record<GatePassStatus, number> = {
  overdue: 0, out: 1, requested: 2, warden_approved: 3, approved: 4, returned: 5, rejected: 6,
};

export function GatePassTab() {
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const canWrite = useOwnership('hostel').canOperate;
  const { blockIds, seesAll, isChiefWarden } = useHostelScope();
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };
  const { data: passes, loading } = useGatePasses(schoolId);

  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const [reject, setReject] = useState<GatePass | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [notify, setNotify] = useState<GatePass | null>(null);
  const [notifyMsg, setNotifyMsg] = useState('');

  // Tick every 30s so overdue badges update live without a reload.
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  // Block-scope: a warden sees only their block; chief warden / leadership see all.
  const scoped = useMemo(
    () => (seesAll ? passes : passes.filter((e) => !e.blockId || blockIds.has(e.blockId))),
    [passes, seesAll, blockIds],
  );

  const kpis = useMemo(() => {
    let awaiting = 0, out = 0, overdue = 0;
    for (const e of scoped) {
      if (e.status === 'requested' || e.status === 'warden_approved') awaiting++;
      if (e.status === 'out') out++;
      if (isOverdue(e, now)) overdue++;
    }
    return { awaiting, out, overdue };
  }, [scoped, now]);

  const rows = useMemo(() => {
    return scoped
      .filter((e) => (filter ? effectiveStatus(e, now) === filter : true))
      .sort((a, b) => RANK[effectiveStatus(a, now)] - RANK[effectiveStatus(b, now)] || (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }, [scoped, filter, now]);

  const act = async (e: GatePass, patch: Partial<GatePass>, msg: string, summary?: string) => {
    if (!schoolId) return;
    setBusy(true);
    try { await updateGatePass(schoolId, e.id, patch, actor, summary); toast.success(msg, e.studentName); }
    catch { toast.error('Could not update'); } finally { setBusy(false); }
  };

  const wardenApprove = (e: GatePass) => {
    // If the pass escalates, it goes to the chief warden; otherwise it's approved.
    if (e.needsChiefApproval) {
      void act(e, { status: 'warden_approved', wardenApprovedByName: member?.name, wardenApprovedAt: Date.now() }, 'Sent to chief warden');
    } else {
      void act(e, { status: 'approved', wardenApprovedByName: member?.name, wardenApprovedAt: Date.now() }, 'Pass approved');
    }
  };
  const chiefApprove = (e: GatePass) =>
    act(e, { status: 'approved', chiefApprovedByName: member?.name, chiefApprovedAt: Date.now() }, 'Pass approved (chief)');

  const confirmReject = async () => {
    if (!reject) return;
    await act(reject, { status: 'rejected', rejectedByName: member?.name, rejectionReason: rejectReason.trim() || undefined }, 'Pass rejected');
    setReject(null); setRejectReason('');
  };

  const sendNotify = async () => {
    if (!schoolId || !notify) return;
    setBusy(true);
    try {
      await notifyHostel(schoolId, {
        kind: isOverdue(notify, now) ? 'gatepass_overdue' : 'general',
        studentId: notify.studentId, studentName: notify.studentName,
        blockId: notify.blockId, blockName: notify.blockName,
        guardianName: notify.guardianName, guardianPhone: notify.guardianPhone,
        message: notifyMsg.trim(),
        refType: 'hostel_gatepass', refId: notify.id,
      }, actor);
      await updateGatePass(schoolId, notify.id, { notifiedCount: (notify.notifiedCount ?? 0) + 1, lastNotifiedAt: Date.now() }, actor);
      toast.success('Parent notified', notify.studentName);
      setNotify(null); setNotifyMsg('');
    } catch { toast.error('Could not record notification'); } finally { setBusy(false); }
  };

  const openNotify = (e: GatePass) => {
    setNotify(e);
    setNotifyMsg(isOverdue(e, now)
      ? `${e.studentName} is past the expected return time (${time(e.expectedReturn)}) and not yet back. Please contact the hostel immediately.`
      : `Update regarding ${e.studentName}'s gate pass.`);
  };

  return (
    <div>
      {!seesAll && (
        <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '0 0 12px', display: 'flex', gap: 6, alignItems: 'center' }}>
          <Icon name="info" size={13} /> Showing passes for your block only. The chief warden sees every block.
        </p>
      )}

      <div className="nx-kpi-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
        <KPICard icon="clock" label="Awaiting approval" count={kpis.awaiting} />
        <KPICard icon="external-link" label="Currently out" count={kpis.out} />
        <KPICard icon="alert-triangle" label="Overdue" count={kpis.overdue} delta={kpis.overdue > 0 ? { value: 'Action needed', dir: 'down' } : undefined} />
      </div>

      {kpis.overdue > 0 && (
        <div className="ops-sos" role="alert">
          <span className="ops-sos__icon"><Icon name="alert-triangle" size={20} /></span>
          <div>
            <div className="ops-sos__title">{kpis.overdue} overdue {kpis.overdue === 1 ? 'boarder' : 'boarders'}</div>
            <div className="ops-sos__meta">A boarder is past their expected return and not yet back. Notify the guardian and escalate.</div>
          </div>
        </div>
      )}

      <div className="nx-toolbar">
        <Select className="nx-toolbar__filter" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by status" options={GATEPASS_FILTERS} />
        <span style={{ flex: 1 }} />
        {canWrite && <Button variant="gold" leftIcon="plus" onClick={() => navigate('/hostel/gatepass/new')}>New gate pass</Button>}
      </div>

      {loading ? (
        <Skeleton height={220} />
      ) : rows.length === 0 ? (
        <Panel><EmptyState icon="calendar" title={filter ? 'No matching passes' : 'No gate passes'}
          message={filter ? 'Try a different status filter.' : canWrite ? 'Raise a gate pass to start the approval workflow.' : 'Gate passes will appear here.'} /></Panel>
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
                      <Badge variant={GATEPASS_STATUS_META[eff].variant}>{GATEPASS_STATUS_META[eff].label}</Badge>
                      {e.needsChiefApproval && <Badge variant="warning">Chief sign-off</Badge>}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 3 }}>
                      {typeLabel(e.type)}{e.gradeName ? ` · ${e.gradeName}` : ''}{e.blockName ? ` · ${e.blockName}` : ''}{e.destination ? ` · ${e.destination}` : ''}
                    </div>
                    {e.reason && <div style={{ fontSize: 12.5, marginTop: 3 }}>{e.reason}</div>}
                    <div style={{ fontSize: 11.5, color: overdue ? 'var(--danger)' : 'var(--text-muted)', marginTop: 4 }}>
                      {e.expectedReturn ? <>Expected back {formatDate(e.expectedReturn)} · {time(e.expectedReturn)}{overdue ? ` · ${formatRelative(e.expectedReturn)}` : ''}</> : 'No return time set'}
                      {e.outAt ? ` · out ${time(e.outAt)}` : ''}{e.returnedAt ? ` · returned ${formatDate(e.returnedAt)} ${time(e.returnedAt)}` : ''}
                    </div>
                    {(e.guardianName || e.guardianPhone) && (
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>Guardian: {e.guardianName ?? '—'}{e.guardianPhone ? ` · ${e.guardianPhone}` : ''}{e.notifiedCount ? ` · notified ${e.notifiedCount}×` : ''}</div>
                    )}
                    {e.status === 'rejected' && e.rejectionReason && (
                      <div style={{ fontSize: 11.5, color: 'var(--danger)', marginTop: 3 }}>Rejected: {e.rejectionReason}</div>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                      {e.wardenApprovedByName ? `Warden: ${e.wardenApprovedByName}` : ''}
                      {e.chiefApprovedByName ? ` · Chief: ${e.chiefApprovedByName}` : ''}
                    </div>
                  </div>
                </div>

                {canWrite && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    {e.status === 'requested' && <>
                      <Button variant="gold" size="sm" leftIcon="check" loading={busy} onClick={() => wardenApprove(e)}>Warden approve</Button>
                      <Button variant="ghost" size="sm" leftIcon="x" disabled={busy} onClick={() => setReject(e)}>Reject</Button>
                    </>}
                    {e.status === 'warden_approved' && (
                      isChiefWarden ? <>
                        <Button variant="gold" size="sm" leftIcon="shield-check" loading={busy} onClick={() => chiefApprove(e)}>Chief approve</Button>
                        <Button variant="ghost" size="sm" leftIcon="x" disabled={busy} onClick={() => setReject(e)}>Reject</Button>
                      </> : (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Icon name="clock" size={13} /> Awaiting chief warden
                        </span>
                      )
                    )}
                    {e.status === 'approved' && (
                      <Button variant="gold" size="sm" leftIcon="external-link" loading={busy} onClick={() => act(e, { status: 'out', outAt: Date.now(), checkedOutByName: member?.name }, 'Checked out')}>Check out (gate)</Button>
                    )}
                    {e.status === 'out' && <>
                      <Button variant={overdue ? 'danger' : 'gold'} size="sm" leftIcon="check-circle" loading={busy} onClick={() => act(e, { status: 'returned', returnedAt: Date.now(), checkedInByName: member?.name }, 'Checked in')}>Check in (gate)</Button>
                      <Button variant="ghost" size="sm" leftIcon="bell" disabled={busy} onClick={() => openNotify(e)}>Notify parent</Button>
                    </>}
                  </div>
                )}
              </Panel>
            );
          })}
        </div>
      )}

      <ConfirmModal open={!!reject} onClose={() => { setReject(null); setRejectReason(''); }} onConfirm={confirmReject} tone="danger" loading={busy}
        title="Reject gate pass?" message={reject ? `${reject.studentName}'s request will be rejected.` : ''} confirmLabel="Reject">
        <Field label="Reason" optional><Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={2} placeholder="Why is this being rejected?" /></Field>
      </ConfirmModal>

      <Modal open={!!notify} onClose={() => { setNotify(null); setNotifyMsg(''); }} icon="bell" tone="warning" size="md" dismissible={!busy}
        title="Notify parent" description={notify ? `${notify.studentName}${notify.guardianPhone ? ` · ${notify.guardianPhone}` : ''}` : undefined}
        footer={<>
          <Button variant="ghost" onClick={() => { setNotify(null); setNotifyMsg(''); }} disabled={busy}>Cancel</Button>
          <Button variant="gold" leftIcon="send" loading={busy} disabled={!notifyMsg.trim()} onClick={sendNotify}>Record notification</Button>
        </>}>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 0 }}>
          Records an in-app notification log for the guardian. (SMS / WhatsApp delivery is a future seam — no message is sent on this plan.)
        </p>
        <Field label="Message" required><Textarea value={notifyMsg} onChange={(e) => setNotifyMsg(e.target.value)} rows={3} /></Field>
      </Modal>
    </div>
  );
}
