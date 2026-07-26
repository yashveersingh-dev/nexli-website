import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteField, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { tenantDoc } from '@/lib/db';
import { writeAuditEvent } from '@/lib/audit';
import { KPICard } from '@/components/KPICard';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { DataTable, type Column } from '@/components/DataTable';
import { Input, Select } from '@/components/form';
import { Modal, ConfirmModal } from '@/components/Modal';
import { EmptyState } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { formatINR, formatDate, initials } from '@/lib/format';
import { useSession } from '@/app/providers/SessionProvider';
import {
  useRteApplications,
  deleteRteApplication,
  type Actor,
} from '@/features/compliance/data';
import { RTE_STAGE_META, RTE_STAGE_OPTIONS, RTE_CATEGORY_OPTIONS } from '@/features/compliance/meta';
import type { RteApplication, RteStage } from '@/types/compliance';

const CATEGORY_LABEL: Record<'ews' | 'dg', string> = { ews: 'EWS', dg: 'DG' };

/** Stages where a lottery rank is meaningful. A rank left over on a reopened
 *  (applied / rejected / withdrawn) application must not be shown or sorted on,
 *  since `updateDoc` cannot clear the field through the typed writer. */
const RANK_STAGES = new Set<RteStage>(['lottery', 'allotted', 'admitted']);
const effectiveRank = (a: RteApplication): number | null =>
  a.lotteryRank != null && RANK_STAGES.has(a.stage) ? a.lotteryRank : null;

/** Valid forward transitions for the manual stage actions in the detail modal. */
const STAGE_ACTIONS: Partial<Record<RteStage, { to: RteStage; label: string; icon: 'check-circle' | 'x' | 'minus-circle' | 'refresh' }[]>> = {
  applied: [{ to: 'withdrawn', label: 'Withdraw', icon: 'minus-circle' }],
  lottery: [{ to: 'allotted', label: 'Mark allotted', icon: 'check-circle' }, { to: 'rejected', label: 'Reject', icon: 'x' }],
  allotted: [
    { to: 'admitted', label: 'Confirm admission', icon: 'check-circle' },
    { to: 'rejected', label: 'Reject', icon: 'x' },
    { to: 'withdrawn', label: 'Withdraw', icon: 'minus-circle' },
  ],
  admitted: [{ to: 'withdrawn', label: 'Mark withdrawn', icon: 'minus-circle' }],
  rejected: [{ to: 'applied', label: 'Reopen', icon: 'refresh' }],
  withdrawn: [{ to: 'applied', label: 'Reopen', icon: 'refresh' }],
};

