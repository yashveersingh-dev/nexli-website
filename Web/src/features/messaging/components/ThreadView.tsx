import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { EmptyState, Skeleton, Spinner } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { useSession } from '@/app/providers/SessionProvider';
import { usePrefersReducedMotion } from '@/lib/hooks';
import { formatDate, formatRelative } from '@/lib/format';
import type { RoleId } from '@/types/roles';
import {
  useConversation, useMessages, sendMessage, markRead, otherUid, conversationId as makeId,
  escalateConversation, resolveEscalation, isOverdue, convKind,
} from '../data';
import { isStaffRole, nextTier, escalationFloor, tierLabel } from '../policy';
import type { EscalationTier, Message, Recipient } from '../types';
import { MessageBubble } from './MessageBubble';
import { Composer } from './Composer';
import { EscalateSheet } from './EscalateSheet';

interface Props {
  conversationId: string;
  /** Recipient hint when opening a brand-new thread before its doc exists. */
  pendingRecipient?: Recipient | null;
  /** Shown on mobile (route view); hidden in the desktop two-pane. */
  onBack?: () => void;
}

/** Day separator label between message groups. */
function dayLabel(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const isSameDay = d.toDateString() === today.toDateString();
  const yest = new Date(today);
  yest.setDate(today.getDate() - 1);
  if (isSameDay) return 'Today';
  if (d.toDateString() === yest.toDateString()) return 'Yesterday';
  return formatDate(ts, 'DD MMM YYYY');
}

