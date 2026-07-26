import type { BadgeVariant } from '@/components/Badge';
import type { IconName } from '@/components/Icon';
import type { RoleId } from '@/types/roles';
import type { EventApprovalStatus, EventStatus, SchoolEvent } from '@/types/community';

/**
 * Events approval state machine (review-first: leadership approves, doesn't author).
 *
 *   draft ─request→ requested ─approve→ approved (published)
 *                       │
 *                       └── reject (with note) → rejected
 *
 * Two creation paths both end in Principal/VP approval before an event goes public:
 *   • Owners (coordinators / HOD / sports / arts — `useOwnership('events').canOperate`)
 *     create a full event → `requested` → approval → published.
 *   • Teachers (teaching roles, NOT owners/approvers) raise a lighter
 *     "Teacher Event Request" (`isTeacherRequest`) → `requested` → approve/reject.
 *
 * `status` (upcoming/ongoing/…) is kept consistent with the approval state by the
 * patch builders below — an event is only listed publicly once approved.
 */

/**
 * Teaching roles that may raise a *request* but are NOT events owners/approvers.
 * (Events owners are coordinators/HOD/sports/arts — they use the full form.)
 */
export const TEACHER_REQUEST_ROLES: RoleId[] = [
  'class_teacher', 'subject_teacher', 'substitute_teacher', 'special_educator',
];

/** May this role raise a Teacher Event Request? (teaching role, not an owner). */
export function canRequestEvent(role: RoleId | undefined, canOperate: boolean): boolean {
  if (canOperate) return false; // owners use the full create flow
  return !!role && TEACHER_REQUEST_ROLES.includes(role);
}

/** An event's effective approval status (legacy events with no field → approved). */
export function approvalOf(event: Pick<SchoolEvent, 'approvalStatus'>): EventApprovalStatus {
  return event.approvalStatus ?? 'approved';
}

/** An event is publicly visible / "published" only once approved. */
export function isPublished(event: Pick<SchoolEvent, 'approvalStatus'>): boolean {
  return approvalOf(event) === 'approved';
}

export const EVENT_APPROVAL_META: Record<EventApprovalStatus, { label: string; variant: BadgeVariant; icon: IconName }> = {
  draft: { label: 'Draft', variant: 'muted', icon: 'edit' },
  requested: { label: 'Pending approval', variant: 'warning', icon: 'clock' },
  approved: { label: 'Approved', variant: 'success', icon: 'check-circle' },
  rejected: { label: 'Rejected', variant: 'danger', icon: 'x' },
};

/** Approver may act (approve/reject) only on requested events. */
export function canReviewApproval(status: EventApprovalStatus): boolean {
  return status === 'requested';
}

/**
 * Patch that raises an event for approval (owner create, or resubmit). Keeps
 * `status` consistent: a non-cancelled event awaiting approval is not yet public,
 * so we hold it at its scheduled `status` but flip `approvalStatus` to requested.
 */
export function requestPatch(actorName?: string, isTeacherRequest = false): Partial<SchoolEvent> {
  return {
    approvalStatus: 'requested',
    requestedByName: actorName,
    requestedAt: Date.now(),
    isTeacherRequest: isTeacherRequest || undefined,
    approvalNote: '',
  };
}

/**
 * Patch that resubmits a previously *rejected* event for approval. Returns it to
 * the Principal/VP pending queue: flips `approvalStatus` back to `requested`,
 * clears the prior reviewer's verdict (`approvedByName`/`approvalNote`), restamps
 * `requestedAt`, and lifts the schedule out of `cancelled` back to `upcoming`
 * (re-derived on approval). Preserves whether it was a teacher request.
 */
export function resubmitPatch(actorName: string | undefined, wasTeacherRequest: boolean): Partial<SchoolEvent> {
  return {
    approvalStatus: 'requested',
    requestedByName: actorName,
    requestedAt: Date.now(),
    isTeacherRequest: wasTeacherRequest || undefined,
    approvedByName: '',
    approvalNote: '',
    status: 'upcoming',
  };
}

/** May this rejected event be resubmitted for approval by this actor? */
export function canResubmit(
  event: Pick<SchoolEvent, 'approvalStatus' | 'requestedByName'>,
  canOperate: boolean,
  actorName: string | undefined,
): boolean {
  if (approvalOf(event) !== 'rejected') return false;
  // Owners/operators may resubmit; otherwise only the original requester.
  return canOperate || (!!actorName && event.requestedByName === actorName);
}

/** Patch that approves + publishes an event (consistent `status`). */
export function approvePatch(scheduledStatus: EventStatus, actorName?: string, note?: string): Partial<SchoolEvent> {
  return {
    approvalStatus: 'approved',
    approvedByName: actorName,
    approvedAt: Date.now(),
    status: scheduledStatus,
    ...(note?.trim() ? { approvalNote: note.trim() } : {}),
  };
}

/** Patch that rejects an event with a required note (and cancels its schedule). */
export function rejectPatch(actorName?: string, note?: string): Partial<SchoolEvent> {
  return {
    approvalStatus: 'rejected',
    approvedByName: actorName,
    approvedAt: Date.now(),
    status: 'cancelled',
    ...(note?.trim() ? { approvalNote: note.trim() } : {}),
  };
}
