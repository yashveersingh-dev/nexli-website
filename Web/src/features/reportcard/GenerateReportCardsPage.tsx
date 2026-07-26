import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Panel } from '@/components/Panel';
import { Icon } from '@/components/Icon';
import { Field, Select, Input } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { RESULT_STATUS_META } from '@/features/examinations/examSchema';
import { useSession } from '@/app/providers/SessionProvider';
import {
  useReportCards, useSchemes, generateReportCards, buildBatch, reportCardId, type Actor,
  useStudents, useGrades, useSections, useExams, useAllExamPapers, useAllExamResults, useAllAttendance,
} from './data';
import { SEED_SCHEMES } from './schemes';
import type { ReportCardScheme } from '@/types/reportcard';
import './reportcard.css';

/**
 * Lower-bound `date` (`'yyyy-mm-dd'`) for the attendance read backing a report
 * card. Cards are scoped to one academic year, and `ReportCardTerm` carries no
 * date bounds, so the correct (and read-bounding) window is that academic year —
 * not all of history. Indian sessions run Apr→Mar, so we take Apr 1 of the
 * session's start year. Accepts "2025-26", "2025/26" or a bare "2025"; falls
 * back to Apr 1 of the prior year when the string can't be parsed (keeps a full
 * session of data rather than risk clipping it).
 */
function academicYearStart(academicYear: string): string {
  const m = academicYear.match(/\d{4}/);
  const startYear = m ? Number(m[0]) : new Date().getFullYear() - 1;
  return `${startYear}-04-01`;
}

/**
 * Generate flow: pick a scheme + class/section + term → preview the auto-filled
 * batch (each row = a student with computed totals / grade / result / rank) →
 * "Create drafts". Existing cards are never overwritten.
 */
