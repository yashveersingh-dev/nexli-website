import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { Icon } from '@/components/Icon';
import { Field, Input, Select, Textarea } from '@/components/form';
import { EmptyState, Skeleton, InfoCard } from '@/components/feedback';
import { Badge } from '@/components/Badge';
import { useToast } from '@/components/Toast';
import { useSession } from '@/app/providers/SessionProvider';
import { RESULT_STATUS_META } from '@/features/examinations/examSchema';
import { useReportCard, useScheme, updateReportCard, type Actor } from './data';
import { findSeedScheme } from './schemes';
import { computeSubject, computeTotals, computeResult } from './compute';
import { statusOf, canEditStatus, RC_STATUS_META } from './workflow';
import type {
  ReportCard, ReportCardActivity, ReportCardCoScholastic, ReportCardScheme,
  ReportCardSport, ReportCardSubject,
} from '@/types/reportcard';
import './reportcard.css';

const PERFORMANCE_OPTIONS = [
  { value: '', label: '— Rating —' },
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'satisfactory', label: 'Satisfactory' },
  { value: 'needs_improvement', label: 'Needs improvement' },
];

const PARTICIPATION_OPTIONS = [
  { value: '', label: '— Participation —' },
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'satisfactory', label: 'Satisfactory' },
  { value: 'minimal', label: 'Minimal' },
];

/**
 * Card editor. Component marks are pre-filled from generation; the teacher
 * adjusts them, edits co-scholastic grades, attendance, health and remarks. The
 * subject %/grade/result and overall totals recompute LIVE as marks change.
 * Class rank is not recomputed here (it is a batch property assigned at
 * generation); editing a single card does not re-rank the class.
 */
