import {
  arrayUnion, getDoc, increment, query, serverTimestamp, setDoc, updateDoc, where,
  writeBatch, limit as fsLimit,
} from 'firebase/firestore';
import { useMemo } from 'react';
import type { RoleId } from '@/types/roles';
import { db } from '@/lib/firebase';
import { tenantCol, tenantDoc, useCollection, useDocument, type ListState } from '@/lib/db';
import { writeAuditEvent } from '@/lib/audit';
import { canInitiateTo, nextTier, escalationFloor } from './policy';
import type {
  Conversation, EscalationEvent, EscalationTier, Message,
} from './types';

/**
 * Direct Messaging data layer. Tenant-scoped collections under
 * `schools/{schoolId}/…`:
 *  - `conversations` — one doc per pair (deterministic id = sorted uids).
 *  - `messages`      — flat collection, each tagged with `conversationId`.
 *
 * Pass `schoolId` from `useSession()` and `actor = { uid, name }` to writers.
 * Mirrors the generic create/update + audit pattern from `features/daily/data`.
 */

export interface Actor {
  uid: string;
  name?: string;
  /** Sender's role — used by the create-path recipient policy (defense-in-depth). */
  role?: RoleId;
}

const CONVERSATIONS = 'conversations';
const MESSAGES = 'messages';

/** Default threshold (ms) after which an awaiting reply counts as overdue: 2 days. */
export const SLA_THRESHOLD_MS = 2 * 24 * 60 * 60 * 1000;

/** Migration-safe thread kind: legacy docs with no `kind` are plain direct messages. */
export function convKind(conv: Pick<Conversation, 'kind'>): 'direct' | 'escalation' {
  return conv.kind ?? 'direct';
}

/**
 * Client-side SLA: is this thread awaiting a response past the threshold? No
 * scheduled function — computed purely on read from timestamps. A thread is
 * "overdue" when the most recent activity (a message, or its creation if no
 * message yet) is older than `thresholdMs` AND it is not resolved.
 *
 * `forUid` (optional): when provided, only counts as awaiting if the *other*
 * side spoke last (i.e. the ball is in `forUid`'s court). Omit for a global
 * "stale thread" check.
 */
export function isOverdue(
  conv: Pick<Conversation, 'lastAt' | 'createdAt' | 'lastSenderUid' | 'escalation'>,
  forUid?: string,
  thresholdMs: number = SLA_THRESHOLD_MS,
  now: number = Date.now(),
): boolean {
  if (conv.escalation?.status === 'resolved') return false;
  const last = conv.lastAt || conv.createdAt || 0;
  if (!last) return false;
  if (now - last < thresholdMs) return false;
  // If we know who should reply, only flag when the other party spoke last.
  if (forUid && conv.lastSenderUid && conv.lastSenderUid === forUid) return false;
  return true;
}

/**
 * Deterministic conversation id for a pair of member uids. Sorting first means
 * `conversationId(a, b) === conversationId(b, a)`, so both participants (and any
 * later "start a chat" action) resolve to the exact same document.
 */
export function conversationId(a: string, b: string): string {
  return [a, b].sort().join('__');
}

/** The other participant's uid in a conversation (relative to `me`). */
export function otherUid(conv: Pick<Conversation, 'participantUids'>, me: string): string {
  return conv.participantUids.find((u) => u !== me) ?? me;
}

/* ---------------- Reads (real-time) ---------------- */

/**
 * Conversations the user is part of. Index-free by design (Spark plan):
 * a single `array-contains` filter needs no composite index, whereas pairing it
 * with `orderBy('lastAt')` on a different field would require one. Callers sort
 * by `lastAt` client-side (see `MessagesPage`), so ordering is handled in memory.
 */
export function useConversations(schoolId?: string, uid?: string) {
  return useCollection<Conversation>(
    schoolId && uid
      ? query(
          tenantCol(schoolId, CONVERSATIONS),
          where('participantUids', 'array-contains', uid),
          fsLimit(100),
        )
      : null,
    [schoolId, uid],
  );
}

/**
 * Escalated threads for the leadership queue. Index-free by design (Spark plan):
 * a single equality filter on `kind` needs no composite index. Callers narrow to
 * "escalated to me" (by tier/assignee) and sort by `escalation.at` client-side.
 */
export function useEscalations(schoolId?: string) {
  return useCollection<Conversation>(
    schoolId
      ? query(
          tenantCol(schoolId, CONVERSATIONS),
          where('kind', '==', 'escalation'),
          fsLimit(100),
        )
      : null,
    [schoolId],
  );
}

/** A single conversation document (null id → idle). */
export function useConversation(schoolId?: string, conversationId?: string) {
  return useDocument<Conversation>(
    schoolId && conversationId ? tenantDoc(schoolId, CONVERSATIONS, conversationId) : null,
  );
}

