import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from '@/components/Icon';
import { Button } from '@/components/Button';

export interface FormPageBreadcrumb {
  label: string;
  onClick?: () => void;
}

export interface FormPageProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Back affordance in the header. */
  onBack?: () => void;
  breadcrumbs?: FormPageBreadcrumb[];
  /** Extra header-right content (e.g. a status badge or secondary menu). */
  headerRight?: ReactNode;
  children: ReactNode;
  /* Sticky action bar */
  submitLabel?: string;
  submitIcon?: IconName;
  cancelLabel?: string;
  onCancel?: () => void;
  /** Submitting state (disables + spins the primary button). */
  submitting?: boolean;
  /** Disable the submit button (e.g. invalid/unchanged). */
  submitDisabled?: boolean;
  /** Destructive submit (e.g. terminate). */
  destructive?: boolean;
  /** Extra controls on the left of the action bar (e.g. "Save as draft"). */
  actionsExtra?: ReactNode;
  /** Hide the sticky bar (when the form has its own actions). */
  hideActions?: boolean;
  className?: string;
}

/**
 * Dedicated-page shell for a major form: title/back header, scrollable body of
 * <FormSection>s, and a sticky save bar (above the mobile bottom-nav / safe area).
 * Place inside a <Form> so the submit button drives RHF.
 */
export function FormPage({
  title,
  subtitle,
  onBack,
  breadcrumbs,
  headerRight,
  children,
  submitLabel = 'Save',
  submitIcon,
  cancelLabel = 'Cancel',
  onCancel,
  submitting,
  submitDisabled,
  destructive,
  actionsExtra,
  hideActions,
  className,
}: FormPageProps) {
  return (
    <div className={cn('nx-formpage', className)}>
      <header className="nx-formpage__head">
        {onBack && (
          <button type="button" className="nx-formpage__back" onClick={onBack} aria-label="Go back">
            <Icon name="chevron-left" size={18} />
          </button>
        )}
        <div className="nx-formpage__heading">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="nx-formpage__crumbs" aria-label="Breadcrumb">
              {breadcrumbs.map((b, i) => (
                <span key={i} className="nx-formpage__crumb">
                  {b.onClick ? (
                    <button type="button" onClick={b.onClick}>
                      {b.label}
                    </button>
                  ) : (
                    <span>{b.label}</span>
                  )}
                  {i < breadcrumbs.length - 1 && <Icon name="chevron-right" size={12} aria-hidden="true" />}
                </span>
              ))}
            </nav>
          )}
          <h1 className="nx-formpage__title">{title}</h1>
          {subtitle && <p className="nx-formpage__sub">{subtitle}</p>}
        </div>
        {headerRight && <div className="nx-formpage__head-right">{headerRight}</div>}
      </header>

      <div className="nx-formpage__body">{children}</div>

      {!hideActions && (
        <div className="nx-savebar" role="group" aria-label="Form actions">
          <div className="nx-savebar__inner">
            <div className="nx-savebar__left">{actionsExtra}</div>
            <div className="nx-savebar__right">
              {onCancel && (
                <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
                  {cancelLabel}
                </Button>
              )}
              <Button
                type="submit"
                variant={destructive ? 'danger' : 'gold'}
                loading={submitting}
                disabled={submitDisabled}
                leftIcon={submitIcon}
              >
                {submitLabel}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export interface FormSectionProps {
  title?: ReactNode;
  description?: ReactNode;
  /** Right side of the section header. */
  aside?: ReactNode;
  children: ReactNode;
  /** Single-column instead of the responsive 2-col grid. */
  single?: boolean;
  className?: string;
}

/**
 * A titled block of fields inside a FormPage. Body is a responsive grid that
 * collapses to one column under 640px. Wrap a field in `.nx-col-full` to span both.
 */
export function FormSection({ title, description, aside, children, single, className }: FormSectionProps) {
  return (
    <section className={cn('nx-section', className)}>
      {(title || description || aside) && (
        <div className="nx-section__head">
          <div>
            {title && <h2 className="nx-section__title">{title}</h2>}
            {description && <p className="nx-section__desc">{description}</p>}
          </div>
          {aside && <div className="nx-section__aside">{aside}</div>}
        </div>
      )}
      <div className={cn('nx-section__grid', single && 'nx-section__grid--single')}>{children}</div>
    </section>
  );
}

/** Forces a field to span the full width of a FormSection grid. */
export function FormRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('nx-col-full', className)}>{children}</div>;
}