export function ReportCardFormPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member, can } = useSession();
  const canWrite = can('gradebook.write') || can('exams.write');
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };

  const { data: existing, loading } = useReportCard(schoolId, id);
  const { data: persistedScheme } = useScheme(schoolId, existing?.schemeId);

  const scheme: ReportCardScheme | undefined = useMemo(
    () => persistedScheme ?? (existing?.schemeId ? findSeedScheme(existing.schemeId) : undefined),
    [persistedScheme, existing],
  );

  const [subjects, setSubjects] = useState<ReportCardSubject[] | null>(null);
  const [coScholastic, setCoScholastic] = useState<ReportCardCoScholastic[]>([]);
  const [attPresent, setAttPresent] = useState('');
  const [attTotal, setAttTotal] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [promotedTo, setPromotedTo] = useState('');
  const [sports, setSports] = useState<ReportCardSport[]>([]);
  const [activities, setActivities] = useState<ReportCardActivity[]>([]);
  const [achievements, setAchievements] = useState<string[]>([]);
  const [achievementDraft, setAchievementDraft] = useState('');
  const [overallRemark, setOverallRemark] = useState('');
  const [classTeacherRemark, setClassTeacherRemark] = useState('');
  const [principalRemark, setPrincipalRemark] = useState('');
  const [coordinatorRemark, setCoordinatorRemark] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);

  // Hydrate local editor state once the card loads.
  if (existing && !hydrated) {
    setSubjects(existing.subjects.map((s) => ({ ...s, components: s.components.map((c) => ({ ...c })) })));
    setCoScholastic((existing.coScholastic ?? []).map((c) => ({ ...c })));
    setAttPresent(existing.attendance ? String(existing.attendance.present) : '');
    setAttTotal(existing.attendance ? String(existing.attendance.total) : '');
    setHeightCm(existing.health?.heightCm != null ? String(existing.health.heightCm) : '');
    setWeightKg(existing.health?.weightKg != null ? String(existing.health.weightKg) : '');
    setPromotedTo(existing.promotedTo ?? '');
    setSports((existing.sports ?? []).map((s) => ({ ...s })));
    setActivities((existing.activities ?? []).map((a) => ({ ...a })));
    setAchievements([...(existing.achievements ?? [])]);
    setOverallRemark(existing.overallRemark ?? '');
    setClassTeacherRemark(existing.classTeacherRemark ?? '');
    setPrincipalRemark(existing.principalRemark ?? '');
    setCoordinatorRemark(existing.remarks ?? '');
    setHydrated(true);
  }

  const totals = useMemo(() => (scheme && subjects ? computeTotals(scheme, subjects) : null), [scheme, subjects]);
  const result = useMemo(
    () => (subjects && totals ? computeResult(subjects, totals.percentage) : null),
    [subjects, totals],
  );

  if (loading) return <div className="nx-page"><Skeleton height={360} /></div>;
  if (!schoolId) return <div className="nx-page"><EmptyState icon="school" title="No school context" /></div>;
  if (!canWrite) {
    return (
      <div className="nx-page">
        <EmptyState icon="lock" title="Not allowed" message="You don't have permission to edit report cards."
          action={<Button variant="subtle" onClick={() => navigate('/report-cards')}>Back</Button>} />
      </div>
    );
  }
  if (!existing) {
    return (
      <div className="nx-page">
        <EmptyState icon="file-text" title="Card not found"
          action={<Button variant="subtle" onClick={() => navigate('/report-cards')}>Back</Button>} />
      </div>
    );
  }

  const editStatus = statusOf(existing);
  if (!canEditStatus(editStatus)) {
    return (
      <div className="nx-page">
        <EmptyState
          icon={RC_STATUS_META[editStatus].icon}
          title={editStatus === 'approved' ? 'Card is approved' : 'Card is awaiting approval'}
          message={
            editStatus === 'approved'
              ? 'Approved cards are locked. Ask an approver to return it if changes are needed.'
              : 'This card is pending approval and cannot be edited until it is approved or returned.'
          }
          action={<Button variant="subtle" leftIcon="chevron-left" onClick={() => navigate(`/report-cards/${existing.id}`)}>View card</Button>}
        />
      </div>
    );
  }
  if (!scheme || !subjects || !totals || !result) {
    return (
      <div className="nx-page">
        <EmptyState icon="file-text" title="Scheme unavailable"
          message="The grading scheme for this card could not be loaded. Re-generate the card from the scheme."
          action={<Button variant="subtle" onClick={() => navigate('/report-cards')}>Back</Button>} />
      </div>
    );
  }

  // Live recompute one subject when a component mark changes.
  const setMark = (subjectIdx: number, compIdx: number, raw: string) => {
    setSubjects((prev) => {
      if (!prev) return prev;
      const next = prev.map((s) => ({ ...s, components: s.components.map((c) => ({ ...c })) }));
      const comp = next[subjectIdx].components[compIdx];
      const v = raw.trim();
      let marks: number | null = v === '' ? null : Number(v);
      if (marks != null && (Number.isNaN(marks) || marks < 0)) marks = null;
      if (marks != null && marks > comp.max) marks = comp.max;
      comp.marks = marks;
      next[subjectIdx] = computeSubject(scheme, next[subjectIdx].subjectName, next[subjectIdx].components, next[subjectIdx].remark);
      return next;
    });
  };

  const setSubjectRemark = (idx: number, value: string) => {
    setSubjects((prev) => prev && prev.map((s, i) => (i === idx ? { ...s, remark: value || undefined } : s)));
  };

  const setCoGrade = (idx: number, value: string) => {
    setCoScholastic((prev) => prev.map((c, i) => (i === idx ? { ...c, grade: value } : c)));
  };

  // Sports rows
  const addSport = () => setSports((prev) => [...prev, { activity: '', performance: '' }]);
  const setSport = (i: number, patch: Partial<ReportCardSport>) =>
    setSports((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const removeSport = (i: number) => setSports((prev) => prev.filter((_, idx) => idx !== i));

  // Activity rows
  const addActivity = () => setActivities((prev) => [...prev, { activity: '', participation: '' }]);
  const setActivity = (i: number, patch: Partial<ReportCardActivity>) =>
    setActivities((prev) => prev.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  const removeActivity = (i: number) => setActivities((prev) => prev.filter((_, idx) => idx !== i));

  // Achievement chips
  const addAchievement = () => {
    const v = achievementDraft.trim();
    if (!v) return;
    setAchievements((prev) => [...prev, v]);
    setAchievementDraft('');
  };
  const removeAchievement = (i: number) => setAchievements((prev) => prev.filter((_, idx) => idx !== i));

  const save = async () => {
    const num = (s: string): number | null => {
      if (s.trim() === '') return null;
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    };
    const present = num(attPresent);
    const total = num(attTotal);
    const safePresent = present != null && total != null ? Math.min(present, total) : present;
    const pct = safePresent != null && total != null && total > 0 ? Math.round((safePresent / total) * 100) : 0;
    const attendance =
      safePresent != null && total != null && total > 0 ? { present: safePresent, total, pct } : undefined;
    const h = num(heightCm) ?? undefined;
    const w = num(weightKg) ?? undefined;
    const health = h != null || w != null ? { heightCm: h, weightKg: w } : undefined;

    // Keep only meaningful rows. Build objects WITHOUT undefined keys — Firestore
    // rejects `undefined` inside array elements (unlike top-level optional fields).
    const cleanSports: ReportCardSport[] = sports
      .filter((s) => s.activity.trim() || s.performance)
      .map((s) => {
        const r = s.remarks?.trim();
        return { activity: s.activity.trim(), performance: s.performance, ...(r ? { remarks: r } : {}) };
      });
    const cleanActivities: ReportCardActivity[] = activities
      .filter((a) => a.activity.trim() || a.participation)
      .map((a) => {
        const r = a.remarks?.trim();
        return { activity: a.activity.trim(), participation: a.participation, ...(r ? { remarks: r } : {}) };
      });
    const cleanAchievements = achievements.map((a) => a.trim()).filter(Boolean);

    const patch: Partial<ReportCard> = {
      subjects,
      coScholastic,
      attendance,
      health,
      totals,
      result,
      promotedTo: promotedTo.trim() || undefined,
      sports: cleanSports.length ? cleanSports : undefined,
      activities: cleanActivities.length ? cleanActivities : undefined,
      achievements: cleanAchievements.length ? cleanAchievements : undefined,
      overallRemark: overallRemark.trim() || undefined,
      classTeacherRemark: classTeacherRemark.trim() || undefined,
      principalRemark: principalRemark.trim() || undefined,
      remarks: coordinatorRemark.trim() || undefined,
      studentName: existing.studentName,
    };
    setSaving(true);
    try {
      await updateReportCard(schoolId, existing.id, patch, actor);
      toast.success('Card saved', `${existing.studentName} · submit for approval when ready`);
      navigate(`/report-cards/${existing.id}`);
    } catch {
      toast.error('Could not save', 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const resultMeta = RESULT_STATUS_META[result];

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Edit report card</h1>
          <p className="nx-page__sub">
            {existing.studentName} · {[existing.gradeName, existing.sectionName].filter(Boolean).join(' · ') || 'No class'} · {existing.termLabel ?? existing.term}
          </p>
        </div>
        <div className="rc-head-actions">
          <Button variant="ghost" leftIcon="chevron-left" onClick={() => navigate(`/report-cards/${existing.id}`)}>Cancel</Button>
          <Button variant="gold" leftIcon="check" loading={saving} onClick={save}>Save changes</Button>
        </div>
      </div>

      <Panel title="Subject marks" sub="Adjust component marks — the percentage, grade and result recompute live.">
        {subjects.length === 0 ? (
          <InfoCard icon="info" title="No subjects on this card">
            This card has no subjects. They are sourced from the term's exam papers; generate again once exam papers exist.
          </InfoCard>
        ) : (
          subjects.map((s, si) => (
            <div className="rc-subject-block" key={s.subjectName}>
              <div className="rc-subject-head">
                <span className="rc-subject-name">{s.subjectName}</span>
                <span className="rc-subject-totals">
                  <span>{s.total} / {s.max}</span>
                  <span>{s.percentage}%</span>
                  <span>Grade {s.grade}</span>
                  <Badge variant={s.passed ? 'success' : 'danger'}>{s.passed ? 'Pass' : 'Fail'}</Badge>
                </span>
              </div>
              <div className="rc-comp-grid">
                {s.components.map((c, ci) => (
                  <div className="rc-comp" key={c.componentId}>
                    <label htmlFor={`mark-${si}-${ci}`}>{c.label} <small>/{c.max}</small></label>
                    <Input
                      id={`mark-${si}-${ci}`}
                      type="number"
                      inputMode="numeric"
                      size="sm"
                      min={0}
                      max={c.max}
                      value={c.marks == null ? '' : String(c.marks)}
                      placeholder="—"
                      aria-label={`${s.subjectName} ${c.label} marks out of ${c.max}`}
                      onChange={(e) => setMark(si, ci, e.target.value)}
                    />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10 }}>
                <Field label="Subject remark" optional htmlFor={`remark-${si}`}>
                  <Input id={`remark-${si}`} size="sm" value={s.remark ?? ''} placeholder="Short note (optional)"
                    onChange={(e) => setSubjectRemark(si, e.target.value)} />
                </Field>
              </div>
            </div>
          ))
        )}
      </Panel>

      <Panel title="Summary">
        <div className="rc-summary">
          <div className="rc-stat"><div className="rc-stat__label">Total</div><div className="rc-stat__value">{totals.obtained} / {totals.max}</div></div>
          <div className="rc-stat"><div className="rc-stat__label">Percentage</div><div className="rc-stat__value">{totals.percentage}%</div></div>
          {totals.cgpa != null && <div className="rc-stat"><div className="rc-stat__label">CGPA</div><div className="rc-stat__value">{totals.cgpa}</div></div>}
          <div className="rc-stat"><div className="rc-stat__label">Result</div><div className="rc-stat__value" style={{ color: 'var(--gold)' }}>{resultMeta.label}</div></div>
          {existing.rank != null && <div className="rc-stat"><div className="rc-stat__label">Class rank</div><div className="rc-stat__value">{existing.rank}{existing.classSize ? ` / ${existing.classSize}` : ''}</div></div>}
        </div>
      </Panel>

      {coScholastic.length > 0 && (
        <Panel title="Co-scholastic areas" sub="Grades on the co-scholastic scale (e.g. A / B / C).">
          <div className="rc-grid">
            {coScholastic.map((c, i) => (
              <Field key={c.area} label={c.area} optional htmlFor={`co-${i}`}>
                <Input id={`co-${i}`} size="sm" value={c.grade} placeholder="A / B / C"
                  onChange={(e) => setCoGrade(i, e.target.value)} />
              </Field>
            ))}
          </div>
        </Panel>
      )}

      <Panel title="Sports & games" sub="Add the student's sports/PE participation and a performance rating for each.">
        {sports.length === 0 ? (
          <p className="rc-note" style={{ margin: '0 0 10px' }}>No sports added yet.</p>
        ) : (
          <div className="rc-rowlist">
            {sports.map((s, i) => (
              <div className="rc-entry-row" key={i}>
                <Input value={s.activity} placeholder="Sport / activity name" aria-label={`Sport ${i + 1} name`}
                  onChange={(e) => setSport(i, { activity: e.target.value })} />
                <Select value={s.performance} options={PERFORMANCE_OPTIONS} aria-label={`Sport ${i + 1} performance`}
                  onChange={(e) => setSport(i, { performance: e.target.value as ReportCardSport['performance'] })} />
                <Input value={s.remarks ?? ''} placeholder="Remark (optional)" aria-label={`Sport ${i + 1} remark`}
                  onChange={(e) => setSport(i, { remarks: e.target.value })} />
                <Button variant="ghost" leftIcon="minus-circle" aria-label={`Remove sport ${i + 1}`} onClick={() => removeSport(i)} />
              </div>
            ))}
          </div>
        )}
        <Button variant="ghost" size="sm" leftIcon="plus" onClick={addSport} style={{ marginTop: 8 }}>Add sport</Button>
      </Panel>

      <Panel title="Activities & clubs" sub="Co-curricular activities and a participation level for each.">
        {activities.length === 0 ? (
          <p className="rc-note" style={{ margin: '0 0 10px' }}>No activities added yet.</p>
        ) : (
          <div className="rc-rowlist">
            {activities.map((a, i) => (
              <div className="rc-entry-row" key={i}>
                <Input value={a.activity} placeholder="Activity / club name" aria-label={`Activity ${i + 1} name`}
                  onChange={(e) => setActivity(i, { activity: e.target.value })} />
                <Select value={a.participation} options={PARTICIPATION_OPTIONS} aria-label={`Activity ${i + 1} participation`}
                  onChange={(e) => setActivity(i, { participation: e.target.value as ReportCardActivity['participation'] })} />
                <Input value={a.remarks ?? ''} placeholder="Remark (optional)" aria-label={`Activity ${i + 1} remark`}
                  onChange={(e) => setActivity(i, { remarks: e.target.value })} />
                <Button variant="ghost" leftIcon="minus-circle" aria-label={`Remove activity ${i + 1}`} onClick={() => removeActivity(i)} />
              </div>
            ))}
          </div>
        )}
        <Button variant="ghost" size="sm" leftIcon="plus" onClick={addActivity} style={{ marginTop: 8 }}>Add activity</Button>
      </Panel>

      <Panel title="Achievements" sub="Prizes, certificates and milestones earned this term.">
        <div className="rc-chip-add">
          <Input value={achievementDraft} placeholder="e.g. 1st place, Inter-house Quiz"
            aria-label="Achievement to add"
            onChange={(e) => setAchievementDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAchievement(); } }} />
          <Button variant="subtle" leftIcon="plus" onClick={addAchievement}>Add</Button>
        </div>
        {achievements.length > 0 && (
          <div className="rc-chips">
            {achievements.map((a, i) => (
              <span className="rc-chip" key={`${a}-${i}`}>
                {a}
                <button type="button" className="rc-chip__x" aria-label={`Remove ${a}`} onClick={() => removeAchievement(i)}>
                  <Icon name="x" size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Attendance, health & promotion">
        <div className="rc-grid">
          <Field label="Days present" optional htmlFor="rc-att-present" hint="Pre-filled from marked attendance; adjust if needed.">
            <Input id="rc-att-present" type="number" inputMode="numeric" min={0} value={attPresent} placeholder="e.g. 86"
              onChange={(e) => setAttPresent(e.target.value)} />
          </Field>
          <Field label="Working days" optional htmlFor="rc-att-total">
            <Input id="rc-att-total" type="number" inputMode="numeric" min={0} value={attTotal} placeholder="e.g. 92"
              onChange={(e) => setAttTotal(e.target.value)} />
          </Field>
          <Field label="Height (cm)" optional htmlFor="rc-height">
            <Input id="rc-height" type="number" inputMode="numeric" min={0} value={heightCm} placeholder="optional"
              onChange={(e) => setHeightCm(e.target.value)} />
          </Field>
          <Field label="Weight (kg)" optional htmlFor="rc-weight">
            <Input id="rc-weight" type="number" inputMode="numeric" min={0} value={weightKg} placeholder="optional"
              onChange={(e) => setWeightKg(e.target.value)} />
          </Field>
          <Field label="Promoted to" optional htmlFor="rc-promoted">
            <Input id="rc-promoted" value={promotedTo} placeholder="e.g. Class 7"
              onChange={(e) => setPromotedTo(e.target.value)} />
          </Field>
        </div>
      </Panel>

      <Panel title="Remarks">
        <Field label="Overall remark" optional htmlFor="rc-overall">
          <Textarea id="rc-overall" rows={2} maxLength={600} value={overallRemark} placeholder="Holistic note on the term's performance…"
            onChange={(e) => setOverallRemark(e.target.value)} />
        </Field>
        <Field label="Class teacher's remark" optional htmlFor="rc-ct">
          <Textarea id="rc-ct" rows={2} maxLength={600} value={classTeacherRemark} placeholder="From the class teacher…"
            onChange={(e) => setClassTeacherRemark(e.target.value)} />
        </Field>
        <Field label="Principal's remark" optional htmlFor="rc-principal">
          <Textarea id="rc-principal" rows={2} maxLength={600} value={principalRemark} placeholder="From the principal…"
            onChange={(e) => setPrincipalRemark(e.target.value)} />
        </Field>
        <Field label="Coordinator's remark" optional htmlFor="rc-coordinator" hint="A general remark from the activity / sports coordinator.">
          <Textarea id="rc-coordinator" rows={2} maxLength={600} value={coordinatorRemark} placeholder="From the coordinator…"
            onChange={(e) => setCoordinatorRemark(e.target.value)} />
        </Field>
      </Panel>

      <div className="rc-head-actions" style={{ justifyContent: 'flex-end', marginTop: 4 }}>
        <Button variant="ghost" leftIcon="chevron-left" onClick={() => navigate(`/report-cards/${existing.id}`)}>Cancel</Button>
        <Button variant="gold" leftIcon="check" loading={saving} onClick={save}>Save changes</Button>
      </div>
    </div>
  );
}
