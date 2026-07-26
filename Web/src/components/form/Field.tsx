import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface FieldProps {
  /** Visible label. Omit for a label-less control (still pass `aria-label` to the control). */
  label?: ReactNode;
  /** Associates the label/help with the control. Auto-generated if omitted. */
  htmlFor?: string;
  required?: boolean;
  /** Shows a subtle "Optional" tag (use when most siblings are required). */
  optional?: boolean;
  /** Helper text under the label, shown when there is no error. */
  hint?: ReactNode;
  /** Error message; replaces the hint and flags the control. */
  error?: ReactNode;
  /** Right side of the label row (e.g. a char counter or "Forgot?" link). */
  labelAction?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * Layout + a11y wrapper for a single form control: label (with required/optional
 * cue), the control, and a hint/error line wired by id for screen readers.
 * Pass `controlId`/`describedById` down to the control via the render-prop form,
 * or simply give the control a matching `id`.
 */
export function Field({
  label,
  htmlFor,
  required,
  optional,
  hint,
  error,
  labelAction,
  className,
  children,
}: FieldProps) {
  const reactId = useId();
  const id = htmlFor ?? `f-${reactId}`;
  const msgId = `${id}-msg`;
  const hasError = error != null && error !== false && error !== '';

  return (
    <div className={cn('nx-field', hasError && 'nx-field--invalid', className)}>
      {(label || labelAction) && (
        <div className="nx-field__labelrow">
          {label != null ? (
            <label className="nx-field__label" htmlFor={id}>
              {label}
              {required && (
                <span className="nx-field__req" aria-hidden="true">
                  *
                </span>
              )}
              {optional && !required && <span className="nx-field__optional">Optional</span>}
            </label>
          ) : (
            <span />
          )}
          {labelAction}
        </div>
      )}
      {children}
      {hasError ? (
        <p className="nx-field__error" id={msgId} role="alert">
          {error}
        </p>
      ) : hint != null ? (
        <p className="nx-field__hint" id={msgId}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Builds the id/aria props a control needs to bind to its Field. */
export function fieldControlProps(id: string, hasError: boolean, hasMsg: boolean) {
  return {
    id,
    'aria-invalid': hasError || undefined,
    'aria-describedby': hasMsg ? `${id}-msg` : undefined,
  } as const;
}
