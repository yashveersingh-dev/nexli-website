import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Panel } from '@/components/Panel';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Modal } from '@/components/Modal';
import { Field, Input, Select } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { useSession } from '@/app/providers/SessionProvider';
import {
  BOARD_OPTIONS,
  QUESTION_TYPE_META,
  QUESTION_TYPE_OPTIONS,
  type Board,
  type BlueprintSection,
  type PaperBlueprint,
  type QuestionType,
} from '@/types/qpaper';
import { useBlueprints, createBlueprint, type Actor } from './data';
import { SEED_BLUEPRINTS } from './blueprints';
import './qpaper.css';

interface DraftSection {
  label: string;
  instruction: string;
  questionType: QuestionType;
  marksEach: string;
  count: string;
}

const emptyDraftSection = (label: string): DraftSection => ({
  label,
  instruction: '',
  questionType: 'mcq',
  marksEach: '1',
  count: '5',
});

export function BlueprintsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member, can } = useSession();
  const canRead = can('exams.read');
  const canWrite = can('exams.write');
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };

  const { data: tenantBlueprints, loading } = useBlueprints(canRead ? schoolId : undefined);

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [board, setBoard] = useState<Board>('CBSE');
  const [durationMins, setDurationMins] = useState('180');
  const [sections, setSections] = useState<DraftSection[]>([emptyDraftSection('Section A')]);

  const draftTotal = sections.reduce((sum, s) => sum + (Number(s.marksEach) || 0) * (Number(s.count) || 0), 0);

  const resetForm = () => {
    setName('');
    setBoard('CBSE');
    setDurationMins('180');
    setSections([emptyDraftSection('Section A')]);
  };

  const addSection = () => {
    const label = `Section ${String.fromCharCode(65 + sections.length)}`;
    setSections((s) => [...s, emptyDraftSection(label)]);
  };
  const updateSection = (i: number, patch: Partial<DraftSection>) =>
    setSections((s) => s.map((sec, idx) => (idx === i ? { ...sec, ...patch } : sec)));
  const removeSection = (i: number) => setSections((s) => s.filter((_, idx) => idx !== i));

  const save = async () => {
    if (!schoolId || !name.trim()) return;
    setBusy(true);
    const built: BlueprintSection[] = sections
      .filter((s) => s.label.trim() && Number(s.count) > 0)
      .map((s) => ({
        label: s.label.trim(),
        instruction: s.instruction.trim() || undefined,
        questionType: s.questionType,
        marksEach: Number(s.marksEach) || 0,
        count: Number(s.count) || 0,
      }));
    const payload: Omit<PaperBlueprint, 'id'> = {
      schoolId,
      name: name.trim(),
      board,
      totalMarks: draftTotal,
      durationMins: Number(durationMins) || 0,
      sections: built,
    };
    try {
      await createBlueprint(schoolId, payload, actor);
      toast.success('Blueprint saved', payload.name);
      setOpen(false);
      resetForm();
    } catch {
      toast.error('Could not save the blueprint');
    } finally {
      setBusy(false);
    }
  };

  if (!canRead) {
    return (
      <div className="nx-page">
        <Panel><EmptyState icon="lock" title="No access" message="You don't have permission to view blueprints." /></Panel>
      </div>
    );
  }

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Blueprints</h1>
          <p className="nx-page__sub">Reusable paper patterns — sections, question types, marks and counts. Auto-fill a paper from any of these in one click.</p>
        </div>
      </div>

      <div className="qp-toolbar">
        <Button variant="ghost" leftIcon="file-text" onClick={() => navigate('/question-papers/papers')}>Papers</Button>
        <div className="qp-grow" />
        {canWrite && <Button variant="gold" leftIcon="plus" onClick={() => { resetForm(); setOpen(true); }}>New blueprint</Button>}
      </div>

      <Panel title="Built-in patterns" sub="Ready to use — no setup needed.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {SEED_BLUEPRINTS.map((b) => (
            <BlueprintRow key={b.id} bp={b} builtin onUse={() => navigate(`/question-papers/papers/new?blueprint=${encodeURIComponent(b.id)}`)} canUse={canWrite} />
          ))}
        </div>
      </Panel>

      <div style={{ height: 14 }} />

      <Panel title="Your blueprints">
        {loading ? (
          <Skeleton height={120} />
        ) : tenantBlueprints.length === 0 ? (
          <EmptyState icon="copy" title="No custom blueprints" message={canWrite ? 'Create one to match your school\'s exam pattern.' : 'Custom blueprints will appear here.'} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {tenantBlueprints.map((b) => (
              <BlueprintRow key={b.id} bp={b} onUse={() => navigate(`/question-papers/papers/new?blueprint=${encodeURIComponent(b.id)}`)} canUse={canWrite} />
            ))}
          </div>
        )}
      </Panel>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        icon="copy"
        tone="gold"
        size="lg"
        title="New blueprint"
        description="Define the sections, each with a question type, marks per question and count."
        dismissible={!busy}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button variant="gold" leftIcon="check" loading={busy} disabled={!name.trim() || sections.length === 0} onClick={save}>Save blueprint</Button>
          </>
        }
      >
        <div className="grid g-3">
          <Field label="Name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Class IX Maths SA-2" />
          </Field>
          <Field label="Board" optional>
            <Select value={board} onChange={(e) => setBoard(e.target.value as Board)} options={BOARD_OPTIONS} />
          </Field>
          <Field label="Duration (mins)" optional>
            <Input type="number" min={0} value={durationMins} onChange={(e) => setDurationMins(e.target.value)} />
          </Field>
        </div>

        <div className="qp-meter" style={{ marginTop: 4 }}>
          <span className="qp-meter__label">Total: {draftTotal} marks</span>
          <span className="qp-meter__sub">{sections.length} section{sections.length === 1 ? '' : 's'}</span>
        </div>

        {sections.map((s, i) => (
          <div key={i} className="qp-section">
            <div className="qp-section__head">
              <div style={{ flex: 1 }}>
                <Input value={s.label} onChange={(e) => updateSection(i, { label: e.target.value })} placeholder="Section label" />
              </div>
              {sections.length > 1 && <Button variant="ghost" size="sm" leftIcon="x" aria-label="Remove section" onClick={() => removeSection(i)} />}
            </div>
            <div className="grid g-3">
              <Field label="Question type">
                <Select value={s.questionType} onChange={(e) => updateSection(i, { questionType: e.target.value as QuestionType })} options={QUESTION_TYPE_OPTIONS} />
              </Field>
              <Field label="Marks each">
                <Input type="number" min={0} value={s.marksEach} onChange={(e) => updateSection(i, { marksEach: e.target.value })} />
              </Field>
              <Field label="Count">
                <Input type="number" min={0} value={s.count} onChange={(e) => updateSection(i, { count: e.target.value })} />
              </Field>
            </div>
            <Field label="Instruction" optional>
              <Input value={s.instruction} onChange={(e) => updateSection(i, { instruction: e.target.value })} placeholder="e.g. All questions are compulsory." />
            </Field>
          </div>
        ))}

        <Button variant="subtle" leftIcon="plus" onClick={addSection}>Add section</Button>
      </Modal>
    </div>
  );
}

function BlueprintRow({ bp, builtin, onUse, canUse }: { bp: PaperBlueprint | (Omit<PaperBlueprint, 'schoolId'> & { schoolId?: string }); builtin?: boolean; onUse: () => void; canUse: boolean }) {
  const summary = bp.sections
    .map((s) => `${s.count}×${QUESTION_TYPE_META[s.questionType].short}(${s.marksEach})`)
    .join('  ·  ');
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px', borderBottom: '1px solid var(--border, rgba(255,255,255,0.06))' }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <strong style={{ fontSize: 13.5 }}>{bp.name}</strong>
          {builtin && <Badge variant="info">Built-in</Badge>}
          {bp.board && <Badge variant="muted">{bp.board}</Badge>}
          <Badge variant="muted">{bp.totalMarks} marks</Badge>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3 }}>{summary}</div>
      </div>
      {canUse && <Button variant="ghost" size="sm" leftIcon="file-text" onClick={onUse}>Use</Button>}
    </div>
  );
}
