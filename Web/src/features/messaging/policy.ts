import type { RoleId } from '@/types/roles';
import type { EscalationTier } from './types';

/**
 * Messaging hierarchy + escalation policy (ROLE_AUDIT §5).
 *
 * Pure, client-side predicates — no backend, no Firestore. Two concerns:
 *  1. Recipient policy (`canInitiateTo`) — who may *start* a thread with whom.
 *  2. Escalation ladder (`nextTier`) — Teacher → Coordinator → VP → Principal.
 *
 * Principle: leadership is NOT a public help desk. Parents/students reach a
 * teacher/coordinator first; the Principal/VP are reached via *escalation*, not
 * as a default DM target. Staff may message peers and the families they serve.
 *
 * Roles are derived from member/staff records read-only (never written here).
 */

/* ----------------------------- Role groups ----------------------------- */

/** Families (parent/student) — the constituency that must start at the front line. */
const FAMILY_ROLES = new Set<RoleId>(['parent', 'student', 'alumni']);

/**
 * Leadership tiers that are *escalation targets*, not default DM recipients.
 * A family may not initiate a thread directly to any of these.
 */
const LEADERSHIP_ROLES = new Set<RoleId>([
  'chairman',
  'trustee',
  'director',
  'regional_director',
  'cluster_director',
  'principal',
  'vp_academic',
  'vp_admin',
]);

/**
 * The "front line" a family is allowed to reach directly: classroom teachers and
 * the academic coordinators / HODs who own day-to-day student matters.
 */
const FRONTLINE_ROLES = new Set<RoleId>([
  'class_teacher',
  'subject_teacher',
  'substitute_teacher',
  'special_educator',
  'counselor',
  'sports_teacher',
  'arts_teacher',
  'activity_coordinator',
  'club_coordinator',
  'house_master',
  'academic_coordinator',
  'hod',
]);

export function isFamilyRole(role?: RoleId): boolean {
  return !!role && FAMILY_ROLES.has(role);
}

export function isLeadershipRole(role?: RoleId): boolean {
  return !!role && LEADERSHIP_ROLES.has(role);
}

export function isFrontlineRole(role?: RoleId): boolean {
  return !!role && FRONTLINE_ROLES.has(role);
}

/** Staff = anyone who is not a family/community member (and has a role at all). */
export function isStaffRole(role?: RoleId): boolean {
  return !!role && !FAMILY_ROLES.has(role);
}

/* --------------------------- Recipient policy --------------------------- */

/**
 * May a sender *initiate* a new conversation to a recipient?
 *
 *  - Family (parent/student/alumni) → only front-line staff (teachers /
 *    coordinators / counselors). NOT Principal/VP/Director — those are reached
 *    by escalation. NOT another family member.
 *  - Staff → any other staff peer, and any family member (the families they
 *    serve). Staff may reach leadership directly (internal chain of command).
 *
 * Unknown recipient role is treated conservatively: families are blocked,
 * staff are allowed (a staff record with no role is still a colleague).
 *
 * This is the single source of truth, enforced in the picker (filter) AND the
 * create path (`ensureConversation`/`startMessage`) as defense-in-depth.
 */
export function canInitiateTo(senderRole?: RoleId, recipientRole?: RoleId): boolean {
  if (isFamilyRole(senderRole)) {
    // Families reach only the front line — never leadership, never peers.
    return isFrontlineRole(recipientRole);
  }
  // Staff: may message any staff peer or any family member, but not another
  // role-less/family-blocked edge. Block staff→nothing only when recipient role
  // is family AND sender somehow lacks a role (defensive; staff always has one).
  if (!senderRole) return false;
  // Staff may reach everyone (peers, leadership, and the families they serve).
  return true;
}

/** Human-readable reason a recipient is unavailable, for picker hints/toasts. */
export function blockedReason(senderRole?: RoleId, recipientRole?: RoleId): string | null {
  if (canInitiateTo(senderRole, recipientRole)) return null;
  if (isFamilyRole(senderRole) && isLeadershipRole(recipientRole)) {
    return 'Leadership is reached by escalation — please start with a teacher or coordinator.';
  }
  if (isFamilyRole(senderRole) && isFamilyRole(recipientRole)) {
    return 'You can only message school staff.';
  }
  return 'You can’t start a conversation with this person.';
}

/* ---------------------------- Escalation ladder ---------------------------- */

/** The fixed escalation ladder, in ascending order of authority. */
export const ESCALATION_LADDER: EscalationTier[] = ['teacher', 'coordinator', 'vp', 'principal'];

const TIER_LABELS: Record<EscalationTier, string> = {
  teacher: 'Teacher',
  coordinator: 'Coordinator',
  vp: 'Vice Principal',
  principal: 'Principal',
};

export function tierLabel(tier: EscalationTier): string {
  return TIER_LABELS[tier];
}

/**
 * The next tier up from a given tier, or `null` if already at the top
 * (Principal — nowhere left to escalate).
 */
export function nextTier(tier: EscalationTier): EscalationTier | null {
  const i = ESCALATION_LADDER.indexOf(tier);
  if (i < 0 || i >= ESCALATION_LADDER.length - 1) return null;
  return ESCALATION_LADDER[i + 1];
}

/**
 * Map a role to the escalation tier it *handles*, or `null` if the role does not
 * staff any rung of the ladder. Only the front-line teaching/pastoral roles sit
 * at `teacher`; coordinators/HODs at `coordinator`; VPs at `vp`; principal at
 * `principal`.
 *
 * CRITICAL (confidentiality): this must NOT default unknown/back-office roles to
 * `teacher`. The "Escalated to me" queue (`MessagesPage`) shows every thread at
 * `e.tier === myTier`; a default floor of `teacher` would expose parent
 * grievance threads to every non-teaching staff member (nurse, accountant,
 * librarian, security, lab assistant, …) — an over-broad read. Returning `null`
 * for those roles keeps the queue empty for them.
 */
export function tierForRole(role?: RoleId): EscalationTier | null {
  if (!role) return null;
  if (role === 'principal') return 'principal';
  if (role === 'vp_academic' || role === 'vp_admin') return 'vp';
  if (role === 'academic_coordinator' || role === 'hod') return 'coordinator';
  if (isFrontlineRole(role)) return 'teacher';
  return null;
}

/**
 * The rung an escalation STARTS at when opened by `role` (never null). Distinct
 * from `tierForRole`: a thread always needs a well-defined floor to escalate
 * from, even when the opener (e.g. a parent participant, or a back-office role)
 * doesn't themselves staff a queue tier. Defaults to `teacher`.
 */
export function escalationFloor(role?: RoleId): EscalationTier {
  return tierForRole(role) ?? 'teacher';
}

/** Does this role staff any rung of the escalation ladder (i.e. own a queue)? */
export function handlesEscalations(role?: RoleId): boolean {
  return tierForRole(role) !== null;
}

/** Does a role sit at exactly `tier` (i.e. is the escalations queue theirs)? */
export function roleHandlesTier(role: RoleId | undefined, tier: EscalationTier): boolean {
  return tierForRole(role) === tier;
}
