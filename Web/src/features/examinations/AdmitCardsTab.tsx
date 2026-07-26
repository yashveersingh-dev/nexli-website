import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Field, Select } from '@/components/form';
import { Icon } from '@/components/Icon';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useSession } from '@/app/providers/SessionProvider';
import { useStudents, useGrades, useSections } from '@/features/school/data';
import { useExamPapers } from '@/features/daily/data';
import { formatDate } from '@/lib/format';
import type { Exam } from '@/types/daily';
import { sortPapers, endTimeLabel, dateRangeLabel } from './shared';

export function AdmitCardsTab({ exam }: { exam: Exam }) {
  const { schoolId, school } = useSession();
  const { data: papers, loading: pLoading } = useExamPapers(schoolId, exam.id);
  const { data: students } = useStudents(schoolId);
  const { data: grades } = useGrades(schoolId);
  const { data: sections } = useSections(schoolId);

  const [gradeId, setGradeId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [studentId, setStudentId] = useState('');

  const gradeName = (gid?: string) => grades.find((g) => g.id === gid)?.name ?? '';

  const examGrades = useMemo(
    () => grades.filter((g) => !exam.gradeIds?.length || exam.gradeIds.includes(g.id)).sort((a, b) => a.order - b.order),
    [grades, exam.gradeIds],
  );
  useEffect(() => { if (!gradeId && examGrades.length) setGradeId(examGrades[0].id); }, [examGrades, gradeId]);

  const gradeSections = useMemo(() => sections.filter((s) => s.gradeId === gradeId).sort((a, b) => a.name.localeCompare(b.name)), [sections, gradeId]);
  const roster = useMemo(
    () => students.filter((s) => s.sectionId === sectionId && s.status === 'active')
      .sort((a, b) => (a.rollNo ?? a.fullName ?? '').localeCompare(b.rollNo ?? b.fullName ?? '', undefined, { numeric: true })),
    [students, sectionId],
  );
  const student = roster.find((s) => s.id === studentId);

  const gradePapers = useMemo(() => {
    const filtered = papers.filter((p) => !p.gradeId || p.gradeId === gradeId);
    return sortPapers(filtered.length ? filtered : papers);
  }, [papers, gradeId]);

  if (pLoading) return <Skeleton height={280} />;
  if (papers.length === 0) {
    return <EmptyState icon="calendar" title="No datesheet yet" message="Add papers on the Datesheet tab to generate hall tickets." />;
  }
  if (examGrades.length === 0) {
    return <EmptyState icon="award" title="No grades assigned" message="Edit this exam to assign grades." />;
  }

  return (
    <div>
      <div className="nx-exam-pickrow" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        <Field label="Grade">
          <Select value={gradeId} onChange={(e) => { setGradeId(e.target.value); setSectionId(''); setStudentId(''); }}
            options={examGrades.map((g) => ({ value: g.id, label: g.name }))} />
        </Field>
        <Field label="Section">
          <Select value={sectionId} onChange={(e) => { setSectionId(e.target.value); setStudentId(''); }} placeholder="Select section"
            options={gradeSections.map((s) => ({ value: s.id, label: `${gradeName(s.gradeId)} ${s.name}`.trim() }))} />
        </Field>
        <Field label="Student">
          <Select value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="Select student"
            options={roster.map((s) => ({ value: s.id, label: `${s.rollNo ? `${s.rollNo} · ` : ''}${s.fullName}` }))} disabled={!sectionId} />
        </Field>
      </div>

      {!student ? (
        <EmptyState icon="user" title="Pick a student" message="Choose a student to view their hall ticket and datesheet." />
      ) : (
        <div className="nx-ticket">
          <div className="nx-ticket__head">
            <div style={{ minWidth: 0 }}>
              <div className="nx-ticket__title">{school?.name ?? 'School'}</div>
              <div className="nx-ticket__sub">{exam.name}{exam.academicYear ? ` · ${exam.academicYear}` : ''} · Hall Ticket</div>
            </div>
            <Button variant="subtle" size="sm" leftIcon="download" onClick={() => window.print()}>Print</Button>
          </div>

          <div className="nx-kv" style={{ marginTop: 12 }}>
            <span className="nx-kv__k">Student</span>
            <span className="nx-kv__v">{student.fullName}</span>
          </div>
          <div className="nx-kv">
            <span className="nx-kv__k">Roll / Admission no.</span>
            <span className="nx-kv__v">{student.rollNo || '—'} / {student.admissionNo}</span>
          </div>
          <div className="nx-kv">
            <span className="nx-kv__k">Class</span>
            <span className="nx-kv__v">{gradeName(student.gradeId) || student.gradeName || '—'} {student.sectionName ?? ''}</span>
          </div>
          <div className="nx-kv">
            <span className="nx-kv__k">Exam dates</span>
            <span className="nx-kv__v">{dateRangeLabel(exam.startDate, exam.endDate, (ts) => formatDate(ts))}</span>
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Datesheet</div>
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
          </div>
        </div>
      )}
    </div>
  );
}
