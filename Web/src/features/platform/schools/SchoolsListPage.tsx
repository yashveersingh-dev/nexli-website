import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { DataTable, type Column } from '@/components/DataTable';
import { Input, Select } from '@/components/form';
import { formatDate, formatNumber } from '@/lib/format';
import { useSchools, effectiveSubscriptionStatus } from '@/features/platform/data';
import { SUBSCRIPTION_STATUS_META } from '@/features/platform/meta';
import type { School } from '@/types/models';

const PAGE_SIZE = 25;
const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'trial', label: 'Trial' },
  { value: 'paused', label: 'Paused' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'expired', label: 'Expired' },
  { value: 'terminated', label: 'Terminated' },
];

/** School Registry (spec §12.3) — searchable, filterable list of all tenants. */
export function SchoolsListPage() {
  const navigate = useNavigate();
  const { data: schools, loading, error } = useSchools();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return schools
      .filter((s) => !status || effectiveSubscriptionStatus(s) === status)
      .filter((s) =>
        !q ||
        s.name?.toLowerCase().includes(q) ||
        s.city?.toLowerCase().includes(q) ||
        s.state?.toLowerCase().includes(q) ||
        s.adminEmail?.toLowerCase().includes(q),
      )
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  }, [schools, search, status]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns: Column<School>[] = [
    {
      key: 'name',
      header: 'School',
      primary: true,
      render: (s) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <Avatar name={s.name ?? '?'} src={s.logoUrl} size={34} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {s.name}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
              {[s.city, s.state].filter(Boolean).join(', ') || '—'}
            </div>
          </div>
        </div>
      ),
    },
    { key: 'board', header: 'Board', render: (s) => s.board ?? '—' },
    { key: 'plan', header: 'Plan', render: (s) => s.plan ?? 'Unassigned' },
    { key: 'students', header: 'Students', align: 'right', render: (s) => formatNumber(s.studentCount ?? 0) },
    {
      key: 'status',
      header: 'Status',
      render: (s) => {
        const m = SUBSCRIPTION_STATUS_META[effectiveSubscriptionStatus(s)];
        return <Badge variant={m.variant}>{m.label}</Badge>;
      },
    },
    { key: 'renewal', header: 'Renewal', render: (s) => (s.renewalDate ? formatDate(s.renewalDate) : '—') },
  ];

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Schools</h1>
          <p className="nx-page__sub">
            {loading ? 'Loading…' : `${filtered.length} school${filtered.length === 1 ? '' : 's'} on the platform`}
          </p>
        </div>
        <Button variant="gold" leftIcon="plus" onClick={() => navigate('/schools/new')}>
          Add school
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={pageRows}
        rowKey={(s) => s.id}
        loading={loading}
        error={error ? 'Could not load schools.' : null}
        onRowClick={(s) => navigate(`/schools/${s.id}`)}
        emptyIcon="school"
        emptyTitle={search || status ? 'No schools match your filters' : 'No schools yet'}
        emptyMessage={
          search || status
            ? 'Try a different search or clear the status filter.'
            : 'Add your first school to bring it onto the NEXLI platform.'
        }
        pagination={{ page, pageSize: PAGE_SIZE, total: filtered.length, onPageChange: setPage }}
        toolbar={
          <div className="nx-toolbar">
            <div className="nx-toolbar__search">
              <Input
                leftIcon="search"
                placeholder="Search by name, city or admin…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                aria-label="Search schools"
              />
            </div>
            <div className="nx-toolbar__filter">
              <Select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                options={STATUS_FILTERS}
                aria-label="Filter by status"
              />
            </div>
          </div>
        }
      />
    </div>
  );
}
