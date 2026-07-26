import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/Button';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { useSession } from '@/app/providers/SessionProvider';
import {
  useConversations, useEscalations, ensureConversation, conversationId as makeId, isOverdue,
  RecipientPolicyError,
} from '../data';
import { handlesEscalations, tierForRole } from '../policy';
import type { Conversation, Recipient } from '../types';
import { ConversationListItem } from '../components/ConversationListItem';
import { ThreadView } from '../components/ThreadView';
import { NewMessageSheet } from '../components/NewMessageSheet';

type Tab = 'all' | 'escalated';

/**
 * Messages hub. Two-pane on ≥768px (conversation list + open thread); on phones
 * the list fills the screen and tapping a row routes to `/messages/:id`.
 * The selected id comes from the route param so deep links and the back button
 * both work without extra state.
 */
export function MessagesPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { conversationId: routeId } = useParams<{ conversationId: string }>();
  const { schoolId, uid, member, role } = useSession();
  const me = uid ?? '';

  const { data: conversations, loading, error } = useConversations(schoolId, me);
  const [picking, setPicking] = useState(false);
  const [tab, setTab] = useState<Tab>('all');
  // Recipient chosen before the conversation doc exists (empty new thread).
  const [pending, setPending] = useState<Recipient | null>(null);

  // Only roles that actually staff a rung of the ladder (front-line teachers,
  // coordinators/HODs, VPs, principal) see an "Escalated to me" view: threads
  // escalated up to (and assigned at) their tier. Back-office staff (nurse,
  // accountant, librarian, security, …) and families do NOT — guarding the queue
  // on `handlesEscalations` prevents an over-broad read of confidential threads.
  const myTier = tierForRole(role);
  const showEscalations = handlesEscalations(role);

  // Escalations feed: a separate index-free query on `kind == 'escalation'` (not
  // participant-scoped), so a leader sees threads escalated to their tier even
  // when they aren't one of the two original participants. Only subscribed for
  // staff (families never escalate or see the queue).
  const { data: escalations } = useEscalations(showEscalations ? schoolId : undefined);

  // "Escalated to me": not resolved, and currently sitting at my tier (or
  // assigned directly to me). Narrowed client-side from the kind feed.
  const escalatedToMe = useMemo(
    () =>
      escalations.filter((c) => {
        const e = c.escalation;
        if (!e || e.status === 'resolved') return false;
        return e.assignedToUid === me || e.tier === myTier;
      }),
    [escalations, me, myTier],
  );

  const escalatedCount = escalatedToMe.length;

  const sorted = useMemo(() => {
    const base = tab === 'escalated' ? escalatedToMe : conversations;
    const key = (c: Conversation) =>
      tab === 'escalated' ? (c.escalation?.at ?? c.lastAt ?? 0) : (c.lastAt ?? 0);
    return [...base].sort((a, b) => key(b) - key(a));
  }, [conversations, escalatedToMe, tab]);

  const selectedId = routeId ?? null;

  const open = (id: string) => {
    setPending(null);
    navigate(`/messages/${id}`);
  };

  const pickRecipient = async (r: Recipient) => {
    setPicking(false);
    if (!schoolId) return;
    const id = makeId(me, r.uid);
    setPending(r);
    try {
      await ensureConversation(
        schoolId,
        { uid: me, name: member?.name, role },
        { uid: r.uid, name: r.name, role: r.role },
      );
    } catch (err) {
      if (err instanceof RecipientPolicyError) {
        // Defense-in-depth: the picker shouldn't have offered this person.
        setPending(null);
        toast.warning('Not allowed', err.message);
        return;
      }
      toast.warning('Offline', 'You can compose now; it will sync when you’re back online.');
    }
    navigate(`/messages/${id}`);
  };

  return (
    <div className="nx-page nx-msg-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Messages</h1>
          <p className="nx-page__sub">
            {showEscalations
              ? 'Direct conversations and escalations you handle.'
              : 'Reach your child’s teachers and coordinators.'}
          </p>
        </div>
        <Button variant="gold" size="sm" leftIcon="plus" onClick={() => setPicking(true)}>
          <span>New message</span>
        </Button>
      </div>

      <div className={selectedId ? 'nx-messenger has-thread' : 'nx-messenger'}>
        {/* ---- Conversation list ---- */}
        <aside className="nx-messenger__list" aria-label="Conversations">
          {showEscalations && (
            <div className="nx-msg-tabs" role="tablist" aria-label="Conversation filter">
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'all'}
                className={tab === 'all' ? 'nx-msg-tab is-active' : 'nx-msg-tab'}
                onClick={() => setTab('all')}
              >
                All
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'escalated'}
                className={tab === 'escalated' ? 'nx-msg-tab is-active' : 'nx-msg-tab'}
                onClick={() => setTab('escalated')}
              >
                <span>Escalated to me</span>
                {escalatedCount > 0 && <span className="nx-msg-tab__count">{escalatedCount}</span>}
              </button>
            </div>
          )}
          {loading ? (
            <div className="nx-conv-list">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="nx-conv nx-conv--skel">
                  <Skeleton width={42} height={42} radius={999} />
                  <div className="nx-conv__main">
                    <Skeleton width="50%" height={12} />
                    <Skeleton width="80%" height={10} />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <EmptyState icon="info" title="Couldn’t load messages" message="Please try again shortly." />
          ) : sorted.length === 0 ? (
            tab === 'escalated' ? (
              <EmptyState
                icon="check-circle"
                title="Nothing escalated to you"
                message="Threads escalated to your level will appear here."
              />
            ) : (
              <EmptyState
                icon="message"
                title="No conversations yet"
                message="Start a direct message with a colleague."
                action={
                  <Button variant="subtle" size="sm" leftIcon="plus" onClick={() => setPicking(true)}>
                    <span>New message</span>
                  </Button>
                }
              />
            )
          ) : (
            <div className="nx-conv-list" role="list">
              {sorted.map((c) => (
                <ConversationListItem
                  key={c.id}
                  conversation={c}
                  me={me}
                  active={c.id === selectedId}
                  overdue={isOverdue(c, me)}
                  onClick={() => open(c.id)}
                />
              ))}
            </div>
          )}
        </aside>

        {/* ---- Thread (desktop pane) ---- */}
        <div className="nx-messenger__thread">
          {selectedId ? (
            <ThreadView
              conversationId={selectedId}
              pendingRecipient={pending}
              onBack={() => navigate('/messages')}
            />
          ) : (
            <div className="nx-messenger__placeholder">
              <div className="nx-messenger__placeholder-icon" aria-hidden="true">
                <Icon name="message" size={28} />
              </div>
              <p className="nx-messenger__placeholder-title">Your messages</p>
              <p className="nx-messenger__placeholder-hint">Select a conversation or start a new one.</p>
            </div>
          )}
        </div>
      </div>

      <NewMessageSheet
        open={picking}
        schoolId={schoolId}
        meUid={me}
        myRole={role}
        onClose={() => setPicking(false)}
        onPick={pickRecipient}
      />
    </div>
  );
}