/** The conversation thread: header, scrollable message log, composer. */
export function ThreadView({ conversationId, pendingRecipient, onBack }: Props) {
  const { schoolId, uid, member, role } = useSession();
  const toast = useToast();
  const reduced = usePrefersReducedMotion();
  const me = uid ?? '';
  const actor = useMemo(() => ({ uid: me, name: member?.name, role }), [me, member?.name, role]);

  const { data: conversation, loading: cLoading } = useConversation(schoolId, conversationId);
  const { data: messages, loading: mLoading, error } = useMessages(schoolId, conversationId);

  const [escalating, setEscalating] = useState(false);
  const [escBusy, setEscBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const amParticipant = !!conversation?.participantUids.includes(me);

  // Escalation derivations. Escalate is offered to the staff handling the thread
  // OR its initiator (a participant — possibly a parent). The target is one rung
  // above the thread's current tier, or above the actor's own tier if it has
  // never been escalated. Top rung (Principal) has nowhere to go, so it's hidden.
  // Resolving is a handling decision, so it stays staff-only.
  const esc = conversation?.escalation;
  const currentTier: EscalationTier = esc?.tier ?? escalationFloor(role);
  const targetTier = nextTier(currentTier);
  const amStaff = isStaffRole(role);
  const isResolved = esc?.status === 'resolved';
  const canEscalate = (amStaff || amParticipant) && !!targetTier && !isResolved && !!conversation;
  const canResolve = amStaff && !!conversation && convKind(conversation) === 'escalation' && !isResolved;
  const overdue = !!conversation && isOverdue(conversation, me);

  // Resolve the "other" party to title the thread:
  //  - A participant sees the person they're talking to.
  //  - A non-participant (leadership reviewing an escalation) sees the original
  //    participants joined, so the queue thread reads as the case it is.
  const other = useMemo(() => {
    if (conversation) {
      if (amParticipant) {
        const ouid = otherUid(conversation, me);
        return { uid: ouid, name: conversation.participantNames[ouid] ?? 'Conversation' };
      }
      const names = conversation.participantUids
        .map((u) => conversation.participantNames[u] ?? 'Member');
      return { uid: conversation.participantUids[0], name: names.join(' · ') };
    }
    if (pendingRecipient) return { uid: pendingRecipient.uid, name: pendingRecipient.name };
    return null;
  }, [conversation, pendingRecipient, me, amParticipant]);

  // Mark read whenever this thread is open and has unread for me (participants only).
  useEffect(() => {
    if (schoolId && amParticipant && conversation && (conversation.unread?.[me] ?? 0) > 0) {
      void markRead(schoolId, conversationId, me);
    }
  }, [schoolId, conversationId, conversation, me, amParticipant]);

  // Auto-scroll to newest on new messages / open.
  useEffect(() => {
    const el = logRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: reduced ? 'auto' : 'smooth' });
  }, [messages.length, reduced]);

  const handleSend = async (text: string) => {
    if (!schoolId || !other) return;
    try {
      // Ensure the deterministic conversation exists, then send.
      const id = makeId(me, other.uid);
      await sendMessage(schoolId, id, actor, other.uid, text);
    } catch {
      toast.toast({
        title: 'Message not sent',
        description: 'Check your connection — it will be delivered once you’re back online.',
        tone: 'warning',
      });
    }
  };

  const handleEscalate = async (reason: string, assignee?: { uid: string; name: string; role?: RoleId }) => {
    if (!schoolId || !targetTier) return;
    setEscBusy(true);
    try {
      const to = await escalateConversation(schoolId, conversationId, actor, reason, {
        assignee: assignee ? { uid: assignee.uid, name: assignee.name } : undefined,
      });
      setEscalating(false);
      if (to) toast.success('Escalated', `Raised to ${tierLabel(to)}.`);
    } catch {
      toast.warning('Couldn’t escalate', 'Please try again in a moment.');
    } finally {
      setEscBusy(false);
    }
  };

  const handleResolve = async () => {
    if (!schoolId) return;
    setEscBusy(true);
    try {
      await resolveEscalation(schoolId, conversationId, actor, 'Resolved.');
      toast.success('Resolved', 'This escalation is closed.');
    } catch {
      toast.warning('Couldn’t resolve', 'Please try again in a moment.');
    } finally {
      setEscBusy(false);
    }
  };

  const grouped = useMemo(() => groupByDay(messages), [messages]);

  if (!other && (cLoading || mLoading)) {
    return (
      <section className="nx-thread" aria-label="Conversation">
        <div className="nx-thread__head">
          <Skeleton width={38} height={38} radius={999} />
          <Skeleton width={160} height={14} />
        </div>
        <div className="nx-thread__log">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={48} radius={14} />)}
        </div>
      </section>
    );
  }

  if (!other) {
    return (
      <section className="nx-thread nx-thread--empty" aria-label="Conversation">
        <EmptyState icon="message" title="Conversation not found" message="It may have been removed." />
      </section>
    );
  }

  return (
    <section className="nx-thread" aria-label={`Conversation with ${other.name}`}>
      <header className="nx-thread__head">
        {onBack && (
          <button type="button" className="nx-thread__back" onClick={onBack} aria-label="Back to conversations">
            <Icon name="chevron-left" size={20} aria-hidden="true" />
          </button>
        )}
        <Avatar name={other.name} size={38} />
        <div className="nx-thread__headtext">
          <span className="nx-thread__name">{other.name}</span>
          <span className="nx-thread__sub">
            {esc && esc.status !== 'resolved'
              ? `Escalation · ${tierLabel(esc.tier)}`
              : isResolved
                ? 'Escalation · Resolved'
                : 'Direct message'}
          </span>
        </div>
        {(canEscalate || canResolve) && (
          <div className="nx-thread__actions">
            {canResolve && (
              <Button variant="subtle" size="sm" leftIcon="check-circle" onClick={handleResolve} loading={escBusy}>
                <span>Resolve</span>
              </Button>
            )}
            {canEscalate && (
              <Button variant="ghost" size="sm" leftIcon="trending-up" onClick={() => setEscalating(true)}>
                <span>Escalate</span>
              </Button>
            )}
          </div>
        )}
      </header>

      {esc && (
        <div
          className={isResolved ? 'nx-esc-bar is-resolved' : 'nx-esc-bar'}
          role="status"
        >
          <Icon name={isResolved ? 'check-circle' : 'alert-triangle'} size={15} aria-hidden="true" />
          <div className="nx-esc-bar__text">
            <span className="nx-esc-bar__title">
              {isResolved ? 'Resolved' : `Escalated to ${tierLabel(esc.tier)}`}
              {esc.assignedToName && !isResolved && ` · ${esc.assignedToName}`}
            </span>
            {esc.reason && <span className="nx-esc-bar__reason">{esc.reason}</span>}
          </div>
          {overdue && !isResolved && (
            <span className="nx-esc-bar__sla" title="Awaiting a response">
              <Icon name="clock" size={12} aria-hidden="true" /> Overdue
            </span>
          )}
        </div>
      )}

      <div className="nx-thread__log" ref={logRef} role="log" aria-live="polite" aria-label="Messages" aria-busy={mLoading || undefined}>
        {error ? (
          <EmptyState icon="info" title="Couldn’t load messages" message="Please try again in a moment." />
        ) : mLoading ? (
          <div className="nx-thread__loading"><Spinner /></div>
        ) : messages.length === 0 ? (
          <div className="nx-thread__intro">
            <Avatar name={other.name} size={56} />
            <p className="nx-thread__intro-name">{other.name}</p>
            <p className="nx-thread__intro-hint">This is the start of your conversation. Say hello.</p>
          </div>
        ) : (
          grouped.map(([day, msgs]) => (
            <div className="nx-thread__group" key={day}>
              <div className="nx-thread__day"><span>{day}</span></div>
              {msgs.map((m) => <MessageBubble key={m.id} message={m} mine={m.senderUid === me} />)}
            </div>
          ))
        )}

        {esc && esc.history.length > 0 && (
          <div className="nx-esc-log" aria-label="Escalation history">
            <div className="nx-esc-log__head">
              <Icon name="activity" size={13} aria-hidden="true" />
              <span>Escalation trail</span>
            </div>
            <ol className="nx-esc-log__items">
              {[...esc.history]
                .sort((a, b) => a.at - b.at)
                .map((h, i) => (
                  <li key={`${h.at}-${i}`} className="nx-esc-log__item">
                    <span className="nx-esc-log__dot" aria-hidden="true" />
                    <div className="nx-esc-log__body">
                      <span className="nx-esc-log__line">
                        <strong>{h.byName}</strong>{' '}
                        {h.status === 'resolved'
                          ? `resolved at ${tierLabel(h.toTier)}`
                          : h.fromTier
                            ? `escalated ${tierLabel(h.fromTier)} → ${tierLabel(h.toTier)}`
                            : `escalated to ${tierLabel(h.toTier)}`}
                      </span>
                      {h.reason && <span className="nx-esc-log__reason">“{h.reason}”</span>}
                      <span className="nx-esc-log__time">{formatRelative(h.at)}</span>
                    </div>
                  </li>
                ))}
            </ol>
          </div>
        )}
      </div>

      {amParticipant ? (
        <Composer onSend={handleSend} recipientName={other.name} disabled={!schoolId} />
      ) : (
        <div className="nx-thread__review" role="note">
          <Icon name="eye" size={14} aria-hidden="true" />
          <span>You’re reviewing this escalation. Reassign or resolve it above.</span>
        </div>
      )}

      {targetTier && (
        <EscalateSheet
          open={escalating}
          schoolId={schoolId}
          targetTier={targetTier}
          busy={escBusy}
          onClose={() => setEscalating(false)}
          onConfirm={handleEscalate}
        />
      )}
    </section>
  );
}

function groupByDay(messages: Message[]): [string, Message[]][] {
  const out: [string, Message[]][] = [];
  for (const m of messages) {
    const label = dayLabel(m.sentAt);
    const last = out[out.length - 1];
    if (last && last[0] === label) last[1].push(m);
    else out.push([label, [m]]);
  }
  return out;
}