/**
 * Messages in a thread, oldest → newest. Index-free by design (Spark plan):
 * an equality filter combined with `orderBy('sentAt')` on a different field
 * would require a composite index, so we filter only by `conversationId` and
 * sort ascending by `sentAt` in memory. `fsLimit` without `orderBy` returns an
 * arbitrary slice, so we drop it and rely on the per-thread volume staying small
 * (a thread realistically holds far fewer than the old 200 cap).
 */
export function useMessages(schoolId?: string, conversationId?: string): ListState<Message> {
  const state = useCollection<Message>(
    schoolId && conversationId
      ? query(
          tenantCol(schoolId, MESSAGES),
          where('conversationId', '==', conversationId),
        )
      : null,
    [schoolId, conversationId],
  );
  const data = useMemo(
    () => [...state.data].sort((a, b) => (a.sentAt ?? 0) - (b.sentAt ?? 0)),
    [state.data],
  );
  return { ...state, data };
}

/* ---------------- Writes ---------------- */

/** Raised when the recipient policy forbids a sender from starting a thread. */
export class RecipientPolicyError extends Error {
  constructor(message = 'You can’t start a conversation with this person.') {
    super(message);
    this.name = 'RecipientPolicyError';
  }
}

/**
 * Ensure a conversation doc exists for a pair, creating it on first contact.
 * Idempotent (merge), so it is safe to call before every send / on open.
 * Returns the deterministic conversation id.
 *
 * Enforces the recipient policy (`canInitiateTo`) as defense-in-depth — the
 * picker already filters options, but the create path re-checks so a stale
 * deep-link or programmatic call can't bypass the hierarchy. The check applies
 * only when the conversation does NOT already exist (an existing thread, e.g. a
 * staff member who first contacted a family, stays open both ways).
 */
export async function ensureConversation(
  schoolId: string,
  actor: Actor,
  other: { uid: string; name: string; role?: RoleId },
): Promise<string> {
  const id = conversationId(actor.uid, other.uid);
  const ref = tenantDoc(schoolId, CONVERSATIONS, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    if (!canInitiateTo(actor.role, other.role)) {
      throw new RecipientPolicyError();
    }
    const seed: Omit<Conversation, 'id'> = {
      schoolId,
      participantUids: [actor.uid, other.uid].sort() as [string, string],
      participantNames: { [actor.uid]: actor.name ?? 'You', [other.uid]: other.name },
      lastMessage: '',
      lastAt: Date.now(),
      unread: { [actor.uid]: 0, [other.uid]: 0 },
      kind: 'direct',
      createdAt: Date.now(),
      createdBy: actor.uid,
      version: 1,
    };
    await setDoc(ref, { ...seed, serverCreatedAt: serverTimestamp() }, { merge: true });
  }
  return id;
}

/**
 * Send a message: writes the message doc, updates the conversation preview
 * (`lastMessage`/`lastAt`), and bumps the recipient's unread counter — all in a
 * single atomic batch so the list and the thread never disagree.
 */
export async function sendMessage(
  schoolId: string,
  conversationId: string,
  actor: Actor,
  recipientUid: string,
  text: string,
): Promise<void> {
  const body = text.trim();
  if (!body) return;
  const now = Date.now();

  const batch = writeBatch(db);
  // Doc id must be unique even on a same-millisecond double-send (fast double-tap,
  // or two devices): `${convId}_${now}_${uid6}` alone collided and the second write
  // silently overwrote the first. Append a CSPRNG suffix to guarantee uniqueness.
  const rand = crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
  const msgRef = tenantDoc(schoolId, MESSAGES, `${conversationId}_${now}_${actor.uid.slice(0, 6)}_${rand}`);
  const convRef = tenantDoc(schoolId, CONVERSATIONS, conversationId);

  batch.set(msgRef, {
    schoolId,
    conversationId,
    senderUid: actor.uid,
    senderName: actor.name ?? 'You',
    text: body,
    sentAt: now,
    serverSentAt: serverTimestamp(),
    createdAt: now,
    createdBy: actor.uid,
    version: 1,
  });
  batch.set(
    convRef,
    {
      lastMessage: body,
      lastAt: now,
      lastSenderUid: actor.uid,
      [`unread.${recipientUid}`]: increment(1),
      [`unread.${actor.uid}`]: 0,
      lastModifiedAt: now,
      lastModifiedBy: actor.uid,
    },
    { merge: true },
  );

  await batch.commit();
  void writeAuditEvent({
    action: 'message.sent',
    schoolId,
    actor,
    targetType: 'conversation',
    targetId: conversationId,
  });
}

