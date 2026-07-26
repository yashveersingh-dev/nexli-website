import { useEffect, useMemo, useState } from 'react';
import { deleteDoc } from 'firebase/firestore';
import { tenantDoc } from '@/lib/db';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { Field, Select } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { useSession } from '@/app/providers/SessionProvider';
import { useStudents, useGrades, useSections } from '@/features/school/data';
import { useExamPapers, useExamResults, saveExamResult } from '@/features/daily/data';
import type { Exam, ExamPaper, ExamResult } from '@/types/daily';
import { examResultId, sortPapers } from './shared';
import { letterGrade, resultStatusFor, RESULT_STATUS_META } from './examSchema';

type MarksMap = Record<string, Record<string, number>>; // studentId -> paperId -> marks

function computeRow(papers: ExamPaper[], marks: Record<string, number> | undefined) {
  let total = 0;
  let max = 0;
  let entered = 0;
  let failed = 0;
  for (const p of papers) {
    const pm = p.maxMarks ?? 0;
    const v = marks?.[p.id];
    if (v != null && !Number.isNaN(v)) {
      // Only papers the student actually sat count toward total AND max — otherwise a
      // student who took a partial set of papers is divided by the full datesheet max
      // and looks like a fail. Percentage is over attempted papers only.
      total += v;
      max += pm;
      entered++;
      const pass = p.passMarks ?? Math.ceil(pm * 0.33);
      if (v < pass) failed++;
    }
  }
  const pct = max > 0 ? Math.round((total / max) * 1000) / 10 : 0;
  return { total, max, entered, failed, pct };
}

