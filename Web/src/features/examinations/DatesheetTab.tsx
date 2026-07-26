import { useMemo, useState } from 'react';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Modal, ConfirmModal } from '@/components/Modal';
import { Field, Input, Select } from '@/components/form';
import { Icon } from '@/components/Icon';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { useSession } from '@/app/providers/SessionProvider';
import { useGrades, useSubjects } from '@/features/school/data';
import { useExamPapers, createExamPaper, updateExamPaper, deleteExamPaper } from '@/features/daily/data';
import { formatDate } from '@/lib/format';
import type { Exam, ExamPaper } from '@/types/daily';
import { sortPapers, endTimeLabel } from './shared';

interface PaperDraft {
  gradeId: string;
  subjectId: string;
  date: string;
  startTime: string;
  durationMins: string;
  maxMarks: string;
  passMarks: string;
  roomName: string;
}

const emptyDraft = (gradeId = ''): PaperDraft => ({
  gradeId,
  subjectId: '',
  date: '',
  startTime: '',
  durationMins: '180',
  maxMarks: '100',
  passMarks: '33',
  roomName: '',
});

export function DatesheetTab({ exam }: { exam: Exam }) {
  const { schoolId, uid, member, can } = useSession();
  const canWrite = can('exams.write');
  const toast = useToast();
  const { data: papers, loading, error } = useExamPapers(schoolId, exam.id);
  const { data: grades } = useGrades(schoolId);
  const { data: subjects } = useSubjects(schoolId);

  const [editing, setEditing] = useState<ExamPaper | null | undefined>(undefined); // undefined=closed, null=new
  const [removing, setRemoving] = useState<ExamPaper | null>(null);
  const [draft, setDraft] = useState<PaperDraft>(emptyDraft());
  const [busy, setBusy] = useState(false);

  const actor = { uid: uid ?? 'unknown', name: member?.name };
  const gradeName = (gid?: string) => grades.find((g) => g.id === gid)?.name ?? '';
  const examGrades = useMemo(
    () => grades.filter((g) => !exam.gradeIds?.length || exam.gradeIds.includes(g.id)).sort((a, b) => a.order - b.order),
    [grades, exam.gradeIds],
  );

  const sorted = useMemo(() => sortPapers(papers), [papers]);

  const open = (p: ExamPaper | null) => {
    setEditing(p);
    setDraft(
      p
        ? {
            gradeId: p.gradeId ?? '',
            subjectId: p.subjectId ?? '',
            date: p.date ? new Date(p.date).toISOString().slice(0, 10) : '',
            startTime: p.startTime ?? '',
            durationMins: p.durationMins != null ? String(p.durationMins) : '',
            maxMarks: p.maxMarks != null ? String(p.maxMarks) : '',
            passMarks: p.passMarks != null ? String(p.passMarks) : '',
            roomName: p.roomName ?? '',
          }
        : emptyDraft(examGrades[0]?.id ?? ''),
    );
  };

  const validMax = draft.maxMarks !== '' && Number(draft.maxMarks) > 0;
  const passOverMax = draft.passMarks !== '' && draft.maxMarks !== '' && Number(draft.passMarks) > Number(draft.maxMarks);
  const canSave = !!draft.subjectId && validMax && !passOverMax;

  const save = async () => {
    if (!schoolId || !canSave) return;
    setBusy(true);
    try {
      const subject = subjects.find((s) => s.id === draft.subjectId);
      const payload: Omit<ExamPaper, 'id'> = {
        schoolId,
        examId: exam.id,
        gradeId: draft.gradeId || undefined,
        gradeName: gradeName(draft.gradeId) || undefined,
        subjectId: draft.subjectId,
        subjectName: subject?.name,
        date: draft.date ? new Date(draft.date).getTime() : undefined,
        startTime: draft.startTime || undefined,
        durationMins: draft.durationMins ? Number(draft.durationMins) : undefined,
        maxMarks: Number(draft.maxMarks),
        passMarks: draft.passMarks ? Number(draft.passMarks) : undefined,
        roomName: draft.roomName.trim() || undefined,
      };
      if (editing) await updateExamPaper(schoolId, editing.id, payload, actor);
      else await createExamPaper(schoolId, payload, actor);
      toast.success(editing ? 'Paper updated' : 'Paper added', subject?.name);
      setEditing(undefined);
    } catch {
      toast.error('Could not save paper', 'It will sync when you are back online.');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!schoolId || !removing) return;
    setBusy(true);
    try {
      await deleteExamPaper(schoolId, removing.id, actor);
      toast.success('Paper removed');
      setRemoving(null);
    } catch {
      toast.error('Could not remove paper');
    } finally {
      setBusy(false);
    }
  };

  const subjectOptions = [
    { value: '', label: 'Select a subject' },
    ...subjects
      .filter((s) => !draft.gradeId || !s.gradeIds?.length || s.gradeIds.includes(draft.gradeId))
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((s) => ({ value: s.id, label: s.name })),
  ];

  return (
    <div>
      <div className="nx-exam-toolbar">
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Exam datesheet</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
            {loading ? 'Loading…' : `${sorted.length} subject paper${sorted.length === 1 ? '' : 's'} scheduled — one per subject (date, time, room, marks)`}
          </div>
        </div>
        {canWrite && <Button variant="gold" size="sm" leftIcon="plus" onClick={() => open(null)} disabled={examGrades.length === 0}>Add subject paper</Button>}
      </div>

      {loading ? (
        <div className="nx-ds-list">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={64} radius={10} />)}</div>
      ) : error ? (
        <EmptyState icon="alert-triangle" title="Could not load datesheet" message="Check your connection and try again." />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon="calendar"
          title="Create the datesheet"
          message={canWrite ? 'Build the exam schedule by adding a paper for each subject — date, time, room and marks.' : 'The datesheet has not been prepared yet.'}
          action={canWrite && examGrades.length > 0 ? <Button variant="gold" leftIcon="plus" onClick={() => open(null)}>Create datesheet</Button> : undefined}
        />
      ) : (
        <div className="nx-ds-list">
          {sorted.map((p) => <PaperRow key={p.id} paper={p} canWrite={canWrite} onEdit={() => open(p)} onDelete={() => setRemoving(p)} />)}
        </div>
      )}

      {/* Paper editor */}
      <Modal
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        icon="file-text"
        tone="gold"
        title={editing ? 'Edit exam paper' : 'Add exam paper'}
        size="md"
        dismissible={!busy}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(undefined)} disabled={busy}>Cancel</Button>
            <Button variant="gold" leftIcon="check" loading={busy} disabled={!canSave} onClick={save}>Save</Button>
          </>
        }
      >
        <div className="grid g-2">
          {examGrades.length > 1 && (
            <Field label="Grade">
              <Select value={draft.gradeId} onChange={(e) => setDraft((d) => ({ ...d, gradeId: e.target.value, subjectId: '' }))}
                options={examGrades.map((g) => ({ value: g.id, label: g.name }))} />
            </Field>
          )}
          <Field label="Subject" required>
            <Select value={draft.subjectId} onChange={(e) => setDraft((d) => ({ ...d, subjectId: e.target.value }))} placeholder="Select a subject" options={subjectOptions} />
          </Field>
        </div>
        <div className="grid g-2">
          <Field label="Date"><Input type="date" value={draft.date} onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))} /></Field>
          <Field label="Start time"><Input type="time" value={draft.startTime} onChange={(e) => setDraft((d) => ({ ...d, startTime: e.target.value }))} /></Field>
        </div>
        <div className="grid g-3">
          <Field label="Duration (mins)"><Input type="number" inputMode="numeric" min={0} value={draft.durationMins} onChange={(e) => setDraft((d) => ({ ...d, durationMins: e.target.value }))} placeholder="180" /></Field>
          <Field label="Max marks" required>
            <Input type="number" inputMode="numeric" min={1} invalid={draft.maxMarks !== '' && !validMax} value={draft.maxMarks} onChange={(e) => setDraft((d) => ({ ...d, maxMarks: e.target.value }))} placeholder="100" />
          </Field>
          <Field label="Pass marks" error={passOverMax ? 'Above max' : undefined}>
            <Input type="number" inputMode="numeric" min={0} invalid={passOverMax} value={draft.passMarks} onChange={(e) => setDraft((d) => ({ ...d, passMarks: e.target.value }))} placeholder="33" />
          </Field>
        </div>
        <Field label="Room" optional><Input value={draft.roomName} onChange={(e) => setDraft((d) => ({ ...d, roomName: e.target.value }))} placeholder="e.g. Exam Hall A" /></Field>
      </Modal>

      <ConfirmModal
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={confirmDelete}
        tone="danger"
        loading={busy}
        title="Remove paper?"
        message={`"${removing?.subjectName ?? 'This paper'}" will be removed from the datesheet.`}
        confirmLabel="Remove"
      />
    </div>
  );
}

