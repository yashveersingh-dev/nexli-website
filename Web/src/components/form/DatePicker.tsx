import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/Icon';

export interface DatePickerProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  invalid?: boolean;
  size?: 'sm' | 'md' | 'lg';
  /** 'date' (default) | 'time' | 'datetime-local' | 'month'. */
  mode?: 'date' | 'time' | 'datetime-local' | 'month';
}

/**
 * Native date/time picker styled to NEXLI. Native gives the system calendar on
 * mobile (best UX) and full keyboard/SR support. Value is the ISO string the
 * native input uses (yyyy-mm-dd, etc.); format for display with `formatDate`.
 */
export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(function DatePicker(
  { invalid, size = 'md', mode = 'date', className, ...rest },
  ref,
) {
  const icon = mode === 'time' ? 'clock' : 'calendar';
  return (
    <div
      className={cn(
        'nx-input-wrap nx-date-wrap has-left',
        `nx-input-wrap--${size}`,
        invalid && 'is-invalid',
        rest.disabled && 'is-disabled',
        className,
      )}
    >
      <Icon name={icon} size={16} className="nx-input__icon nx-input__icon--left" />
      <input ref={ref} type={mode} className="nx-input nx-date" {...rest} />
    </div>
  );
});
