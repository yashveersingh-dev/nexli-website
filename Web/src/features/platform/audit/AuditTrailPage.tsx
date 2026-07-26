import { useMemo, useState } from 'react';
import { DataTable, type Column } from '@/components/DataTable';
import { InfoCard } from '@/components/feedback';
import { Input, Select } from '@/components/form';
import { formatDate, formatRelative } from '@/lib/format';
import { usePlatformAudit, type PlatformAuditEntry } from '@/features/platform/data';

const PAGE_SIZE = 25;

/**
 * Platform Audit Trail (spec §12.8) — an append-only, immutable record of every
 * Super Admin action. Read-only viewer: search + filter, newest-first. Entries
 * can never be edited or deleted.
 */
export function AuditTrailPage() {
  const { data: entries, loading, error } = usePlatformAudit(300);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);

  const actionOptions = useMemo(() => {
    const distinct = Array.from(new Set(entries.map((e) => e.action).filter(Boolean))).sort();
    return [
      { value: '', label: 'All actions' },
      ...distinct.map((a) => ({ value: a, label: a })),
    ];
  }, [entries]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries
      .filter((e) => !action || e.action === action)
      .filter(
        (e) =>
          !q ||
          e.action?.toLowerCase().includes(q) ||
          e.summary?.toLowerCase().includes(q) ||
          e.actorName?.toLowerCase().includes(q),
      )
      .sort((a, b) => b.ts - a.ts);
  }, [entries, search, action]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns: Column<PlatformAuditEntry>[] = [
    {
      key: 'action',
      header: 'Action',
      primary: true,
      render: (e) => <code className="nx-audit__action">{e.action}</code>,
    },
    {
      key: 'summary',
      header: 'Summary',
      truncate: true,
      render: (e) => e.summary || '—',
    },
    {
      key: 'actor',
      header: 'Actor',
      render: (e) => e.actorName || '—',
    },
    {
      key: 'target',
      header: 'Target',
      render: (e) =>
        e.targetType || e.targetId
          ? [e.targetType, e.targetId].filter(Boolean).join(' · ')
          : '—',
    },
    {
      key: 'time',
      header: 'Time',
      align: 'right',
      render: (e) => (
        <span title={formatDate(e.ts, 'DD MMM YYYY, HH:mm')}>{formatRelative(e.ts)}</span>
      ),
    },
  ];

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Audit trail</h1>
          <p className="nx-page__sub">
            {loading
              ? 'Loading…'
              : `${filtered.length} action${filtered.length === 1 ? '' : 's'} logged`}
          </p>
        </div>
      </div>

      <InfoCard icon="shield-check" title="Permanent record">
        This log is append-only. Every Super Admin action is recorded here and can never be edited
        or deleted.
      </InfoCard>

      <DataTable
        columns={columns}
        rows={pageRows}
        rowKey={(e) => e.id}
        loading={loading}
        error={error ? 'Could not load the audit trail.' : null}
        emptyIcon="shield"
        emptyTitle={
          search || action ? 'No actions match your filters' : 'No platform actions logged yet'
        }
        emptyMessage={
          search || action
            ? 'Try a different search or clear the action filter.'
            : 'Super Admin actions will appear here as they happen.'
        }
        pagination={{ page, pageSize: PAGE_SIZE, total: filtered.length, onPageChange: setPage }}
        caption="Platform audit trail"
        toolbar={
          <div className="nx-toolbar">
            <div className="nx-toolbar__search">
              <Input
                leftIcon="search"
                placeholder="Search by action, summary or actor…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                aria-label="Search audit trail"
              />
            </div>
            <div className="nx-toolbar__filter">
              <Select
                value={action}
                onChange={(e) => {
                  setAction(e.target.value);
                  setPage(1);
                }}
                options={actionOptions}
                aria-label="Filter by action"
              />
            </div>
          </div>
        }
      />
    </div>
  );
}
