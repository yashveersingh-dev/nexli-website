import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Panel } from '@/components/Panel';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Field, Input, Select, Textarea, Toggle } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useGrades, useSubjects } from '@/features/school/data';
import {
  BLOOM_OPTIONS,
  BOARD_OPTIONS,
  DIFFICULTY_OPTIONS,
  OPTION_TYPES,
  QUESTION_STATUS_OPTIONS,
  QUESTION_TYPE_META,
  QUESTION_TYPE_OPTIONS,
  type Board,
  type Bloom,
  type Difficulty,
  type Question,
  type QuestionOption,
  type QuestionStatus,
  type QuestionType,
} from '@/types/qpaper';
import { useQuestion, createQuestion, updateQuestion, type Actor } from './data';
import './qpaper.css';

const OPTION_KEYS = ['A', 'B', 'C', 'D'] as const;

export function QuestionFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  // Authoring questions is an operate action; leadership (reviewers) gets the view-only gate.
  const canWrite = useOwnership('qpaper').canOperate;
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };
  const isEdit = !!id;

  const { data: existing, loading } = useQuestion(schoolId, id);
  const { data: subjects } = useSubjects(schoolId);
  const { data: grades } = useGrades(schoolId);

  // ---- controlled form state ----
  const [type, setType] = useState<QuestionType>('mcq');
  const [stem, setStem] = useState('');
  const [opts, setOpts] = useState<string[]>(['', '', '', '']);
  const [correct, setCorrect] = useState<string[]>([]);
  const [answer, setAnswer] = useState('');
  const [solution, setSolution] = useState('');
  const [markingScheme, setMarkingScheme] = useState('');
  const [imageUrls, setImageUrls] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [gradeName, setGradeName] = useState('');
  const [chapter, setChapter] = useState('');
  const [topic, setTopic] = useState('');
  const [subTopic, setSubTopic] = useState('');
  const [loCode, setLoCode] = useState('');
  const [bloom, setBloom] = useState<Bloom>('understand');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [competency, setCompetency] = useState(false);
  const [marks, setMarks] = useState('1');
  const [expectedTime, setExpectedTime] = useState('');
  const [board, setBoard] = useState<Board>('CBSE');
  const [source, setSource] = useState('');
  const [pyqYear, setPyqYear] = useState('');
  const [status, setStatus] = useState<QuestionStatus>('approved');
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);

  // Hydrate when editing.
  useEffect(() => {
    if (!isEdit || !existing) return;
    setType(existing.type);
    setStem(existing.stem);
    setOpts([0, 1, 2, 3].map((i) => existing.options?.[i]?.text ?? ''));
    setCorrect(existing.correct ?? []);
    setAnswer(existing.answer ?? '');
    setSolution(existing.solution ?? '');
    setMarkingScheme(existing.markingScheme ?? '');
    setImageUrls((existing.imageUrls ?? []).join('\n'));
    setSubjectName(existing.subjectName ?? '');
    setGradeName((existing.gradeNames ?? [])[0] ?? '');
    setChapter(existing.chapter ?? '');
    setTopic(existing.topic ?? '');
    setSubTopic(existing.subTopic ?? '');
    setLoCode(existing.loCode ?? '');
    setBloom(existing.bloom);
    setDifficulty(existing.difficulty);
    setCompetency(!!existing.competency);
    setMarks(String(existing.marks ?? 1));
    setExpectedTime(existing.expectedTimeMins != null ? String(existing.expectedTimeMins) : '');
    setBoard((existing.boards ?? [])[0] ?? 'CBSE');
    setSource(existing.source ?? '');
    setPyqYear(existing.pyqYear != null ? String(existing.pyqYear) : '');
    setStatus(existing.status);
  }, [isEdit, existing]);

  const hasOptions = OPTION_TYPES.includes(type);
  const multiCorrect = type === 'mcq_multi';

  const subjectOptions = useMemo(
    () => [...new Set(subjects.map((s) => s.name))].sort().map((n) => ({ value: n, label: n })),
    [subjects],
  );
  const gradeOptions = useMemo(
    () => [...grades].sort((a, b) => a.order - b.order).map((g) => ({ value: g.name, label: g.name })),
    [grades],
  );

  const marksNum = Number(marks);
  const stemError = touched && !stem.trim() ? 'Question text is required' : undefined;
  const marksError = touched && (!Number.isFinite(marksNum) || marksNum < 0) ? 'Enter valid marks' : undefined;
  const optionError = touched && hasOptions && (!opts[0].trim() || !opts[1].trim()) ? 'At least options A and B are required' : undefined;

  const toggleCorrect = (key: string) => {
    if (multiCorrect) {
      setCorrect((c) => (c.includes(key) ? c.filter((k) => k !== key) : [...c, key]));
    } else {
      setCorrect([key]);
    }
  };

  const save = async () => {
    setTouched(true);
    if (!schoolId) return;
    if (!stem.trim() || (hasOptions && (!opts[0].trim() || !opts[1].trim())) || !Number.isFinite(marksNum) || marksNum < 0) {
      return;
    }
    setBusy(true);

    const options: QuestionOption[] | undefined = hasOptions
      ? OPTION_KEYS.map((k, i) => ({ key: k, text: opts[i].trim() })).filter((o) => o.text)
      : undefined;
    const validKeys = options?.map((o) => o.key) ?? [];
    const correctKeys = hasOptions ? correct.filter((k) => validKeys.includes(k)) : undefined;

    const payload: Omit<Question, 'id'> = {
      schoolId,
      type,
      stem: stem.trim(),
      options,
      correct: correctKeys && correctKeys.length ? correctKeys : type === 'true_false' && answer ? [answer] : undefined,
      answer: !hasOptions && answer.trim() ? answer.trim() : undefined,
      solution: solution.trim() || undefined,
      markingScheme: markingScheme.trim() || undefined,
      imageUrls: imageUrls.split(/[\n,]/).map((s) => s.trim()).filter(Boolean),
      subjectName: subjectName.trim() || undefined,
      gradeNames: gradeName ? [gradeName] : undefined,
      chapter: chapter.trim() || undefined,
      topic: topic.trim() || undefined,
      subTopic: subTopic.trim() || undefined,
      loCode: loCode.trim() || undefined,
      bloom,
      difficulty,
      competency,
      marks: marksNum,
      expectedTimeMins: expectedTime ? Number(expectedTime) : undefined,
      boards: [board],
      source: source.trim() || undefined,
      pyqYear: pyqYear ? Number(pyqYear) : undefined,
      language: 'en',
      status,
    };
    // Strip empty arrays so Firestore stays tidy.
    if (payload.imageUrls && payload.imageUrls.length === 0) payload.imageUrls = undefined;

    try {
      if (isEdit && existing) {
        await updateQuestion(schoolId, existing.id, payload, actor);
        toast.success('Question updated');
      } else {
        await createQuestion(schoolId, payload, actor);
        toast.success('Question added');
      }
      navigate('/question-papers');
    } catch {
      toast.error('Could not save the question');
    } finally {
      setBusy(false);
    }
  };

  if (!canWrite) {
    return (
      <div className="nx-page">
        <EmptyState icon="lock" title="View only" message="You don't have permission to edit questions."
          action={<Button variant="subtle" onClick={() => navigate('/question-papers')}>Back to bank</Button>} />
      </div>
    );
  }
  if (isEdit && loading) return <div className="nx-page"><Skeleton height={120} /><div style={{ height: 12 }} /><Skeleton height={360} /></div>;
  if (isEdit && !existing) {
    return (
      <div className="nx-page">
        <EmptyState icon="book" title="Question not found"
          action={<Button variant="subtle" onClick={() => navigate('/question-papers')}>Back to bank</Button>} />
      </div>
    );
  }

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">{isEdit ? 'Edit question' : 'New question'}</h1>
          <p className="nx-page__sub">Tag thoroughly — good tags make auto-generated papers balanced. Maths in plain text / Unicode (e.g. x², √, ≤).</p>
        </div>
      </div>

      <Panel title="Question">
        <div className="grid g-2">
          <Field label="Type" required>
            <Select value={type} onChange={(e) => { setType(e.target.value as QuestionType); setCorrect([]); }} options={QUESTION_TYPE_OPTIONS} />
          </Field>
          <Field label="Marks" required error={marksError}>
            <Input type="number" min={0} value={marks} onChange={(e) => setMarks(e.target.value)} />
          </Field>
        </div>

        <Field label="Question text (stem)" required error={stemError} hint="Use Unicode for maths: x² + 2x, √, ≤, π, °, ×, ÷.">
          <Textarea value={stem} onChange={(e) => setStem(e.target.value)} rows={3} autoResize placeholder="Type the question…" />
        </Field>

        {hasOptions && (
          <Field label="Options" required error={optionError} hint={multiCorrect ? 'Tick all correct options.' : 'Tick the single correct option.'}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {OPTION_KEYS.map((k, i) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    className={`qp-chip${correct.includes(k) ? ' is-on' : ''}`}
                    style={{ minWidth: 42, justifyContent: 'center' }}
                    aria-pressed={correct.includes(k)}
                    aria-label={`Mark option ${k} correct`}
                    onClick={() => toggleCorrect(k)}
                  >
                    {k}
                  </button>
                  <div style={{ flex: 1 }}>
                    <Input value={opts[i]} onChange={(e) => setOpts((o) => o.map((v, idx) => (idx === i ? e.target.value : v)))} placeholder={`Option ${k}${i > 1 ? ' (optional)' : ''}`} />
                  </div>
                </div>
              ))}
            </div>
          </Field>
        )}

        {type === 'true_false' && (
          <Field label="Correct answer" hint="Used in the auto answer key.">
            <Select value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Select…"
              options={[{ value: 'True', label: 'True' }, { value: 'False', label: 'False' }]} />
          </Field>
        )}

        {!hasOptions && type !== 'true_false' && (
          <Field label="Model answer" optional hint="Shown in the answer key.">
            <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={2} autoResize placeholder="Expected answer / key points…" />
          </Field>
        )}

        <div className="grid g-2">
          <Field label="Worked solution" optional hint="Detailed solution for the key.">
            <Textarea value={solution} onChange={(e) => setSolution(e.target.value)} rows={2} autoResize placeholder="Step-by-step solution…" />
          </Field>
          <Field label="Marking scheme" optional hint="Step-mark notes.">
            <Textarea value={markingScheme} onChange={(e) => setMarkingScheme(e.target.value)} rows={2} autoResize placeholder="e.g. 1 mark for formula, 1 for substitution…" />
          </Field>
        </div>

        <Field label="Image URLs" optional hint="Paste links (one per line). Phase 1 stores URLs only — no upload yet.">
          <Textarea value={imageUrls} onChange={(e) => setImageUrls(e.target.value)} rows={2} placeholder="https://…" />
        </Field>
      </Panel>

      <div style={{ height: 14 }} />

      <Panel title="Tags" sub="The differentiator — drives filtering and blueprint auto-fill.">
        <div className="grid g-2">
          <Field label="Subject" optional>
            <Select value={subjectName} onChange={(e) => setSubjectName(e.target.value)} placeholder="Select / type below"
              options={subjectOptions} />
          </Field>
          <Field label="Subject (free text)" optional hint="If your subject isn't listed above.">
            <Input value={subjectName} onChange={(e) => setSubjectName(e.target.value)} placeholder="e.g. Science" />
          </Field>
        </div>
        <div className="grid g-2">
          <Field label="Grade / Class" optional>
            <Select value={gradeName} onChange={(e) => setGradeName(e.target.value)} placeholder="Select grade"
              options={gradeOptions.length ? gradeOptions : [{ value: gradeName, label: gradeName || '—' }]} />
          </Field>
          <Field label="LO code" optional hint="NCERT learning-outcome code.">
            <Input value={loCode} onChange={(e) => setLoCode(e.target.value)} placeholder="e.g. C10-SCI-1.2" />
          </Field>
        </div>
        <div className="grid g-3">
          <Field label="Chapter" optional>
            <Input value={chapter} onChange={(e) => setChapter(e.target.value)} placeholder="e.g. Electricity" />
          </Field>
          <Field label="Topic" optional>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Ohm's law" />
          </Field>
          <Field label="Sub-topic" optional>
            <Input value={subTopic} onChange={(e) => setSubTopic(e.target.value)} placeholder="optional" />
          </Field>
        </div>
        <div className="grid g-3">
          <Field label="Bloom level" required>
            <Select value={bloom} onChange={(e) => setBloom(e.target.value as Bloom)} options={BLOOM_OPTIONS} />
          </Field>
          <Field label="Difficulty" required>
            <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)} options={DIFFICULTY_OPTIONS} />
          </Field>
          <Field label="Board" optional>
            <Select value={board} onChange={(e) => setBoard(e.target.value as Board)} options={BOARD_OPTIONS} />
          </Field>
        </div>
        <div className="grid g-3">
          <Field label="Expected time (mins)" optional>
            <Input type="number" min={0} value={expectedTime} onChange={(e) => setExpectedTime(e.target.value)} placeholder="optional" />
          </Field>
          <Field label="Source" optional>
            <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. NCERT pg 112, PYQ" />
          </Field>
          <Field label="PYQ year" optional>
            <Input type="number" min={0} value={pyqYear} onChange={(e) => setPyqYear(e.target.value)} placeholder="e.g. 2023" />
          </Field>
        </div>
        <div className="grid g-2">
          <Field label="Status" required>
            <Select value={status} onChange={(e) => setStatus(e.target.value as QuestionStatus)} options={QUESTION_STATUS_OPTIONS} />
          </Field>
          <Field label="Competency-based (NEP)" optional>
            <Toggle checked={competency} onChange={setCompetency} label="Competency / HOTS question" />
          </Field>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          <Badge variant="muted">Tip</Badge> Only <strong>approved</strong> questions are used by blueprint auto-fill.
          {' '}This is a <strong>{QUESTION_TYPE_META[type].label}</strong>.
        </p>
      </Panel>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <Button variant="gold" leftIcon="check" loading={busy} onClick={save}>{isEdit ? 'Save changes' : 'Add question'}</Button>
        <Button variant="ghost" onClick={() => navigate('/question-papers')} disabled={busy}>Cancel</Button>
      </div>
    </div>
  );
}
