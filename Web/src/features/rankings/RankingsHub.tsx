import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Tabs } from '@/components/Tabs';
import { Panel } from '@/components/Panel';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Select } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useSession } from '@/app/providers/SessionProvider';
import { useStudents, useGrades, useSections, useExams, useAllAttendance, useAllExamResults } from './data';
import type { AttendanceDay } from '@/types/daily';
import type { Student } from '@/types/sis';

type TabId = 'marks' | 'attendance';
const PAGE = 25;

/**
 * Attendance-ranking window. There is no term selector on this leaderboard, so
 * rather than rank on all-time attendance (an ever-growing whole-collection
 * read) we rank on a rolling ~term-length (one quarter) present-day %, matching
 * the analytics screen's window. Keeps the board a current-standing view.
 */
const ATT_WINDOW_DAYS = 90;

interface RankRow {
  student: Student;
  value: number; // % (0–100)
  tie: number; // tie-breaker magnitude (total marks / recorded days)
  meta: string; // recorded-days / exams-counted label
}

function attendancePct(days: AttendanceDay[], studentId: string): { pct: number; total: number } {
  let present = 0, total = 0;
  for (const d of days) {
    const st = d.entries?.[studentId];
    if (!st || st === 'holiday') continue;
    total++;
    if (st === 'present' || st === 'late' || st === 'half_day') present += st === 'half_day' ? 0.5 : 1;
  }
  return { pct: total ? Math.round((present / total) * 100) : 0, total };
}

/**
 * Student rankings — two independent engines.
 *  • Marks: normalised exam percentage (a Class 6 student at 100% outranks a Class 7
 *    student at 99%, because we rank on %, never absolute marks).
 *  • Attendance: present-day percentage. Kept entirely separate from marks.
 * Staff-only (internal merit view); not exposed to parents/students.
 */
export function RankingsHub() {
  const { schoolId } = useSession();
  const [tab, setTab] = useState<TabId>('marks');
  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Student Rankings</h1>
          <p className="nx-page__sub">Merit (exam %) and attendance leaderboards — ranked fairly across classes by percentage, not raw marks.</p>
        </div>
      </div>
      <Tabs
        variant="line"
        aria-label="Ranking type"
        value={tab}
        onChange={(id) => setTab(id as TabId)}
        tabs={[
          { id: 'marks', label: 'By marks', icon: 'trophy' },
          { id: 'attendance', label: 'By attendance', icon: 'clock' },
        ]}
      >
        {(active) => (active === 'marks' ? <MarksRanking schoolId={schoolId} /> : <AttendanceRanking schoolId={schoolId} />)}
      </Tabs>
    </div>
  );
}

/** Shared scope (school / grade / section) + a paginated ranked list. */
function useScope(schoolId?: string) {
  const { data: students, loading: sLoading } = useStudents(schoolId);
  const { data: grades } = useGrades(schoolId);
  const { data: sections } = useSections(schoolId);
  const [gradeId, setGradeId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [page, setPage] = useState(0);

  const active = useMemo(() => students.filter((s) => s.status === 'active'), [students]);
  const scoped = useMemo(
    () => active.filter((s) => (gradeId ? s.gradeId === gradeId : true) && (sectionId ? s.sectionId === sectionId : true)),
    [active, gradeId, sectionId],
  );
  const sectionOpts = useMemo(
    () => sections.filter((s) => (gradeId ? s.gradeId === gradeId : true)),
    [sections, gradeId],
  );

  const ScopeBar = (
    <div className="nx-toolbar" style={{ marginBottom: 14, gap: 10, display: 'flex', flexWrap: 'wrap' }}>
      <Select
        aria-label="Class"
        value={gradeId}
        onChange={(e) => { setGradeId(e.target.value); setSectionId(''); setPage(0); }}
        options={[{ value: '', label: 'All classes' }, ...grades.map((g) => ({ value: g.id, label: g.name }))]}
      />
      <Select
        aria-label="Section"
        value={sectionId}
        onChange={(e) => { setSectionId(e.target.value); setPage(0); }}
        options={[{ value: '', label: gradeId ? 'All sections' : 'All sections' }, ...sectionOpts.map((s) => ({ value: s.id, label: s.name }))]}
      />
    </div>
  );

  return { sLoading, scoped, page, setPage, ScopeBar };
}

function rankAndPaginate(rows: RankRow[], page: number) {
  const sorted = [...rows].sort(
    (a, b) => b.value - a.value || b.tie - a.tie || a.student.fullName.localeCompare(b.student.fullName),
  );
  const total = sorted.length;
  // Compute tie-aware ranks over the full list so page 2+ shows correct numbers.
  const ranks: number[] = [];
  sorted.forEach((r, i) => {
    if (i === 0) { ranks.push(1); return; }
    const prev = sorted[i - 1];
    ranks.push(r.value === prev.value && r.tie === prev.tie ? ranks[i - 1] : i + 1);
  });
  const slice = sorted.slice(page * PAGE, page * PAGE + PAGE);
  const sliceRanks = ranks.slice(page * PAGE, page * PAGE + PAGE);
  return { total, slice, sliceRanks };
}

function RankList({ rows, page, setPage, valueSuffix, emptyTitle, emptyMsg }: {
  rows: RankRow[]; page: number; setPage: (n: number) => void; valueSuffix: string; emptyTitle: string; emptyMsg: string;
}) {
  const { total, slice, sliceRanks } = useMemo(() => rankAndPaginate(rows, page), [rows, page]);
  if (total === 0) return <Panel><EmptyState icon="bar-chart" title={emptyTitle} message={emptyMsg} /></Panel>;
  const pageStart = page * PAGE; // 0-based position of first item on this page
  const pageEnd = pageStart + slice.length; // exclusive
  const medal = (rank: number) => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null);
  return (
    <Panel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {slice.map((r, i) => {
          const rank = sliceRanks[i];
          return (
            <Link key={r.student.id} to={`/students/${r.student.id}`}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 4px', textDecoration: 'none', color: 'inherit', borderBottom: '1px solid var(--border, rgba(255,255,255,0.06))' }}>
              <span style={{ width: 34, textAlign: 'center', fontWeight: 700, fontSize: rank <= 3 ? 18 : 14, color: rank <= 3 ? 'var(--gold)' : 'var(--text-muted)' }}>
                {medal(rank) ?? rank}
              </span>
              <Avatar name={r.student.fullName} src={r.student.photoUrl} size={32} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.student.fullName}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {[r.student.gradeName, r.student.sectionName].filter(Boolean).join(' · ')}{r.meta ? ` · ${r.meta}` : ''}
                </div>
              </div>
              <Badge variant={r.value >= 75 ? 'success' : r.value >= 50 ? 'warning' : 'danger'}>{r.value}{valueSuffix}</Badge>
            </Link>
          );
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, gap: 10 }}>
        <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Showing {pageStart + 1}–{pageEnd} of {total}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" size="sm" leftIcon="chevron-left" disabled={page === 0} onClick={() => setPage(page - 1)}>Prev</Button>
          <Button variant="ghost" size="sm" rightIcon="chevron-right" disabled={pageEnd >= total} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      </div>
    </Panel>
  );
}

