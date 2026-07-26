import { useMemo, useState } from 'react';
import { Sheet } from '@/components/Sheet';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useStaff } from '@/features/school/data';
import type { RoleId } from '@/types/roles';
import { canInitiateTo, isFamilyRole } from '../policy';
import type { Recipient } from '../types';

interface Props {
  open: boolean;
  schoolId?: string;
  /** Current user's uid — excluded from the recipient list. */
  meUid: string;
  /** Current user's role — drives the recipient policy (who may be messaged). */
  myRole?: RoleId;
  onClose: () => void;
  onPick: (recipient: Recipient) => void;
}

/**
 * Bottom-sheet recipient picker. Lists active staff (excluding self), searchable.
 * Enforces the recipient policy (`canInitiateTo`): a parent/student sees only
 * front-line teachers/coordinators — never Principal/VP/Director — so leadership
 * is reached by escalation, not as a default DM target.
 */
export function NewMessageSheet({ open, schoolId, meUid, myRole, onClose, onPick }: Props) {
  const { data: staff, loading } = useStaff(schoolId);
  const [q, setQ] = useState('');
  const iAmFamily = isFamilyRole(myRole);

  const people = useMemo<Recipient[]>(() => {
    const term = q.trim().toLowerCase();
    return staff
      .filter((s) => s.uid && s.uid !== meUid && s.status !== 'resigned' && s.status !== 'retired')
      // Recipient policy: only offer people the current user may initiate to.
      .filter((s) => canInitiateTo(myRole, s.roleId))
      .map((s) => ({
        uid: s.uid as string, name: s.name, designation: s.designation,
        photoUrl: s.photoUrl, role: s.roleId,
      }))
      .filter((r) => !term || r.name.toLowerCase().includes(term) || (r.designation ?? '').toLowerCase().includes(term))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [staff, meUid, myRole, q]);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="New message"
      description={
        iAmFamily
          ? 'Reach a teacher or coordinator. Leadership is contacted by escalation.'
          : 'Choose a colleague to start a conversation.'
      }
      side="bottom"
      size="lg"
    >
      <div className="nx-picker">
        {iAmFamily && (
          <p className="nx-picker__note" role="note">
            <Icon name="info" size={14} aria-hidden="true" />
            <span>Messages go to your child’s teachers and coordinators first.</span>
          </p>
        )}
        <div className="nx-picker__search">
          <Icon name="search" size={16} aria-hidden="true" />
          <input
            type="search"
            className="nx-picker__input"
            placeholder="Search staff…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search staff"
            autoComplete="off"
          />
        </div>

        {loading ? (
          <div className="nx-picker__list">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="nx-picker__skel">
                <Skeleton width={40} height={40} radius={999} />
                <Skeleton width="55%" height={12} />
              </div>
            ))}
          </div>
        ) : people.length === 0 ? (
          <EmptyState
            icon="users"
            title={q ? 'No matches' : iAmFamily ? 'No staff available' : 'No colleagues yet'}
            message={
              q
                ? 'Try a different name.'
                : iAmFamily
                  ? 'Your child’s teachers and coordinators will appear here.'
                  : 'Staff records will appear here once added.'
            }
          />
        ) : (
          <ul className="nx-picker__list" role="list">
            {people.map((r) => (
              <li key={r.uid}>
                <button type="button" className="nx-picker__item" onClick={() => onPick(r)}>
                  <Avatar name={r.name} src={r.photoUrl} size={40} />
                  <span className="nx-picker__meta">
                    <span className="nx-picker__name">{r.name}</span>
                    {r.designation && <span className="nx-picker__role">{r.designation}</span>}
                  </span>
                  <Icon name="chevron-right" size={16} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Sheet>
  );
}
