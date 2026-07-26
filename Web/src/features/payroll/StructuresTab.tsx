import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { DataTable, type Column } from '@/components/DataTable';
import { Input } from '@/components/form';
import { formatINR } from '@/lib/format';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useSalaryStructures } from '@/features/finance/data';
import { useStaff } from '@/features/school/data';
import { grossFromStructure } from './salarySchema';
import type { StaffProfile } from '@/types/hr';

interface StaffRow {
  id: string;
  name: string;
  designation?: string;
  department?: string;
  gross?: number;
  hasStructure: boolean;
}

/** Lists staff with their salary-structure status; links to the dedicated form. */
export function StructuresTab() {
  const navigate = useNavigate();
  const { schoolId } = useSession();
  const canWrite = useOwnership('payroll').canOperate;

  const { data: staff, loading: staffLoading, error: staffError } = useStaff(schoolId);
  const { data: structures, loading: structLoading } = useSalaryStructures(schoolId);

  const [q, setQ] = useState('');

  const byStaff = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of structures) m.set(s.staffId || s.id, grossFromStructure(s));
    return m;
  }, [structures]);

  const rows = useMemo<StaffRow[]>(() => {
    const needle = q.trim().toLowerCase();
    return staff
      .filter((p: StaffProfile) => p.status !== 'resigned' && p.status !== 'retired')
      .filter((p) => (needle ? [p.name, p.designation, p.department, p.employeeId].some((v) => v?.toLowerCase().includes(needle)) : true))
      .map((p) => ({
        id: p.id,
        name: p.name,
        designation: p.designation,
        department: p.department,
        gross: byStaff.get(p.id),
        hasStructure: byStaff.has(p.id),
      }))
      .sort((a, b) => Number(a.hasStructure) - Number(b.hasStructure) || a.name.localeCompare(b.name));
  }, [staff, byStaff, q]);

  const setLabel = canWrite ? 'Set salary' : 'View';

  const columns: Column<StaffRow>[] = [
    {
      key: 'name', header: 'Staff', primary: true,
      render: (r) => (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600 }}>{r.name}</div>
          {(r.designation || r.department) && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{[r.designation, r.department].filter(Boolean).join(' · ')}</div>
          )}
        </div>
      ),
    },
    {
      key: 'status', header: 'Structure', align: 'right',
      render: (r) => r.hasStructure
        ? <span className="fin-amount">{formatINR(r.gross ?? 0)}<span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}> /mo</span></span>
        : <Badge variant="warning">Not set</Badge>,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      loading={staffLoading || structLoading}
      error={staffError ? 'Could not load staff.' : null}
      toolbar={
        <div className="nx-toolbar" style={{ marginBottom: 16 }}>
          <div className="nx-toolbar__search">
            <Input leftIcon="search" placeholder="Search staff, designation…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search staff" />
          </div>
        </div>
      }
      onRowClick={(r) => navigate(`/payroll/structure/${r.id}`)}
      actions={(r) => (
        <Button variant={r.hasStructure ? 'subtle' : 'gold'} size="sm" leftIcon={r.hasStructure ? 'edit' : 'plus'} onClick={() => navigate(`/payroll/structure/${r.id}`)}>
          {r.hasStructure ? 'Edit' : setLabel}
        </Button>
      )}
      emptyIcon="users"
      emptyTitle={q ? 'No matching staff' : 'No staff yet'}
      emptyMessage={q ? 'Try a different search.' : 'Add staff in the HR module, then set their salary here.'}
    />
  );
}
