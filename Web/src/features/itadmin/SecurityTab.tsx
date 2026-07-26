import { useMemo, useState } from 'react';
import { DataTable, type Column } from '@/components/DataTable';
import { Panel } from '@/components/Panel';
import { Input, Select } from '@/components/form';
import { EmptyState, InfoCard } from '@/components/feedback';
import { formatDate, formatRelative } from '@/lib/format';
import { useSession } from '@/app/providers/SessionProvider';
import { useTenantAudit, type TenantAuditEntry } from './data';

const PAGE_SIZE = 25;

/**
 * Read view of recent audit events (the module holds `audit.read`) plus a
 * least-privilege note. Read-only — IT reviews system activity, it never edits
 * the log or touches the underlying business data.
 */
export function SecurityTab() {
  const { schoolId, can } = useSession();
  const canRead = can('audit.read');
  const { data: entries, loading, error } = useTenantAudit(canRead ? schoolId : undefined, 300);

  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);

  const actionOptions = useMemo(() => {
    const distinct = Array.from(new Set(entries.map((e) => e.action).filter(Boolean))).sort();
    return [{ value: '', label: 'All actions' }, ...distinct.map((a) => ({ value: a, label: a }))];
  }, [entries]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries
      .filter((e) => !action || e.action === action)
      .filter((e) => !q
        || e.action?.toLowerCase().includes(q)
        || e.summary?.toLowerCase().includes(q)
        || e.actorName?.toLowerCase().includes(q))
      .sort((a, b) => b.ts - a.ts);
  }, [entries, search, action]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (!canRead) {
    return <Panel><EmptyState icon="lock" title="No audit access" message="You don't have permission to read the audit log." /></Panel>;
  }

  const columns: Column<TenantAuditEntry>[] = [
    { key: 'action', header: 'Action', primary: true, render: (e) => <code className="ita-action">{e.action}</code> },
    { key: 'summary', header: 'Summary', truncate: true, render: (e) => e.summary || '—' },
    { key: 'actor', header: 'Actor', render: (e) => e.actorName || '—' },
    { key: 'target', header: 'Target', hideOnMobile: true, render: (e) => (e.targetType || e.targetId ? [e.targetType, e.targetId].filter(Boolean).join(' · ') : '—') },
    { key: 'time', header: 'Time', align: 'right', render: (e) => <span title={formatDate(e.ts, 'DD MMM YYYY, HH:mm')}>{formatRelative(e.ts)}</span> },
  ];

  return (
    <div className="ita-stack">
      <InfoCard icon="shield-check" title="Least-privilege & append-only">
        IT reviews system activity here but administers the system, not the data — no student marks, fee
        amounts or payroll figures. This log is append-only: entries can never be edited or deleted.
      </InfoCard>

      <DataTable
        columns={columns}
        rows={pageRows}
        rowKey={(e) => e.id}
        loading={loading}
        error={error ? 'Could not load the audit log.' : null}
        emptyIcon="shield"
        emptyTitle={search || action ? 'No events match your filters' : 'No audit events yet'}
        emptyMessage={search || action ? 'Try a different search or clear the filter.' : 'System actions will appear here as they happen.'}
        pagination={{ page, pageSize: PAGE_SIZE, total: filtered.length, onPageChange: setPage }}
        caption="School audit log"
        toolbar={
          <div className="nx-toolbar">
            <div className="nx-toolbar__search">
              <Input leftIcon="search" placeholder="Search by action, summary or actor…" value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }} aria-label="Search audit log" />
            </div>
            <Select className="nx-toolbar__filter" value={action}
              onChange={(e) => { setAction(e.target.value); setPage(1); }} options={actionOptions} aria-label="Filter by action" />
          </div>
        }
      />
    </div>
  );
}
