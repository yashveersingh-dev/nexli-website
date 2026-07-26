import type { ReactNode } from 'react';
import { Icon } from '@/components/Icon';

/**
 * Subtle "oversight, not operation" banner shown to reviewers (leadership) inside
 * operational modules — communicates that the daily workflow is owned by another
 * role, while they review/monitor/audit. Pair with `useOwnership(moduleKey)`:
 *   {isReviewer && !canOperate && <ReviewModeNote owner={ownerLabel} />}
 */
export function ReviewModeNote({ owner, children }: { owner: string; children?: ReactNode }) {
  return (
    <div className="nx-review-note" role="note">
      <Icon name="eye" size={15} />
      <span>
        {children ?? (
          <>
            Review mode — day-to-day operations here are handled by <strong>{owner}</strong>. You can review, monitor and audit.
          </>
        )}
      </span>
    </div>
  );
}
