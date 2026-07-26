import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { Input, Toggle } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useStudents, useGrades, useSections } from '@/features/school/data';
import { useScopedSectionIds } from '@/features/academics/shared';
import { useAssessments, useAssessmentResult, saveAssessmentResult, updateAssessment } from '@/features/daily/data';
import { ASSESSMENT_TYPE_OPTIONS } from '@/features/daily/meta';
import { formatDate } from '@/lib/format';
import type { AssessmentMark } from '@/types/daily';
import { letterGrade, PASS_PERCENT } from './assessmentSchema';
import './gradebook.css';

const typeLabel = (t: string) => ASSESSMENT_TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t;

export function MarksEntryPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const canWrite = useOwnership('gradebook').canOperate;

  const { data: assessments, loading: aLoading } = useAssessments(schoolId);
  const assessment = assessments.find((a) => a.id === id);
  const { data: result } = useAssessmentResult(schoolId, id);
  const { data: students, loading: sLoading } = useStudents(schoolId);
  const { data: grades } = useGrades(schoolId);
  const { data: sections } = useSections(schoolId);
  const { isBroad, sectionIds } = useScopedSectionIds('gradebook', 'gradebook.read', sections);

  const [entries, setEntries] = useState<Record<string, AssessmentMark>>({});
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const sectionId = assessment?.sectionId ?? '';
  const maxMarks = assessment?.maxMarks ?? 100;

  const roster = useMemo(
    () =>
      students
        .filter((s) => s.sectionId === sectionId && s.status === 'active')
        .sort((a, b) => (a.rollNo ?? a.fullName ?? '').localeCompare(b.rollNo ?? b.fullName ?? '', undefined, { numeric: true })),
    [students, sectionId],
  );

  // Seed entries from the saved result once data is available.
  // Use a stable identity key (joined ids) so a same-length roster change
  // (e.g. one student swapped out) still triggers a re-seed.
  const rosterKey = roster.map((s) => s.id).join(',');
  useEffect(() => {
    if (!sectionId) return;
    const seed: Record<string, AssessmentMark> = {};
    for (const s of roster) seed[s.id] = result?.entries?.[s.id] ?? {};
    setEntries(seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId, result, rosterKey]);

  const gradeName = (gid?: string) => grades.find((g) => g.id === gid)?.name;
  const sectionLabel = useMemo(() => {
    const s = sections.find((x) => x.id === sectionId);
    return assessment?.sectionName || (s ? `${gradeName(s.gradeId) ?? ''} ${s.name}`.trim() : '');
  }, [sections, sectionId, assessment, grades]);

  const setMark = (studentId: string, marksRaw: string) => {
    const trimmed = marksRaw.trim();
    const marks = trimmed === '' ? null : Number(trimmed);
    setEntries((e) => {
      const prev = e[studentId] ?? {};
      const next: AssessmentMark = { ...prev, absent: false, marks };
      if (marks != null && !Number.isNaN(marks)) next.grade = letterGrade((marks / maxMarks) * 100);
      else next.grade = undefined;
      return { ...e, [studentId]: next };
    });
  };

  const toggleAbsent = (studentId: string, absent: boolean) => {
    setEntries((e) => ({ ...e, [studentId]: absent ? { absent: true, marks: null } : { absent: false, marks: null } }));
  };

  const stats = useMemo(() => {
    const scored: number[] = [];
    let absent = 0;
    let entered = 0;
    let pass = 0;
    for (const s of roster) {
      const m = entries[s.id];
      if (!m) continue;
      if (m.absent) { absent++; continue; }
      if (m.marks != null && !Number.isNaN(m.marks)) {
        scored.push(m.marks);
        entered++;
        if ((m.marks / maxMarks) * 100 >= PASS_PERCENT) pass++;
      }
    }
    const avg = scored.length ? scored.reduce((a, b) => a + b, 0) / scored.length : 0;
    const high = scored.length ? Math.max(...scored) : 0;
    return {
      avg, high, entered, absent,
      passPct: entered ? Math.round((pass / entered) * 100) : 0,
    };
  }, [entries, roster, maxMarks]);

  const overMax = roster.some((s) => {
    const m = entries[s.id];
    return m && !m.absent && m.marks != null && !Number.isNaN(m.marks) && (m.marks < 0 || m.marks > maxMarks);
  });

  const actor = { uid: uid ?? 'unknown', name: member?.name };

  const save = async () => {
    if (!schoolId || !assessment) return;
    if (overMax) {
      toast.error('Check marks', `Marks must be between 0 and ${maxMarks}.`);
      return;
    }
    setSaving(true);
    try {
      const clean: Record<string, AssessmentMark> = {};
      for (const s of roster) {
        const m = entries[s.id];
        if (!m) continue;
        if (m.absent) clean[s.id] = { absent: true, marks: null };
        else if (m.marks != null && !Number.isNaN(m.marks)) clean[s.id] = { marks: m.marks, grade: m.grade };
      }
      await saveAssessmentResult(schoolId, assessment.id, { schoolId, assessmentId: assessment.id, sectionId, entries: clean }, actor);
      toast.success('Marks saved', `${stats.entered}/${roster.length} entered`);
    } catch {
      toast.error('Could not save', 'It will sync when you are back online.');
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async () => {
    if (!schoolId || !assessment) return;
    setPublishing(true);
    try {
      await updateAssessment(schoolId, assessment.id, { published: !assessment.published }, actor);
      toast.success(assessment.published ? 'Unpublished' : 'Published', assessment.name);
    } catch {
      toast.error('Could not update', 'Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  if (aLoading) return <div className="nx-page"><Skeleton height={360} /></div>;
  if (!assessment) {
    return (
      <div className="nx-page">
        <EmptyState icon="file-text" title="Assessment not found" action={<Button variant="subtle" onClick={() => navigate('/gradebook')}>Back to gradebook</Button>} />
      </div>
    );
  }
  // Scope guard: a scoped teacher must not open marks for another section's assessment.
  if (!isBroad && (!assessment.sectionId || !sectionIds!.has(assessment.sectionId))) {
    return (
      <div className="nx-page">
        <EmptyState icon="lock" title="Not your section" message="You can only enter marks for the section(s) you are assigned." action={<Button variant="subtle" onClick={() => navigate('/gradebook')}>Back to gradebook</Button>} />
      </div>
    );
  }

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <Button variant="ghost" size="sm" leftIcon="chevron-left" onClick={() => navigate('/gradebook')}>Back to gradebook</Button>
      </div>

      <Panel>
        <div className="nx-gb-head">
          <div style={{ minWidth: 0 }}>
            <h1 className="nx-page__title" style={{ marginBottom: 4 }}>{assessment.name}</h1>
            <div className="nx-gb-meta">
              <Badge variant="info">{typeLabel(assessment.type)}</Badge>
              {assessment.subjectName && <span className="nx-gb-meta__item">{assessment.subjectName}</span>}
              {sectionLabel && <span className="nx-gb-meta__item">{sectionLabel}</span>}
              <span className="nx-gb-meta__item">Max {assessment.maxMarks}</span>
              {assessment.date && <span className="nx-gb-meta__item">{formatDate(assessment.date)}</span>}
            </div>
          </div>
          <div className="nx-gb-publish">
            <Badge variant={assessment.published ? 'success' : 'muted'}>{assessment.published ? 'Published' : 'Draft'}</Badge>
            {canWrite && (
              <Toggle
                checked={!!assessment.published}
                onChange={togglePublish}
                disabled={publishing}
                label="Publish"
                aria-label="Publish assessment"
              />
            )}
          </div>
        </div>
      </Panel>

      {sLoading ? (
        <Panel><Skeleton height={300} /></Panel>
      ) : roster.length === 0 ? (
        <Panel><EmptyState icon="users" title="No students in this section" message="Assign active students to this section to enter marks." /></Panel>
      ) : (
        <>
          <div className="nx-statstrip" style={{ marginBottom: 16 }}>
            <div className="nx-statstrip__item">
              <div className="nx-statstrip__val">{stats.avg ? stats.avg.toFixed(1) : '—'}</div>
              <div className="nx-statstrip__lbl">Average</div>
            </div>
            <div className="nx-statstrip__item">
              <div className="nx-statstrip__val">{stats.entered ? stats.high : '—'}</div>
              <div className="nx-statstrip__lbl">Highest</div>
            </div>
            <div className="nx-statstrip__item">
              <div className="nx-statstrip__val" style={{ color: stats.passPct >= 60 ? 'var(--success)' : 'var(--warning)' }}>{stats.entered ? `${stats.passPct}%` : '—'}</div>
              <div className="nx-statstrip__lbl">Pass rate</div>
            </div>
            <div className="nx-statstrip__item">
              <div className="nx-statstrip__val">{stats.entered}/{roster.length}</div>
              <div className="nx-statstrip__lbl">Entered</div>
            </div>
          </div>

          <Panel bodyClassName="nx-gb-roster">
            {roster.map((s, i) => {
              const m = entries[s.id] ?? {};
              const invalid = !m.absent && m.marks != null && !Number.isNaN(m.marks) && (m.marks < 0 || m.marks > maxMarks);
              return (
                <div className="nx-gb-row" key={s.id}>
                  <span className="nx-gb-row__no">{s.rollNo || i + 1}</span>
                  <Avatar name={s.fullName} src={s.photoUrl} size={32} />
                  <span className="nx-gb-row__name">{s.fullName}</span>
                  <div className="nx-gb-row__entry">
                    <div className="nx-gb-marks">
                      <Input
                        type="number"
                        inputMode="numeric"
                        size="sm"
                        min={0}
                        max={maxMarks}
                        disabled={!canWrite || !!m.absent}
                        invalid={invalid}
                        value={m.absent ? '' : m.marks ?? ''}
                        onChange={(e) => setMark(s.id, e.target.value)}
                        placeholder={m.absent ? 'AB' : '–'}
                        aria-label={`Marks for ${s.fullName}, out of ${maxMarks}`}
                        className="nx-gb-marks__input"
                      />
                      <span className="nx-gb-marks__max">/ {maxMarks}</span>
                      {m.grade && !m.absent && <span className="nx-gb-grade">{m.grade}</span>}
                    </div>
                    <button
                      type="button"
                      className={`nx-gb-absent${m.absent ? ' is-on' : ''}`}
                      onClick={() => canWrite && toggleAbsent(s.id, !m.absent)}
                      disabled={!canWrite}
                      aria-pressed={!!m.absent}
                    >
                      Absent
                    </button>
                  </div>
                </div>
              );
            })}
          </Panel>

          {canWrite && (
            <div className="nx-savebar">
              <div className="nx-savebar__inner">
                <div className="nx-savebar__left">
                  <span style={{ fontSize: 12.5, color: overMax ? 'var(--danger)' : 'var(--text-muted)' }}>
                    {overMax ? `Marks must be 0–${maxMarks}` : `${stats.entered} entered · ${stats.absent} absent`}
                  </span>
                </div>
                <div className="nx-savebar__right">
                  <Button variant="gold" leftIcon="check" loading={saving} disabled={overMax} onClick={save}>Save marks</Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
