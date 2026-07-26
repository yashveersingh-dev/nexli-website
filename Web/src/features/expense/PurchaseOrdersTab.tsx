import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { DataTable, type Column } from '@/components/DataTable';
import { Input, Select } from '@/components/form';
import { Icon } from '@/components/Icon';
import { formatINR, formatDate } from '@/lib/format';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { usePurchaseOrders } from '@/features/finance/data';
import { PO_STATUS_META } from '@/features/finance/meta';
import type { PurchaseOrder, POStatus } from '@/types/finance';

export function PurchaseOrdersTab() {
  const navigate = useNavigate();
  const { schoolId } = useSession();
  const canWrite = useOwnership('expense').canOperate;
  const { data: orders, loading, error } = usePurchaseOrders(schoolId);

  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return orders
      .filter((o) => (status ? o.status === status : true))
      .filter((o) => (needle ? [o.poNo, o.vendorName].some((v) => v?.toLowerCase().includes(needle)) : true))
      .sort((a, b) => (b.orderedDate ?? b.createdAt ?? 0) - (a.orderedDate ?? a.createdAt ?? 0));
  }, [orders, q, status]);

  const columns: Column<PurchaseOrder>[] = [
    {
      key: 'poNo', header: 'Purchase order', primary: true,
      render: (o) => (
        <span className="lib-book">
          <span className="nx-noticerow__icon is-normal" style={{ flexShrink: 0 }}><Icon name="box" size={15} /></span>
          <span className="lib-book__text">
            <span className="lib-book__title">{o.vendorName ?? 'Vendor'}</span>
            <span className="lib-book__author">{o.poNo} · {o.items.length} item{o.items.length === 1 ? '' : 's'}{o.orderedDate ? ` · ${formatDate(o.orderedDate)}` : ''}</span>
          </span>
        </span>
      ),
    },
    { key: 'expected', header: 'Expected', hideOnMobile: true, render: (o) => (o.expectedDate ? formatDate(o.expectedDate) : '—') },
    { key: 'status', header: 'Status', render: (o) => <Badge variant={PO_STATUS_META[o.status].variant}>{PO_STATUS_META[o.status].label}</Badge> },
    { key: 'total', header: 'Total', align: 'right', render: (o) => <span className="fin-amount">{formatINR(o.total)}</span> },
  ];

  const toolbar = (
    <div className="nx-toolbar">
      <div className="nx-toolbar__search">
        <Input leftIcon="search" placeholder="Search PO no., vendor…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search purchase orders" />
      </div>
      <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status"
        options={[{ value: '', label: 'All statuses' }, ...(Object.keys(PO_STATUS_META) as POStatus[]).map((s) => ({ value: s, label: PO_STATUS_META[s].label }))]} />
      {canWrite && <Button variant="gold" leftIcon="plus" onClick={() => navigate('/expense/po/new')}>New PO</Button>}
    </div>
  );

  return (
    <DataTable
      columns={columns} rows={rows} rowKey={(o) => o.id} loading={loading} error={error ? 'Could not load purchase orders.' : null}
      toolbar={toolbar} onRowClick={(o) => navigate(`/expense/po/${o.id}`)}
      emptyIcon="box"
      emptyTitle={q || status ? 'No matching purchase orders' : 'No purchase orders yet'}
      emptyMessage={q || status ? 'Try a different search or filter.' : canWrite ? 'Issue a purchase order to a vendor to begin procurement.' : 'Purchase orders will appear here.'}
    />
  );
}
