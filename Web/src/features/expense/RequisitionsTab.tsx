import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { DataTable, type Column } from '@/components/DataTable';
import { Input, Select } from '@/components/form';
import { Icon } from '@/components/Icon';
import { formatINR, formatDate } from '@/lib/format';
import { useSession } from '@/app/providers/SessionProvider';
import { useRequisitions } from '@/features/finance/data';
import { REQUISITION_STATUS_META } from '@/features/finance/meta';
import type { Requisition, RequisitionStatus } from '@/types/finance';

export function RequisitionsTab() {
  const navigate = useNavigate();
  const { schoolId } = useSession();
  // Raising a requisition (a *request*) is open to any active staff member —
  // it flows to Accounts/approvers. This affordance is intentionally NOT gated.
  const { data: requisitions, loading, error } = useRequisitions(schoolId);

  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return requisitions
      .filter((r) => (status ? r.status === status : true))
      .filter((r) => (needle ? [r.title, r.department, r.reqNo, r.requestedByName].some((v) => v?.toLowerCase().includes(needle)) : true))
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }, [requisitions, q, status]);

  const columns: Column<Requisition>[] = [
    {
      key: 'title', header: 'Requisition', primary: true,
      render: (r) => (
        <span className="lib-book">
          <span className="nx-noticerow__icon is-normal" style={{ flexShrink: 0 }}><Icon name="file-text" size={15} /></span>
          <span className="lib-book__text">
            <span className="lib-book__title">{r.title}</span>
            <span className="lib-book__author">{r.reqNo}{r.department ? ` · ${r.department}` : ''} · {r.items.length} item{r.items.length === 1 ? '' : 's'}</span>
          </span>
        </span>
      ),
    },
    { key: 'created', header: 'Raised', hideOnMobile: true, render: (r) => (r.createdAt ? formatDate(r.createdAt) : '—') },
    { key: 'status', header: 'Status', render: (r) => <Badge variant={REQUISITION_STATUS_META[r.status].variant}>{REQUISITION_STATUS_META[r.status].label}</Badge> },
    { key: 'estTotal', header: 'Est. total', align: 'right', render: (r) => <span className="fin-amount fin-amount--muted">{formatINR(r.estTotal)}</span> },
  ];

  const toolbar = (
    <div className="nx-toolbar">
      <div className="nx-toolbar__search">
        <Input leftIcon="search" placeholder="Search title, department, no…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search requisitions" />
      </div>
      <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status"
        options={[{ value: '', label: 'All statuses' }, ...(Object.keys(REQUISITION_STATUS_META) as RequisitionStatus[]).map((s) => ({ value: s, label: REQUISITION_STATUS_META[s].label }))]} />
      <Button variant="gold" leftIcon="plus" onClick={() => navigate('/expense/requisitions/new')}>New requisition</Button>
    </div>
  );

  return (
    <DataTable
      columns={columns} rows={rows} rowKey={(r) => r.id} loading={loading} error={error ? 'Could not load requisitions.' : null}
      toolbar={toolbar} onRowClick={(r) => navigate(`/expense/requisitions/${r.id}`)}
      emptyIcon="file-text"
      emptyTitle={q || status ? 'No matching requisitions' : 'No requisitions yet'}
      emptyMessage={q || status ? 'Try a different search or filter.' : 'Raise a requisition to request a purchase for approval.'}
    />
  );
}
