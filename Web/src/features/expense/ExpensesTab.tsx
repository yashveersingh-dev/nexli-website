import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { DataTable, type Column } from '@/components/DataTable';
import { Input, Select } from '@/components/form';
import { Icon } from '@/components/Icon';
import { KPICard } from '@/components/KPICard';
import { ConfirmModal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { formatINR, formatDate } from '@/lib/format';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useExpenses, updateExpense, deleteExpense, type Actor } from '@/features/finance/data';
import {
  EXPENSE_CATEGORY_META, EXPENSE_CATEGORY_OPTIONS, EXPENSE_STATUS_META,
} from '@/features/finance/meta';
import { buildExpensesTallyXml, downloadXml } from '@/features/finance/tallyExport';
import type { Expense, ExpenseStatus } from '@/types/finance';

const startOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1).getTime();

export function ExpensesTab() {
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const canWrite = useOwnership('expense').canOperate;
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };

  const { data: expenses, loading, error } = useExpenses(schoolId);

  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [removing, setRemoving] = useState<Expense | null>(null);
  const [busy, setBusy] = useState(false);

  const kpis = useMemo(() => {
    const month = startOfMonth();
    let totalMonth = 0;
    const byStatus: Record<ExpenseStatus, number> = { recorded: 0, approved: 0, paid: 0, rejected: 0 };
    for (const e of expenses) {
      byStatus[e.status] = (byStatus[e.status] ?? 0) + 1;
      if (e.date >= month && e.status !== 'rejected') totalMonth += e.amount;
    }
    return { totalMonth, byStatus };
  }, [expenses]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return expenses
      .filter((e) => (category ? e.category === category : true))
      .filter((e) => (status ? e.status === status : true))
      .filter((e) => (needle ? [e.description, e.vendorName, e.expenseNo, e.reference].some((v) => v?.toLowerCase().includes(needle)) : true))
      .sort((a, b) => b.date - a.date);
  }, [expenses, q, category, status]);

  const setStatusOf = async (e: Expense, next: ExpenseStatus) => {
    if (!schoolId) return;
    try {
      const patch: Partial<Expense> = next === 'approved'
        ? { status: next, approvedByUid: actor.uid, approvedByName: actor.name }
        : { status: next };
      await updateExpense(schoolId, e.id, patch, actor);
      toast.success(next === 'paid' ? 'Marked paid' : next === 'approved' ? 'Expense approved' : 'Expense updated');
    } catch { toast.error('Could not update', 'Please try again.'); }
  };

  const remove = async () => {
    if (!schoolId || !removing) return;
    setBusy(true);
    try { await deleteExpense(schoolId, removing.id, actor); toast.success('Expense deleted'); setRemoving(null); }
    catch { toast.error('Could not delete'); } finally { setBusy(false); }
  };

  const columns: Column<Expense>[] = [
    {
      key: 'description', header: 'Expense', primary: true,
      render: (e) => (
        <span className="lib-book">
          <span className="nx-noticerow__icon is-normal" style={{ flexShrink: 0 }}>
            <Icon name={EXPENSE_CATEGORY_META[e.category]?.icon ?? 'box'} size={15} />
          </span>
          <span className="lib-book__text">
            <span className="lib-book__title">{e.description}</span>
            <span className="lib-book__author">{e.expenseNo} · {formatDate(e.date)}{e.vendorName ? ` · ${e.vendorName}` : ''}</span>
          </span>
        </span>
      ),
    },
    { key: 'category', header: 'Category', hideOnMobile: true, render: (e) => EXPENSE_CATEGORY_META[e.category]?.label ?? e.category },
    {
      key: 'status', header: 'Status',
      render: (e) => (
        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <Badge variant={EXPENSE_STATUS_META[e.status].variant}>{EXPENSE_STATUS_META[e.status].label}</Badge>
          {e.pettyCash && <Badge variant="muted">Petty cash</Badge>}
        </span>
      ),
    },
    { key: 'amount', header: 'Amount', align: 'right', render: (e) => <span className="fin-amount">{formatINR(e.amount)}</span> },
  ];

  const actions = canWrite
    ? (e: Expense) => (
        <>
          {e.status === 'recorded' && (
            <Button variant="ghost" size="sm" leftIcon="check" aria-label={`Approve ${e.description}`} onClick={() => setStatusOf(e, 'approved')}>Approve</Button>
          )}
          {(e.status === 'recorded' || e.status === 'approved') && (
            <Button variant="subtle" size="sm" leftIcon="wallet" aria-label={`Mark ${e.description} paid`} onClick={() => setStatusOf(e, 'paid')}>Mark paid</Button>
          )}
          <Button variant="ghost" size="sm" leftIcon="edit" aria-label={`Edit ${e.description}`} onClick={() => navigate(`/expense/${e.id}/edit`)} />
          <Button variant="ghost" size="sm" leftIcon="minus-circle" aria-label={`Delete ${e.description}`} onClick={() => setRemoving(e)} />
        </>
      )
    : undefined;

  const toolbar = (
    <>
      <div className="kpi-grid" style={{ marginBottom: 16 }}>
        <KPICard icon="wallet" label="This month" count={kpis.totalMonth} format="inrCompact" />
        <KPICard icon="file-text" label="Recorded" count={kpis.byStatus.recorded} format="us" sub="awaiting approval" />
        <KPICard icon="check-circle" label="Approved" count={kpis.byStatus.approved} format="us" sub="ready to pay" />
        <KPICard icon="trending-up" label="Paid" count={kpis.byStatus.paid} format="us" sub="settled" subColor="var(--success)" />
      </div>
      <div className="nx-toolbar">
        <div className="nx-toolbar__search">
          <Input leftIcon="search" placeholder="Search description, vendor, ref…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search expenses" />
        </div>
        <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category"
          options={[{ value: '', label: 'All categories' }, ...EXPENSE_CATEGORY_OPTIONS]} />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status"
          options={[{ value: '', label: 'All statuses' }, ...(Object.keys(EXPENSE_STATUS_META) as ExpenseStatus[]).map((s) => ({ value: s, label: EXPENSE_STATUS_META[s].label }))]} />
        <Button variant="subtle" leftIcon="download" onClick={() => rows.length && downloadXml('expenses-tally', buildExpensesTallyXml(rows))} disabled={rows.length === 0} title="Export the listed expenses as a Tally-importable XML">Tally XML</Button>
        {canWrite && <Button variant="gold" leftIcon="plus" onClick={() => navigate('/expense/new')}>Record expense</Button>}
      </div>
    </>
  );

  return (
    <>
      <DataTable
        columns={columns} rows={rows} rowKey={(e) => e.id} loading={loading} error={error ? 'Could not load expenses.' : null}
        toolbar={toolbar} actions={actions}
        emptyIcon="wallet"
        emptyTitle={q || category || status ? 'No matching expenses' : 'No expenses yet'}
        emptyMessage={q || category || status ? 'Try a different search or filter.' : canWrite ? 'Record your first expense to start tracking spend.' : 'Recorded expenses will appear here.'}
      />

      <ConfirmModal open={!!removing} onClose={() => setRemoving(null)} onConfirm={remove} tone="danger" loading={busy}
        title="Delete expense?" message={`"${removing?.description}" (${removing ? formatINR(removing.amount) : ''}) will be permanently removed.`} confirmLabel="Delete" />
    </>
  );
}
