import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { Modal, ConfirmModal } from '@/components/Modal';
import { Field, Input, Textarea } from '@/components/form';
import { EmptyState, Skeleton, InfoCard } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { formatINR } from '@/lib/format';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import {
  usePayrollRun, usePayslips, useSalaryStructures, savePayslipGuarded, updatePayrollRun,
  submitPayrollRun, approvePayrollRun, returnPayrollRun, markPayrollRunPaid,
  type Actor,
} from '@/features/finance/data';
import { PAYROLL_RUN_PHASE_META, payrollRunPhase, computeESI, computePT } from '@/features/finance/meta';
import { buildPayrollTallyXml, downloadXml } from '@/features/finance/tallyExport';
import { downloadStatutoryCsv, printStatutorySummary } from './statutoryExport';
import { computePayslip } from './salarySchema';
import type { Payslip, PayrollRun } from '@/types/finance';

/**
 * A single payroll run with the approval split (ROLE_AUDIT §7c):
 *   draft → HR/Accounts SUBMIT → Principal/VP-Admin APPROVE / RETURN → Accounts DISBURSE.
 * Operate affordances (submit, edit LOP, mark paid) gate on `canOperate`; the
 * Approve/Return sign-off gates on `isApprover`.
 */
export function RunDetailPage() {
  const { runId = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member, school } = useSession();
  const { canOperate, isApprover } = useOwnership('payroll');
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };

  const { data: run, loading: runLoading } = usePayrollRun(schoolId, runId);
  const { data: payslips, loading: slipLoading } = usePayslips(schoolId, runId);
  const { data: structures } = useSalaryStructures(schoolId);

  const [editing, setEditing] = useState<Payslip | null>(null);
  const [confirm, setConfirm] = useState<null | 'submit' | 'approve' | 'paid'>(null);
  const [returning, setReturning] = useState(false);
  const [busy, setBusy] = useState(false);

  const sorted = useMemo(() => [...payslips].sort((a, b) => a.staffName.localeCompare(b.staffName)), [payslips]);
  const totals = useMemo(() => sorted.reduce((acc, p) => ({
    gross: acc.gross + p.grossEarnings,
    ded: acc.ded + p.totalDeductions,
    net: acc.net + p.netPay,
  }), { gross: 0, ded: 0, net: 0 }), [sorted]);

  const back = () => navigate('/payroll');

  if (runLoading) return <div className="nx-page"><Skeleton height={64} /><Skeleton height={320} style={{ marginTop: 12 }} /></div>;
  if (!run) {
    return <div className="nx-page"><Panel><EmptyState icon="calendar" title="Run not found" message="This payroll run may have been removed." action={<Button variant="subtle" onClick={back}>Back to payroll</Button>} /></Panel></div>;
  }

  const phase = payrollRunPhase(run);
  const isDraft = phase === 'draft'; // editable: fresh draft only (not yet submitted)
  // Separation of duties: whoever submitted the run for approval may not approve it.
  const iSubmitted = !!run.submittedByUid && run.submittedByUid === uid;
  const phaseMeta = PAYROLL_RUN_PHASE_META[phase];

  const recalcRunTotals = async (slips: Payslip[]) => {
    const t = slips.reduce((acc, p) => ({
      gross: acc.gross + p.grossEarnings, ded: acc.ded + p.totalDeductions, net: acc.net + p.netPay,
    }), { gross: 0, ded: 0, net: 0 });
    const patch: Partial<PayrollRun> = { totalGross: t.gross, totalDeductions: t.ded, totalNet: t.net, staffCount: slips.length };
    await updatePayrollRun(schoolId!, runId, patch, actor);
  };

  const runAction = async (fn: () => Promise<void>, okTitle: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(okTitle, run.label);
      setConfirm(null);
      setReturning(false);
    } catch (e) {
      // Surface guard messages (e.g. self-approval blocked) instead of a generic error.
      toast.error('Could not update run', e instanceof Error ? e.message : 'Please try again.');
    } finally { setBusy(false); }
  };

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <Button variant="ghost" size="sm" leftIcon="chevron-left" aria-label="Back" onClick={back} />
          <div>
            <h1 className="nx-page__title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {run.label} <Badge variant={phaseMeta.variant}>{phaseMeta.label}</Badge>
            </h1>
            <p className="nx-page__sub">{run.staffCount} staff · Net payable {formatINR(run.totalNet)}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {/* HR/Accounts: submit a fresh draft for approval. */}
          {canOperate && phase === 'draft' && (
            <Button variant="gold" leftIcon="send" onClick={() => setConfirm('submit')}>Submit for approval</Button>
          )}
          {/* Principal/VP-Admin: sign off a submitted run — but not one they submitted. */}
          {isApprover && phase === 'awaiting' && (
            <>
              <Button variant="ghost" leftIcon="refresh" onClick={() => setReturning(true)}>Return</Button>
              <Button
                variant="gold"
                leftIcon="shield-check"
                disabled={iSubmitted}
                title={iSubmitted ? 'You submitted this run — a different approver must approve it (separation of duties).' : undefined}
                onClick={() => setConfirm('approve')}
              >
                Approve
              </Button>
            </>
          )}
          {/* Accounts: disburse — only AFTER approval (finalized). */}
          {canOperate && (phase === 'approved' || phase === 'awaiting') && (
            <Button
              variant="gold"
              leftIcon="wallet"
              disabled={phase !== 'approved'}
              title={phase !== 'approved' ? 'Run must be approved before it can be disbursed' : undefined}
              onClick={() => setConfirm('paid')}
            >
              Mark paid
            </Button>
          )}
        </div>
      </div>

      <RunApprovalCard run={run} phase={phase} canOperate={canOperate} isApprover={isApprover} iSubmitted={iSubmitted} />

      <div className="fin-summary">
        <div className="fin-summary__card"><div className="fin-summary__label">Gross earnings</div><div className="fin-summary__value">{formatINR(totals.gross)}</div></div>
        <div className="fin-summary__card"><div className="fin-summary__label">Total deductions</div><div className="fin-summary__value">{formatINR(totals.ded)}</div></div>
        <div className="fin-summary__card"><div className="fin-summary__label">Net payable</div><div className="fin-summary__value" style={{ color: 'var(--success)' }}>{formatINR(totals.net)}</div></div>
        <div className="fin-summary__card"><div className="fin-summary__label">Payslips</div><div className="fin-summary__value">{sorted.length}</div></div>
      </div>

      <Panel title="Payslips" sub={isDraft ? 'Edit Loss-of-Pay days before submitting for approval' : undefined}>
        {slipLoading ? (
          <Skeleton height={200} />
        ) : sorted.length === 0 ? (
          <EmptyState icon="file-text" title="No payslips" message="This run has no payslips." />
        ) : (
          <div className="fin-kv-list" style={{ gap: 8 }}>
            {sorted.map((p) => (
              <div className="fin-invrow" key={p.id}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="fin-invrow__title">{p.staffName}</div>
                  <div className="fin-invrow__meta">
                    {p.designation ? `${p.designation} · ` : ''}
                    Gross {formatINR(p.grossEarnings)} · Deductions {formatINR(p.totalDeductions)}
                    {(p.lopDays ?? 0) > 0 ? ` · LOP ${p.lopDays}d` : ''}
                  </div>
                </div>
                <span className="fin-amount fin-amount--paid" style={{ flexShrink: 0 }}>{formatINR(p.netPay)}</span>
                <div className="fin-invrow__actions">
                  {isDraft && canOperate && (
                    <Button variant="ghost" size="sm" leftIcon="edit" aria-label={`Edit ${p.staffName}`} onClick={() => setEditing(p)} />
                  )}
                  <Button variant="ghost" size="sm" leftIcon="file-text" aria-label={`Payslip for ${p.staffName}`} onClick={() => navigate(`/payroll/payslip/${runId}/${p.staffId}`)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {sorted.length > 0 && (
        <Panel title="Exports" sub="Tally &amp; statutory">
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '0 0 12px' }}>
            Tally XML posts this run's net salary as a Payment voucher (map the ledger names in Tally).
            The statutory sheet lists per-employee PF / ESI / PT / TDS for challan preparation.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button variant="subtle" leftIcon="download" onClick={() => downloadXml(`payroll-${run.label}-tally`, buildPayrollTallyXml([run]))}>Tally XML</Button>
            <Button variant="subtle" leftIcon="download" onClick={() => downloadStatutoryCsv(run, sorted)}>Statutory CSV</Button>
            <Button variant="ghost" leftIcon="file-text" onClick={() => { if (!printStatutorySummary({ schoolName: school?.name ?? 'School', run, slips: sorted })) toast.error('Popup blocked', 'Allow popups to print the statutory summary.'); }}>Print statutory summary</Button>
          </div>
        </Panel>
      )}

      <LopEditModal
        slip={editing}
        onClose={() => setEditing(null)}
        onSave={async (lopDays) => {
          if (!editing || !schoolId) return;
          setBusy(true);
          try {
            const struct = structures.find((s) => (s.staffId || s.id) === editing.staffId);
            const recomputed = struct
              ? computePayslip(struct, { runId, month: run.month, year: run.year, label: run.label, lopDays })
              : recomputeFromExisting(editing, lopDays, run);
            // Guarded write: rejected (in-transaction) if the run is already
            // approved/paid, so payslips can't be altered after sign-off.
            await savePayslipGuarded(schoolId, runId, editing.staffId, recomputed, actor);
            const next = sorted.map((s) => (s.staffId === editing.staffId ? { ...recomputed, id: s.id } as Payslip : s));
            await recalcRunTotals(next);
            toast.success('Payslip updated', editing.staffName);
            setEditing(null);
          } catch (e) {
            toast.error('Could not update payslip', e instanceof Error ? e.message : 'Please try again.');
          } finally { setBusy(false); }
        }}
        busy={busy}
      />

      <ConfirmModal
        open={confirm === 'submit'} onClose={() => setConfirm(null)} icon="send"
        onConfirm={() => runAction(() => submitPayrollRun(schoolId!, runId, actor), 'Submitted for approval')}
        tone="gold" loading={busy} confirmLabel="Submit for approval"
        title="Submit this run for approval?"
        message={`${run.label} will be sent to the Principal / VP-Admin for sign-off. You can disburse it once approved.`}
      />
      <ConfirmModal
        open={confirm === 'approve'} onClose={() => setConfirm(null)} icon="shield-check"
        onConfirm={() => runAction(() => approvePayrollRun(schoolId!, runId, actor), 'Run approved')}
        tone="gold" loading={busy} confirmLabel="Approve run"
        title="Approve this payroll run?"
        message={`As Drawing & Disbursing authority, you confirm ${formatINR(run.totalNet)} for ${run.staffCount} staff (${run.label}). Accounts can then disburse.`}
      />
      <ConfirmModal
        open={confirm === 'paid'} onClose={() => setConfirm(null)} icon="wallet"
        onConfirm={() => runAction(() => markPayrollRunPaid(schoolId!, runId, actor), 'Run marked paid')}
        tone="gold" loading={busy} confirmLabel="Mark as paid"
        title="Mark run as paid?" message={`Confirm that ${formatINR(run.totalNet)} has been disbursed to ${run.staffCount} staff for ${run.label}.`}
      />

      <ReturnModal
        open={returning}
        busy={busy}
        runLabel={run.label}
        onClose={() => setReturning(false)}
        onReturn={(note) => runAction(() => returnPayrollRun(schoolId!, runId, note, actor), 'Returned to draft')}
      />
    </div>
  );
}

/**
 * Approval-split summary card. Explains the HR → run → Principal/VP approve →
 * Accounts disburse flow, and surfaces the latest approval/return note + approver.
 */
function RunApprovalCard({ run, phase, canOperate, isApprover, iSubmitted }: {
  run: PayrollRun;
  phase: ReturnType<typeof payrollRunPhase>;
  canOperate: boolean;
  isApprover: boolean;
  iSubmitted: boolean;
}) {
  const title =
    phase === 'awaiting' ? 'Awaiting Principal / VP-Admin approval'
    : phase === 'approved' ? 'Approved — ready for disbursement'
    : phase === 'paid' ? 'Disbursed'
    : 'How payroll approval works';

  const action =
    phase === 'draft' ? (canOperate ? 'Submit this run for sign-off when the payslips are ready.' : 'HR / Accounts will submit this run for approval.')
    : phase === 'awaiting' ? (isApprover ? (iSubmitted ? 'You submitted this run, so a different Principal / VP-Admin must approve it (separation of duties). You can still Return it.' : 'Review the payslips, then Approve or Return with a note.') : 'A Principal or VP-Admin must approve before Accounts can disburse.')
    : phase === 'approved' ? 'Accounts can now mark the run paid (disburse salaries).'
    : '';

  return (
    <div style={{ marginBottom: 14 }}>
      <InfoCard icon="shield-check" title={title}>
        HR owns salary structures → a monthly run is submitted → Principal / VP-Admin
        (Drawing &amp; Disbursing Officer) approves → Accounts disburses.
        {action ? <> <strong>{action}</strong></> : null}
        {run.approvedByName && phase === 'approved' && (
          <> · Approved by {run.approvedByName}.</>
        )}
        {run.approvalNote && (phase === 'draft' || phase === 'awaiting') && (
          <> · Latest note: “{run.approvalNote}”.</>
        )}
      </InfoCard>
    </div>
  );
}

/** Approver Return dialog — requires a short reason that goes back to HR/Accounts. */
function ReturnModal({ open, busy, runLabel, onClose, onReturn }: {
  open: boolean; busy: boolean; runLabel: string; onClose: () => void; onReturn: (note: string) => void;
}) {
  const [note, setNote] = useState('');
  const trimmed = note.trim();
  return (
    <Modal
      open={open}
      onClose={() => { setNote(''); onClose(); }}
      icon="refresh"
      tone="warning"
      title="Return run to draft"
      description={`${runLabel} will go back to HR / Accounts for changes. Add a brief reason.`}
      size="sm"
      dismissible={!busy}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={() => { setNote(''); onClose(); }} disabled={busy}>Cancel</Button>
          <Button type="button" variant="gold" leftIcon="refresh" loading={busy} disabled={!trimmed} onClick={() => onReturn(trimmed)}>Return run</Button>
        </>
      }
    >
      <Field label="Reason for return" hint="Shown to HR / Accounts on the run.">
        <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. LOP for two staff looks off — please re-check." aria-label="Reason for return" />
      </Field>
    </Modal>
  );
}

/** LOP days editor. Net recomputes from the salary structure (or existing slip). */
function LopEditModal({ slip, onClose, onSave, busy }: {
  slip: Payslip | null; onClose: () => void; onSave: (lopDays: number) => Promise<void>; busy: boolean;
}) {
  // Remounted per-slip via `key`, so initial state can read the slip directly.
  if (!slip) return null;
  return <LopEditModalInner key={slip.id} slip={slip} onClose={onClose} onSave={onSave} busy={busy} />;
}

function LopEditModalInner({ slip, onClose, onSave, busy }: {
  slip: Payslip; onClose: () => void; onSave: (lopDays: number) => Promise<void>; busy: boolean;
}) {
  const [lop, setLop] = useState(String(slip.lopDays ?? 0));
  return (
    <Modal
      open
      onClose={onClose}
      icon="edit"
      tone="gold"
      title={`Loss of Pay — ${slip.staffName}`}
      description="Number of unpaid (LOP) days for this month. Net pay recomputes automatically."
      size="sm"
      dismissible={!busy}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="button" variant="gold" leftIcon="check" loading={busy} onClick={() => onSave(Math.max(0, Number(lop) || 0))}>Save</Button>
        </>
      }
    >
      <Field label="LOP days" hint={`Current: ${slip.lopDays ?? 0} day(s)`}>
        <Input type="number" inputMode="numeric" min={0} value={lop} onChange={(e) => setLop(e.target.value)} aria-label="Loss of pay days" />
      </Field>
    </Modal>
  );
}

