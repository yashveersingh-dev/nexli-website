import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { DataTable, type Column } from '@/components/DataTable';
import { Modal } from '@/components/Modal';
import { Field, Select } from '@/components/form';
import { InfoCard } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { formatINR } from '@/lib/format';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import {
  useSalaryStructures, usePayrollRuns, generatePayrollRun,
  payrollRunId, type Actor,
} from '@/features/finance/data';
import { PAYROLL_RUN_PHASE_META, payrollRunPhase, MONTHS, monthLabel } from '@/features/finance/meta';
import { computePayslip, isStructureActive } from './salarySchema';
import type { PayrollRun } from '@/types/finance';

/** Lists monthly payroll runs; "New run" generates a draft from salary structures. */
export function RunsTab() {
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const { canOperate: canWrite, isApprover } = useOwnership('payroll');
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };

  const { data: runs, loading, error } = usePayrollRuns(schoolId);
  const { data: structures } = useSalaryStructures(schoolId);

  const [newOpen, setNewOpen] = useState(false);

  const sorted = useMemo(
    () => [...runs].sort((a, b) => (b.year - a.year) || (b.month - a.month)),
    [runs],
  );
  const existingIds = useMemo(() => new Set(runs.map((r) => r.id)), [runs]);
  // "Awaiting approval" = submitted drafts pending Principal/VP-Admin sign-off.
  const awaiting = useMemo(() => runs.filter((r) => payrollRunPhase(r) === 'awaiting'), [runs]);

  const columns: Column<PayrollRun>[] = [
    {
      key: 'label', header: 'Run', primary: true,
      render: (r) => (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600 }}>{r.label}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.staffCount} staff</div>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (r) => { const m = PAYROLL_RUN_PHASE_META[payrollRunPhase(r)]; return <Badge variant={m.variant}>{m.label}</Badge>; } },
    { key: 'gross', header: 'Gross', align: 'right', hideOnMobile: true, render: (r) => <span className="fin-amount fin-amount--muted">{formatINR(r.totalGross)}</span> },
    { key: 'net', header: 'Net payable', align: 'right', render: (r) => <span className="fin-amount fin-amount--paid">{formatINR(r.totalNet)}</span> },
  ];

  return (
    <div>
      <div className="nx-toolbar" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, flex: 1 }}>
          HR / Accounts generate a run and submit it; Principal / VP-Admin approve; Accounts disburse.
        </p>
        {canWrite && <Button variant="gold" leftIcon="plus" onClick={() => setNewOpen(true)}>New run</Button>}
      </div>

      {/* Approver indicator: surface runs pending sign-off (leadership lands here). */}
      {isApprover && awaiting.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <InfoCard icon="clock" title={`${awaiting.length} run${awaiting.length > 1 ? 's' : ''} awaiting approval`}>
            {awaiting.map((r) => r.label).join(', ')} — open a run to Approve or Return it.
          </InfoCard>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={sorted}
        rowKey={(r) => r.id}
        loading={loading}
        error={error ? 'Could not load payroll runs.' : null}
        onRowClick={(r) => navigate(`/payroll/runs/${r.id}`)}
        emptyIcon="calendar"
        emptyTitle="No payroll runs yet"
        emptyMessage={canWrite ? 'Create your first monthly run to generate payslips.' : 'Payroll runs will appear here.'}
      />

      {canWrite && (
        <NewRunModal
          open={newOpen}
          onClose={() => setNewOpen(false)}
          existingIds={existingIds}
          onGenerate={async (year, month) => {
            const id = payrollRunId(year, month);
            const label = monthLabel(month, year);
            const eligible = structures.filter(isStructureActive);
            if (eligible.length === 0) {
              toast.warning('No active salary structures', 'Set up salaries before running payroll.');
              return false;
            }
            try {
              // Compute every payslip up-front, then write the run doc + all
              // payslips atomically (see generatePayrollRun) so a failure can't
              // orphan payslips or leave the run with wrong totals; retry is safe.
              let totalGross = 0, totalDeductions = 0, totalNet = 0;
              const slips = eligible.map((s) => {
                const slip = computePayslip(s, { runId: id, month, year, label });
                totalGross += slip.grossEarnings;
                totalDeductions += slip.totalDeductions;
                totalNet += slip.netPay;
                return { staffId: s.staffId, data: slip };
              });
              const run: Omit<PayrollRun, 'id'> = {
                schoolId: schoolId!, month, year, label, status: 'draft',
                staffCount: eligible.length, totalGross, totalDeductions, totalNet,
              };
              await generatePayrollRun(schoolId!, id, run, slips, actor);
              toast.success('Draft run generated', `${label} · ${eligible.length} payslips`);
              setNewOpen(false);
              navigate(`/payroll/runs/${id}`);
              return true;
            } catch {
              toast.error('Could not generate run', 'Please try again.');
              return false;
            }
          }}
        />
      )}
    </div>
  );
}

function NewRunModal({ open, onClose, existingIds, onGenerate }: {
  open: boolean;
  onClose: () => void;
  existingIds: Set<string>;
  onGenerate: (year: number, month: number) => Promise<boolean>;
}) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [busy, setBusy] = useState(false);

  const duplicate = existingIds.has(payrollRunId(year, month));
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  const submit = async () => {
    if (duplicate) return;
    setBusy(true);
    try { await onGenerate(year, month); } finally { setBusy(false); }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon="calendar"
      tone="gold"
      title="New payroll run"
      description="Generates a draft with one payslip per staff member who has an active salary structure."
      size="sm"
      dismissible={!busy}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="button" variant="gold" leftIcon="check" loading={busy} disabled={duplicate} onClick={submit}>Generate draft</Button>
        </>
      }
    >
      <div className="grid g-2">
        <Field label="Month">
          <Select value={String(month)} onChange={(e) => setMonth(Number(e.target.value))} aria-label="Month"
            options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))} />
        </Field>
        <Field label="Year">
          <Select value={String(year)} onChange={(e) => setYear(Number(e.target.value))} aria-label="Year"
            options={years.map((y) => ({ value: String(y), label: String(y) }))} />
        </Field>
      </div>
      {duplicate && (
        <div style={{ marginTop: 12 }}>
          <InfoCard icon="alert-triangle" title="Run already exists">
            A payroll run for {monthLabel(month, year)} already exists. Open it from the list to review or edit.
          </InfoCard>
        </div>
      )}
    </Modal>
  );
}