export function GenerateReportCardsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member, can } = useSession();
  const canWrite = can('gradebook.write') || can('exams.write');
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };

  // Academic year drives the attendance window below, so it (and its state) is
  // declared before the attendance read. Accepts free text like "2025-26".
  const [year, setYear] = useState('');
  const academicYear = year.trim() || `${new Date().getFullYear()}`;

  const { data: schemes, loading: schemesLoading } = useSchemes(schoolId);
  const { data: students, loading: sLoading } = useStudents(schoolId);
  const { data: grades } = useGrades(schoolId);
  const { data: sections } = useSections(schoolId);
  const { data: exams } = useExams(schoolId);
  const { data: papers } = useAllExamPapers(schoolId);
  const { data: results } = useAllExamResults(schoolId);
  // Scope attendance to the card's academic year (Apr→Mar) rather than reading
  // all history; the term's recorded days are a subset of that window.
  const { data: attendance } = useAllAttendance(schoolId, { since: academicYearStart(academicYear) });
  const { data: existingCards } = useReportCards(schoolId);

  // Schemes available = persisted + any seed not yet persisted (so generation works day one).
  const allSchemes: ReportCardScheme[] = useMemo(() => {
    const byId = new Map<string, ReportCardScheme>();
    for (const s of SEED_SCHEMES) byId.set(s.id, { ...s, schoolId: schoolId ?? '' });
    for (const s of schemes) byId.set(s.id, s);
    return [...byId.values()];
  }, [schemes, schoolId]);

  const [schemeId, setSchemeId] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [term, setTerm] = useState('');
  const [running, setRunning] = useState(false);

  const scheme = allSchemes.find((s) => s.id === schemeId);

  const sectionOptions = useMemo(
    () => [
      { value: '', label: 'All sections' },
      ...sections.filter((s) => (gradeId ? s.gradeId === gradeId : true)).map((s) => ({ value: s.id, label: s.name })),
    ],
    [sections, gradeId],
  );

  const gradeName = grades.find((g) => g.id === gradeId)?.name;

  const targetStudents = useMemo(
    () =>
      students.filter(
        (s) => s.status === 'active' && (gradeId ? s.gradeId === gradeId : true) && (sectionId ? s.sectionId === sectionId : true),
      ),
    [students, gradeId, sectionId],
  );

  // In-scope exams/papers/attendance for the preview computation.
  const scopedPapers = useMemo(() => {
    if (!gradeName) return papers;
    return papers.filter((p) => !p.gradeName || p.gradeName === gradeName);
  }, [papers, gradeName]);

  const scopedAttendance = useMemo(() => {
    if (!sectionId) return attendance;
    return attendance.filter((a) => a.sectionId === sectionId);
  }, [attendance, sectionId]);

  const preview = useMemo(() => {
    if (!scheme || !term || targetStudents.length === 0) return [];
    return buildBatch({
      scheme: { ...scheme, schoolId: schoolId ?? '' },
      term,
      students: targetStudents,
      exams,
      papers: scopedPapers,
      results,
      attendance: scopedAttendance,
      academicYear,
    });
  }, [scheme, term, targetStudents, exams, scopedPapers, results, scopedAttendance, academicYear, schoolId]);

  const existingIds = useMemo(
    () => new Set(existingCards.map((c) => reportCardId(c.studentId, c.academicYear, c.term))),
    [existingCards],
  );

  if (!canWrite) {
    return (
      <div className="nx-page">
        <Panel><EmptyState icon="lock" title="Not allowed" message="You don't have permission to generate report cards." /></Panel>
      </div>
    );
  }
  if (schemesLoading || sLoading) {
    return <div className="nx-page"><Skeleton height={48} /><Skeleton height={300} /></div>;
  }

  const run = async () => {
    if (!schoolId || !scheme) { toast.error('Pick a scheme', 'Choose a grading scheme first.'); return; }
    if (!term) { toast.error('Pick a term', 'Choose the term to generate for.'); return; }
    if (targetStudents.length === 0) { toast.error('No active students', 'No active students match that class.'); return; }
    setRunning(true);
    try {
      const res = await generateReportCards(
        schoolId,
        {
          scheme: { ...scheme, schoolId },
          term,
          students: targetStudents,
          exams,
          papers: scopedPapers,
          results,
          attendance: scopedAttendance,
          academicYear,
        },
        existingCards,
        actor,
      );
      toast.success(
        res.created ? `Created ${res.created} draft card${res.created === 1 ? '' : 's'}` : 'Nothing to create',
        res.skipped ? `${res.skipped} already existed and were left untouched.` : undefined,
      );
      navigate('/report-cards');
    } catch {
      toast.error('Could not generate', 'Please try again.');
    } finally {
      setRunning(false);
    }
  };

  const newCount = preview.filter((c) => !existingIds.has(reportCardId(c.studentId, c.academicYear, c.term))).length;

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Generate report cards</h1>
          <p className="nx-page__sub">Pick a scheme, class and term. Cards auto-fill from exam marks &amp; attendance — preview, then create drafts.</p>
        </div>
        <Button variant="ghost" leftIcon="chevron-left" onClick={() => navigate('/report-cards')}>Back</Button>
      </div>

      <Panel title="Scope">
        <div className="rc-grid">
          <Field label="Scheme" required htmlFor="rc-gen-scheme">
            <Select id="rc-gen-scheme" value={schemeId} placeholder="Select a scheme"
              options={allSchemes.map((s) => ({ value: s.id, label: `${s.name} (${s.board})` }))}
              onChange={(e) => { setSchemeId(e.target.value); setTerm(''); }} />
          </Field>
          <Field label="Term" required htmlFor="rc-gen-term">
            <Select id="rc-gen-term" value={term} placeholder={scheme ? 'Select a term' : 'Pick a scheme first'}
              disabled={!scheme}
              options={(scheme?.terms ?? []).map((t) => ({ value: t.id, label: t.label }))}
              onChange={(e) => setTerm(e.target.value)} />
          </Field>
          <Field label="Class" htmlFor="rc-gen-grade">
            <Select id="rc-gen-grade" value={gradeId} placeholder="All classes"
              options={[{ value: '', label: 'All classes' }, ...grades.map((g) => ({ value: g.id, label: g.name }))]}
              onChange={(e) => { setGradeId(e.target.value); setSectionId(''); }} />
          </Field>
          <Field label="Section" htmlFor="rc-gen-section">
            <Select id="rc-gen-section" value={sectionId} options={sectionOptions} onChange={(e) => setSectionId(e.target.value)} />
          </Field>
          <Field label="Academic year" htmlFor="rc-gen-year">
            <Input id="rc-gen-year" value={year} placeholder="2025-26" onChange={(e) => setYear(e.target.value)} />
          </Field>
        </div>
        <p className="rc-note">
          <Icon name="info" size={14} />
          {scheme && term
            ? `${targetStudents.length} active student${targetStudents.length === 1 ? '' : 's'} in scope · ${newCount} new draft${newCount === 1 ? '' : 's'} to create (existing cards are skipped).`
            : 'Pick a scheme and term to preview the batch. Cards auto-fill from existing exam marks and attendance.'}
        </p>
        <Button variant="gold" leftIcon="plus" loading={running} disabled={!scheme || !term || newCount === 0} onClick={run}>
          Create {newCount || ''} draft{newCount === 1 ? '' : 's'}
        </Button>
      </Panel>

      <Panel title="Preview" sub={scheme && term ? `${scheme.name} · ${scheme.terms.find((t) => t.id === term)?.label ?? term}` : undefined}>
        {!scheme || !term ? (
          <EmptyState icon="bar-chart" title="Nothing to preview yet" message="Choose a scheme and term above to see the auto-filled batch." />
        ) : preview.length === 0 ? (
          <EmptyState icon="users" title="No students in scope" message="No active students match the selected class and section." />
        ) : (
          <div className="rc-table-wrap">
            <table className="rc-preview-table">
              <thead>
                <tr>
                  <th>#</th><th>Student</th><th>Class</th>
                  <th>Total</th><th>%</th><th>Result</th>
                  {scheme.showRank && <th>Rank</th>}
                  <th>Attendance</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((c, i) => {
                  const isNew = !existingIds.has(reportCardId(c.studentId, c.academicYear, c.term));
                  return (
                    <tr key={c.studentId}>
                      <td>{i + 1}</td>
                      <td>{c.studentName}</td>
                      <td>{[c.gradeName, c.sectionName].filter(Boolean).join(' · ') || '—'}</td>
                      <td>{c.totals.max > 0 ? `${c.totals.obtained} / ${c.totals.max}` : '—'}</td>
                      <td>{c.totals.max > 0 ? `${c.totals.percentage}%` : '—'}</td>
                      <td>{c.totals.max > 0 ? <Badge variant={RESULT_STATUS_META[c.result].variant}>{RESULT_STATUS_META[c.result].label}</Badge> : '—'}</td>
                      {scheme.showRank && <td>{c.rank ?? '—'}</td>}
                      <td>{c.attendance ? `${c.attendance.pct}%` : '—'}</td>
                      <td>{isNew ? <Badge variant="info">New</Badge> : <Badge variant="muted">Exists</Badge>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {scheme && term && preview.length > 0 && preview.every((c) => c.totals.max === 0) && (
          <p className="rc-note">
            <Icon name="info" size={14} />
            No exam marks were found for this class/term, so totals compute as zero. Cards are still created as drafts — enter marks in the editor or once exams are graded, regenerate.
          </p>
        )}
      </Panel>
    </div>
  );
}
