import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KPICard } from '@/components/KPICard';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { DataTable, type Column } from '@/components/DataTable';
import { Input, Select, Field, DatePicker } from '@/components/form';
import { Modal, ConfirmModal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { formatINR } from '@/lib/format';
import { useSession } from '@/app/providers/SessionProvider';
import {
  useRteClaims,
  updateRteClaim,
  deleteRteClaim,
  type Actor,
} from '@/features/compliance/data';
import { CLAIM_STATUS_META } from '@/features/compliance/meta';
import type { RteClaim, ClaimStatus } from '@/types/compliance';

const STATUS_OPTIONS = (Object.keys(CLAIM_STATUS_META) as ClaimStatus[]).map((v) => ({ value: v, label: CLAIM_STATUS_META[v].label }));

/** Next forward action in the draft → submitted → approved → received flow. */
const NEXT_ACTION: Partial<Record<ClaimStatus, { to: ClaimStatus; label: string }>> = {
  draft: { to: 'submitted', label: 'Submit' },
  submitted: { to: 'approved', label: 'Approve' },
  approved: { to: 'received', label: 'Mark received' },
};

const iso = (ts?: number) => (ts ? new Date(ts).toISOString().slice(0, 10) : '');

export function ClaimsTab() {
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member, can } = useSession();
  const canWrite = can('compliance.write');
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };
  const { data: claims, loading, error } = useRteClaims(schoolId);

  const [status, setStatus] = useState('');
  const [removing, setRemoving] = useState<RteClaim | null>(null);
  const [busy, setBusy] = useState(false);
  // "Received" capture
  const [receiving, setReceiving] = useState<RteClaim | null>(null);
  const [received, setReceived] = useState('');
  const [receivedOn, setReceivedOn] = useState('');

  const currentYear = useMemo(() => {
    const now = new Date();
    const start = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
  }, []);

  const kpis = useMemo(() => {
    let claimed = 0, recd = 0, pending = 0;
    for (const c of claims) {
      if (c.academicYear !== currentYear) continue;
      claimed += c.amountClaimed ?? 0;
      recd += c.amountReceived ?? 0;
      if (c.status !== 'received' && c.status !== 'rejected') pending += c.amountClaimed ?? 0;
    }
    return { claimed, recd, pending };
  }, [claims, currentYear]);

  const rows = useMemo(() => {
    return claims
      .filter((c) => (status ? c.status === status : true))
      .sort((a, b) => {
        if (a.academicYear !== b.academicYear) return b.academicYear.localeCompare(a.academicYear);
        return (b.createdAt ?? 0) - (a.createdAt ?? 0);
      });
  }, [claims, status]);

  const advance = async (c: RteClaim, to: ClaimStatus) => {
    if (!schoolId) return;
    setBusy(true);
    const patch: Partial<RteClaim> = to === 'submitted' ? { status: to, submittedDate: c.submittedDate ?? Date.now() } : { status: to };
    try {
      await updateRteClaim(schoolId, c.id, patch, actor);
      toast.success(`Claim ${CLAIM_STATUS_META[to].label.toLowerCase()}`, c.academicYear);
    } catch {
      toast.error('Could not update');
    } finally {
      setBusy(false);
    }
  };

  const openReceive = (c: RteClaim) => {
    setReceiving(c);
    setReceived(String(c.amountReceived ?? c.amountClaimed ?? ''));
    setReceivedOn(iso(c.receivedDate ?? Date.now()));
  };

  const confirmReceive = async () => {
    if (!schoolId || !receiving) return;
    const amt = Number(received);
    if (received === '' || Number.isNaN(amt) || amt < 0) return;
    setBusy(true);
    try {
      await updateRteClaim(
        schoolId,
        receiving.id,
        {
          status: 'received',
          amountReceived: amt,
          receivedDate: receivedOn ? new Date(`${receivedOn}T00:00:00`).getTime() : Date.now(),
        },
        actor,
      );
      toast.success('Marked received', formatINR(amt));
      setReceiving(null);
    } catch {
      toast.error('Could not update');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!schoolId || !removing) return;
    setBusy(true);
    try {
      await deleteRteClaim(schoolId, removing.id, actor);
      toast.success('Claim deleted');
      setRemoving(null);
    } catch {
      toast.error('Could not delete');
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<RteClaim>[] = [
    {
      key: 'period',
      header: 'Claim',
      primary: true,
      render: (c) => (
        <span className="rte-claim">
          <span className="rte-claim__title">{c.academicYear}{c.period ? ` · ${c.period}` : ''}</span>
          <span className="rte-claim__sub">
            {c.studentCount} student{c.studentCount === 1 ? '' : 's'} × {formatINR(c.perStudentAmount)}
            {c.referenceNo ? ` · ${c.referenceNo}` : ''}
          </span>
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      hideOnMobile: true,
      render: (c) => <Badge variant={CLAIM_STATUS_META[c.status].variant}>{CLAIM_STATUS_META[c.status].label}</Badge>,
    },
    {
      key: 'received',
      header: 'Received',
      align: 'right',
      hideOnMobile: true,
      render: (c) =>
        c.amountReceived != null ? (
          <span className="rte-amount rte-amount--received">{formatINR(c.amountReceived)}</span>
        ) : (
          <span className="rte-amount--pending">—</span>
        ),
    },
    {
      key: 'amount',
      header: 'Claimed',
      align: 'right',
      render: (c) => <span className="rte-amount">{formatINR(c.amountClaimed)}</span>,
    },
  ];

  const renderActions = canWrite
    ? (c: RteClaim) => {
        const next = c.status === 'approved' ? null : NEXT_ACTION[c.status];
        return (
          <>
            {c.status === 'approved' && (
              <Button variant="gold" size="sm" leftIcon="check-circle" onClick={() => openReceive(c)}>Mark received</Button>
            )}
            {next && (
              <Button variant="subtle" size="sm" leftIcon="check" onClick={() => advance(c, next.to)}>{next.label}</Button>
            )}
            <Button variant="ghost" size="sm" leftIcon="edit" aria-label="Edit" onClick={() => navigate(`/rte/claims/${c.id}/edit`)} />
            <Button variant="ghost" size="sm" leftIcon="minus-circle" aria-label="Delete" onClick={() => setRemoving(c)} />
          </>
        );
      }
    : undefined;

  const toolbar = (
    <>
      <div className="kpi-grid" style={{ marginBottom: 16 }}>
        <KPICard icon="file-text" label={`Claimed (${currentYear})`} count={kpis.claimed} format="inr" />
        <KPICard icon="wallet" label={`Received (${currentYear})`} count={kpis.recd} format="inr" subColor={kpis.recd ? 'var(--success)' : undefined} />
        <KPICard icon="credit-card" label="Awaiting" count={kpis.pending} format="inr" subColor={kpis.pending ? 'var(--warning)' : undefined} sub="not yet received" />
      </div>

      <div className="nx-toolbar">
        <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status"
          options={[{ value: '', label: 'All statuses' }, ...STATUS_OPTIONS]} />
        <div style={{ flex: 1 }} />
        {canWrite && <Button variant="gold" leftIcon="plus" onClick={() => navigate('/rte/claims/new')}>New claim</Button>}
      </div>
    </>
  );

  return (
    <div>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(c) => c.id}
        loading={loading}
        error={error ? 'Could not load claims.' : null}
        toolbar={toolbar}
        actions={renderActions}
        emptyIcon="wallet"
        emptyTitle={status ? 'No matching claims' : 'No reimbursement claims yet'}
        emptyMessage={
          status
            ? 'Try a different status filter.'
            : canWrite
              ? 'Raise a claim to track state reimbursement for RTE-admitted students.'
              : 'Reimbursement claims will appear here.'
        }
      />

      {/* Capture received amount + date */}
      <Modal
        open={!!receiving}
        onClose={() => setReceiving(null)}
        icon="wallet"
        tone="gold"
        size="sm"
        title="Record reimbursement received"
        description={receiving ? `${receiving.academicYear}${receiving.period ? ` · ${receiving.period}` : ''} · claimed ${formatINR(receiving.amountClaimed)}` : undefined}
        dismissible={!busy}
        footer={
          <>
            <Button variant="ghost" onClick={() => setReceiving(null)} disabled={busy}>Cancel</Button>
            <Button variant="gold" leftIcon="check" loading={busy} disabled={received === '' || Number(received) < 0 || Number.isNaN(Number(received))} onClick={confirmReceive}>
              Save
            </Button>
          </>
        }
      >
        <Field label="Amount received (₹)" required>
          <Input type="number" inputMode="numeric" value={received} onChange={(e) => setReceived(e.target.value)} prefix="₹" autoFocus />
        </Field>
        <Field label="Received on">
          <DatePicker value={receivedOn} onChange={(e) => setReceivedOn(e.target.value)} />
        </Field>
      </Modal>

      <ConfirmModal
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={confirmDelete}
        tone="danger"
        loading={busy}
        title="Delete claim?"
        message={removing ? `The ${removing.academicYear} claim of ${formatINR(removing.amountClaimed)} will be removed.` : ''}
        confirmLabel="Delete"
      />
    </div>
  );
}
