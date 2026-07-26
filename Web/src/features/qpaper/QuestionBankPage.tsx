import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Panel } from '@/components/Panel';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Input, Select } from '@/components/form';
import { ConfirmModal } from '@/components/Modal';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { ReviewModeNote } from '@/components/ReviewModeNote';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useGrades, useSubjects } from '@/features/school/data';
import {
  BLOOM_META,
  DIFFICULTY_META,
  QUESTION_STATUS_OPTIONS,
  QUESTION_TYPE_META,
  QUESTION_TYPE_OPTIONS,
  type Bloom,
  type Difficulty,
  type Question,
} from '@/types/qpaper';
import { useQuestions, deleteQuestion, seedQuestions, type Actor } from './data';
import { SAMPLE_QUESTIONS, SAMPLE_COUNT } from './sampleQuestions';
import './qpaper.css';

/** Apply all bank filters to a question list (shared with the paper picker). */
export function filterQuestions(
  questions: Question[],
  f: {
    search?: string;
    subjectName?: string;
    gradeName?: string;
    type?: string;
    bloom?: string;
    difficulty?: string;
    status?: string;
    competency?: string;
  },
): Question[] {
  const search = f.search?.trim().toLowerCase();
  return questions.filter((q) => {
    if (search && !`${q.stem} ${q.chapter ?? ''} ${q.topic ?? ''}`.toLowerCase().includes(search)) return false;
    if (f.subjectName && q.subjectName !== f.subjectName) return false;
    if (f.gradeName && !(q.gradeNames ?? []).includes(f.gradeName)) return false;
    if (f.type && q.type !== f.type) return false;
    if (f.bloom && q.bloom !== f.bloom) return false;
    if (f.difficulty && q.difficulty !== f.difficulty) return false;
    if (f.status && q.status !== f.status) return false;
    if (f.competency === 'yes' && !q.competency) return false;
    if (f.competency === 'no' && q.competency) return false;
    return true;
  });
}