function PaperRow({ paper, canWrite, onEdit, onDelete }: { paper: ExamPaper; canWrite: boolean; onEdit: () => void; onDelete: () => void }) {
  const endTime = endTimeLabel(paper.startTime, paper.durationMins);
  return (
    <div className="nx-ds-row">
      <div className="nx-ds-row__date" aria-hidden={!paper.date}>
        {paper.date ? (
          <>
            <span className="nx-ds-row__day">{formatDate(paper.date, 'ddd')}</span>
            <span className="nx-ds-row__dnum">{formatDate(paper.date, 'D')}</span>
            <span className="nx-ds-row__mon">{formatDate(paper.date, 'MMM')}</span>
          </>
        ) : (
          <span className="nx-ds-row__mon">TBA</span>
        )}
      </div>
      <div className="nx-ds-row__main">
        <div className="nx-ds-row__subject">{paper.subjectName ?? 'Untitled'}{paper.gradeName ? ` · ${paper.gradeName}` : ''}</div>
        <div className="nx-ds-row__sub">
          {paper.startTime && (
            <span className="nx-ds-row__chip"><Icon name="clock" size={13} />{paper.startTime}{endTime ? `–${endTime}` : ''}</span>
          )}
          {paper.maxMarks != null && (
            <span className="nx-ds-row__chip"><Icon name="award" size={13} />Max {paper.maxMarks}{paper.passMarks != null ? ` · Pass ${paper.passMarks}` : ''}</span>
          )}
          {paper.roomName && (
            <span className="nx-ds-row__chip"><Icon name="building" size={13} />{paper.roomName}</span>
          )}
          {!paper.date && <Badge variant="muted">Date TBA</Badge>}
        </div>
      </div>
      {canWrite && (
        <div className="nx-ds-row__actions">
          <Button variant="ghost" size="sm" leftIcon="edit" onClick={onEdit} aria-label={`Edit ${paper.subjectName ?? 'paper'}`} />
          <Button variant="ghost" size="sm" leftIcon="x" onClick={onDelete} aria-label={`Remove ${paper.subjectName ?? 'paper'}`} />
        </div>
      )}
    </div>
  );
}
