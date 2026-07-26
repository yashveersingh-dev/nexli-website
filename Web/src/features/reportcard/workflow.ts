import type { BadgeVariant } from '@/components/Badge';
import type { IconName } from '@/components/Icon';
import type { RoleId } from '@/types/roles';
import type { ReportCard, ReportCardStatus } from '@/types/reportcard';

/**
 * Report-card approval state machine. Identical semantics to the HPC workflow
 * (`features/hpc/hpcWorkflow.ts`) — review-first: leadership approves, doesn't
 * author. The logic is replicated here (rather than imported) because the HPC
 * patch builders are typed to `Partial<HpcCard>`; this module's patches are
 * typed to `Partial<ReportCard>` so the data layer stays type-safe.
 *
 *   draft ─submit→ submitted ─approve→ approved (published)
 *     ▲                │
 *     └── returned ◀───┘ return (with note)  ── author edits ── resubmit ──┐
 *                                                                          └→ submitted
 */

/** Leadership roles allowed to approve/return. */
export const RC_APPROVER_ROLES: RoleId[] = ['principal', 'vp_admin', 'vp_academic'];

/** Can this user act as an approver? Leadership roles, plus `settings.manage` as an escape hatch. */
export function canApproveReportCard(role: RoleId | undefined, can: (perm: string) => boolean): boolean {
  if (role && RC_APPROVER_ROLES.includes(role)) return true;
  return can('settings.manage');
}

/** A card's effective approval status (legacy cards: derive from `published`). */
export function statusOf(card: Pick<ReportCard, 'approvalStatus' | 'published'>): ReportCardStatus {
  if (card.approvalStatus) return card.approvalStatus;
  return card.published ? 'approved' : 'draft';
}

export const RC_STATUS_META: Record<ReportCardStatus, { label: string; variant: BadgeVariant; icon: IconName }> = {
  draft: { label: 'Draft', variant: 'muted', icon: 'edit' },
  submitted: { label: 'Pending approval', variant: 'warning', icon: 'clock' },
  approved: { label: 'Approved', variant: 'success', icon: 'check-circle' },
  returned: { label: 'Returned', variant: 'danger', icon: 'info' },
};

/** Author may edit a card only while it is not awaiting/holding approval. */
export function canEditStatus(status: ReportCardStatus): boolean {
  return status === 'draft' || status === 'returned';
}
/** Author may submit from draft or returned. */
export function canSubmitStatus(status: ReportCardStatus): boolean {
  return status === 'draft' || status === 'returned';
}
/** Approver may act only on submitted cards. */
export function canReviewStatus(status: ReportCardStatus): boolean {
  return status === 'submitted';
}

/** Patch that moves a card → submitted (clears any prior return note). */
export function submitPatch(actorName?: string): Partial<ReportCard> {
  return {
    approvalStatus: 'submitted',
    submittedByName: actorName,
    submittedAt: Date.now(),
    published: false,
    approvalNote: '',
  };
}

/** Patch that approves + publishes a card. */
export function approvePatch(actorName?: string, note?: string): Partial<ReportCard> {
  return {
    approvalStatus: 'approved',
    approvedByName: actorName,
    approvedAt: Date.now(),
    published: true,
    ...(note?.trim() ? { approvalNote: note.trim() } : {}),
  };
}

/** Patch that returns a card to its author with a required note. */
export function returnPatch(note: string): Partial<ReportCard> {
  return {
    approvalStatus: 'returned',
    published: false,
    approvalNote: note.trim(),
  };
}
