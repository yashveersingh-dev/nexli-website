import { useMemo, useState } from 'react';
import { Sheet } from '@/components/Sheet';
import { Button } from '@/components/Button';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { Skeleton } from '@/components/feedback';
import { useStaff } from '@/features/school/data';
import type { RoleId } from '@/types/roles';
import { tierForRole, tierLabel } from '../policy';
import type { EscalationTier } from '../types';

interface Assignee {
  uid: string;
  name: string;
  role?: RoleId;
}

interface Props {
  open: boolean;
  schoolId?: string;
  /** The tier the thread will move *to* (next rung up). */
  targetTier: EscalationTier;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (reason: string, assignee?: Assignee) => void;
}

/**
 * Escalation dialog: capture a reason and optionally hand the thread to a
 * specific staff member at the target tier. The candidate list is derived
 * read-only from the staff directory, filtered to people whose role occupies
 * `targetTier` — so escalating to "Coordinator" only offers coordinators/HODs.
 */
export function EscalateSheet({ open, schoolId, targetTier, busy, onClose, onConfirm }: Props) {
  const { data: staff, loading } = useStaff(schoolId);
  const [reason, setReason] = useState('');
  const [assignee, setAssignee] = useState<Assignee | null>(null);

  const candidates = useMemo<Assignee[]>(
    () =>
      staff
        .filter((s) => s.uid && s.status !== 'resigned' && s.status !== 'retired')
        .filter((s) => tierForRole(s.roleId) === targetTier)
        .map((s) => ({ uid: s.uid as string, name: s.name, role: s.roleId }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [staff, targetTier],
  );

  const confirm = () => {
    onConfirm(reason, assignee ?? undefined);
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Escalate to ${tierLabel(targetTier)}`}
      description="Raise this thread to the next tier. Assignment is optional."
      side="bottom"
      size="lg"
      footer={
        <div className="nx-esc-foot">
          <Button variant="ghost" size="md" onClick={onClose} disabled={busy}>
            <span>Cancel</span>
          </Button>
          <Button variant="gold" size="md" leftIcon="trending-up" onClick={confirm} loading={busy}>
            <span>Escalate</span>
          </Button>
        </div>
      }
    >
      <div className="nx-esc">
        <label className="nx-esc__field">
          <span className="nx-esc__label">Reason</span>
          <textarea
            className="nx-esc__textarea"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this being escalated?"
            rows={3}
            aria-label="Escalation reason"
          />
        </label>

        <div className="nx-esc__field">
          <span className="nx-esc__label">
            Assign to <span className="nx-esc__optional">(optional)</span>
          </span>
          {loading ? (
            <div className="nx-esc__cands">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="nx-esc__cand">
                  <Skeleton width={32} height={32} radius={999} />
                  <Skeleton width="55%" height={12} />
                </div>
              ))}
            </div>
          ) : candidates.length === 0 ? (
            <p className="nx-esc__none">
              No {tierLabel(targetTier).toLowerCase()} on record — it will be left for them to pick up.
            </p>
          ) : (
            <ul className="nx-esc__cands" role="listbox" aria-label={`${tierLabel(targetTier)} candidates`}>
              {candidates.map((c) => {
                const sel = assignee?.uid === c.uid;
                return (
                  <li key={c.uid}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={sel}
                      className={sel ? 'nx-esc__cand is-sel' : 'nx-esc__cand'}
                      onClick={() => setAssignee(sel ? null : c)}
                    >
                      <Avatar name={c.name} size={32} />
                      <span className="nx-esc__cand-name">{c.name}</span>
                      {sel && <Icon name="check" size={16} aria-hidden="true" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Sheet>
  );
}
