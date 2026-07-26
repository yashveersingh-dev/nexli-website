import { useMemo } from 'react';
import { Badge } from '@/components/Badge';
import { Panel } from '@/components/Panel';
import { Icon } from '@/components/Icon';
import { Skeleton } from '@/components/feedback';
import { useSession } from '@/app/providers/SessionProvider';
import { useExamPapers, useExamResults } from '@/features/daily/data';
import { formatDate } from '@/lib/format';
import type { Student } from '@/types/sis';
import type { Exam } from '@/types/daily';
import { sortPapers, endTimeLabel, dateRangeLabel } from './shared';
import { letterGrade, resultStatusFor, RESULT_STATUS_META, type ResultStatus } from './examSchema';

export function ChildExams({ exam, student }: { exam: Exam; student: Student }) {
  const { schoolId } = useSession();
  const { data: papers, loading: pLoading } = useExamPapers(schoolId, exam.id);
  const { data: results, loading: rLoading } = useExamResults(schoolId, exam.id);

  const myResult = useMemo(() => results.find((r) => r.studentId === student.id), [results, student.id]);

  const gradePapers = useMemo(() => {
    const filtered = papers.filter((p) => !p.gradeId || p.gradeId === student.gradeId);
    return sortPapers(filtered.length ? filtered : papers);
  }, [papers, student.gradeId]);

  // Subject lookup for results that store marks by paperId.
  const paperById = useMemo(() => {
    const m = new Map(papers.map((p) => [p.id, p]));
    return m;
  }, [papers]);

  const headerRight = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Icon name="calendar" size={13} style={{ color: 'var(--text-muted)' }} />
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{dateRangeLabel(exam.startDate, exam.endDate, (ts) => formatDate(ts))}</span>
    </div>
  );

  return (
    <Panel title={exam.name} sub={exam.academicYear} headerRight={headerRight}>
      {/* Datesheet */}
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Datesheet</div>
      {pLoading ? (
        <Skeleton height={120} radius={10} />
      ) : gradePapers.length === 0 ? (
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>The datesheet has not been published yet.</p>
      ) : (
        <div className="nx-ds-list">
          {gradePapers.map((p) => {
            const endTime = endTimeLabel(p.startTime, p.durationMins);
            return (
              <div key={p.id} className="nx-ds-row">
                <div className="nx-ds-row__date">
                  {p.date ? (
                    <>
                      <span className="nx-ds-row__day">{formatDate(p.date, 'ddd')}</span>
                      <span className="nx-ds-row__dnum">{formatDate(p.date, 'D')}</span>
                      <span className="nx-ds-row__mon">{formatDate(p.date, 'MMM')}</span>
                    </>
                  ) : (
                    <span className="nx-ds-row__mon">TBA</span>
                  )}
                </div>
                <div className="nx-ds-row__main">
                  <div className="nx-ds-row__subject">{p.subjectName ?? 'Untitled'}</div>
                  <div className="nx-ds-row__sub">
                    {p.startTime && <span className="nx-ds-row__chip"><Icon name="clock" size={13} />{p.startTime}{endTime ? `–${endTime}` : ''}</span>}
                    {p.maxMarks != null && <span className="nx-ds-row__chip"><Icon name="award" size={13} />Max {p.maxMarks}</span>}
                    {p.roomName && <span className="nx-ds-row__chip"><Icon name="building" size={13} />{p.roomName}</span>}
                    {!p.date && <Badge variant="muted">Date TBA</Badge>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Report card */}
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', margin: '18px 0 8px' }}>Result</div>
      {rLoading ? (
        <Skeleton height={100} radius={10} />
      ) : !myResult || Object.keys(myResult.marks ?? {}).length === 0 ? (
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Results for this exam have not been released yet.</p>
      ) : (
        <ReportCard result={myResult} paperById={paperById} />
      )}
    </Panel>
  );
}

function ReportCard({
  result,
  paperById,
}: {
  result: import('@/types/daily').ExamResult;
  paperById: Map<string, import('@/types/daily').ExamPaper>;
}) {
  const rows = Object.entries(result.marks ?? {}).map(([paperId, marks]) => {
    const paper = paperById.get(paperId);
    return {
      paperId,
      subject: paper?.subjectName ?? 'Subject',
      marks,
      max: paper?.maxMarks,
      pass: paper?.passMarks ?? (paper?.maxMarks != null ? Math.ceil(paper.maxMarks * 0.33) : undefined),
    };
  });
  rows.sort((a, b) => a.subject.localeCompare(b.subject));

  // Derive status from saved field; if absent, recompute from marks rather than
  // defaulting to 'pass' (which would mislead a student whose result was saved
  // before the resultStatus field existed).
  const status: ResultStatus = result.resultStatus ?? (() => {
    if (result.percentage == null) return 'fail';
    const failed = rows.filter((r) => r.pass != null && r.marks < r.pass).length;
    return resultStatusFor(failed, result.percentage);
  })();
  const meta = RESULT_STATUS_META[status];

  return (
    <div className="nx-report__grid">
      {rows.map((r) => {
        const failed = r.pass != null && r.marks < r.pass;
        return (
          <div className="nx-report-row" key={r.paperId}>
            <span className="nx-report-row__sub">{r.subject}</span>
            <span className="nx-report-row__marks" style={failed ? { color: 'var(--danger)' } : undefined}>
              {r.marks}{r.max != null ? ` / ${r.max}` : ''}
            </span>
          </div>
        );
      })}
      <div className="nx-report-foot">
        <div>
          <div className="nx-report-foot__big">{result.percentage != null ? `${result.percentage}%` : '—'}</div>
          <div className="nx-report-foot__lbl">
            {result.total != null ? `Total ${result.total}` : ''}
            {result.percentage != null ? ` · Grade ${letterGrade(result.percentage)}` : ''}
          </div>
        </div>
        <Badge variant={meta.variant}>{meta.label}</Badge>
      </div>
    </div>
  );
}
