import type { BadgeVariant } from '@/components/Badge';
import type { IconName } from '@/components/Icon';
import type { RoleId } from '@/types/roles';
import type { HpcApprovalStatus, HpcCard } from '@/types/special';

/**
 * HPC approval state machine (review-first: leadership approves, doesn't author).
 *
 *   draft ─submit→ submitted ─approve→ approved (published)
 *     ▲                │
 *     └── returned ◀───┘ return (with note)  ── author edits ── resubmit ──┐
 *                                                                          └→ submitted
 *
 * `published` is kept consistent with `approvalStatus === 'approved'` by the
 * patch builders below — a card is only visible to parent/student once approved.
 */

/** Leadership roles allowed to approve/return (mirrors `reportcard.approve`). */
export const HPC_APPROVER_ROLES: RoleId[] = ['principal', 'vp_admin', 'vp_academic'];

/**
 * Can this user act as an approver? Leadership roles carry `*` permissions, so we
 * gate on the role set directly, plus `settings.manage` (e.g. IT admin) as a
 * documented escape hatch — matching the brief.
 */
export function canApproveHpc(role: RoleId | undefined, can: (perm: string) => boolean): boolean {
  if (role && HPC_APPROVER_ROLES.includes(role)) return true;
  return can('settings.manage');
}

/** A card's effective approval status (legacy cards: derive from `published`). */
export function statusOf(card: Pick<HpcCard, 'approvalStatus' | 'published'>): HpcApprovalStatus {
  if (card.approvalStatus) return card.approvalStatus;
  return card.published ? 'approved' : 'draft';
}

export const HPC_STATUS_META: Record<HpcApprovalStatus, { label: string; variant: BadgeVariant; icon: IconName }> = {
  draft: { label: 'Draft', variant: 'muted', icon: 'edit' },
  submitted: { label: 'Pending approval', variant: 'warning', icon: 'clock' },
  approved: { label: 'Approved', variant: 'success', icon: 'check-circle' },
  returned: { label: 'Returned', variant: 'danger', icon: 'info' },
};

/** Author may edit a card only while it is not awaiting/holding approval. */
export function canEditStatus(status: HpcApprovalStatus): boolean {
  return status === 'draft' || status === 'returned';
}
/** Author may submit from draft or returned. */
export function canSubmitStatus(status: HpcApprovalStatus): boolean {
  return status === 'draft' || status === 'returned';
}
/** Approver may act only on submitted cards. */
export function canReviewStatus(status: HpcApprovalStatus): boolean {
  return status === 'submitted';
}

/** Patch that moves a card → submitted (clears any prior return note). */
export function submitPatch(actorName?: string): Partial<HpcCard> {
  return {
    approvalStatus: 'submitted',
    submittedByName: actorName,
    submittedAt: Date.now(),
    published: false,
    approvalNote: '',
  };
}

/** Patch that approves + publishes a card. */
export function approvePatch(actorName?: string, note?: string): Partial<HpcCard> {
  return {
    approvalStatus: 'approved',
    approvedByName: actorName,
    approvedAt: Date.now(),
    published: true,
    ...(note?.trim() ? { approvalNote: note.trim() } : {}),
  };
}

/** Patch that returns a card to its author with a required note. */
export function returnPatch(note: string): Partial<HpcCard> {
  return {
    approvalStatus: 'returned',
    published: false,
    approvalNote: note.trim(),
  };
}
