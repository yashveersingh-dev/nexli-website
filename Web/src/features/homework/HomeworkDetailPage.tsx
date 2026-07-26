import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { Modal } from '@/components/Modal';
import { Input, Select, Textarea } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useStudents, useGrades, useSections } from '@/features/school/data';
import { useScopedSectionIds } from '@/features/academics/shared';
import { writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { tenantDoc } from '@/lib/db';
import { writeAuditEvent } from '@/lib/audit';
import { useHomework, useHomeworkSubmissions, upsertSubmission } from '@/features/daily/data';
import { HOMEWORK_STATUS_META } from '@/features/daily/meta';
import { formatDate } from '@/lib/format';
import type { HomeworkStatus, HomeworkSubmission } from '@/types/daily';
import { effectiveStatus, submissionId } from './homeworkSchema';
import { AttachmentList, resolveAttachments } from './AttachmentList';
import { sectionLabelOf } from './util';
import './homework.css';

const STATUS_ORDER: HomeworkStatus[] = ['missing', 'assigned', 'submitted', 'late', 'graded'];

interface RosterRow {
  studentId: string;
  name: string;
  rollNo?: string;
  photoUrl?: string;
  submission?: HomeworkSubmission;
  status: HomeworkStatus;
}

export function HomeworkDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const canWrite = useOwnership('homework').canOperate;

  const { data: homework, loading: hLoading } = useHomework(schoolId);
  const hw = homework.find((h) => h.id === id);
  const { data: submissions, loading: subLoading } = useHomeworkSubmissions(schoolId, id);
  const { data: students, loading: sLoading } = useStudents(schoolId);
  const { data: grades } = useGrades(schoolId);
  const { data: sections } = useSections(schoolId);
  const { isBroad, sectionIds } = useScopedSectionIds('homework', undefined, sections);

  const [grading, setGrading] = useState<RosterRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Capture now at mount; re-render is triggered by real data changes so this
  // is sufficiently fresh.  Do not put Date.now() inside useMemo deps or it
  // would recompute every millisecond.
  const now = useMemo(() => Date.now(), []);
  const actor = useMemo(() => ({ uid: uid ?? 'unknown', name: member?.name }), [uid, member]);

  const sectionId = hw?.sectionId ?? '';

  const roster = useMemo<RosterRow[]>(() => {
    if (!hw) return [];
    const subBy = new Map<string, HomeworkSubmission>();
    for (const s of submissions) subBy.set(s.studentId, s);
    return students
      .filter((s) => s.sectionId === sectionId && s.status === 'active')
      .sort((a, b) => (a.rollNo ?? a.fullName ?? '').localeCompare(b.rollNo ?? b.fullName ?? '', undefined, { numeric: true }))
      .map((s) => {
        const submission = subBy.get(s.id);
        return {
          studentId: s.id,
          name: s.fullName,
          rollNo: s.rollNo,
          photoUrl: s.photoUrl,
          submission,
          status: effectiveStatus(submission?.status, hw.dueDate, submission?.submittedAt, now),
        };
      });
  // `now` is intentionally stable (mount-time snapshot); omitting from deps is fine.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hw, students, sectionId, submissions]);

  const counts = useMemo(() => {
    const c: Record<HomeworkStatus, number> = { assigned: 0, submitted: 0, late: 0, graded: 0, missing: 0 };
    for (const r of roster) c[r.status] += 1;
    return c;
  }, [roster]);

  const sectionLabel = hw?.sectionName || sectionLabelOf(sectionId, sections, grades);

  if (hLoading && !hw) {
    return (
      <div className="nx-page">
        <Skeleton height={48} />
        <Panel>
          <Skeleton height={220} />
        </Panel>
      </div>
    );
  }

  if (!hw) {
    return (
      <div className="nx-page">
        <EmptyState
          icon="clipboard"
          title="Homework not found"
          message="It may have been deleted."
          action={
            <Button variant="subtle" onClick={() => navigate('/homework')}>
              Back to homework
            </Button>
          }
        />
      </div>
    );
  }

  // Scope guard: a scoped teacher must not open a homework (and its student
  // submissions) for a section they don't own.
  if (!isBroad && (!hw.sectionId || !sectionIds!.has(hw.sectionId))) {
    return (
      <div className="nx-page">
        <EmptyState
          icon="lock"
          title="Not your section"
          message="You can only view homework for the section(s) you are assigned."
          action={<Button variant="subtle" onClick={() => navigate('/homework')}>Back to homework</Button>}
        />
      </div>
    );
  }

  const overdue = hw.dueDate != null && now > hw.dueDate;
  const attachments = resolveAttachments(hw);

  const onDelete = async () => {
    if (!schoolId) return;
    setDeleting(true);
    try {
      // Cascade-delete: remove the homework AND its submission docs in one batch so
      // `homework_submissions` aren't orphaned (they'd otherwise linger forever,
      // keyed to a homework id that no longer exists). Firestore batches cap at 500
      // writes; chunk to stay within the limit for very large classes.
      const subIds = submissions.map((s) => s.id);
      const CHUNK = 450;
      for (let i = 0; i < subIds.length; i += CHUNK) {
        const batch = writeBatch(db);
        for (const sid of subIds.slice(i, i + CHUNK)) {
          batch.delete(tenantDoc(schoolId, 'homework_submissions', sid));
        }
        // Delete the homework doc itself in the final chunk (or its own batch if none).
        if (i + CHUNK >= subIds.length) batch.delete(tenantDoc(schoolId, 'homework', hw.id));
        await batch.commit();
      }
      if (subIds.length === 0) {
        const batch = writeBatch(db);
        batch.delete(tenantDoc(schoolId, 'homework', hw.id));
        await batch.commit();
      }
      void writeAuditEvent({ action: 'homework.deleted', schoolId, actor, targetType: 'homework', targetId: hw.id, summary: hw.title });
      toast.success('Homework deleted', hw.title);
      navigate('/homework');
    } catch {
      toast.error('Could not delete', 'Please try again.');
      setDeleting(false);
    }
  };

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <Button variant="ghost" size="sm" leftIcon="chevron-left" onClick={() => navigate('/homework')}>
          Back to homework
        </Button>
      </div>

      <Panel>
        <div className="nx-hw-head">
          <div style={{ minWidth: 0 }}>
            <h1 className="nx-page__title" style={{ marginBottom: 6 }}>{hw.title}</h1>
            <div className="nx-detail__meta">
              {hw.subjectName && <span>{hw.subjectName}</span>}
              {sectionLabel && (
                <>
                  {hw.subjectName && <span className="dot" aria-hidden="true" />}
                  <span>{sectionLabel}</span>
                </>
              )}
              {hw.assignedDate != null && (
                <>
                  <span className="dot" aria-hidden="true" />
                  <span>Assigned {formatDate(hw.assignedDate)}</span>
                </>
              )}
              {hw.dueDate != null && (
                <>
                  <span className="dot" aria-hidden="true" />
                  <span style={overdue ? { color: 'var(--danger)', fontWeight: 600 } : undefined}>Due {formatDate(hw.dueDate)}</span>
                </>
              )}
              {hw.maxMarks != null && (
                <>
                  <span className="dot" aria-hidden="true" />
                  <span>Max {hw.maxMarks}</span>
                </>
              )}
            </div>
          </div>
          {canWrite && (
            <div className="nx-hw-head__actions">
              <Button variant="subtle" size="sm" leftIcon="edit" onClick={() => navigate(`/homework/${hw.id}/edit`)}>
                Edit
              </Button>
              <Button variant="ghost" size="sm" leftIcon="x" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            </div>
          )}
        </div>

        {hw.description && <p className="nx-hw-desc">{hw.description}</p>}

        {attachments.length > 0 && (
          <div className="nx-hw-attach-block">
            <h2 className="nx-hw-attach-block__title">
              Attachments <span className="nx-hw-attach-block__count">{attachments.length}</span>
            </h2>
            <AttachmentList items={attachments} />
          </div>
        )}
      </Panel>

      {/* Summary chips */}
      <div className="nx-hw-chips" role="group" aria-label="Submission summary">
        {STATUS_ORDER.map((st) => {
          const meta = HOMEWORK_STATUS_META[st];
          return (
            <span key={st} className={`nx-hw-chip nx-hw-chip--${st}`}>
              <span className="nx-hw-chip__dot" aria-hidden="true" />
              <span className="nx-hw-chip__n">{counts[st]}</span>
              <span className="nx-hw-chip__l">{meta.label}</span>
            </span>
          );
        })}
      </div>

      <Panel title="Submission tracker" sub={`${roster.length} student${roster.length === 1 ? '' : 's'}`}>
        {sLoading || subLoading ? (
          <Skeleton height={240} />
        ) : roster.length === 0 ? (
          <EmptyState icon="users" title="No students in this section" message="Assign active students to this section to track submissions." />
        ) : (
          <div className="nx-hw-roster">
            {roster.map((r, i) => {
              const meta = HOMEWORK_STATUS_META[r.status];
              const marks = r.submission?.marks;
              return (
                <div className="nx-hw-row" key={r.studentId}>
                  <span className="nx-hw-row__no">{r.rollNo || i + 1}</span>
                  <Avatar name={r.name} src={r.photoUrl} size={32} />
                  <div className="nx-hw-row__main">
                    <span className="nx-hw-row__name">{r.name}</span>
                    {r.submission?.feedback && <span className="nx-hw-row__fb">{r.submission.feedback}</span>}
                  </div>
                  <div className="nx-hw-row__status">
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                    {hw.maxMarks != null && marks != null && (
                      <span className="nx-hw-row__marks">
                        {marks}
                        <span className="nx-hw-row__max">/{hw.maxMarks}</span>
                      </span>
                    )}
                  </div>
                  {canWrite && (
                    <Button
                      variant="subtle"
                      size="sm"
                      className="nx-hw-row__grade"
                      onClick={() => setGrading(r)}
                      aria-label={`Update ${r.name}`}
                    >
                      Update
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {grading && hw && (
        <GradeModal
          row={grading}
          maxMarks={hw.maxMarks}
          onClose={() => setGrading(null)}
          onSave={async (next) => {
            if (!schoolId) return;
            const sid = submissionId(hw.id, grading.studentId);
            const data: Omit<HomeworkSubmission, 'id'> = {
              schoolId,
              homeworkId: hw.id,
              studentId: grading.studentId,
              studentName: grading.name,
              status: next.status,
              marks: next.marks,
              feedback: next.feedback,
              submittedAt:
                grading.submission?.submittedAt ??
                (next.status === 'submitted' || next.status === 'late' || next.status === 'graded' ? Date.now() : undefined),
            };
            try {
              await upsertSubmission(schoolId, sid, data, actor);
              toast.success('Saved', `${grading.name} — ${HOMEWORK_STATUS_META[next.status].label}`);
              setGrading(null);
            } catch {
              toast.error('Could not save', 'It will sync when you are back online.');
            }
          }}
        />
      )}

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete homework?" size="sm">
        <p style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          "{hw.title}" and its submission records will be removed. This cannot be undone.
        </p>
        <div className="nx-hw-modal-actions">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="danger" leftIcon="x" loading={deleting} onClick={onDelete}>
            Delete homework
          </Button>
        </div>
      </Modal>
    </div>
  );
}

interface GradeValues {
  status: HomeworkStatus;
  marks?: number;
  feedback?: string;
}

const GRADE_STATUS_OPTIONS: { value: HomeworkStatus; label: string }[] = [
  { value: 'assigned', label: 'Assigned' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'late', label: 'Late' },
  { value: 'graded', label: 'Graded' },
  { value: 'missing', label: 'Missing' },
];

function GradeModal({
  row,
  maxMarks,
  onClose,
  onSave,
}: {
  row: RosterRow;
  maxMarks?: number;
  onClose: () => void;
  onSave: (v: GradeValues) => Promise<void>;
}) {
  const [status, setStatus] = useState<HomeworkStatus>(row.status);
  const [marks, setMarks] = useState<string>(row.submission?.marks != null ? String(row.submission.marks) : '');
  const [feedback, setFeedback] = useState<string>(row.submission?.feedback ?? '');
  const [saving, setSaving] = useState(false);

  // Seed from the row only when the targeted student changes or the submission
  // doc itself changes (detected via submittedAt). Depending on the whole `row`
  // object would re-seed on every parent render (new object reference from
  // useMemo) and reset in-progress edits.
  useEffect(() => {
    setStatus(row.status);
    setMarks(row.submission?.marks != null ? String(row.submission.marks) : '');
    setFeedback(row.submission?.feedback ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.studentId, row.submission?.submittedAt]);

  const marksNum = marks.trim() === '' ? undefined : Number(marks);
  const marksInvalid =
    marksNum != null && (Number.isNaN(marksNum) || marksNum < 0 || (maxMarks != null && marksNum > maxMarks));

  const submit = async () => {
    if (marksInvalid) return;
    setSaving(true);
    await onSave({
      status,
      marks: marksNum != null && !Number.isNaN(marksNum) ? marksNum : undefined,
      feedback: feedback.trim() || undefined,
    });
    setSaving(false);
  };

  return (
    <Modal open onClose={onClose} title={`Update — ${row.name}`} size="sm">
      <div className="nx-hw-grade">
        <label className="nx-hw-grade__field">
          <span className="nx-hw-grade__lbl">Status</span>
          <Select value={status} onChange={(e) => setStatus(e.target.value as HomeworkStatus)} options={GRADE_STATUS_OPTIONS} aria-label="Submission status" />
        </label>

        {maxMarks != null && (
          <label className="nx-hw-grade__field">
            <span className="nx-hw-grade__lbl">Marks (out of {maxMarks})</span>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              max={maxMarks}
              value={marks}
              invalid={marksInvalid}
              onChange={(e) => setMarks(e.target.value)}
              placeholder="—"
              aria-label={`Marks for ${row.name}, out of ${maxMarks}`}
            />
            {marksInvalid && (
              <span className="nx-field__error" role="alert">
                Enter a value between 0 and {maxMarks}.
              </span>
            )}
          </label>
        )}

        <label className="nx-hw-grade__field">
          <span className="nx-hw-grade__lbl">Feedback (optional)</span>
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={3}
            autoResize
            placeholder="A note for the student…"
            aria-label={`Feedback for ${row.name}`}
          />
        </label>
      </div>

      <div className="nx-hw-modal-actions">
        <Button variant="ghost" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="gold" leftIcon="check" loading={saving} disabled={marksInvalid} onClick={submit}>
          Save
        </Button>
      </div>
    </Modal>
  );
}
