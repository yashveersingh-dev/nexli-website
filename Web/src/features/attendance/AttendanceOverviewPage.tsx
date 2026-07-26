import { useMemo, useState } from 'react';
import { Panel } from '@/components/Panel';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { Field, Select } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useSession } from '@/app/providers/SessionProvider';
import { useStudents, useGrades, useSections } from '@/features/school/data';
import { useSectionAttendance } from '@/features/daily/data';
import { ATTENDANCE_MIN_PERCENT } from '@/features/daily/meta';
import type { AttendanceDay } from '@/types/daily';

/** Per-student attendance % across recorded days (present+late count as attended). */
function computePercents(days: AttendanceDay[], studentIds: string[]): Record<string, { present: number; total: number; pct: number }> {
  const acc: Record<string, { present: number; total: number }> = {};
  for (const id of studentIds) acc[id] = { present: 0, total: 0 };
  for (const day of days) {
    for (const id of studentIds) {
      const st = day.entries?.[id];
      if (!st || st === 'holiday') continue;
      acc[id].total += 1;
      if (st === 'present' || st === 'late' || st === 'half_day') acc[id].present += st === 'half_day' ? 0.5 : 1;
    }
  }
  const out: Record<string, { present: number; total: number; pct: number }> = {};
  for (const id of studentIds) {
    const a = acc[id];
    out[id] = { ...a, pct: a.total ? Math.round((a.present / a.total) * 100) : 0 };
  }
  return out;
}

export function AttendanceOverviewPage() {
  const { schoolId } = useSession();
  const { data: students } = useStudents(schoolId);
  const { data: grades } = useGrades(schoolId);
  const { data: sections } = useSections(schoolId);
  const [sectionId, setSectionId] = useState('');
  const { data: days, loading } = useSectionAttendance(schoolId, sectionId || undefined);

  const gradeName = (gid?: string) => grades.find((g) => g.id === gid)?.name;
  const sectionOptions = sections.map((s) => ({ value: s.id, label: `${gradeName(s.gradeId) ?? ''} ${s.name}`.trim() }));
  const roster = useMemo(() => students.filter((s) => s.sectionId === sectionId && s.status === 'active'), [students, sectionId]);
  const pcts = useMemo(() => computePercents(days, roster.map((s) => s.id)), [days, roster]);
  const atRisk = roster.filter((s) => (pcts[s.id]?.total ?? 0) > 0 && pcts[s.id].pct < ATTENDANCE_MIN_PERCENT);

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Attendance overview</h1>
          <p className="nx-page__sub">Per-student attendance and shortage alerts.</p>
        </div>
      </div>

      <Panel>
        <Field label="Class / Section"><Select value={sectionId} onChange={(e) => setSectionId(e.target.value)} placeholder="Select a section" options={sectionOptions} /></Field>
      </Panel>

      {!sectionId ? (
        <Panel><EmptyState icon="bar-chart" title="Pick a section" message="Choose a section to see attendance analytics." /></Panel>
      ) : loading ? (
        <Panel><Skeleton height={280} /></Panel>
      ) : roster.length === 0 ? (
        <Panel><EmptyState icon="users" title="No students" /></Panel>
      ) : (
        <>
          {atRisk.length > 0 && (
            <Panel title="Shortage alerts" sub={`below ${ATTENDANCE_MIN_PERCENT}%`} headerRight={<Badge variant="danger">{atRisk.length}</Badge>}>
              {atRisk.map((s) => (
                <div className="nx-kv" key={s.id}>
                  <span className="nx-kv__k">{s.fullName}</span>
                  <span className="nx-kv__v" style={{ color: 'var(--danger)', fontWeight: 700 }}>{pcts[s.id].pct}%</span>
                </div>
              ))}
            </Panel>
          )}

          <Panel title="All students" sub={`${days.length} days recorded`}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {roster.map((s) => {
                const p = pcts[s.id] ?? { pct: 0, total: 0 };
                const color = p.pct >= 85 ? 'var(--success)' : p.pct >= ATTENDANCE_MIN_PERCENT ? 'var(--warning)' : 'var(--danger)';
                return (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <Avatar name={s.fullName} src={s.photoUrl} size={30} />
                    <span style={{ flex: '0 0 40%', minWidth: 0, fontSize: 13.5, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.fullName}</span>
                    <div className="nx-att-pct" style={{ flex: 1 }}>
                      <div className="nx-att-pct__bar"><div className="nx-att-pct__fill" style={{ width: `${p.pct}%`, background: color }} /></div>
                      <span className="nx-att-pct__val" style={{ color }}>{p.total ? `${p.pct}%` : '—'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
