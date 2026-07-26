import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { Badge } from '@/components/Badge';
import { Field, Select } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { useSession } from '@/app/providers/SessionProvider';
import { useBoardResults, type BoardResult } from './data';
import {
  groupResultsByStudent,
  distinctValues,
  buildStatementModel,
  statementSubtitle,
  buildStatementHtml,
  openPrintWindow,
  writeStatementWindow,
} from './statement';

/**
 * Board-result VIEWER: pick a student (optionally filtered by board / year /
 * exam) and see that student's board exam(s) — subject-by-subject marks, totals,
 * percentage and result — with a printable "Statement of Marks". Read-only; the
 * import wizard on the sibling tab is the only writer.
 */
export function BoardResultViewer() {
  const toast = useToast();
  const { schoolId, school } = useSession();
  const { data: results, loading, error } = useBoardResults(schoolId);

  const [board, setBoard] = useState('');
  const [year, setYear] = useState('');
  const [exam, setExam] = useState('');
  const [studentKey, setStudentKey] = useState('');

  // Distinct filter options come from the FULL result set (so a filter never
  // hides the option that would re-include its own rows).
  const boards = useMemo(() => distinctValues(results, 'board'), [results]);
  const years = useMemo(() => distinctValues(results, 'year'), [results]);
  const exams = useMemo(() => distinctValues(results, 'examName'), [results]);

  // Results passing the active board/year/exam filters.
  const filtered = useMemo(
    () =>
      results.filter(
        (r) =>
          (!board || r.board === board) &&
          (!year || r.year === year) &&
          (!exam || r.examName === exam),
      ),
    [results, board, year, exam],
  );

  const groups = useMemo(() => groupResultsByStudent(filtered), [filtered]);

  // Keep the selected student valid as filters change; default to the first.
  useEffect(() => {
    if (groups.length === 0) {
      if (studentKey) setStudentKey('');
      return;
    }
    if (!groups.some((g) => g.key === studentKey)) setStudentKey(groups[0].key);
  }, [groups, studentKey]);

  const group = useMemo(() => groups.find((g) => g.key === studentKey), [groups, studentKey]);

  const schoolLocation = [school?.city, school?.state].filter(Boolean).join(', ');

  const print = (result: BoardResult) => {
    // Open SYNCHRONOUSLY (no await before this) so the popup blocker treats it as
    // user-initiated — same contract as certificates/print.ts.
    const win = openPrintWindow();
    if (!win) {
      toast.error('Pop-up blocked', 'Allow pop-ups for this site to print the statement.');
      return;
    }
    const model = buildStatementModel(
      result,
      { name: school?.name, location: schoolLocation, logoUrl: school?.logoUrl },
      new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    );
    writeStatementWindow(win, buildStatementHtml(model));
  };

  if (loading) return <Skeleton height={320} />;
  if (error) return <EmptyState icon="alert-triangle" title="Could not load board results" message="Please try again." />;
  if (results.length === 0) {
    return (
      <EmptyState
        icon="award"
        title="No board results yet"
        message="Import an external CBSE / ICSE / State result sheet on the Import tab to view per-student statements here."
      />
    );
  }

  return (
    <div>
      <div className="nx-brs-filters">
        <Field label="Board">
          <Select value={board} onChange={(e) => setBoard(e.target.value)} placeholder="All boards"
            options={boards.map((b) => ({ value: b, label: b }))} />
        </Field>
        <Field label="Exam">
          <Select value={exam} onChange={(e) => setExam(e.target.value)} placeholder="All exams"
            options={exams.map((x) => ({ value: x, label: x }))} />
        </Field>
        <Field label="Year">
          <Select value={year} onChange={(e) => setYear(e.target.value)} placeholder="All years"
            options={years.map((y) => ({ value: y, label: y }))} />
        </Field>
        <Field label="Student">
          <Select
            value={studentKey}
            onChange={(e) => setStudentKey(e.target.value)}
            placeholder={groups.length ? undefined : 'No matching students'}
            disabled={groups.length === 0}
            options={groups.map((g) => ({
              value: g.key,
              label: g.admissionNo ? `${g.studentName} · ${g.admissionNo}` : g.studentName,
            }))}
          />
        </Field>
      </div>

      {!group ? (
        <EmptyState icon="users" title="No matching students" message="Adjust the board / exam / year filters above." />
      ) : (
        <div className="nx-brs-results">
          {group.results.map((r) => {
            const subtitle = statementSubtitle(r);
            return (
              <Panel
                key={r.id}
                title={group.studentName}
                sub={subtitle || undefined}
                headerRight={
                  <div className="nx-brs-result__head">
                    <Badge variant={r.result === 'pass' ? 'success' : 'danger'}>
                      {r.result === 'pass' ? 'Pass' : 'Fail'}
                    </Badge>
                    <Button variant="ghost" size="sm" leftIcon="download" onClick={() => print(r)}>
                      Print statement
                    </Button>
                  </div>
                }
              >
                <div className="nx-res-table-wrap">
                  <table className="nx-res-table">
                    <thead>
                      <tr>
                        <th className="nx-res-name" scope="col">Subject</th>
                        <th scope="col">Max</th>
                        <th scope="col">Marks</th>
                        <th scope="col">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.subjects.map((s, i) => (
                        <tr key={`${s.name}-${i}`}>
                          <td className="nx-res-name">{s.name}</td>
                          <td>{s.maxMarks > 0 ? s.maxMarks : '—'}</td>
                          <td className="nx-res-table__total">{s.marks}</td>
                          <td>{s.grade?.trim() || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="nx-brs-totals">
                  <div className="nx-brs-totals__item">
                    <span className="nx-brs-totals__lbl">Total</span>
                    <span className="nx-brs-totals__val">{r.totalMax > 0 ? `${r.totalMarks} / ${r.totalMax}` : '—'}</span>
                  </div>
                  <div className="nx-brs-totals__item">
                    <span className="nx-brs-totals__lbl">Percentage</span>
                    <span className="nx-brs-totals__val">{r.totalMax > 0 ? `${r.percentage}%` : '—'}</span>
                  </div>
                  <div className="nx-brs-totals__item">
                    <span className="nx-brs-totals__lbl">Result</span>
                    <Badge variant={r.result === 'pass' ? 'success' : 'danger'}>
                      {r.result === 'pass' ? 'Pass' : 'Fail'}
                    </Badge>
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}
