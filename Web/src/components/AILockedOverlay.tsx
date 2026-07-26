import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/Icon';

/**
 * The exact message NEXLI shows on every AI surface until a production AI
 * provider is integrated (per the approved AI strategy — see NEXLI_BUILD_PLAN.md §13A).
 */
export const AI_COMING_SOON_MESSAGE =
  'AI features are currently in development and will be released in a future update. Please keep an eye on announcements from the Super Admin for upcoming AI capabilities.';

export interface AILockedOverlayProps {
  /** The fully-built AI surface, rendered (blurred) beneath the veil. */
  children: ReactNode;
  title?: string;
  message?: string;
  className?: string;
}

/**
 * Wraps a fully-built AI surface with a premium, glossy blurred "coming soon"
 * veil. The real UI is built underneath so flipping the `aiEnabled` flag later
 * reveals it with no redesign.
 */
export function AILockedOverlay({
  children,
  title = 'AI Assistance',
  message = AI_COMING_SOON_MESSAGE,
  className,
}: AILockedOverlayProps) {
  return (
    <div className={cn('ai-lock', className)}>
      <div className="ai-lock__content" aria-hidden="true">
        {children}
      </div>
      <div className="ai-lock__veil" role="status" aria-live="polite">
        <div className="ai-lock__card">
          <div className="ai-lock__badge">
            <Icon name="sparkles" size={26} />
          </div>
          <div className="ai-lock__pill">
            <Icon name="sparkles" size={12} /> AI · Coming soon
          </div>
          <div className="ai-lock__title">{title}</div>
          <p className="ai-lock__msg">{message}</p>
        </div>
      </div>
    </div>
  );
}