export function ResultsTab({ exam }: { exam: Exam }) {
  const { schoolId, uid, member, can } = useSession();
  const canWrite = can('exams.write');
  const toast = useToast();

  const { data: papers, loading: pLoading } = useExamPapers(schoolId, exam.id);
  const { data: students, loading: stLoading } = useStudents(schoolId);
  const { data: grades } = useGrades(schoolId);
  const { data: sections } = useSections(schoolId);
  const { data: results } = useExamResults(schoolId, exam.id);

  const [gradeId, setGradeId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [marks, setMarks] = useState<MarksMap>({});
  const [saving, setSaving] = useState(false);

  const actor = { uid: uid ?? 'unknown', name: member?.name };
  const gradeName = (gid?: string) => grades.find((g) => g.id === gid)?.name ?? '';

  const examGrades = useMemo(
    () => grades.filter((g) => !exam.gradeIds?.length || exam.gradeIds.includes(g.id)).sort((a, b) => a.order - b.order),
    [grades, exam.gradeIds],
  );
  // Default the grade selector to the first applicable grade.
  useEffect(() => {
    if (!gradeId && examGrades.length) setGradeId(examGrades[0].id);
  }, [examGrades, gradeId]);

  const gradeSections = useMemo(
    () => sections.filter((s) => s.gradeId === gradeId).sort((a, b) => a.name.localeCompare(b.name)),
    [sections, gradeId],
  );

  // Papers relevant to the chosen grade (papers may be grade-scoped or shared).
  const gradePapers = useMemo(() => {
    const filtered = papers.filter((p) => !p.gradeId || p.gradeId === gradeId);
    return sortPapers(filtered.length ? filtered : papers);
  }, [papers, gradeId]);

  const roster = useMemo(
    () =>
      students
        .filter((s) => s.sectionId === sectionId && s.status === 'active')
        .sort((a, b) => (a.rollNo ?? a.fullName ?? '').localeCompare(b.rollNo ?? b.fullName ?? '', undefined, { numeric: true })),
    [students, sectionId],
  );

  const resultsById = useMemo(() => {
    const m = new Map<string, ExamResult>();
    for (const r of results) m.set(r.studentId, r);
    return m;
  }, [results]);

  // Seed editable marks from saved results whenever the section/roster changes.
  // Use a stable identity key (joined ids) so a same-length roster change
  // (e.g. one student swapped out) still triggers a re-seed.
  const rosterKey = roster.map((s) => s.id).join(',');
  useEffect(() => {
    if (!sectionId) return;
    const seed: MarksMap = {};
    for (const s of roster) {
      const saved = resultsById.get(s.id);
      seed[s.id] = saved ? { ...saved.marks } : {};
    }
    setMarks(seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId, resultsById, rosterKey]);

  const setMark = (studentId: string, paperId: string, raw: string) => {
    setMarks((prev) => {
      const row = { ...(prev[studentId] ?? {}) };
      const t = raw.trim();
      if (t === '') delete row[paperId];
      else row[paperId] = Number(t);
      return { ...prev, [studentId]: row };
    });
  };

  const overMax = useMemo(() => {
    for (const s of roster) {
      const row = marks[s.id] ?? {};
      for (const p of gradePapers) {
        const v = row[p.id];
        if (v != null && !Number.isNaN(v) && (v < 0 || (p.maxMarks != null && v > p.maxMarks))) return true;
      }
    }
    return false;
  }, [marks, roster, gradePapers]);

  const enteredCount = useMemo(
    () => roster.filter((s) => Object.keys(marks[s.id] ?? {}).length > 0).length,
    [roster, marks],
  );

  const save = async () => {
    if (!schoolId || overMax) {
      if (overMax) toast.error('Check marks', 'Some marks are outside 0–max.');
      return;
    }
    setSaving(true);
    try {
      const section = sections.find((s) => s.id === sectionId);
      // Per-student isolation: one failed write must not abort the whole save (the
      // old `Promise.all` rejected on the first error and left the rest unsaved with
      // no record of which succeeded). Settle all, then report any failures.
      const outcomes = await Promise.allSettled(
        roster.map(async (s) => {
          const row = marks[s.id] ?? {};
          const clean: Record<string, number> = {};
          for (const p of gradePapers) {
            const v = row[p.id];
            if (v != null && !Number.isNaN(v)) clean[p.id] = v;
          }
          const resultRef = tenantDoc(schoolId, 'exam_results', examResultId(exam.id, s.id));
          if (Object.keys(clean).length === 0) {
            // Marks were cleared for this student: remove any stale saved result so it
            // doesn't keep showing an old total/percentage (and skew rankings). The
            // previous code returned early and left the old doc behind.
            if (resultsById.has(s.id)) await deleteDoc(resultRef);
            return;
          }
          const { total, failed, pct } = computeRow(gradePapers, clean);
          const status = resultStatusFor(failed, pct);
          const payload: Omit<ExamResult, 'id'> = {
            schoolId,
            examId: exam.id,
            studentId: s.id,
            studentName: s.fullName,
            sectionId,
            gradeName: gradeName(section?.gradeId) || undefined,
            marks: clean,
            total,
            percentage: pct,
            resultStatus: status,
          };
          await saveExamResult(schoolId, examResultId(exam.id, s.id), payload, actor);
        }),
      );
      const failures = outcomes.filter((o) => o.status === 'rejected').length;
      if (failures > 0) {
        toast.error('Some results did not save', `${failures} of ${roster.length} failed — they'll retry when back online.`);
      } else {
        toast.success('Results saved', `${enteredCount}/${roster.length} students`);
      }
    } catch {
      toast.error('Could not save', 'It will sync when you are back online.');
    } finally {
      setSaving(false);
    }
  };

  if (pLoading) return <Skeleton height={300} />;

  if (papers.length === 0) {
    return <EmptyState icon="calendar" title="Add papers first" message="Build the datesheet on the Datesheet tab before entering results." />;
  }
  if (examGrades.length === 0) {
    return <EmptyState icon="award" title="No grades assigned" message="Edit this exam to assign grades, then enter results." />;
  }

  return (
    <div>
      <div className="nx-exam-pickrow">
        <Field label="Grade">
          <Select value={gradeId} onChange={(e) => { setGradeId(e.target.value); setSectionId(''); }}
            options={examGrades.map((g) => ({ value: g.id, label: g.name }))} />
        </Field>
        <Field label="Section">
          <Select value={sectionId} onChange={(e) => setSectionId(e.target.value)} placeholder="Select a section"
            options={gradeSections.map((s) => ({ value: s.id, label: `${gradeName(s.gradeId)} ${s.name}`.trim() }))} />
        </Field>
      </div>

      {!sectionId ? (
        <EmptyState icon="users" title="Pick a section" message="Choose a grade and section to enter or review results." />
      ) : stLoading ? (
        <Skeleton height={300} />
      ) : roster.length === 0 ? (
        <EmptyState icon="users" title="No students in this section" message="Assign active students to this section to enter results." />
      ) : gradePapers.length === 0 ? (
        <EmptyState icon="calendar" title="No papers for this grade" message="Add papers for this grade on the Datesheet tab." />
      ) : (
        <>
          <Panel bodyClassName="nx-res-table-wrap">
            <table className="nx-res-table">
              <thead>
                <tr>
                  <th className="nx-res-name" scope="col">Student</th>
                  {gradePapers.map((p) => (
                    <th key={p.id} scope="col" title={p.subjectName ?? ''}>
                      <div>{p.subjectName ?? '—'}</div>
                      <div style={{ fontWeight: 400, fontSize: 11, color: 'var(--text-muted)' }}>/{p.maxMarks ?? '?'}</div>
                    </th>
                  ))}
                  <th scope="col">Total</th>
                  <th scope="col">%</th>
                  <th scope="col">Grade</th>
                  <th scope="col">Result</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((s, i) => {
                  const row = marks[s.id] ?? {};
                  const { total, max, entered, failed, pct } = computeRow(gradePapers, row);
                  const status = entered > 0 ? resultStatusFor(failed, pct) : undefined;
                  return (
                    <tr key={s.id}>
                      <td className="nx-res-name">
                        <span style={{ fontWeight: 600 }}>{s.fullName}</span>
                        <span style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)' }}>Roll {s.rollNo || i + 1}</span>
                      </td>
                      {gradePapers.map((p) => {
                        const v = row[p.id];
                        const invalid = v != null && !Number.isNaN(v) && (v < 0 || (p.maxMarks != null && v > p.maxMarks));
                        return (
                          <td key={p.id}>
                            <input
                              type="number"
                              inputMode="numeric"
                              className={`nx-res-input${invalid ? ' is-invalid' : ''}`}
                              min={0}
                              max={p.maxMarks}
                              disabled={!canWrite}
                              value={v ?? ''}
                              onChange={(e) => setMark(s.id, p.id, e.target.value)}
                              aria-label={`${s.fullName} — ${p.subjectName ?? 'paper'}, out of ${p.maxMarks ?? '?'}`}
                              aria-invalid={invalid || undefined}
                            />
                          </td>
                        );
                      })}
                      <td className="nx-res-table__total">{entered > 0 ? `${total}/${max}` : '—'}</td>
                      <td>{entered > 0 ? `${pct}%` : '—'}</td>
                      <td>{entered > 0 ? letterGrade(pct) : '—'}</td>
                      <td>{status ? <Badge variant={RESULT_STATUS_META[status].variant}>{RESULT_STATUS_META[status].label}</Badge> : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Panel>
          <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 8 }}>
            Pass mark defaults to a paper's own pass marks (or 33% of max). 1–2 failed subjects → Compartment, 3+ → Fail.
          </p>

          {canWrite && (
            <div className="nx-savebar">
              <div className="nx-savebar__inner">
                <div className="nx-savebar__left">
                  <span style={{ fontSize: 12.5, color: overMax ? 'var(--danger)' : 'var(--text-muted)' }}>
                    {overMax ? 'Some marks are outside 0–max' : `${enteredCount} of ${roster.length} students entered`}
                  </span>
                </div>
                <div className="nx-savebar__right">
                  <Button variant="gold" leftIcon="check" loading={saving} disabled={overMax} onClick={save}>Save results</Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
