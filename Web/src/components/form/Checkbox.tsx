import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/Icon';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  indeterminate?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  'aria-label'?: string;
  className?: string;
}

/** Custom-styled checkbox over a real <input> (keeps native a11y + keyboard). */
export function Checkbox({
  checked,
  onChange,
  label,
  description,
  indeterminate,
  disabled,
  invalid,
  id,
  className,
  ...aria
}: CheckboxProps) {
  const reactId = useId();
  const inputId = id ?? `cb-${reactId}`;
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate && !checked;
  }, [indeterminate, checked]);

  return (
    <label
      htmlFor={inputId}
      className={cn('nx-check', disabled && 'is-disabled', invalid && 'is-invalid', className)}
    >
      <span className="nx-check__box">
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          className="nx-check__input"
          checked={checked}
          disabled={disabled}
          aria-label={aria['aria-label']}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="nx-check__mark" aria-hidden="true">
          <Icon name="check" size={12} strokeWidth={3} />
        </span>
      </span>
      {(label || description) && (
        <span className="nx-check__text">
          {label && <span className="nx-check__label">{label}</span>}
          {description && <span className="nx-check__desc">{description}</span>}
        </span>
      )}
    </label>
  );
}