export function QuestionBankPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member, can } = useSession();
  const canRead = can('exams.read');
  // Operate (add/edit/delete questions, load samples) is owned by teachers/exam-control; leadership reviews.
  const { canOperate: canWrite, isReviewer, ownerLabel } = useOwnership('qpaper');
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };

  const { data: questions, loading, error } = useQuestions(canRead ? schoolId : undefined);
  const { data: subjects } = useSubjects(schoolId);
  const { data: grades } = useGrades(schoolId);

  const [search, setSearch] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [gradeName, setGradeName] = useState('');
  const [type, setType] = useState('');
  const [bloom, setBloom] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [status, setStatus] = useState('');
  const [competency, setCompetency] = useState('');
  const [deleting, setDeleting] = useState<Question | null>(null);
  const [busy, setBusy] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Subjects/grades may not be configured; fall back to whatever subjects/grades
  // are referenced by existing questions so filters still work.
  const subjectOptions = useMemo(() => {
    const names = new Set<string>();
    subjects.forEach((s) => names.add(s.name));
    questions.forEach((q) => q.subjectName && names.add(q.subjectName));
    return [...names].sort().map((n) => ({ value: n, label: n }));
  }, [subjects, questions]);

  const gradeOptions = useMemo(() => {
    const names = new Set<string>();
    grades.forEach((g) => names.add(g.name));
    questions.forEach((q) => (q.gradeNames ?? []).forEach((n) => names.add(n)));
    return [...names].sort().map((n) => ({ value: n, label: n }));
  }, [grades, questions]);

  const filtered = useMemo(
    () => filterQuestions(questions, { search, subjectName, gradeName, type, bloom, difficulty, status, competency }),
    [questions, search, subjectName, gradeName, type, bloom, difficulty, status, competency],
  );

  const loadSamples = async () => {
    if (!schoolId) return;
    setSeeding(true);
    try {
      const n = await seedQuestions(schoolId, SAMPLE_QUESTIONS, actor);
      toast.success(`Loaded ${n} sample questions`, 'CBSE Science, Maths, Social Science & English.');
    } catch {
      toast.error('Could not load sample questions');
    } finally {
      setSeeding(false);
    }
  };

  const confirmDelete = async () => {
    if (!schoolId || !deleting) return;
    setBusy(true);
    try {
      await deleteQuestion(schoolId, deleting.id, actor);
      toast.success('Question deleted');
      setDeleting(null);
    } catch {
      toast.error('Could not delete');
    } finally {
      setBusy(false);
    }
  };

  if (!canRead) {
    return (
      <div className="nx-page">
        <Panel>
          <EmptyState icon="lock" title="No access" message="You don't have permission to view the question bank." />
        </Panel>
      </div>
    );
  }

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Question Bank</h1>
          <p className="nx-page__sub">
            Your tagged, reusable pool of questions — the foundation for every paper. Filter by subject, chapter, type,
            Bloom level, difficulty and competency.
          </p>
        </div>
      </div>

      {isReviewer && !canWrite && <ReviewModeNote owner={ownerLabel} />}

      <div className="qp-toolbar">
        <div className="qp-grow">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search stem, chapter or topic…"
            leftIcon="search"
            aria-label="Search questions"
          />
        </div>
        <Button variant="ghost" leftIcon="file-text" onClick={() => navigate('/question-papers/papers')}>
          Papers
        </Button>
        <Button variant="ghost" leftIcon="copy" onClick={() => navigate('/question-papers/blueprints')}>
          Blueprints
        </Button>
        {canWrite && (
          <Button variant="gold" leftIcon="plus" onClick={() => navigate('/question-papers/questions/new')}>
            Add question
          </Button>
        )}
      </div>

      <div className="qp-filters">
        <Select value={subjectName} onChange={(e) => setSubjectName(e.target.value)}
          options={[{ value: '', label: 'All subjects' }, ...subjectOptions]} aria-label="Subject" />
        <Select value={gradeName} onChange={(e) => setGradeName(e.target.value)}
          options={[{ value: '', label: 'All grades' }, ...gradeOptions]} aria-label="Grade" />
        <Select value={type} onChange={(e) => setType(e.target.value)}
          options={[{ value: '', label: 'All types' }, ...QUESTION_TYPE_OPTIONS]} aria-label="Type" />
        <Select value={bloom} onChange={(e) => setBloom(e.target.value)}
          options={[{ value: '', label: 'All Bloom levels' }, ...(Object.keys(BLOOM_META) as Bloom[]).map((b) => ({ value: b, label: BLOOM_META[b].label }))]} aria-label="Bloom" />
        <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}
          options={[{ value: '', label: 'All difficulties' }, ...(Object.keys(DIFFICULTY_META) as Difficulty[]).map((d) => ({ value: d, label: DIFFICULTY_META[d].label }))]} aria-label="Difficulty" />
        <Select value={competency} onChange={(e) => setCompetency(e.target.value)}
          options={[{ value: '', label: 'Competency: any' }, { value: 'yes', label: 'Competency only' }, { value: 'no', label: 'Non-competency' }]} aria-label="Competency" />
        <Select value={status} onChange={(e) => setStatus(e.target.value)}
          options={[{ value: '', label: 'All statuses' }, ...QUESTION_STATUS_OPTIONS]} aria-label="Status" />
      </div>

      {loading ? (
        <Skeleton height={280} />
      ) : error ? (
        <Panel><EmptyState icon="alert-triangle" title="Could not load questions" message="Please try again." /></Panel>
      ) : questions.length === 0 ? (
        <Panel>
          <EmptyState
            icon="book"
            title="Your question bank is empty"
            message={canWrite ? 'Add questions one by one, or load a set of realistic CBSE samples to explore the feature.' : 'No questions have been added yet.'}
            action={
              canWrite ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <Button variant="gold" leftIcon="plus" onClick={() => navigate('/question-papers/questions/new')}>Add question</Button>
                  <Button variant="subtle" leftIcon="download" loading={seeding} onClick={loadSamples}>Load {SAMPLE_COUNT} sample questions</Button>
                </div>
              ) : undefined
            }
          />
        </Panel>
      ) : (
        <Panel
          title={`${filtered.length} of ${questions.length} question${questions.length === 1 ? '' : 's'}`}
          headerRight={
            canWrite ? (
              <Button variant="ghost" size="sm" leftIcon="download" loading={seeding} onClick={loadSamples}>
                Load samples
              </Button>
            ) : undefined
          }
        >
          {filtered.length === 0 ? (
            <EmptyState icon="search" title="No matches" message="Adjust the filters to see more questions." />
          ) : (
            <div>
              {filtered.map((qn) => (
                <QuestionRow
                  key={qn.id}
                  q={qn}
                  canWrite={canWrite}
                  onEdit={() => navigate(`/question-papers/questions/${qn.id}`)}
                  onDelete={() => setDeleting(qn)}
                />
              ))}
            </div>
          )}
        </Panel>
      )}

      <ConfirmModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        tone="danger"
        icon="x"
        loading={busy}
        title="Delete this question?"
        message={deleting ? `"${deleting.stem.slice(0, 80)}${deleting.stem.length > 80 ? '…' : ''}" will be permanently removed from the bank. Papers already built keep their own snapshot.` : ''}
        confirmLabel="Delete"
      />
    </div>
  );
}

function QuestionRow({ q, canWrite, onEdit, onDelete }: { q: Question; canWrite: boolean; onEdit: () => void; onDelete: () => void }) {
  const diff = DIFFICULTY_META[q.difficulty];
  return (
    <div className="qp-q">
      <div className="qp-q__body">
        <div className="qp-q__stem">{q.stem}</div>
        <div className="qp-q__tags">
          <Badge variant="info">{QUESTION_TYPE_META[q.type].short}</Badge>
          <Badge variant={diff?.variant ?? 'muted'}>{diff?.label ?? q.difficulty}</Badge>
          <Badge variant="muted">{q.marks} mark{q.marks === 1 ? '' : 's'}</Badge>
          {q.competency && <Badge variant="success">Competency</Badge>}
          <span className="qp-q__tag">
            {[q.subjectName, (q.gradeNames ?? [])[0], q.chapter, BLOOM_META[q.bloom]?.label].filter(Boolean).join(' · ')}
          </span>
        </div>
      </div>
      {canWrite && (
        <div className="qp-q__actions">
          <Button variant="ghost" size="sm" leftIcon="edit" aria-label="Edit question" onClick={onEdit} />
          <Button variant="ghost" size="sm" leftIcon="x" aria-label="Delete question" onClick={onDelete} />
        </div>
      )}
    </div>
  );
}
