import { useMemo } from 'react';
import { Badge } from '@/components/Badge';
import { Panel } from '@/components/Panel';
import { KPICard } from '@/components/KPICard';
import { Icon } from '@/components/Icon';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useSession } from '@/app/providers/SessionProvider';
import { useSubjects } from '@/features/school/data';
import { useAssessments } from '@/features/daily/data';
import { formatDate } from '@/lib/format';
import type { Assessment, AssessmentMark } from '@/types/daily';
import type { Subject } from '@/types/academics';
import { useStudentContext } from './useStudentContext';
import { useSectionAssessmentResults } from './academicsData';
import { PortalPage } from './PortalShell';
import './studentportal.css';

const ASSESSMENT_TYPE_LABEL: Record<Assessment['type'], string> = {
  class_test: 'Class Test',
  unit_test: 'Unit Test',
  assignment: 'Assignment',
  project: 'Project',
  practical: 'Practical',
  periodic: 'Periodic',
};

interface ScoredAssessment {
  assessment: Assessment;
  mark: AssessmentMark;
  pct: number | null;
}

/** Read-only academic overview: subjects, recent published marks, progress snapshot. */
export function StudentAcademicsPage() {
  const ctx = useStudentContext();
  return (
    <PortalPage ctx={ctx} title="Academics" icon="book" sub="Your subjects, recent marks and progress.">
      {ctx.status === 'ready' && (
        <AcademicsBody sectionId={ctx.student?.sectionId} gradeId={ctx.student?.gradeId} studentId={ctx.studentId} />
      )}
    </PortalPage>
  );
}

function AcademicsBody({
  sectionId,
  gradeId,
  studentId,
}: {
  sectionId?: string;
  gradeId?: string;
  studentId?: string;
}) {
  const { schoolId } = useSession();
  const { data: subjects, loading: subLoading } = useSubjects(schoolId);
  const { data: assessments, loading: aLoading } = useAssessments(schoolId, sectionId);
  const { data: results, loading: rLoading } = useSectionAssessmentResults(schoolId, sectionId);

  // Subjects taught in the student's grade (or untargeted subjects).
  const mySubjects = useMemo<Subject[]>(
    () =>
      subjects
        .filter((s) => !s.gradeIds?.length || (gradeId ? s.gradeIds.includes(gradeId) : false))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [subjects, gradeId],
  );

  // Published assessments for the section, joined with this student's own mark.
  const scored = useMemo<ScoredAssessment[]>(() => {
    if (!studentId) return [];
    const resultByAssessment = new Map(results.map((r) => [r.assessmentId, r]));
    const out: ScoredAssessment[] = [];
    for (const a of assessments) {
      if (!a.published) continue;
      const mark = resultByAssessment.get(a.id)?.entries?.[studentId];
      if (!mark) continue;
      const pct = !mark.absent && typeof mark.marks === 'number' && a.maxMarks > 0
        ? Math.round((mark.marks / a.maxMarks) * 100)
        : null;
      out.push({ assessment: a, mark, pct });
    }
    return out.sort((x, y) => (y.assessment.date ?? y.assessment.createdAt ?? 0) - (x.assessment.date ?? x.assessment.createdAt ?? 0));
  }, [assessments, results, studentId]);

  const snapshot = useMemo(() => {
    const withPct = scored.filter((s) => s.pct != null);
    const avg = withPct.length ? Math.round(withPct.reduce((sum, s) => sum + (s.pct ?? 0), 0) / withPct.length) : null;
    const best = withPct.reduce<ScoredAssessment | null>((b, s) => (b == null || (s.pct ?? 0) > (b.pct ?? 0) ? s : b), null);
    return { avg, best, graded: withPct.length, total: scored.length };
  }, [scored]);

  const loading = subLoading || aLoading || rLoading;

  if (loading) {
    return (
      <div className="sp-stack">
        <Skeleton height={96} radius={14} />
        <Panel><Skeleton height={220} /></Panel>
      </div>
    );
  }

  return (
    <div className="sp-stack">
      <div className="kpi-grid">
        <KPICard icon="book" label="My subjects" count={mySubjects.length} />
        <KPICard
          icon="trending-up"
          label="Average score"
          value={snapshot.avg != null ? `${snapshot.avg}%` : '—'}
          sub={snapshot.graded > 0 ? `${snapshot.graded} graded` : 'No marks yet'}
        />
        <KPICard
          icon="trophy"
          label="Best result"
          value={snapshot.best?.pct != null ? `${snapshot.best.pct}%` : '—'}
          sub={snapshot.best?.assessment.subjectName ?? '—'}
        />
      </div>

      <Panel title="My subjects" sub={mySubjects.length ? `${mySubjects.length} this year` : undefined}>
        {mySubjects.length === 0 ? (
          <EmptyState icon="book" title="No subjects listed" message="Your subjects will appear here once your school sets up your class." />
        ) : (
          <ul className="sp-subjects">
            {mySubjects.map((s) => (
              <li key={s.id} className="sp-subject" style={s.color ? { ['--sub' as string]: s.color } : undefined}>
                <span className="sp-subject__dot" aria-hidden="true" />
                <span className="sp-subject__name">{s.name}</span>
                {s.code && <span className="sp-subject__code">{s.code}</span>}
                <Badge variant="muted">{cap(s.type)}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Recent assessments" sub="Published marks only">
        {scored.length === 0 ? (
          <EmptyState
            icon="edit"
            title="No marks published yet"
            message="When your teachers publish class test and assignment results, they'll show up here."
          />
        ) : (
          <ul className="sp-marks">
            {scored.slice(0, 12).map(({ assessment, mark, pct }) => (
              <li key={assessment.id} className="sp-mark">
                <div className="sp-mark__main">
                  <div className="sp-mark__title">{assessment.name}</div>
                  <div className="sp-mark__meta">
                    {assessment.subjectName && <span>{assessment.subjectName}</span>}
                    <span className="sp-dot" aria-hidden="true" />
                    <span>{ASSESSMENT_TYPE_LABEL[assessment.type]}</span>
                    {assessment.date != null && (
                      <>
                        <span className="sp-dot" aria-hidden="true" />
                        <span>{formatDate(assessment.date)}</span>
                      </>
                    )}
                  </div>
                  {mark.remark && <div className="sp-mark__remark">“{mark.remark}”</div>}
                </div>
                <div className="sp-mark__score">
                  {mark.absent ? (
                    <Badge variant="warning">Absent</Badge>
                  ) : typeof mark.marks === 'number' ? (
                    <>
                      <span className="sp-mark__val">{mark.marks}<span className="sp-mark__max">/{assessment.maxMarks}</span></span>
                      {pct != null && (
                        <span className="sp-mark__pct" style={{ color: pctColor(pct) }}>{pct}%</span>
                      )}
                    </>
                  ) : mark.grade ? (
                    <span className="sp-mark__val">{mark.grade}</span>
                  ) : (
                    <span className="sp-muted">—</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <p className="sp-footnote">
        <Icon name="info" size={13} aria-hidden="true" />
        Term results and report cards are available under Examinations and Progress Card.
      </p>
    </div>
  );
}

function pctColor(pct: number): string {
  if (pct >= 75) return 'var(--success)';
  if (pct >= 40) return 'var(--warning)';
  return 'var(--danger)';
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
}