export function ApplicationsTab() {
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member, can } = useSession();
  const canWrite = can('compliance.write');
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };
  const { data: apps, loading, error } = useRteApplications(schoolId);

  const [q, setQ] = useState('');
  const [stage, setStage] = useState('');
  const [cat, setCat] = useState('');
  const [detail, setDetail] = useState<RteApplication | null>(null);
  const [removing, setRemoving] = useState<RteApplication | null>(null);
  const [runLottery, setRunLottery] = useState(false);
  const [busy, setBusy] = useState(false);

  const kpis = useMemo(() => {
    let inLottery = 0, admitted = 0, ews = 0, dg = 0;
    for (const a of apps) {
      if (a.stage === 'lottery') inLottery++;
      if (a.stage === 'admitted') {
        admitted++;
        if (a.category === 'ews') ews++;
        else if (a.category === 'dg') dg++;
      }
    }
    return { total: apps.length, inLottery, admitted, ews, dg };
  }, [apps]);

  const appliedCount = useMemo(() => apps.filter((a) => a.stage === 'applied').length, [apps]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return apps
      .filter((a) => (stage ? a.stage === stage : true))
      .filter((a) => (cat ? a.category === cat : true))
      .filter((a) =>
        needle
          ? [a.applicantName, a.guardianName, a.applicationNo, a.gradeApplied, a.phone].some((v) =>
              v?.toLowerCase().includes(needle),
            )
          : true,
      )
      .sort((a, b) => {
        // Lottery rank first (only where the rank applies to the stage), then newest applied.
        const ra = effectiveRank(a);
        const rb = effectiveRank(b);
        if (ra != null && rb != null) return ra - rb;
        if (ra != null) return -1;
        if (rb != null) return 1;
        return (b.appliedDate ?? b.createdAt ?? 0) - (a.appliedDate ?? a.createdAt ?? 0);
      });
  }, [apps, q, stage, cat]);

  /**
   * Draw the RTE lottery (statutory — RTE Act 25% quota). Fisher–Yates shuffle of
   * the `applied` pool → sequential lottery ranks + stage 'lottery'.
   *
   * Integrity hardening:
   *  • Shuffle entropy comes from `crypto.getRandomValues` (an auditable CSPRNG),
   *    not `Math.random()` — a statutory draw must be defensibly fair.
   *  • All rank assignments commit in ONE `writeBatch`: either every applicant is
   *    ranked or none is. The old `Promise.all` could partially fail and leave the
   *    pool half-ranked (some 'lottery', some 'applied') with no clean retry.
   */
  const doRunLottery = async () => {
    if (!schoolId) return;
    const pool = apps.filter((a) => a.stage === 'applied');
    if (pool.length === 0) {
      setRunLottery(false);
      return;
    }
    setBusy(true);
    const shuffled = [...pool];
    // Cryptographically uniform Fisher–Yates (rejection sampling avoids modulo bias).
    const rand = new Uint32Array(1);
    const randomBelow = (n: number) => {
      const limit = Math.floor(0xffffffff / n) * n;
      let x = 0;
      do {
        crypto.getRandomValues(rand);
        x = rand[0];
      } while (x >= limit);
      return x % n;
    };
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = randomBelow(i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    try {
      const batch = writeBatch(db);
      const now = Date.now();
      shuffled.forEach((a, idx) => {
        batch.update(tenantDoc(schoolId, 'rte_applications', a.id), {
          stage: 'lottery',
          lotteryRank: idx + 1,
          lastModifiedAt: now,
          lastModifiedBy: actor.uid,
        });
      });
      await batch.commit();
      void writeAuditEvent({
        action: 'rte.application_updated',
        schoolId,
        actor,
        targetType: 'rte_application',
        summary: `Lottery drawn: ${shuffled.length} applicant${shuffled.length === 1 ? '' : 's'} ranked`,
      });
      toast.success('Lottery drawn', `${shuffled.length} application${shuffled.length === 1 ? '' : 's'} ranked.`);
      setRunLottery(false);
    } catch {
      toast.error('Could not run lottery', 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const transition = async (a: RteApplication, to: RteStage) => {
    if (!schoolId) return;
    setBusy(true);
    // Reopening (→ applied) must CLEAR the stale lottery rank + decision date. The
    // typed `updateRteApplication` writer strips `undefined`, so the fields would
    // persist; write `deleteField()` directly to truly remove them (otherwise a
    // reopened application keeps a stale rank and is mis-sorted on next draw).
    const isReopen = to === 'applied';
    const localPatch: Partial<RteApplication> =
      to === 'admitted' || to === 'rejected' || to === 'withdrawn'
        ? { stage: to, decidedDate: Date.now() }
        : isReopen
          ? { stage: to, decidedDate: undefined, lotteryRank: undefined }
          : { stage: to };
    try {
      const now = Date.now();
      await updateDoc(tenantDoc(schoolId, 'rte_applications', a.id), {
        stage: to,
        ...(to === 'admitted' || to === 'rejected' || to === 'withdrawn' ? { decidedDate: now } : {}),
        ...(isReopen ? { decidedDate: deleteField(), lotteryRank: deleteField() } : {}),
        lastModifiedAt: now,
        lastModifiedBy: actor.uid,
      });
      void writeAuditEvent({ action: 'rte.application_updated', schoolId, actor, targetType: 'rte_application', targetId: a.id, summary: `Moved to ${RTE_STAGE_META[to].label}` });
      toast.success(`Moved to ${RTE_STAGE_META[to].label.toLowerCase()}`, a.applicantName);
      setDetail((d) => (d && d.id === a.id ? { ...d, ...localPatch } : d));
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
      await deleteRteApplication(schoolId, removing.id, actor);
      toast.success('Application deleted');
      setRemoving(null);
    } catch {
      toast.error('Could not delete');
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<RteApplication>[] = [
    {
      key: 'applicant',
      header: 'Applicant',
      primary: true,
      render: (a) => (
        <span className="rte-applicant">
          <span className="rte-applicant__avatar" aria-hidden="true">{initials(a.applicantName)}</span>
          <span className="rte-applicant__text">
            <span className="rte-applicant__name">{a.applicantName}</span>
            <span className="rte-applicant__sub">
              {a.guardianName ? `${a.guardianName} · ` : ''}
              {a.gradeApplied || 'Grade —'}
              {a.applicationNo ? ` · ${a.applicationNo}` : ''}
            </span>
          </span>
        </span>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (a) =>
        a.category ? (
          <span className="rte-cat">
            <span className={`rte-cat__dot rte-cat__dot--${a.category}`} aria-hidden="true" />
            {CATEGORY_LABEL[a.category]}
          </span>
        ) : (
          <span className="rte-amount--pending">—</span>
        ),
    },
    {
      key: 'rank',
      header: 'Rank',
      align: 'right',
      hideOnMobile: true,
      render: (a) => {
        const r = effectiveRank(a);
        return r != null ? <span className="rte-rank">#{r}</span> : <span className="rte-amount--pending">—</span>;
      },
    },
    {
      key: 'stage',
      header: 'Stage',
      align: 'right',
      render: (a) => <Badge variant={RTE_STAGE_META[a.stage].variant}>{RTE_STAGE_META[a.stage].label}</Badge>,
    },
  ];

  const toolbar = (
    <>
      <div className="kpi-grid" style={{ marginBottom: 16 }}>
        <KPICard icon="users" label="Total applications" count={kpis.total} format="us" />
        <KPICard icon="refresh" label="In lottery" count={kpis.inLottery} format="us" subColor={kpis.inLottery ? 'var(--warning)' : undefined} />
        <KPICard icon="check-circle" label="Admitted" count={kpis.admitted} format="us" subColor={kpis.admitted ? 'var(--success)' : undefined} />
        <KPICard icon="award" label="Seats by category" value={`${kpis.ews} EWS · ${kpis.dg} DG`} sub="admitted" />
      </div>

      <div className="nx-toolbar">
        <div className="nx-toolbar__search">
          <Input leftIcon="search" placeholder="Search name, guardian, app no…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search applications" />
        </div>
        <Select value={stage} onChange={(e) => setStage(e.target.value)} aria-label="Filter by stage"
          options={[{ value: '', label: 'All stages' }, ...RTE_STAGE_OPTIONS]} />
        <Select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Filter by category"
          options={[{ value: '', label: 'All categories' }, ...RTE_CATEGORY_OPTIONS]} />
        <div style={{ flex: 1 }} />
        {canWrite && (
          <>
            <Button variant="subtle" leftIcon="refresh" onClick={() => setRunLottery(true)} disabled={appliedCount === 0} title={appliedCount === 0 ? 'No applications awaiting the draw' : undefined}>
              Run lottery{appliedCount ? ` (${appliedCount})` : ''}
            </Button>
            <Button variant="gold" leftIcon="user-plus" onClick={() => navigate('/rte/new')}>New application</Button>
          </>
        )}
      </div>
    </>
  );

  return (
    <div>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(a) => a.id}
        loading={loading}
        error={error ? 'Could not load applications.' : null}
        toolbar={toolbar}
        onRowClick={(a) => setDetail(a)}
        emptyIcon="award"
        emptyTitle={q || stage || cat ? 'No matching applications' : 'No RTE applications yet'}
        emptyMessage={
          q || stage || cat
            ? 'Try a different search or filter.'
            : canWrite
              ? 'Add RTE / EWS applicants to manage the 25% quota lottery and admissions.'
              : 'RTE / EWS applications will appear here.'
        }
      />

      {/* Detail + stage workflow */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        icon="award"
        tone="gold"
        size="md"
        title={detail?.applicantName ?? 'Application'}
        description={detail ? RTE_STAGE_META[detail.stage].label : undefined}
      >
        {detail && (
          <div>
            <dl className="rte-kv" style={{ marginBottom: 16 }}>
              {detail.guardianName && (<><dt>Guardian</dt><dd>{detail.guardianName}</dd></>)}
              {detail.phone && (<><dt>Phone</dt><dd>{detail.phone}</dd></>)}
              <dt>Category</dt>
              <dd>{detail.category ? RTE_CATEGORY_OPTIONS.find((o) => o.value === detail.category)?.label : '—'}</dd>
              <dt>Grade</dt>
              <dd>{detail.gradeApplied || '—'}</dd>
              {detail.academicYear && (<><dt>Academic year</dt><dd>{detail.academicYear}</dd></>)}
              {detail.applicationNo && (<><dt>Application no.</dt><dd>{detail.applicationNo}</dd></>)}
              {detail.annualIncome != null && (<><dt>Annual income</dt><dd>{formatINR(detail.annualIncome)}</dd></>)}
              {effectiveRank(detail) != null && (<><dt>Lottery rank</dt><dd>#{effectiveRank(detail)}</dd></>)}
              {detail.appliedDate != null && (<><dt>Applied</dt><dd>{formatDate(detail.appliedDate)}</dd></>)}
              {detail.decidedDate != null && (<><dt>Decided</dt><dd>{formatDate(detail.decidedDate)}</dd></>)}
              {detail.notes && (<><dt>Notes</dt><dd>{detail.notes}</dd></>)}
            </dl>

            {canWrite ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="rte-stages">
                  {(STAGE_ACTIONS[detail.stage] ?? []).map((act) => (
                    <Button
                      key={act.to}
                      className="rte-stage-btn"
                      variant={act.to === 'admitted' || act.to === 'allotted' ? 'gold' : act.to === 'rejected' ? 'danger' : 'subtle'}
                      leftIcon={act.icon}
                      loading={busy}
                      onClick={() => transition(detail, act.to)}
                    >
                      {act.label}
                    </Button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', borderTop: '1px solid var(--hairline)', paddingTop: 10 }}>
                  <Button variant="ghost" leftIcon="edit" onClick={() => { const id = detail.id; setDetail(null); navigate(`/rte/${id}/edit`); }}>Edit</Button>
                  <div style={{ flex: 1 }} />
                  <Button variant="ghost" leftIcon="minus-circle" onClick={() => { setRemoving(detail); setDetail(null); }}>Delete</Button>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>You have read-only access to RTE applications.</p>
            )}
          </div>
        )}
      </Modal>

      {/* Run-lottery confirm */}
      <ConfirmModal
        open={runLottery}
        onClose={() => setRunLottery(false)}
        onConfirm={doRunLottery}
        tone="gold"
        icon="refresh"
        loading={busy}
        title="Draw the RTE lottery?"
        message={`${appliedCount} application${appliedCount === 1 ? '' : 's'} awaiting the draw will be randomly ranked and moved to "In lottery". Applications already in a later stage are untouched.`}
        confirmLabel="Run lottery"
      >
        {appliedCount === 0 && (
          <EmptyState icon="info" title="Nothing to draw" message="No applications are in the Applied stage." />
        )}
      </ConfirmModal>

      {/* Delete confirm */}
      <ConfirmModal
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={confirmDelete}
        tone="danger"
        loading={busy}
        title="Delete application?"
        message={removing ? `"${removing.applicantName}" will be permanently removed.` : ''}
        confirmLabel="Delete"
      />
    </div>
  );
}
