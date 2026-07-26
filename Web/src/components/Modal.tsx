import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from '@/components/Icon';
import { Button, type ButtonVariant } from '@/components/Button';
import { Portal } from '@/components/Portal';
import { useEscapeKey, useFocusTrap, useLockBodyScroll, usePresence } from '@/lib/hooks';

export type ModalSize = 'sm' | 'md' | 'lg';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  /** Leading icon + tone for the header badge. */
  icon?: IconName;
  tone?: 'default' | 'gold' | 'danger' | 'success' | 'warning' | 'info';
  size?: ModalSize;
  children?: ReactNode;
  /** Footer action row (use <Button>s). When omitted, no footer renders. */
  footer?: ReactNode;
  /** Disable backdrop-click / Escape close (e.g. during a submit). */
  dismissible?: boolean;
  /** Hide the top-right close button. */
  hideClose?: boolean;
  className?: string;
}

/**
 * Accessible dialog: portal + scrim, focus trap, Escape + backdrop close, body
 * scroll lock, mount/exit transition. Mobile: centered card that becomes a
 * bottom sheet under 480px. Use for confirm/preview/warn/simple flows — major
 * data entry lives on dedicated routed pages.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  icon,
  tone = 'default',
  size = 'md',
  children,
  footer,
  dismissible = true,
  hideClose,
  className,
}: ModalProps) {
  const { mounted, shown } = usePresence(open);
  const trapRef = useFocusTrap<HTMLDivElement>(mounted);
  const reactId = useId();
  const titleId = `${reactId}-title`;
  const descId = `${reactId}-desc`;

  useLockBodyScroll(mounted);
  useEscapeKey(mounted && dismissible, onClose);

  if (!mounted) return null;

  return (
    <Portal>
      <div className={cn('nx-modal', shown && 'is-shown')}>
        <div
          className="nx-modal__backdrop"
          onClick={dismissible ? onClose : undefined}
          aria-hidden="true"
        />
        <div
          ref={trapRef}
          className={cn('nx-modal__panel', `nx-modal__panel--${size}`, className)}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          aria-describedby={description ? descId : undefined}
        >
          {!hideClose && (
            <button type="button" className="nx-modal__close" onClick={onClose} aria-label="Close dialog">
              <Icon name="x" size={18} />
            </button>
          )}
          {(title || icon) && (
            <div className="nx-modal__head">
              {icon && (
                <span className={cn('nx-modal__icon', `nx-modal__icon--${tone}`)} aria-hidden="true">
                  <Icon name={icon} size={20} />
                </span>
              )}
              <div className="nx-modal__headtext">
                {title && (
                  <h2 className="nx-modal__title" id={titleId}>
                    {title}
                  </h2>
                )}
                {description && (
                  <p className="nx-modal__desc" id={descId}>
                    {description}
                  </p>
                )}
              </div>
            </div>
          )}
          {children != null && <div className="nx-modal__body">{children}</div>}
          {footer && <div className="nx-modal__foot">{footer}</div>}
        </div>
      </div>
    </Portal>
  );
}

export interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: ReactNode;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 'danger' uses the destructive styling + warning icon. */
  tone?: 'gold' | 'danger';
  icon?: IconName;
  loading?: boolean;
  children?: ReactNode;
}

/** Common confirm/destructive dialog built on Modal. */
export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'gold',
  icon,
  loading,
  children,
}: ConfirmModalProps) {
  const confirmVariant: ButtonVariant = tone === 'danger' ? 'danger' : 'gold';
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={title}
      description={message}
      icon={icon ?? (tone === 'danger' ? 'alert-triangle' : 'help-circle')}
      tone={tone === 'danger' ? 'danger' : 'gold'}
      dismissible={!loading}
      hideClose={loading}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button type="button" variant={confirmVariant} loading={loading} onClick={() => void onConfirm()}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}