/** Clear the current user's unread counter for a conversation (on open). */
export async function markRead(schoolId: string, conversationId: string, uid: string): Promise<void> {
  await updateDoc(tenantDoc(schoolId, CONVERSATIONS, conversationId), { [`unread.${uid}`]: 0 });
}

/** One-shot fetch a conversation (e.g. to resolve recipient before a deep link). */
export async function getConversation(schoolId: string, conversationId: string): Promise<Conversation | null> {
  const snap = await getDoc(tenantDoc(schoolId, CONVERSATIONS, conversationId));
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as object) } as Conversation) : null;
}

export async function startMessage(
  schoolId: string,
  actor: Actor,
  other: { uid: string; name: string; role?: RoleId },
  text: string,
): Promise<string> {
  // ensureConversation enforces the recipient policy (throws RecipientPolicyError).
  const id = await ensureConversation(schoolId, actor, other);
  await sendMessage(schoolId, id, actor, other.uid, text);
  return id;
}

/* ---------------- Escalation (manual, client-side) ---------------- */

/**
 * Escalate a thread one rung up the ladder (Teacher → Coordinator → VP →
 * Principal), or initialise escalation on a plain direct thread. Manual only —
 * no automation. Records an immutable history entry plus the new assignee, and
 * flips the doc to `kind:'escalation'` so it surfaces in the leadership queue.
 *
 * `assignee` is the staff member the thread is being handed to (resolved by the
 * caller from the directory — read-only). When omitted, the tier advances but
 * assignment is left open for leadership to pick up from the queue.
 */
export async function escalateConversation(
  schoolId: string,
  conversationId: string,
  actor: Actor,
  reason: string,
  opts?: { assignee?: { uid: string; name: string } },
): Promise<EscalationTier | null> {
  const ref = tenantDoc(schoolId, CONVERSATIONS, conversationId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const conv = snap.data() as Conversation;

  // Current tier: from existing escalation, else derive a floor from the actor's
  // role (a teacher opening an escalation starts the ladder at 'teacher').
  const current: EscalationTier = conv.escalation?.tier ?? escalationFloor(actor.role);
  const target = nextTier(current);
  if (!target) return null; // Already at the top (Principal) — nowhere to escalate.

  const at = Date.now();
  const event: EscalationEvent = {
    fromTier: conv.escalation ? current : null,
    toTier: target,
    reason: reason.trim() || 'Escalated for review.',
    byName: actor.name ?? 'Staff',
    byUid: actor.uid,
    at,
    status: 'escalated',
  };

  await updateDoc(ref, {
    kind: 'escalation',
    'escalation.tier': target,
    'escalation.status': 'escalated',
    'escalation.assignedToUid': opts?.assignee?.uid ?? null,
    'escalation.assignedToName': opts?.assignee?.name ?? null,
    'escalation.reason': event.reason,
    'escalation.at': at,
    'escalation.history': arrayUnion(event),
    lastModifiedAt: at,
    lastModifiedBy: actor.uid,
  });

  void writeAuditEvent({
    action: 'message.escalated',
    schoolId,
    actor: { uid: actor.uid, name: actor.name, role: actor.role },
    targetType: 'conversation',
    targetId: conversationId,
    summary: `Escalated to ${target}`,
    details: { fromTier: event.fromTier, toTier: target, reason: event.reason },
  });
  return target;
}

/**
 * Mark an escalated thread resolved. Appends a closing history entry and flips
 * status to `resolved` (kept as `kind:'escalation'` for the audit trail).
 */
export async function resolveEscalation(
  schoolId: string,
  conversationId: string,
  actor: Actor,
  reason: string,
): Promise<void> {
  const ref = tenantDoc(schoolId, CONVERSATIONS, conversationId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const conv = snap.data() as Conversation;
  const tier: EscalationTier = conv.escalation?.tier ?? escalationFloor(actor.role);
  const at = Date.now();
  const event: EscalationEvent = {
    fromTier: tier,
    toTier: tier,
    reason: reason.trim() || 'Resolved.',
    byName: actor.name ?? 'Staff',
    byUid: actor.uid,
    at,
    status: 'resolved',
  };
  await updateDoc(ref, {
    'escalation.status': 'resolved',
    'escalation.reason': event.reason,
    'escalation.at': at,
    'escalation.history': arrayUnion(event),
    lastModifiedAt: at,
    lastModifiedBy: actor.uid,
  });
  void writeAuditEvent({
    action: 'message.resolved',
    schoolId,
    actor: { uid: actor.uid, name: actor.name, role: actor.role },
    targetType: 'conversation',
    targetId: conversationId,
    summary: `Resolved at ${tier}`,
    details: { tier, reason: event.reason },
  });
}
