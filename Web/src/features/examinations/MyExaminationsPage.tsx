import { useMemo } from 'react';
import { Badge } from '@/components/Badge';
import { Panel } from '@/components/Panel';
import { Tabs } from '@/components/Tabs';
import { Icon } from '@/components/Icon';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useSession } from '@/app/providers/SessionProvider';
import { useStudentsByIds } from '@/features/school/data';
import { useExams } from '@/features/daily/data';
import type { Student } from '@/types/sis';
import type { Exam } from '@/types/daily';
import { ChildExams } from './ChildExams';
import './examinations.css';

export function MyExaminationsPage() {
  const { schoolId, role, member } = useSession();
  const { data: exams, loading: eLoading } = useExams(schoolId);

  const childIds = useMemo<string[]>(() => {
    if (role === 'student') return member?.studentId ? [member.studentId] : [];
    return member?.childStudentIds ?? [];
  }, [role, member]);

  // Own-record scoping: families can't list the whole students collection (rules
  // deny it) — fetch only the linked child docs by id.
  const { data: children, loading: sLoading } = useStudentsByIds(schoolId, childIds);
  const published = useMemo(() => exams.filter((e) => e.published), [exams]);

  if (sLoading || eLoading) {
    return <div className="nx-page"><Skeleton height={48} /><Panel><Skeleton height={220} /></Panel></div>;
  }

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Examinations</h1>
          <p className="nx-page__sub">{role === 'student' ? 'Your datesheet and results.' : "Your children's datesheets and results."}</p>
        </div>
      </div>

      {childIds.length === 0 ? (
        <Panel>
          <EmptyState icon="file-text" title="Account not linked" message="Exam datesheets and results appear here once your school links your account to a student." />
        </Panel>
      ) : children.length === 0 ? (
        <Panel>
          <EmptyState icon="file-text" title="No student found" message="We couldn't find a linked student record yet. Please contact your school office." />
        </Panel>
      ) : published.length === 0 ? (
        <Panel>
          <EmptyState icon="file-text" title="Nothing published yet" message="When your school publishes an exam, its datesheet and results will show up here." />
        </Panel>
      ) : children.length === 1 ? (
        <ChildExamsView student={children[0]} exams={published} single />
      ) : (
        <Tabs
          variant="pill"
          aria-label="Select child"
          tabs={children.map((c) => ({ id: c.id, label: c.fullName.split(' ')[0] }))}
        >
          {(activeId) => {
            const child = children.find((c) => c.id === activeId);
            return child ? <ChildExamsView student={child} exams={published} /> : null;
          }}
        </Tabs>
      )}
    </div>
  );
}

function ChildExamsView({ student, exams, single }: { student: Student; exams: Exam[]; single?: boolean }) {
  // Only exams that include the student's grade (or that target no grade in particular).
  const relevant = useMemo(
    () =>
      exams
        .filter((e) => !e.gradeIds?.length || (student.gradeId ? e.gradeIds.includes(student.gradeId) : false))
        .sort((a, b) => (b.startDate ?? b.createdAt ?? 0) - (a.startDate ?? a.createdAt ?? 0)),
    [exams, student.gradeId],
  );

  if (relevant.length === 0) {
    return (
      <Panel title={single ? undefined : student.fullName}>
        <EmptyState icon="file-text" title="No exams for this class yet" message={`Nothing has been published for ${student.gradeName ?? 'this class'} so far.`} />
      </Panel>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {!single && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="user" size={16} />
          <span style={{ fontWeight: 600 }}>{student.fullName}</span>
          {student.gradeName && <Badge variant="muted">{student.gradeName} {student.sectionName ?? ''}</Badge>}
        </div>
      )}
      {relevant.map((exam) => <ChildExams key={exam.id} exam={exam} student={student} />)}
    </div>
  );
}
