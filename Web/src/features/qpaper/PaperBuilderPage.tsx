import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Panel } from '@/components/Panel';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Modal } from '@/components/Modal';
import { Field, Input, Select, Textarea } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useGrades, useSubjects } from '@/features/school/data';
import {
  BOARD_OPTIONS,
  QUESTION_TYPE_META,
  QUESTION_TYPE_OPTIONS,
  DIFFICULTY_META,
  type Board,
  type PaperItem,
  type PaperSection,
  type Question,
  type QuestionPaper,
} from '@/types/qpaper';
import { useQuestions, usePaper, useBlueprints, createPaper, updatePaper, type Actor } from './data';
import { SEED_BLUEPRINTS, findSeedBlueprint, autoFillFromBlueprint, questionToItem, paperMarksTotal } from './blueprints';
import { filterQuestions } from './QuestionBankPage';
import './qpaper.css';

export function PaperBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const { schoolId, uid, member, school } = useSession();
  // Building papers is an operate action; leadership (reviewers) gets the view-only gate.
  const canWrite = useOwnership('qpaper').canOperate;
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };
  const isEdit = !!id;

  const { data: existing, loading: loadingPaper } = usePaper(schoolId, id);
  const { data: questions, loading: loadingBank } = useQuestions(schoolId);
  const { data: subjects } = useSubjects(schoolId);
  const { data: grades } = useGrades(schoolId);
  const { data: tenantBlueprints } = useBlueprints(schoolId);

  // ---- header ----
  const [title, setTitle] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [gradeName, setGradeName] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [examName, setExamName] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [board, setBoard] = useState<Board>('CBSE');
  const [totalMarks, setTotalMarks] = useState('80');
  const [durationMins, setDurationMins] = useState('180');
  const [instructions, setInstructions] = useState('');
  const [blueprintId, setBlueprintId] = useState<string | undefined>(undefined);

  // ---- sections (the actual paper body) ----
  const [sections, setSections] = useState<PaperSection[]>([{ label: 'Section A', items: [] }]);

  const [busy, setBusy] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [picker, setPicker] = useState<number | null>(null); // section index being added to
  const [fillOpen, setFillOpen] = useState(false);

  // Hydrate when editing an existing paper.
  useEffect(() => {
    if (!isEdit || !existing || hydrated) return;
    setTitle(existing.title);
    setSubjectName(existing.subjectName ?? '');
    setGradeName(existing.gradeName ?? '');
    setSectionName(existing.sectionName ?? '');
    setExamName(existing.examName ?? '');
    setAcademicYear(existing.academicYear ?? '');
    setBoard(existing.board ?? 'CBSE');
    setTotalMarks(String(existing.totalMarks ?? 0));
    setDurationMins(String(existing.durationMins ?? 0));
    setInstructions((existing.instructions ?? []).join('\n'));
    setBlueprintId(existing.blueprintId);
    setSections(existing.sections.length ? existing.sections : [{ label: 'Section A', items: [] }]);
    setHydrated(true);
  }, [isEdit, existing, hydrated]);

  // New paper: defaults + optional ?blueprint= preset.
  useEffect(() => {
    if (isEdit || hydrated) return;
    setAcademicYear(school?.currentAcademicYear ?? '');
    const bp = searchParams.get('blueprint');
    if (bp) {
      const found = [...SEED_BLUEPRINTS, ...tenantBlueprints].find((b) => b.id === bp);
      if (found) {
        setTitle(found.name);
        setBoard((found.board as Board) ?? 'CBSE');
        setTotalMarks(String(found.totalMarks));
        setDurationMins(String(found.durationMins));
        setBlueprintId(found.id);
        setSections(found.sections.map((s) => ({ label: s.label, instruction: s.instruction, items: [] })));
      } else if (tenantBlueprints.length === 0) {
        // A custom blueprint may still be loading — wait for the tenant list before
        // locking hydration, so the preset isn't silently dropped on first render.
        return;
      }
    }
    setHydrated(true);
  }, [isEdit, hydrated, school, searchParams, tenantBlueprints]);

  const subjectOptions = useMemo(
    () => [...new Set(subjects.map((s) => s.name))].sort().map((n) => ({ value: n, label: n })),
    [subjects],
  );
  const gradeOptions = useMemo(
    () => [...grades].sort((a, b) => a.order - b.order).map((g) => ({ value: g.name, label: g.name })),
    [grades],
  );

  const usedIds = useMemo(() => new Set(sections.flatMap((s) => s.items.map((i) => i.questionId))), [sections]);
  const runningTotal = paperMarksTotal(sections);
  const declared = Number(totalMarks) || 0;
  const meterPct = declared > 0 ? Math.min(100, Math.round((runningTotal / declared) * 100)) : 0;
  const meterClass = runningTotal === declared && declared > 0 ? 'is-exact' : runningTotal > declared ? 'is-over' : '';

  // ---- section ops ----
  const addSection = () => {
    const label = `Section ${String.fromCharCode(65 + sections.length)}`;
    setSections((s) => [...s, { label, items: [] }]);
  };
  const renameSection = (i: number, label: string) => setSections((s) => s.map((sec, idx) => (idx === i ? { ...sec, label } : sec)));
  const setSectionInstruction = (i: number, instruction: string) => setSections((s) => s.map((sec, idx) => (idx === i ? { ...sec, instruction } : sec)));
  const removeSection = (i: number) => setSections((s) => s.filter((_, idx) => idx !== i));
  const removeItem = (si: number, qi: number) => setSections((s) => s.map((sec, idx) => (idx === si ? { ...sec, items: sec.items.filter((_, j) => j !== qi) } : sec)));
  const moveItem = (si: number, qi: number, dir: -1 | 1) =>
    setSections((s) =>
      s.map((sec, idx) => {
        if (idx !== si) return sec;
        const items = [...sec.items];
        const ni = qi + dir;
        if (ni < 0 || ni >= items.length) return sec;
        [items[qi], items[ni]] = [items[ni], items[qi]];
        return { ...sec, items };
      }),
    );
  const addItemsToSection = (si: number, items: PaperItem[]) =>
    setSections((s) => s.map((sec, idx) => (idx === si ? { ...sec, items: [...sec.items, ...items] } : sec)));

  // ---- auto-fill ----
  const runFill = (bpId: string) => {
    const pool = filterQuestions(questions, { subjectName: subjectName || undefined, gradeName: gradeName || undefined });
    const all = [...SEED_BLUEPRINTS, ...tenantBlueprints];
    const bp = findSeedBlueprint(bpId) ?? all.find((b) => b.id === bpId);
    if (!bp) return;
    const result = autoFillFromBlueprint(bp, pool);
    setSections(result.sections.length ? result.sections : [{ label: 'Section A', items: [] }]);
    setBlueprintId(bp.id);
    setTotalMarks(String(bp.totalMarks));
    setDurationMins(String(bp.durationMins));
    if (!title.trim()) setTitle(bp.name);
    setFillOpen(false);
    const shortfall = result.gaps.filter((g) => g.filled < g.wanted);
    if (shortfall.length) {
      toast.warning('Filled with gaps', shortfall.map((g) => `${g.label}: ${g.filled}/${g.wanted}`).join(', ') + ' — add more matching questions to the bank.');
    } else {
      toast.success('Paper auto-filled from blueprint');
    }
  };

  const buildPayload = (): Omit<QuestionPaper, 'id'> => ({
    schoolId: schoolId!,
    title: title.trim(),
    subjectName: subjectName.trim() || undefined,
    gradeName: gradeName.trim() || undefined,
    sectionName: sectionName.trim() || undefined,
    examName: examName.trim() || undefined,
    academicYear: academicYear.trim() || undefined,
    board,
    totalMarks: declared,
    durationMins: Number(durationMins) || 0,
    instructions: instructions.split('\n').map((s) => s.trim()).filter(Boolean),
    blueprintId,
    sections: sections.filter((s) => s.label.trim()),
    status: existing?.status ?? 'draft',
  });

  const save = async (goPreview: boolean) => {
    if (!schoolId || !title.trim()) {
      toast.error('Add a title first');
      return;
    }
    setBusy(true);
    try {
      const payload = buildPayload();
      if (isEdit && existing) {
        await updatePaper(schoolId, existing.id, payload, actor);
        toast.success('Paper saved');
        navigate(goPreview ? `/question-papers/papers/${existing.id}/preview` : '/question-papers/papers');
      } else {
        const newId = await createPaper(schoolId, payload, actor);
        toast.success('Paper created');
        navigate(goPreview ? `/question-papers/papers/${newId}/preview` : `/question-papers/papers/${newId}`);
      }
    } catch {
      toast.error('Could not save the paper');
    } finally {
      setBusy(false);
    }
  };

  if (!canWrite) {
    return (
      <div className="nx-page">
        <EmptyState icon="lock" title="View only" message="You don't have permission to build papers."
          action={<Button variant="subtle" onClick={() => navigate('/question-papers/papers')}>Back to papers</Button>} />
      </div>
    );
  }
  if (isEdit && loadingPaper) return <div className="nx-page"><Skeleton height={140} /><div style={{ height: 12 }} /><Skeleton height={360} /></div>;
  if (isEdit && !existing) {
    return (
      <div className="nx-page">
        <EmptyState icon="file-text" title="Paper not found"
          action={<Button variant="subtle" onClick={() => navigate('/question-papers/papers')}>Back to papers</Button>} />
      </div>
    );
  }

  const blueprintMenuOptions = [
    ...SEED_BLUEPRINTS.map((b) => ({ value: b.id, label: `${b.name} (${b.totalMarks}m)` })),
    ...tenantBlueprints.map((b) => ({ value: b.id, label: `${b.name} (${b.totalMarks}m)` })),
  ];

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">{isEdit ? 'Edit paper' : 'New paper'}</h1>
          <p className="nx-page__sub">Set the header, then pick questions manually or auto-fill from a blueprint. The marks meter tracks your declared total.</p>
        </div>
      </div>

      <Panel title="Paper details">
        <div className="grid g-2">
          <Field label="Title" required>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Half-Yearly Examination — Science" />
          </Field>
          <Field label="Exam name" optional hint="Printed as the heading (defaults to title).">
            <Input value={examName} onChange={(e) => setExamName(e.target.value)} placeholder="e.g. Half-Yearly Examination 2025-26" />
          </Field>
        </div>
        <div className="grid g-3">
          <Field label="Subject" optional>
            <Select value={subjectName} onChange={(e) => setSubjectName(e.target.value)} placeholder="Any subject"
              options={subjectOptions.length ? subjectOptions : [{ value: subjectName, label: subjectName || '—' }]} />
          </Field>
          <Field label="Grade / Class" optional>
            <Select value={gradeName} onChange={(e) => setGradeName(e.target.value)} placeholder="Any grade"
              options={gradeOptions.length ? gradeOptions : [{ value: gradeName, label: gradeName || '—' }]} />
          </Field>
          <Field label="Section" optional>
            <Input value={sectionName} onChange={(e) => setSectionName(e.target.value)} placeholder="e.g. A" />
          </Field>
        </div>
        <div className="grid g-3">
          <Field label="Total marks" required>
            <Input type="number" min={1} value={totalMarks} onChange={(e) => setTotalMarks(e.target.value)} />
          </Field>
          <Field label="Duration (mins)" required>
            <Input type="number" min={1} value={durationMins} onChange={(e) => setDurationMins(e.target.value)} />
          </Field>
          <Field label="Board" optional>
            <Select value={board} onChange={(e) => setBoard(e.target.value as Board)} options={BOARD_OPTIONS} />
          </Field>
        </div>
        <div className="grid g-2">
          <Field label="Academic year" optional>
            <Input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} placeholder="2025-2026" />
          </Field>
        </div>
        <Field label="General instructions" optional hint="One per line — printed as a numbered list.">
          <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={3} placeholder={'All questions are compulsory.\nMarks are indicated against each question.'} />
        </Field>
      </Panel>

      <div style={{ height: 14 }} />

      {/* Marks meter */}
      <div className="qp-meter">
        <div>
          <div className="qp-meter__label">{runningTotal} / {declared} marks</div>
          <div className="qp-meter__sub">
            {runningTotal === declared && declared > 0 ? 'Matches the declared total.' : runningTotal > declared ? `Over by ${runningTotal - declared}.` : `${declared - runningTotal} marks to go.`}
          </div>
        </div>
        <div className="qp-meter__bar"><div className={`qp-meter__fill ${meterClass}`} style={{ width: `${meterPct}%` }} /></div>
        <span className="qp-meter__sub">{usedIds.size} question{usedIds.size === 1 ? '' : 's'}</span>
      </div>

      {/* Auto-fill */}
      <div className="qp-toolbar">
        <Button variant="subtle" leftIcon="copy" onClick={() => setFillOpen(true)} disabled={loadingBank}>Fill from blueprint</Button>
        {blueprintId && (
          <Button variant="ghost" leftIcon="refresh" onClick={() => runFill(blueprintId)} disabled={loadingBank}>Regenerate</Button>
        )}
        <div className="qp-grow" />
      </div>

      {/* Sections */}
      {sections.map((sec, si) => (
        <div key={si} className="qp-section">
          <div className="qp-section__head">
            <div style={{ flex: 1 }}>
              <Input value={sec.label} onChange={(e) => renameSection(si, e.target.value)} placeholder="Section label" />
            </div>
            <Badge variant="muted">{sec.items.reduce((a, it) => a + it.marks, 0)} marks</Badge>
            <Button variant="ghost" size="sm" leftIcon="plus" onClick={() => setPicker(si)}>Add questions</Button>
            {sections.length > 1 && <Button variant="ghost" size="sm" leftIcon="x" aria-label="Remove section" onClick={() => removeSection(si)} />}
          </div>
          <Input value={sec.instruction ?? ''} onChange={(e) => setSectionInstruction(si, e.target.value)} placeholder="Section instruction (optional)" />
          {sec.items.length === 0 ? (
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', padding: '10px 0' }}>No questions yet — use “Add questions”.</div>
          ) : (
            <div style={{ marginTop: 6 }}>
              {sec.items.map((it, qi) => (
                <div key={`${it.questionId}-${qi}`} className="qp-item">
                  <span className="qp-item__no">{qi + 1}.</span>
                  <div className="qp-item__stem">
                    {it.stem}
                    <span style={{ marginLeft: 6 }}><Badge variant="info">{QUESTION_TYPE_META[it.type].short}</Badge></span>
                  </div>
                  <span className="qp-item__marks">[{it.marks}]</span>
                  <div className="qp-item__actions">
                    <Button variant="ghost" size="sm" leftIcon="chevron-left" aria-label="Move up" onClick={() => moveItem(si, qi, -1)} />
                    <Button variant="ghost" size="sm" leftIcon="chevron-right" aria-label="Move down" onClick={() => moveItem(si, qi, 1)} />
                    <Button variant="ghost" size="sm" leftIcon="x" aria-label="Remove" onClick={() => removeItem(si, qi)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      <Button variant="subtle" leftIcon="plus" onClick={addSection}>Add section</Button>

      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        <Button variant="gold" leftIcon="check" loading={busy} onClick={() => save(false)}>{isEdit ? 'Save paper' : 'Create paper'}</Button>
        <Button variant="subtle" leftIcon="download" loading={busy} onClick={() => save(true)}>Save &amp; preview</Button>
        <Button variant="ghost" onClick={() => navigate('/question-papers/papers')} disabled={busy}>Cancel</Button>
      </div>

      {/* Question picker */}
      {picker !== null && (
        <PickerModal
          open
          onClose={() => setPicker(null)}
          questions={questions}
          loading={loadingBank}
          usedIds={usedIds}
          defaultSubject={subjectName}
          defaultGrade={gradeName}
          onAdd={(items) => { addItemsToSection(picker, items); setPicker(null); }}
        />
      )}

      {/* Fill-from-blueprint chooser */}
      <Modal
        open={fillOpen}
        onClose={() => setFillOpen(false)}
        icon="copy"
        tone="gold"
        title="Fill from blueprint"
        description="Pick a pattern. Questions are chosen at random from approved bank questions matching each section’s type & marks (no repeats)."
        footer={<Button variant="ghost" onClick={() => setFillOpen(false)}>Cancel</Button>}
      >
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 10 }}>
          Pool: {filterQuestions(questions, { subjectName: subjectName || undefined, gradeName: gradeName || undefined }).length} approved questions
          {subjectName ? ` for ${subjectName}` : ''}{gradeName ? ` · ${gradeName}` : ''}. Set the subject/grade above to narrow the pool.
        </p>
        <Field label="Blueprint">
          <Select
            value=""
            onChange={(e) => e.target.value && runFill(e.target.value)}
            placeholder="Choose a blueprint…"
            options={blueprintMenuOptions}
          />
        </Field>
      </Modal>
    </div>
  );
}

/* ============================ Picker modal ============================ */

function PickerModal({
  open,
  onClose,
  questions,
  loading,
  usedIds,
  defaultSubject,
  defaultGrade,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  questions: Question[];
  loading: boolean;
  usedIds: Set<string>;
  defaultSubject?: string;
  defaultGrade?: string;
  onAdd: (items: PaperItem[]) => void;
}) {
  const [search, setSearch] = useState('');
  const [subjectName, setSubjectName] = useState(defaultSubject ?? '');
  const [gradeName, setGradeName] = useState(defaultGrade ?? '');
  const [type, setType] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const subjectOptions = useMemo(
    () => [...new Set(questions.map((q) => q.subjectName).filter(Boolean) as string[])].sort().map((n) => ({ value: n, label: n })),
    [questions],
  );
  const gradeOptions = useMemo(
    () => [...new Set(questions.flatMap((q) => q.gradeNames ?? []))].sort().map((n) => ({ value: n, label: n })),
    [questions],
  );

  const filtered = useMemo(
    () => filterQuestions(questions, { search, subjectName, gradeName, type, difficulty }).filter((q) => !usedIds.has(q.id)),
    [questions, search, subjectName, gradeName, type, difficulty, usedIds],
  );

  const toggle = (qid: string) => setSelected((s) => { const n = new Set(s); if (n.has(qid)) n.delete(qid); else n.add(qid); return n; });

  const add = () => {
    const items = questions.filter((q) => selected.has(q.id)).map(questionToItem);
    onAdd(items);
  };

  const selMarks = questions.filter((q) => selected.has(q.id)).reduce((a, q) => a + q.marks, 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon="book"
      tone="gold"
      size="lg"
      title="Add questions"
      description="Filter the bank and tick the questions to add to this section."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="gold" leftIcon="plus" disabled={selected.size === 0} onClick={add}>
            Add {selected.size} ({selMarks} marks)
          </Button>
        </>
      }
    >
      <div style={{ marginBottom: 10 }}>
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" leftIcon="search" />
      </div>
      <div className="qp-filters" style={{ marginBottom: 12 }}>
        <Select value={subjectName} onChange={(e) => setSubjectName(e.target.value)} options={[{ value: '', label: 'All subjects' }, ...subjectOptions]} aria-label="Subject" />
        <Select value={gradeName} onChange={(e) => setGradeName(e.target.value)} options={[{ value: '', label: 'All grades' }, ...gradeOptions]} aria-label="Grade" />
        <Select value={type} onChange={(e) => setType(e.target.value)} options={[{ value: '', label: 'All types' }, ...QUESTION_TYPE_OPTIONS]} aria-label="Type" />
        <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}
          options={[{ value: '', label: 'All difficulties' }, ...(Object.keys(DIFFICULTY_META) as (keyof typeof DIFFICULTY_META)[]).map((d) => ({ value: d, label: DIFFICULTY_META[d].label }))]} aria-label="Difficulty" />
      </div>

      {loading ? (
        <Skeleton height={200} />
      ) : filtered.length === 0 ? (
        <EmptyState icon="search" title="No matching questions" message="Adjust filters, or add more questions to the bank (approved status is not required to pick manually)." />
      ) : (
        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {filtered.map((q) => {
            const on = selected.has(q.id);
            return (
              <div key={q.id} className="qp-q" style={{ cursor: 'pointer' }} onClick={() => toggle(q.id)} role="button" aria-pressed={on}>
                <div className="qp-q__check">
                  <span className={`qp-chip${on ? ' is-on' : ''}`} style={{ width: 26, height: 26, padding: 0, justifyContent: 'center' }} aria-hidden="true">{on ? '✓' : ''}</span>
                </div>
                <div className="qp-q__body">
                  <div className="qp-q__stem">{q.stem}</div>
                  <div className="qp-q__tags">
                    <Badge variant="info">{QUESTION_TYPE_META[q.type].short}</Badge>
                    <Badge variant={DIFFICULTY_META[q.difficulty]?.variant ?? 'muted'}>{DIFFICULTY_META[q.difficulty]?.label}</Badge>
                    <Badge variant="muted">{q.marks}m</Badge>
                    <span className="qp-q__tag">{[q.subjectName, (q.gradeNames ?? [])[0], q.chapter].filter(Boolean).join(' · ')}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