function MarksRanking({ schoolId }: { schoolId?: string }) {
  const { sLoading, scoped, page, setPage, ScopeBar } = useScope(schoolId);
  const { data: exams } = useExams(schoolId);
  const { data: results, loading: rLoading } = useAllExamResults(schoolId);
  const [examId, setExamId] = useState('');

  const byStudent = useMemo(() => {
    const m = new Map<string, { sum: number; n: number; total: number }>();
    for (const r of results) {
      if (examId && r.examId !== examId) continue;
      if (r.percentage == null) continue;
      const g = m.get(r.studentId) ?? { sum: 0, n: 0, total: 0 };
      g.sum += r.percentage; g.n++; g.total += r.total ?? 0;
      m.set(r.studentId, g);
    }
    return m;
  }, [results, examId]);

  const rows = useMemo<RankRow[]>(
    () => scoped.flatMap((s) => {
      const g = byStudent.get(s.id);
      if (!g || g.n === 0) return [];
      return [{ student: s, value: Math.round(g.sum / g.n), tie: g.total, meta: `${g.n} exam${g.n > 1 ? 's' : ''}` }];
    }),
    [scoped, byStudent],
  );

  if (sLoading || rLoading) return <Skeleton height={300} />;
  return (
    <div>
      <div className="nx-toolbar" style={{ marginBottom: 10, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <Select aria-label="Exam" value={examId} onChange={(e) => { setExamId(e.target.value); setPage(0); }}
          options={[{ value: '', label: 'Cumulative (all exams)' }, ...exams.map((x) => ({ value: x.id, label: x.name }))]} />
      </div>
      {ScopeBar}
      <RankList
        rows={rows} page={page} setPage={setPage} valueSuffix="%"
        emptyTitle="No exam results yet"
        emptyMsg="The merit ranking appears once exam results are entered and published. It ranks on normalised percentage, so classes are compared fairly."
      />
    </div>
  );
}

function AttendanceRanking({ schoolId }: { schoolId?: string }) {
  const { sLoading, scoped, page, setPage, ScopeBar } = useScope(schoolId);
  const { data: attendance, loading: aLoading } = useAllAttendance(schoolId, { sinceDays: ATT_WINDOW_DAYS });

  const rows = useMemo<RankRow[]>(
    () => scoped.flatMap((s) => {
      const a = attendancePct(attendance, s.id);
      if (a.total === 0) return [];
      return [{ student: s, value: a.pct, tie: a.total, meta: `${a.total} day${a.total > 1 ? 's' : ''}` }];
    }),
    [scoped, attendance],
  );

  if (sLoading || aLoading) return <Skeleton height={300} />;
  return (
    <div>
      <p className="nx-page__sub" style={{ marginBottom: 10 }}>Present-day % over the last {ATT_WINDOW_DAYS} days.</p>
      {ScopeBar}
      <RankList
        rows={rows} page={page} setPage={setPage} valueSuffix="%"
        emptyTitle="No attendance recorded yet"
        emptyMsg="The attendance ranking appears once attendance is marked. It ranks purely on present-day percentage — kept entirely separate from marks."
      />
    </div>
  );
}