/**
 * Fallback recompute (salary structure deleted): scale LOP off the existing gross
 * AND re-derive ESI/PT on the earned (post-LOP) gross, mirroring `computePayslip`.
 * Applicability is inferred from the original slip (a deduction that was > 0 was
 * applicable); PF/TDS are kept as-is (PF is on basic, not gross-derived).
 */
function recomputeFromExisting(slip: Payslip, lopDays: number, run: PayrollRun): Omit<Payslip, 'id'> {
  const dim = new Date(run.year, run.month, 0).getDate();
  const safeLop = Math.max(0, Math.min(lopDays, dim));
  const lop = dim > 0 ? Math.round((slip.grossEarnings / dim) * safeLop) : 0;
  const earnedGross = Math.max(0, slip.grossEarnings - lop);
  const deductions = {
    ...slip.deductions,
    esi: computeESI(earnedGross, (slip.deductions.esi ?? 0) > 0),
    pt: computePT(earnedGross, (slip.deductions.pt ?? 0) > 0),
    lop,
  };
  const totalDeductions = deductions.pf + deductions.esi + deductions.pt + deductions.tds + deductions.lop + deductions.other;
  const { id: _drop, ...rest } = slip;
  void _drop;
  return {
    ...rest,
    deductions,
    totalDeductions,
    netPay: Math.max(0, slip.grossEarnings - totalDeductions),
    paidDays: dim - safeLop,
    lopDays: safeLop,
  };
}
