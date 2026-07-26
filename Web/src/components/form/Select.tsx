import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/Icon';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  invalid?: boolean;
  size?: 'sm' | 'md' | 'lg';
  /** Convenience: render options from data (or pass <option> children directly). */
  options?: SelectOption[];
  /** Disabled, empty leading option (shown when value is ''). */
  placeholder?: string;
}

/**
 * Native <select> styled to the NEXLI surface with a custom chevron. Native is a
 * deliberate choice: best mobile UX (system picker) and accessibility for free.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { invalid, size = 'md', options, placeholder, className, children, value, ...rest },
  ref,
) {
  return (
    <div
      className={cn(
        'nx-input-wrap nx-select-wrap',
        `nx-input-wrap--${size}`,
        invalid && 'is-invalid',
        rest.disabled && 'is-disabled',
        (value === '' || value == null) && placeholder && 'is-placeholder',
        className,
      )}
    >
      <select ref={ref} className="nx-input nx-select" value={value} {...rest}>
        {placeholder && (
          <option value="" disabled hidden={rest.required}>
            {placeholder}
          </option>
        )}
        {options
          ? options.map((o) => (
              <option key={o.value} value={o.value} disabled={o.disabled}>
                {o.label}
              </option>
            ))
          : children}
      </select>
      <Icon name="chevron-down" size={16} className="nx-select__chev" />
    </div>
  );
});
