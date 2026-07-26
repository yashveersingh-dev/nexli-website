import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface RadioOption {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}

export interface RadioGroupProps {
  name?: string;
  value: string;
  onChange: (value: string) => void;
  options: RadioOption[];
  /** 'card' renders selectable tiles; 'inline' renders compact dots in a row. */
  variant?: 'card' | 'inline';
  disabled?: boolean;
  invalid?: boolean;
  /** Accessible group name. */
  'aria-label'?: string;
  /** id of an external label (e.g. the Field label) for the group. */
  'aria-labelledby'?: string;
  className?: string;
}

/** Accessible radio group (real <input type=radio> under styled tiles/dots). */
export function RadioGroup({
  name,
  value,
  onChange,
  options,
  variant = 'card',
  disabled,
  invalid,
  className,
  ...aria
}: RadioGroupProps) {
  const reactId = useId();
  const groupName = name ?? `rg-${reactId}`;

  return (
    <div
      role="radiogroup"
      aria-label={aria['aria-label']}
      aria-labelledby={aria['aria-labelledby']}
      aria-invalid={invalid || undefined}
      className={cn('nx-radiogroup', `nx-radiogroup--${variant}`, className)}
    >
      {options.map((o) => {
        const id = `${groupName}-${o.value}`;
        const isDisabled = disabled || o.disabled;
        return (
          <label
            key={o.value}
            htmlFor={id}
            className={cn(
              'nx-radio',
              value === o.value && 'is-checked',
              isDisabled && 'is-disabled',
              invalid && 'is-invalid',
            )}
          >
            <input
              id={id}
              type="radio"
              name={groupName}
              className="nx-radio__input"
              value={o.value}
              checked={value === o.value}
              disabled={isDisabled}
              onChange={() => onChange(o.value)}
            />
            <span className="nx-radio__dot" aria-hidden="true" />
            <span className="nx-radio__text">
              <span className="nx-radio__label">{o.label}</span>
              {o.description && <span className="nx-radio__desc">{o.description}</span>}
            </span>
          </label>
        );
      })}
    </div>
  );
}
