import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Inline label to the right of the switch. */
  label?: ReactNode;
  /** Secondary description under the label. */
  description?: ReactNode;
  disabled?: boolean;
  size?: 'sm' | 'md';
  /** Accessible name when no visible `label` is given. */
  'aria-label'?: string;
  id?: string;
  className?: string;
}

/** Accessible switch (role="switch"). Animates the knob via transform only. */
export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
  size = 'md',
  className,
  id,
  ...aria
}: ToggleProps) {
  const reactId = useId();
  const labelId = label ? `${id ?? reactId}-lbl` : undefined;

  const control = (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={aria['aria-label']}
      aria-labelledby={labelId}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn('nx-switch', `nx-switch--${size}`, checked && 'is-on', !label && className)}
    >
      <span className="nx-switch__knob" />
    </button>
  );

  if (!label && !description) return control;

  return (
    <div className={cn('nx-switch-row', disabled && 'is-disabled', className)}>
      {control}
      <div className="nx-switch-row__text">
        {label && (
          <span className="nx-switch-row__label" id={labelId} onClick={() => !disabled && onChange(!checked)}>
            {label}
          </span>
        )}
        {description && <span className="nx-switch-row__desc">{description}</span>}
      </div>
    </div>
  );
}
