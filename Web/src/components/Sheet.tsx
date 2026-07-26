import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/Icon';
import { Portal } from '@/components/Portal';
import { useEscapeKey, useFocusTrap, useLockBodyScroll, usePresence } from '@/lib/hooks';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  /** Slide-in edge. 'right' = side drawer; 'bottom' = bottom sheet (default). */
  side?: 'right' | 'bottom' | 'left';
  /** Width (right/left) or max-height (bottom). */
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  footer?: ReactNode;
  dismissible?: boolean;
  hideClose?: boolean;
  className?: string;
}

/**
 * Slide-over panel: a bottom sheet on phones, side drawer on larger screens.
 * Good for filters, quick detail/peek, or secondary flows that shouldn't take a
 * full route. Portal + focus trap + scroll lock + Escape, with a grab handle on
 * bottom sheets. Honors safe-area insets.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  side = 'bottom',
  size = 'md',
  children,
  footer,
  dismissible = true,
  hideClose,
  className,
}: SheetProps) {
  const { mounted, shown } = usePresence(open, 280);
  const trapRef = useFocusTrap<HTMLDivElement>(mounted);
  const reactId = useId();
  const titleId = `${reactId}-title`;
  const descId = `${reactId}-desc`;

  useLockBodyScroll(mounted);
  useEscapeKey(mounted && dismissible, onClose);

  if (!mounted) return null;

  return (
    <Portal>
      <div className={cn('nx-sheet', `nx-sheet--${side}`, shown && 'is-shown')}>
        <div className="nx-sheet__backdrop" onClick={dismissible ? onClose : undefined} aria-hidden="true" />
        <div
          ref={trapRef}
          className={cn('nx-sheet__panel', `nx-sheet__panel--${size}`, className)}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          aria-describedby={description ? descId : undefined}
        >
          {side === 'bottom' && <div className="nx-sheet__grip" aria-hidden="true" />}
          {(title || !hideClose) && (
            <div className="nx-sheet__head">
              <div className="nx-sheet__headtext">
                {title && (
                  <h2 className="nx-sheet__title" id={titleId}>
                    {title}
                  </h2>
                )}
                {description && (
                  <p className="nx-sheet__desc" id={descId}>
                    {description}
                  </p>
                )}
              </div>
              {!hideClose && (
                <button type="button" className="nx-sheet__close" onClick={onClose} aria-label="Close">
                  <Icon name="x" size={18} />
                </button>
              )}
            </div>
          )}
          <div className="nx-sheet__body">{children}</div>
          {footer && <div className="nx-sheet__foot">{footer}</div>}
        </div>
      </div>
    </Portal>
  );
}
