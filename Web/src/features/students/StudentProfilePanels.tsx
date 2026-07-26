import { useMemo } from 'react';
import { query, where } from 'firebase/firestore';
import { Panel } from '@/components/Panel';
import { Badge } from '@/components/Badge';
import { EmptyState, Skeleton } from '@/components/feedback';
import { formatINR, formatDate } from '@/lib/format';
import { tenantCol, useCollection } from '@/lib/db';
import { useStudent } from '@/features/school/data';
import { useInvoices } from '@/features/finance/data';
import type { AttendanceDay } from '@/types/daily';

/** Per-student attendance % + a recent-days strip.
 * Scoped to the student's OWN section: attendance is stored per-section-per-day,
 * so we query only `attendance_days where sectionId == <student's section>`
 * (single-field index, automatic) instead of reading every section's days for the
 * whole school. The student's row is read from each day's `entries` map by id. */
export function StudentAttendancePanel({ schoolId, studentId }: { schoolId: string; studentId: string }) {
  // One extra single-doc read to learn the student's section; the alternative
  // (whole-collection scan) cost O(sections × days) reads on every open.
  const { data: student, loading: studentLoading } = useStudent(schoolId, studentId);
  const sectionId = student?.sectionId;
  const { data: days, loading: daysLoading } = useCollection<AttendanceDay>(
    schoolId && sectionId
      ? query(tenantCol(schoolId, 'attendance_days'), where('sectionId', '==', sectionId))
      : null,
    [schoolId, sectionId],
  );
  // Stay in the loading state until the student doc resolves (so we know the
  // section) AND, when there is one, its attendance query settles — otherwise the
  // empty state would flash before the section is known. A student with no section
  // assigned falls straight through to the (correct) "no attendance" empty state.
  const loading = studentLoading || (!!sectionId && daysLoading);
  const stats = useMemo(() => {
    let present = 0;
    let total = 0;
    const recent: { date: string; st: string }[] = [];
    for (const d of days) {
      const st = d.entries?.[studentId];
      if (!st) continue;
      recent.push({ date: d.date, st });
      if (st === 'holiday') continue;
      total++;
      if (st === 'present' || st === 'late' || st === 'half_day') present += st === 'half_day' ? 0.5 : 1;
    }
    recent.sort((a, b) => b.date.localeCompare(a.date));
    return { pct: total ? Math.round((present / total) * 100) : 0, total, present, recent: recent.slice(0, 24) };
  }, [days, studentId]);

  if (loading) return <Panel><Skeleton height={140} /></Panel>;
  const color = stats.pct >= 85 ? 'var(--success)' : stats.pct >= 75 ? 'var(--warning)' : 'var(--danger)';
  return (
    <Panel title="Attendance" sub="all recorded days">
      {stats.total === 0 ? (
        <EmptyState icon="clock" title="No attendance recorded" message="Daily attendance for this student will appear here once marked." />
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 30, fontWeight: 700, color }}>{stats.pct}%</span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {stats.present % 1 === 0 ? stats.present : stats.present.toFixed(1)} present of {stats.total} marked
            </span>
            {stats.pct < 75 && <Badge variant="danger">Below 75%</Badge>}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {stats.recent.map((r, i) => {
              const c = r.st === 'present' ? 'var(--success)' : r.st === 'absent' ? 'var(--danger)' : r.st === 'holiday' ? 'var(--border-2)' : 'var(--warning)';
              return (
                <span key={i} title={`${r.date}: ${r.st}`} style={{ width: 30, height: 30, borderRadius: 7, display: 'grid', placeItems: 'center', fontSize: 10.5, color: '#fff', background: c }}>
                  {r.date.slice(8)}
                </span>
              );
            })}
          </div>
        </>
      )}
    </Panel>
  );
}

/** Per-student fees summary + invoice list (from the finance invoices hook). */
export function StudentFeesPanel({ schoolId, studentId }: { schoolId: string; studentId: string }) {
  // Scope the read to this student server-side (where studentId == …) instead of
  // pulling every invoice in the school and filtering on the client. Single-field
  // equality is auto-indexed by Firestore, so no composite index is required here.
  const { data: mine, loading } = useInvoices(schoolId, studentId);
  const totals = useMemo(() => {
    let billed = 0;
    let paid = 0;
    let due = 0;
    for (const i of mine) {
      billed += i.netAmount ?? 0;
      paid += i.paidAmount ?? 0;
      // Canonical due = net − paid (don't trust a possibly-stale stored dueAmount).
      due += Math.max(0, (i.netAmount ?? 0) - (i.paidAmount ?? 0));
    }
    return { billed, paid, due };
  }, [mine]);

  if (loading) return <Panel><Skeleton height={140} /></Panel>;
  return (
    <div className="grid g-2">
      <Panel title="Fees summary">
        <div className="nx-kv"><span className="nx-kv__k">Billed</span><span className="nx-kv__v">{totals.billed ? formatINR(totals.billed) : '—'}</span></div>
        <div className="nx-kv"><span className="nx-kv__k">Paid</span><span className="nx-kv__v">{totals.paid ? formatINR(totals.paid) : '—'}</span></div>
        <div className="nx-kv">
          <span className="nx-kv__k">Due</span>
          <span className="nx-kv__v">{totals.due > 0 ? <Badge variant="danger">{formatINR(totals.due)}</Badge> : totals.billed > 0 ? <Badge variant="success">Cleared</Badge> : '—'}</span>
        </div>
      </Panel>
      <Panel title="Invoices">
        {mine.length === 0 ? (
          <EmptyState icon="credit-card" title="No invoices" message="Fee invoices raised for this student appear here." />
        ) : (
          mine.map((i) => (
            <div className="nx-kv" key={i.id}>
              <span className="nx-kv__k">{i.title ?? 'Invoice'}</span>
              <span className="nx-kv__v">{formatINR(i.netAmount ?? 0)} · {i.status}</span>
            </div>
          ))
        )}
      </Panel>
    </div>
  );
}

type MedicalRec = { id: string; studentId?: string; date?: number; complaint?: string; diagnosis?: string; outcome?: string; kind?: string };

/** Per-student health records — gated by the caller (medical.read) before rendering. */
export function StudentHealthPanel({ schoolId, studentId }: { schoolId: string; studentId: string }) {
  const { data, loading } = useCollection<MedicalRec>(schoolId ? tenantCol(schoolId, 'medical') : null, [schoolId]);
  const mine = useMemo(
    () => data.filter((m) => m.studentId === studentId).sort((a, b) => (b.date ?? 0) - (a.date ?? 0)),
    [data, studentId],
  );
  if (loading) return <Panel><Skeleton height={120} /></Panel>;
  return (
    <Panel title="Health records" sub="restricted — medical staff & leadership only">
      {mine.length === 0 ? (
        <EmptyState icon="heart-pulse" title="No health records" message="Clinic visits and health notes for this student appear here." />
      ) : (
        mine.map((m) => (
          <div className="nx-kv" key={m.id}>
            <span className="nx-kv__k">{m.date ? formatDate(m.date) : '—'} · {m.complaint ?? m.kind ?? 'Visit'}</span>
            <span className="nx-kv__v">{m.diagnosis ?? m.outcome ?? '—'}</span>
          </div>
        ))
      )}
    </Panel>
  );
}
