import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { DataTable, type Column } from '@/components/DataTable';
import { Input, Select } from '@/components/form';
import { useCan, useSession } from '@/app/providers/SessionProvider';
import { useTransferCertificates } from '@/features/school/data';
import { TC_STATUS_META } from '@/features/school/meta';
import { formatDate } from '@/lib/format';
import type { TransferCertificate, TCStatus } from '@/types/sis';
import '@/features/school/school.css';

export function TCListPage() {
  const navigate = useNavigate();
  const { schoolId } = useSession();
  const canWrite = useCan('students.write');
  const { data: tcs, loading, error } = useTransferCertificates(schoolId);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tcs
      .filter((t) => !status || t.status === status)
      .filter((t) => !q || t.studentName?.toLowerCase().includes(q) || t.admissionNo?.toLowerCase().includes(q) || t.tcNumber?.toLowerCase().includes(q))
      .sort((a, b) => (b.requestedDate ?? 0) - (a.requestedDate ?? 0));
  }, [tcs, search, status]);

  const columns: Column<TransferCertificate>[] = [
    { key: 'student', header: 'Student', primary: true, render: (t) => (
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, color: 'var(--text)' }}>{t.studentName}</div>
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{t.admissionNo}{t.gradeName ? ` · ${t.gradeName}` : ''}</div>
      </div>
    ) },
    { key: 'tcno', header: 'TC No.', render: (t) => t.tcNumber ?? '—' },
    { key: 'requested', header: 'Requested', render: (t) => (t.requestedDate ? formatDate(t.requestedDate) : '—') },
    { key: 'status', header: 'Status', render: (t) => { const m = TC_STATUS_META[(t.status as TCStatus) ?? 'requested']; return <Badge variant={m.variant}>{m.label}</Badge>; } },
  ];

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <button type="button" className="nx-formpage__back" style={{ marginBottom: 10 }} onClick={() => navigate('/students')} aria-label="Back to students"><Icon name="chevron-left" size={18} /></button>
          <h1 className="nx-page__title">Transfer certificates</h1>
          <p className="nx-page__sub">{loading ? 'Loading…' : `${filtered.length} request${filtered.length === 1 ? '' : 's'}`}</p>
        </div>
        {canWrite && <Button variant="gold" leftIcon="plus" onClick={() => navigate('/students/tc/new')}>New request</Button>}
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(t) => t.id}
        loading={loading}
        error={error ? 'Could not load certificates.' : null}
        onRowClick={(t) => navigate(`/students/tc/${t.id}`)}
        emptyIcon="award"
        emptyTitle={search || status ? 'No certificates match' : 'No transfer certificates yet'}
        emptyMessage={search || status ? 'Try clearing the filters.' : 'Raise a TC request when a student is leaving the school.'}
        toolbar={
          <div className="nx-toolbar">
            <div className="nx-toolbar__search"><Input leftIcon="search" placeholder="Search by student, admission or TC no…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search certificates" /></div>
            <div className="nx-toolbar__filter"><Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status" options={[{ value: '', label: 'All statuses' }, ...Object.entries(TC_STATUS_META).map(([v, m]) => ({ value: v, label: m.label }))]} /></div>
          </div>
        }
      />
    </div>
  );
}
