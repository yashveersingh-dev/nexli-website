import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { formatRelative } from '@/lib/format';
import type { Conversation } from '../types';
import { otherUid } from '../data';
import { tierLabel } from '../policy';

interface Props {
  conversation: Conversation;
  me: string;
  active?: boolean;
  /** Client-side SLA flag: thread is awaiting a response past the threshold. */
  overdue?: boolean;
  onClick: () => void;
}

/** One row in the conversation list: avatar, name, last-message preview, time, unread badge. */
export function ConversationListItem({ conversation, me, active, overdue, onClick }: Props) {
  const amParticipant = conversation.participantUids.includes(me);
  // Participant → show the other person; reviewer (leadership in the queue) →
  // show both original participants so the row reads as the case it is.
  const name = amParticipant
    ? conversation.participantNames[otherUid(conversation, me)] ?? 'Unknown'
    : conversation.participantUids.map((u) => conversation.participantNames[u] ?? 'Member').join(' · ');
  const unread = conversation.unread?.[me] ?? 0;
  const mineLast = conversation.lastSenderUid === me;
  const preview = conversation.lastMessage
    ? `${mineLast ? 'You: ' : ''}${conversation.lastMessage}`
    : 'No messages yet';
  const esc = conversation.escalation;
  const isEscalated = conversation.kind === 'escalation' && esc && esc.status !== 'resolved';
  // Hide the overdue badge once resolved or when it would be redundant noise.
  const showOverdue = overdue && esc?.status !== 'resolved';

  return (
    <button
      type="button"
      className={active ? 'nx-conv is-active' : 'nx-conv'}
      onClick={onClick}
      aria-current={active ? 'true' : undefined}
    >
      <Avatar name={name} size={42} />
      <div className="nx-conv__main">
        <div className="nx-conv__row">
          <span className="nx-conv__name">{name}</span>
          {conversation.lastAt > 0 && conversation.lastMessage && (
            <span className="nx-conv__time">{formatRelative(conversation.lastAt)}</span>
          )}
        </div>
        {(isEscalated || showOverdue) && (
          <div className="nx-conv__row nx-conv__tags">
            {isEscalated && (
              <span className="nx-conv__tag nx-conv__tag--esc">
                <Icon name="trending-up" size={11} aria-hidden="true" />
                {tierLabel(esc!.tier)}
              </span>
            )}
            {showOverdue && (
              <span className="nx-conv__tag nx-conv__tag--overdue" title="Awaiting a response">
                <Icon name="clock" size={11} aria-hidden="true" />
                Overdue
              </span>
            )}
          </div>
        )}
        <div className="nx-conv__row">
          <span className={unread > 0 ? 'nx-conv__preview is-unread' : 'nx-conv__preview'}>{preview}</span>
          {unread > 0 && (
            <span className="nx-conv__badge" aria-label={`${unread} unread message${unread === 1 ? '' : 's'}`}>
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
