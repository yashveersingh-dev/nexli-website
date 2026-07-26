import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Panel } from '@/components/Panel';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import { Skeleton, EmptyState } from '@/components/feedback';
import { Select, Textarea } from '@/components/form';
import { ConfirmModal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { formatDate, formatRelative } from '@/lib/format';
import { useSession } from '@/app/providers/SessionProvider';
import { useIepPlan, updateIepPlan, deleteIepPlan } from '@/features/analytics/data';
import { IEP_GOAL_STATUS_META, IEP_STATUS_META } from '@/features/analytics/meta';
import { ConfidentialNote } from '../components/Confidential';
import { isReviewDue, goalsAchieved } from '../iepSchema';
import { appendProgress, goalLog, type GoalWithLog } from '../progressLog';
import type { IepGoal, IepGoalStatus, IepPlan } from '@/types/special';
import '../sped.css';

const GOAL_STATUS_OPTIONS = (Object.keys(IEP_GOAL_STATUS_META) as IepGoalStatus[]).map((v) => ({
  value: v,
  label: IEP_GOAL_STATUS_META[v].label,
}));

/** Confidential IEP plan file: profile, per-goal progress + quick status updates. */
export function IepDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member, can } = useSession();
  const canRead = can('iep.read');
  const canWrite = can('iep.write');
  const { data: plan, loading } = useIepPlan(schoolId, canRead ? id : undefined);

  const [savingGoal, setSavingGoal] = useState<number | null>(null);
  const [goalNotes, setGoalNotes] = useState<Record<number, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const back = () => navigate('/sped');
  const actor = { uid: uid ?? 'unknown', name: member?.name };

  if (!schoolId) {
    return (
      <div className="nx-page">
        <EmptyState icon="school" title="No school context" />
      </div>
    );
  }
  // Defense-in-depth: IEP/CWSN files are sensitive (disability data) and limited
  // to special educators. The Hub gates the list; re-gate the deep-linkable detail.
  if (!canRead) {
    return (
      <div className="nx-page">
        <Panel>
          <EmptyState
            icon="lock"
            title="Restricted"
            message="IEP records are limited to special educators."
            action={<Button variant="subtle" onClick={back}>Back</Button>}
          />
        </Panel>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="nx-page">
        <Skeleton height={360} />
      </div>
    );
  }
  if (!plan) {
    return (
      <div className="nx-page">
        <Panel>
          <EmptyState
            icon="file-text"
            title="Plan not found"
            action={
              <Button variant="subtle" onClick={back}>
                Back
              </Button>
            }
          />
        </Panel>
      </div>
    );
  }

  const reviewDue = isReviewDue(plan) || plan.status === 'review_due';
  const st = IEP_STATUS_META[reviewDue && plan.status !== 'closed' ? 'review_due' : plan.status];
  const total = plan.goals?.length ?? 0;
  const done = goalsAchieved(plan.goals);

  const setGoalStatus = async (index: number, status: IepGoalStatus) => {
    if (!plan.goals) return;
    const note = goalNotes[index];
    // Append-only: record the change in the goal's progressLog rather than
    // overwriting history. `appendProgress` also updates the goal's `status`.
    const goals: IepGoal[] = plan.goals.map((g, i) =>
      i === index ? appendProgress(g as GoalWithLog, status, actor, note) : g,
    );
    setSavingGoal(index);
    try {
      await updateIepPlan(schoolId, plan.id, { goals }, actor);
      toast.success('Goal updated', IEP_GOAL_STATUS_META[status].label);
      setGoalNotes((n) => {
        const { [index]: _drop, ...rest } = n;
        return rest;
      });
    } catch {
      toast.error('Could not update', 'Please try again.');
    } finally {
      setSavingGoal(null);
    }
  };

  const onDelete = async () => {
    setDeleting(true);
    try {
      await deleteIepPlan(schoolId, plan.id, actor);
      toast.success('Plan deleted', plan.studentName);
      navigate('/sped');
    } catch {
      toast.error('Could not delete', 'Please try again.');
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="nx-page">
      <div className="nx-page__head" style={{ alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, minWidth: 0 }}>
          <button type="button" className="nx-formpage__back" onClick={back} aria-label="Go back">
            <Icon name="chevron-left" size={18} />
          </button>
          <div style={{ minWidth: 0 }}>
            <h1 className="nx-page__title" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Icon name="user" size={18} aria-hidden="true" /> {plan.studentName}
            </h1>
            <p className="nx-page__sub">
              {plan.gradeName ? `${plan.gradeName} · ` : ''}
              {plan.disability || 'Individualised Education Plan'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <Badge variant={st.variant}>{st.label}</Badge>
          {canWrite && (
            <Button variant="subtle" size="sm" leftIcon="edit" onClick={() => navigate(`/sped/${plan.id}/edit`)}>
              Edit
            </Button>
          )}
        </div>
      </div>

      <ConfidentialNote />

      {reviewDue && plan.status !== 'closed' && (
        <div className="sped-banner sped-banner--warn" role="status">
          <Icon name="clock" size={15} aria-hidden="true" />
          <span>
            <strong>Review due.</strong>{' '}
            {plan.reviewDate ? `The review date (${formatDate(plan.reviewDate)}) has passed.` : 'This plan is marked for review.'}
          </span>
        </div>
      )}

      <div className="sped-detail-grid">
        <div className="sped-detail-main">
          <Panel title="Profile">
            <div className="sped-fields">
              <DetailField label="Disability" value={plan.disability} />
              <DetailField label="Diagnosis" value={plan.diagnosis} />
              <DetailField label="Strengths" value={plan.strengths} pre />
              <DetailField label="Needs" value={plan.needs} pre />
              {plan.accommodations && plan.accommodations.length > 0 && (
                <div className="sped-field">
                  <div className="sped-field__label">Accommodations</div>
                  <div className="sped-chiplist">
                    {plan.accommodations.map((a, i) => (
                      <span className="sped-chip sped-chip--static" key={`${a}-${i}`}>
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Panel>

          <Panel
            title="Goals"
            headerRight={
              <span className="sped-goalcount">
                {done}/{total} achieved
              </span>
            }
          >
            {total === 0 ? (
              <EmptyState icon="info" title="No goals recorded" />
            ) : (
              <div className="sped-goals">
                {plan.goals.map((g, i) => (
                  <GoalCard
                    key={i}
                    goal={g}
                    index={i}
                    canWrite={canWrite}
                    saving={savingGoal === i}
                    note={goalNotes[i] ?? ''}
                    onNote={(v) => setGoalNotes((n) => ({ ...n, [i]: v }))}
                    onStatus={(status) => void setGoalStatus(i, status)}
                  />
                ))}
              </div>
            )}
          </Panel>
        </div>

        <div className="sped-detail-side">
          <Panel title="Plan details">
            <div className="sped-fields">
              <DetailField label="Start date" value={plan.startDate ? formatDate(plan.startDate) : undefined} />
              <DetailField
                label="Next review"
                value={
                  plan.reviewDate
                    ? `${formatDate(plan.reviewDate)} (${formatRelative(plan.reviewDate)})`
                    : undefined
                }
              />
              {plan.teamMembers && plan.teamMembers.length > 0 && (
                <div className="sped-field">
                  <div className="sped-field__label">Support team</div>
                  <div className="sped-chiplist">
                    {plan.teamMembers.map((m, i) => (
                      <span className="sped-chip sped-chip--static" key={`${m}-${i}`}>
                        <Icon name="user" size={11} aria-hidden="true" /> {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {plan.createdAt && (
                <DetailField label="Created" value={`${formatDate(plan.createdAt)}`} />
              )}
            </div>
          </Panel>

          {canWrite && (
            <Panel title="Manage">
              <Button variant="danger" leftIcon="minus-circle" block onClick={() => setConfirmDelete(true)}>
                Delete plan
              </Button>
            </Panel>
          )}
        </div>
      </div>

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={onDelete}
        tone="danger"
        loading={deleting}
        title="Delete this IEP plan?"
        message={`The plan for ${plan.studentName} and its goals will be permanently removed.`}
        confirmLabel="Delete plan"
      />
    </div>
  );
}

function DetailField({ label, value, pre }: { label: string; value?: string; pre?: boolean }) {
  if (!value) return null;
  return (
    <div className="sped-field">
      <div className="sped-field__label">{label}</div>
      <div className={pre ? 'sped-field__value sped-field__value--pre' : 'sped-field__value'}>{value}</div>
    </div>
  );
}

function GoalCard({
  goal,
  index,
  canWrite,
  saving,
  note,
  onNote,
  onStatus,
}: {
  goal: IepGoal;
  index: number;
  canWrite: boolean;
  saving: boolean;
  note: string;
  onNote: (value: string) => void;
  onStatus: (status: IepGoalStatus) => void;
}) {
  const gs = IEP_GOAL_STATUS_META[goal.status];
  const log = goalLog(goal as GoalWithLog);
  // Newest first for the timeline.
  const entries = [...log].sort((a, b) => b.at - a.at);
  return (
    <div className="sped-goalcard">
      <div className="sped-goalcard__top">
        <span className="sped-goalcard__area">{goal.area}</span>
        <Badge variant={gs.variant}>{gs.label}</Badge>
      </div>
      <div className="sped-goalcard__goal">{goal.goal}</div>
      {goal.strategy && <div className="sped-goalcard__strategy">{goal.strategy}</div>}
      <div className="sped-goalcard__foot">
        {goal.targetDate && (
          <span className="sped-goalcard__date">
            <Icon name="calendar" size={12} aria-hidden="true" /> Target {formatDate(goal.targetDate)}
          </span>
        )}
        {canWrite && (
          <label className="sped-goalcard__set">
            <span className="sr-only">Update goal {index + 1} status</span>
            <Select
              size="sm"
              aria-label={`Update goal ${index + 1} status`}
              value={goal.status}
              disabled={saving}
              onChange={(e) => onStatus(e.target.value as IepGoalStatus)}
              options={GOAL_STATUS_OPTIONS}
            />
          </label>
        )}
      </div>

      {canWrite && (
        <Textarea
          className="sped-goalcard__note"
          rows={2}
          autoResize
          value={note}
          disabled={saving}
          onChange={(e) => onNote(e.target.value)}
          aria-label={`Progress note for goal ${index + 1}`}
          placeholder="Optional progress note — saved when you change the status above."
        />
      )}

      {entries.length > 0 && (
        <div className="sped-goalcard__log">
          <div className="sped-goalcard__log-title">Progress history</div>
          <ol className="sped-timeline">
            {entries.map((e, j) => {
              const es = IEP_GOAL_STATUS_META[e.status as IepGoalStatus];
              return (
                <li className="sped-timeline__item" key={`${e.at}-${j}`}>
                  <span className="sped-timeline__dot" aria-hidden="true" />
                  <div className="sped-timeline__body">
                    <div className="sped-timeline__head">
                      <Badge variant={es?.variant ?? 'muted'}>{es?.label ?? e.status}</Badge>
                      <span className="sped-timeline__when">{formatDate(e.at)}</span>
                      {e.byName && <span className="sped-timeline__who">· {e.byName}</span>}
                    </div>
                    {e.note && <div className="sped-timeline__note">{e.note}</div>}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}

export type { IepPlan };
