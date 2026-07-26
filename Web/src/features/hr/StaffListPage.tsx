import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { DataTable, type Column } from '@/components/DataTable';
import { Input, Select } from '@/components/form';
import { useCan, useSession } from '@/app/providers/SessionProvider';
import { useStaff } from '@/features/school/data';
import { STAFF_STATUS_META, DEPARTMENTS } from '@/features/school/meta';
import type { StaffProfile, StaffStatus } from '@/types/hr';
import '@/features/school/school.css';

const PAGE_SIZE = 25;

export function StaffListPage() {
  const navigate = useNavigate();
  const { schoolId } = useSession();
  const canWrite = useCan('hr.write');
  const { data: staff, loading, error } = useStaff(schoolId);
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staff
      .filter((s) => !dept || s.department === dept)
      .filter((s) => !status || s.status === status)
      .filter((s) => !q || s.name?.toLowerCase().includes(q) || s.employeeId?.toLowerCase().includes(q) || s.designation?.toLowerCase().includes(q))
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  }, [staff, search, dept, status]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns: Column<StaffProfile>[] = [
    {
      key: 'name', header: 'Staff', primary: true,
      render: (s) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <Avatar name={s.name ?? '?'} src={s.photoUrl} size={34} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{s.employeeId}{s.designation ? ` · ${s.designation}` : ''}</div>
          </div>
        </div>
      ),
    },
    { key: 'dept', header: 'Department', render: (s) => s.department ?? '—' },
    { key: 'type', header: 'Type', hideOnMobile: true, render: (s) => s.employmentType?.replace(/_/g, ' ') ?? '—' },
    {
      key: 'status', header: 'Status',
      render: (s) => { const m = STAFF_STATUS_META[(s.status as StaffStatus) ?? 'active']; return <Badge variant={m.variant}>{m.label}</Badge>; },
    },
  ];

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Human Resources</h1>
          <p className="nx-page__sub">{loading ? 'Loading…' : `${filtered.length} staff member${filtered.length === 1 ? '' : 's'}`}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="ghost" leftIcon="calendar" onClick={() => navigate('/hr/leave')}>Staff leave</Button>
          <Button variant="ghost" leftIcon="calendar" onClick={() => navigate('/hr/student-leave')}>Student leave</Button>
          {canWrite && <Button variant="ghost" leftIcon="upload" onClick={() => navigate('/hr/import')}>Import</Button>}
          {canWrite && <Button variant="gold" leftIcon="user-plus" onClick={() => navigate('/hr/new')}>Add staff</Button>}
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={pageRows}
        rowKey={(s) => s.id}
        loading={loading}
        error={error ? 'Could not load staff.' : null}
        onRowClick={(s) => navigate(`/hr/${s.id}`)}
        emptyIcon="briefcase"
        emptyTitle={search || dept || status ? 'No staff match your filters' : 'No staff yet'}
        emptyMessage={search || dept || status ? 'Try clearing the filters.' : 'Add your first staff member to build the HR directory.'}
        pagination={{ page, pageSize: PAGE_SIZE, total: filtered.length, onPageChange: setPage }}
        toolbar={
          <div className="nx-toolbar">
            <div className="nx-toolbar__search">
              <Input leftIcon="search" placeholder="Search by name, ID or designation…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} aria-label="Search staff" />
            </div>
            <div className="nx-toolbar__filter">
              <Select value={dept} onChange={(e) => { setDept(e.target.value); setPage(1); }} aria-label="Filter by department"
                options={[{ value: '', label: 'All departments' }, ...DEPARTMENTS.map((d) => ({ value: d, label: d }))]} />
            </div>
            <div className="nx-toolbar__filter">
              <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filter by status"
                options={[{ value: '', label: 'All statuses' }, ...Object.entries(STAFF_STATUS_META).map(([v, m]) => ({ value: v, label: m.label }))]} />
            </div>
          </div>
        }
      />
    </div>
  );
}
