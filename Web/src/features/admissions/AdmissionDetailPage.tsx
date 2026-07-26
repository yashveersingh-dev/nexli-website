import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Panel } from '@/components/Panel';
import { ConfirmModal } from '@/components/Modal';
import { Skeleton, EmptyState } from '@/components/feedback';
import { Input, Textarea } from '@/components/form';
import { useToast } from '@/components/Toast';
import { formatDate } from '@/lib/format';
import { useCan, useSession } from '@/app/providers/SessionProvider';
import {
  useAdmission,
  updateAdmission,
  admitApplicant,
  nextAdmissionNo,
  useGrades,
} from '@/features/school/data';
import { ConsentRequiredBanner } from '@/features/consent';
import '@/features/consent/consent.css';
import { ADMISSION_STAGE_META, CATEGORY_OPTIONS, GENDER_OPTIONS } from '@/features/school/meta';
import { ADMISSION_STAGES } from '@/types/sis';
import { admissionToStudent, ageFromDob } from './admissionSchema';
import './admissions.css';

const optLabel = <T extends string>(opts: { value: T; label: string }[], v?: T) =>
  opts.find((o) => o.value === v)?.label ?? v ?? '—';

export function AdmissionDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member, school } = useSession();
  const canWrite = useCan('students.write');
  const { data: a, loading } = useAdmission(schoolId, id);
  const { data: grades } = useGrades(schoolId);

  const [busy, setBusy] = useState(false);
  const [admitOpen, setAdmitOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [score, setScore] = useState('');
  const [notes, setNotes] = useState('');

  if (loading) {
    return (
      <div className="nx-page">
        <Skeleton width={52} height={52} radius={14} />
        <Panel><Skeleton height={240} /></Panel>
      </div>
    );
  }
  if (!a) {
    return (
      <div className="nx-page">
        <EmptyState
          icon="file-text"
          title="Application not found"
          action={<Button variant="subtle" leftIcon="chevron-left" onClick={() => navigate('/admissions')}>Back to admissions</Button>}
        />
      </div>
    );
  }

  const actor = { uid: uid ?? 'unknown', name: member?.name };
  const stageMeta = ADMISSION_STAGE_META[a.stage];
  const age = ageFromDob(a.dob);
  const isTerminal = ['admitted', 'rejected', 'waitlisted', 'withdrawn'].includes(a.stage);

  // Current position in the ordered pipeline (terminal stages map to -1).
  const stageIndex = ADMISSION_STAGES.indexOf(a.stage);
  // Generic "advance" only walks the review stages up to (and including) `offer`.
  // Reaching `admitted` must go through the Admit action, which also creates the
  // student record — otherwise an application could be flagged admitted with no
  // student and no `convertedStudentId`.
  const lastAdvanceableIndex = ADMISSION_STAGES.indexOf('offer');
  const nextStage = stageIndex >= 0 && stageIndex < lastAdvanceableIndex ? ADMISSION_STAGES[stageIndex + 1] : null;

  const patch = async (data: Parameters<typeof updateAdmission>[2], msg: string) => {
    if (!schoolId) return;
    setBusy(true);
    try {
      await updateAdmission(schoolId, id, data, actor);
      toast.success(msg);
    } catch {
      toast.error('Could not update', 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const advance = () => {
    if (nextStage) void patch({ stage: nextStage }, `Moved to ${ADMISSION_STAGE_META[nextStage].label}`);
  };

  const saveScore = () => {
    const n = Number(score);
    if (score.trim() === '' || Number.isNaN(n)) {
      toast.error('Enter a valid score');
      return;
    }
    void patch({ assessmentScore: n }, 'Assessment score saved').then(() => setScore(''));
  };

  const saveNotes = () => {
    if (!notes.trim()) return;
    void patch({ interviewNotes: notes.trim() }, 'Interview notes saved').then(() => setNotes(''));
  };

  const toggleDoc = (idx: number) => {
    const docs = (a.documents ?? []).map((d, i) => (i === idx ? { ...d, received: !d.received } : d));
    void patch({ documents: docs }, 'Checklist updated');
  };

  const admit = async () => {
    if (!schoolId) return;
    setBusy(true);
    try {
      const admissionNo = await nextAdmissionNo(schoolId, a.academicYear ?? school?.currentAcademicYear);
      const gradeName = grades.find((g) => g.id === a.gradeAppliedId)?.name;
      const studentPayload = admissionToStudent(a, {
        admissionNo,
        gradeName,
        academicYear: school?.currentAcademicYear,
      });
      // Create the student AND flip the admission to admitted in one atomic batch
      // so a network drop can't orphan a student with no convertedStudentId.
      const studentId = await admitApplicant(
        schoolId,
        id,
        { ...studentPayload, schoolId },
        actor,
        a.applicantName,
      );
      toast.success('Applicant admitted', a.applicantName);
      setAdmitOpen(false);
      navigate(`/students/${studentId}`);
    } catch {
      toast.error('Could not admit', 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="nx-page">
      <div className="nx-detail__head">
        <button type="button" className="nx-formpage__back" onClick={() => navigate('/admissions')} aria-label="Back to admissions">
          <Icon name="chevron-left" size={18} />
        </button>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 className="nx-page__title" style={{ fontSize: 20 }}>{a.applicantName}</h1>
          <div className="nx-detail__meta">
            <Badge variant={stageMeta.variant}>{stageMeta.label}</Badge>
            <span>{a.gradeAppliedName || 'Grade not set'}</span>
            {a.appliedDate && (
              <>
                <span className="dot" />
                <span>Applied {formatDate(a.appliedDate)}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Pipeline stepper */}
      <Panel title="Pipeline">
        <ol className="nx-stepper" aria-label="Admission pipeline">
          {ADMISSION_STAGES.map((st, i) => {
            const done = stageIndex >= 0 && i < stageIndex;
            const current = a.stage === st;
            const m = ADMISSION_STAGE_META[st];
            return (
              <li key={st} className={`nx-stepper__item${done ? ' is-done' : ''}${current ? ' is-current' : ''}`}>
                <span className="nx-stepper__dot" aria-hidden="true">
                  {done ? <Icon name="check-circle" size={14} /> : i + 1}
                </span>
                <span className="nx-stepper__label">{m.label}</span>
              </li>
            );
          })}
        </ol>
        {isTerminal && a.stage !== 'admitted' && (
          <p className="nx-stepper__note">
            This application is <strong>{stageMeta.label.toLowerCase()}</strong>.
          </p>
        )}
        {a.convertedStudentId && (
          <div style={{ marginTop: 12 }}>
            {/* DPDP HARD-GATE: the applicant is now an active student record, so
                processing their personal data requires recorded verifiable parental
                consent. This banner blocks/flags that prominently and, for consent
                staff, deep-links straight into recording it; others are told to
                contact the DPO. The student-edit screen enforces the same gate on
                save. */}
            <ConsentRequiredBanner studentId={a.convertedStudentId} />
            <Button variant="subtle" size="sm" leftIcon="arrow-right" onClick={() => navigate(`/students/${a.convertedStudentId}`)}>
              View student record
            </Button>
          </div>
        )}
      </Panel>

      <div className="grid g-2" style={{ marginTop: 16 }}>
        <Panel title="Applicant">
          <KV k="Full name" v={a.applicantName} />
          <KV k="Gender" v={optLabel(GENDER_OPTIONS, a.gender)} />
          <KV k="Date of birth" v={a.dob ? formatDate(a.dob) : '—'} />
          <KV k="Age" v={age != null ? `${age} years` : '—'} />
          <KV k="Grade applied" v={a.gradeAppliedName} />
          <KV k="Category" v={optLabel(CATEGORY_OPTIONS, a.category)} />
          <KV k="RTE application" v={a.rteApplication ? 'Yes' : 'No'} />
          <KV k="Source" v={a.source} />
        </Panel>

        <Panel title="Guardian & application">
          <KV k="Guardian" v={a.guardianName} />
          <KV k="Mobile" v={a.guardianPhone} />
          <KV k="Email" v={a.guardianEmail} />
          <KV k="Academic year" v={a.academicYear} />
          <KV k="Assessment score" v={a.assessmentScore != null ? String(a.assessmentScore) : '—'} />
          <KV k="Notes" v={a.notes} />
        </Panel>
      </div>

      {/* Document checklist */}
      <Panel title="Document checklist" className="nx-mt-16">
        {(a.documents ?? []).length === 0 ? (
          <EmptyState icon="file-text" title="No documents listed" />
        ) : (
          <ul className="nx-checklist">
            {(a.documents ?? []).map((d, i) => (
              <li key={i} className="nx-checklist__item">
                <button
                  type="button"
                  className={`nx-checklist__toggle${d.received ? ' is-on' : ''}`}
                  onClick={() => canWrite && toggleDoc(i)}
                  disabled={!canWrite || busy}
                  aria-pressed={!!d.received}
                >
                  <span className="nx-checklist__box" aria-hidden="true">
                    {d.received && <Icon name="check-circle" size={14} />}
                  </span>
                  <span className="nx-checklist__label">{d.label}</span>
                  <Badge variant={d.received ? 'success' : 'muted'}>{d.received ? 'Received' : 'Pending'}</Badge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* Stage actions */}
      {canWrite && !isTerminal && (
        <Panel title="Actions" className="nx-mt-16">
          <div className="nx-action-grid">
            {nextStage && (
              <div className="nx-action-row">
                <div className="nx-action-row__text">
                  <strong>Advance stage</strong>
                  <span>Move to {ADMISSION_STAGE_META[nextStage].label}</span>
                </div>
                <Button variant="gold" size="sm" leftIcon="arrow-right" loading={busy} onClick={advance}>
                  Advance
                </Button>
              </div>
            )}

            <div className="nx-action-row">
              <div className="nx-action-row__field">
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="Assessment score"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  aria-label="Assessment score"
                />
              </div>
              <Button variant="subtle" size="sm" leftIcon="award" loading={busy} onClick={saveScore}>
                Save score
              </Button>
            </div>

            <div className="nx-action-row nx-action-row--stack">
              <Textarea
                rows={2}
                placeholder="Interview notes…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                aria-label="Interview notes"
              />
              <Button variant="subtle" size="sm" leftIcon="edit" loading={busy} onClick={saveNotes}>
                Save notes
              </Button>
            </div>
          </div>

          <div className="nx-terminal-actions">
            <Button variant="gold" leftIcon="check-circle" disabled={busy} onClick={() => setAdmitOpen(true)}>
              Admit
            </Button>
            <Button variant="subtle" leftIcon="clock" disabled={busy} onClick={() => setWaitlistOpen(true)}>
              Waitlist
            </Button>
            <Button variant="danger" leftIcon="x" disabled={busy} onClick={() => setRejectOpen(true)}>
              Reject
            </Button>
          </div>
        </Panel>
      )}

      <ConfirmModal
        open={admitOpen}
        onClose={() => !busy && setAdmitOpen(false)}
        onConfirm={admit}
        title="Admit applicant"
        message={`Convert ${a.applicantName} into an active student? A new student record and admission number will be created.`}
        confirmLabel="Admit & create student"
        icon="check-circle"
        loading={busy}
      />
      <ConfirmModal
        open={waitlistOpen}
        onClose={() => !busy && setWaitlistOpen(false)}
        onConfirm={async () => {
          await patch({ stage: 'waitlisted' }, 'Application waitlisted');
          setWaitlistOpen(false);
        }}
        title="Waitlist application"
        message={`Move ${a.applicantName} to the waitlist?`}
        confirmLabel="Waitlist"
        icon="clock"
        loading={busy}
      />
      <ConfirmModal
        open={rejectOpen}
        onClose={() => !busy && setRejectOpen(false)}
        onConfirm={async () => {
          await patch({ stage: 'rejected' }, 'Application rejected');
          setRejectOpen(false);
        }}
        title="Reject application"
        message={`Reject ${a.applicantName}'s application? This can be reviewed later.`}
        confirmLabel="Reject"
        tone="danger"
        loading={busy}
      />
    </div>
  );
}

function KV({ k, v }: { k: string; v?: string | number | null }) {
  return (
    <div className="nx-kv">
      <span className="nx-kv__k">{k}</span>
      <span className="nx-kv__v">{v != null && v !== '' ? v : '—'}</span>
    </div>
  );
}
