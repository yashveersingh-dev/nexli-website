import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { query, where } from 'firebase/firestore';
import { Panel } from '@/components/Panel';
import { Button } from '@/components/Button';
import { EmptyState, InfoCard, Skeleton } from '@/components/feedback';
import { tenantCol, useCollection } from '@/lib/db';

type StaffAttRec = { id: string; uid?: string; date?: string; status?: string };

/** Per-staff attendance summary (from the staff_attendance collection). */
export function StaffAttendancePanel({ schoolId, uid }: { schoolId: string; uid: string }) {
  // Filter server-side by uid to avoid loading every staff member's attendance.
  // Requires a single-field index on `uid` (auto-created by Firestore).
  const { data, loading } = useCollection<StaffAttRec>(
    schoolId && uid ? query(tenantCol(schoolId, 'staff_attendance'), where('uid', '==', uid)) : null,
    [schoolId, uid],
  );
  const mine = useMemo(
    () => [...data].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')),
    [data],
  );
  const stats = useMemo(() => {
    let present = 0;
    let total = 0;
    for (const r of mine) {
      if (r.status === 'leave' || r.status === 'holiday') continue;
      total++;
      if (r.status === 'present' || r.status === 'late') present++;
    }
    return { pct: total ? Math.round((present / total) * 100) : 0, total, present };
  }, [mine]);

  if (loading) return <Panel><Skeleton height={120} /></Panel>;
  return (
    <Panel title="Attendance" sub="staff attendance record">
      {mine.length === 0 ? (
        <EmptyState icon="clock" title="No staff attendance recorded" message="This person’s daily attendance appears here once marked." />
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: stats.pct >= 90 ? 'var(--success)' : 'var(--warning)' }}>{stats.pct}%</span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{stats.present} present of {stats.total} days</span>
          </div>
          {mine.slice(0, 12).map((r) => (
            <div className="nx-kv" key={r.id}><span className="nx-kv__k">{r.date ?? '—'}</span><span className="nx-kv__v" style={{ textTransform: 'capitalize' }}>{r.status ?? '—'}</span></div>
          ))}
        </>
      )}
    </Panel>
  );
}

/** Payroll surface — rendered ONLY when the caller holds payroll.read. */
export function StaffPayrollPanel() {
  const navigate = useNavigate();
  return (
    <div className="grid g-2">
      <Panel title="Payroll" sub="restricted — finance / HR / leadership">
        <InfoCard icon="lock" title="Permission-restricted">
          Salary structure and payslips are visible only to roles with payroll access (Finance Manager, Chief Accountant, HR leadership, Principal/VP). Pay runs for this person are processed in the Payroll module.
        </InfoCard>
        <div style={{ marginTop: 12 }}>
          <Button variant="subtle" leftIcon="wallet" onClick={() => navigate('/payroll')}>Open Payroll</Button>
        </div>
      </Panel>
    </div>
  );
}
