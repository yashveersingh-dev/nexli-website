import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/Badge';
import { DataTable, type Column } from '@/components/DataTable';
import { Input, Select } from '@/components/form';
import { formatDate } from '@/lib/format';
import { useSession } from '@/app/providers/SessionProvider';
import { useVisitors } from '@/features/ops/data';
import { VISITOR_STATUS_META, VISITOR_PURPOSE_OPTIONS } from '@/features/ops/meta';
import type { VisitorLog } from '@/types/ops';

const time = (t?: number) => (t ? new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '');
const purposeLabel = (v: string) => VISITOR_PURPOSE_OPTIONS.find((o) => o.value === v)?.label ?? v;

export function VisitorHistoryTab() {
  const navigate = useNavigate();
  const { schoolId } = useSession();
  const { data: visitors, loading, error } = useVisitors(schoolId);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return visitors
      .filter((v) => (status ? v.status === status : true))
      .filter((v) => (needle ? [v.name, v.phone, v.passNo, v.whomToMeet, v.company].some((x) => x?.toLowerCase().includes(needle)) : true))
      .sort((a, b) => (b.inAt ?? b.createdAt ?? 0) - (a.inAt ?? a.createdAt ?? 0));
  }, [visitors, q, status]);

  const columns: Column<VisitorLog>[] = [
    {
      key: 'name', header: 'Visitor', primary: true,
      render: (v) => (
        <span className="lib-book">
          <span className="nx-noticerow__icon is-normal" style={{ flexShrink: 0 }}>{v.name.slice(0, 1).toUpperCase()}</span>
          <span className="lib-book__text">
            <span className="lib-book__title">{v.name}</span>
            <span className="lib-book__author">{purposeLabel(v.purpose)}{v.whomToMeet ? ` · ${v.whomToMeet}` : ''}</span>
          </span>
        </span>
      ),
    },
    { key: 'in', header: 'In', hideOnMobile: true, render: (v) => (v.inAt ? `${formatDate(v.inAt)} ${time(v.inAt)}` : '—') },
    { key: 'out', header: 'Out', hideOnMobile: true, render: (v) => (v.outAt ? `${formatDate(v.outAt)} ${time(v.outAt)}` : '—') },
    { key: 'status', header: 'Status', align: 'right', render: (v) => <Badge variant={VISITOR_STATUS_META[v.status].variant}>{VISITOR_STATUS_META[v.status].label}</Badge> },
  ];

  const toolbar = (
    <div className="nx-toolbar">
      <div className="nx-toolbar__search">
        <Input leftIcon="search" placeholder="Search name, phone, pass…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search visitor log" />
      </div>
      <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status"
        options={[{ value: '', label: 'All statuses' }, { value: 'in', label: 'On premises' }, { value: 'out', label: 'Checked out' }, { value: 'expected', label: 'Expected' }, { value: 'denied', label: 'Denied' }]} />
    </div>
  );

  return (
    <DataTable
      columns={columns} rows={rows} rowKey={(v) => v.id} loading={loading} error={error ? 'Could not load the visitor log.' : null}
      toolbar={toolbar} onRowClick={(v) => navigate(`/visitor/${v.id}`)}
      emptyIcon="users"
      emptyTitle={q || status ? 'No matching visitors' : 'No visitors logged'}
      emptyMessage={q || status ? 'Try a different search or filter.' : 'Checked-in visitors will appear here.'}
    />
  );
}
