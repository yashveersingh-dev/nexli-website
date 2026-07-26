import type { TenantRecord } from '@/types/models';

/**
 * Direct Messaging (1:1) data types. Tenant-scoped under `schools/{schoolId}/…`.
 *
 * This iteration covers staff↔staff conversations. Parents/students are a future
 * extension: the model already keys on opaque member `uid`s, so widening the
 * recipient pool later needs no schema change — only a different picker source.
 */

/** A pair of member uids, always stored sorted ascending. */
export type ParticipantPair = [string, string];

/**
 * Escalation ladder rungs, ascending in authority:
 * Teacher → Coordinator → VP → Principal. A thread starts at whatever tier its
 * staff handler occupies and is bumped one rung at a time, manually.
 */
export type EscalationTier = 'teacher' | 'coordinator' | 'vp' | 'principal';

/** Lifecycle of an escalation: opened, bumped up a tier, or closed out. */
export type EscalationStatus = 'open' | 'escalated' | 'resolved';

/** One immutable entry in a thread's escalation history (newest appended). */
export interface EscalationEvent {
  /** Tier the thread sat at before this bump (null for the very first open). */
  fromTier: EscalationTier | null;
  /** Tier the thread moved to. */
  toTier: EscalationTier;
  /** Why it was escalated/resolved — supplied by the actor. */
  reason: string;
  /** Display name of whoever performed the action (audit trail). */
  byName: string;
  /** uid of the actor (audit trail). */
  byUid: string;
  /** Timestamp (ms). */
  at: number;
  /** Status the thread moved into with this event. */
  status: EscalationStatus;
}

/**
 * Escalation state carried on a conversation. Present only on threads that have
 * been escalated at least once; absent on plain direct messages (`kind:'direct'`).
 */
export interface EscalationState {
  /** Current rung on the ladder. */
  tier: EscalationTier;
  /** Lifecycle status. */
  status: EscalationStatus;
  /** uid of the staff member the thread is currently assigned to (if known). */
  assignedToUid?: string;
  /** Display name of the current handler — for rendering the queue without lookups. */
  assignedToName?: string;
  /** Append-only audit trail of every escalate/resolve action. */
  history: EscalationEvent[];
  /** Free-text reason from the most recent escalation (for quick preview). */
  reason?: string;
  /** Timestamp (ms) of the most recent escalation action — drives queue ordering. */
  at?: number;
}

/**
 * A 1:1 conversation. The document id is deterministic — the two participant
 * uids sorted and joined with `__` (see `conversationId`) — so opening a chat
 * with someone is idempotent: the same pair always resolves to the same doc.
 */
export interface Conversation extends TenantRecord {
  /** Sorted member uids of the two participants. */
  participantUids: ParticipantPair;
  /** uid → display name, for rendering the list without extra lookups. */
  participantNames: Record<string, string>;
  /** Preview of the most recent message (empty until the first send). */
  lastMessage: string;
  /** Timestamp (ms) of the most recent message; drives list ordering. */
  lastAt: number;
  /** uid of whoever sent the last message (for "You:" prefixing). */
  lastSenderUid?: string;
  /** uid → count of messages the recipient has not yet read. */
  unread: Record<string, number>;
  /**
   * Thread kind. Migration-safe: legacy docs with no `kind` are treated as
   * `'direct'` everywhere (see `convKind`). `'escalation'` once bumped up the
   * ladder, so leadership can find it in the escalations queue.
   */
  kind?: 'direct' | 'escalation';
  /** Escalation state — present only on escalated threads. */
  escalation?: EscalationState;
}

/**
 * A single message. Stored in a flat tenant collection (`messages`) keyed by
 * `conversationId` rather than as a subcollection, so a single query streams a
 * thread and the security model stays uniform across the module.
 */
export interface Message extends TenantRecord {
  conversationId: string;
  senderUid: string;
  senderName: string;
  text: string;
  /** Timestamp (ms) the message was sent; thread orders ascending by this. */
  sentAt: number;
}

/** A person who can be messaged (derived from staff for this iteration). */
export interface Recipient {
  uid: string;
  name: string;
  designation?: string;
  photoUrl?: string;
  /** Role of this recipient, derived read-only from their member/staff record;
   *  drives the recipient policy (who a family/staff member may initiate to). */
  role?: import('@/types/roles').RoleId;
}
