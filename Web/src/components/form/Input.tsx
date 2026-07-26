import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from '@/components/Icon';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> {
  invalid?: boolean;
  size?: 'sm' | 'md' | 'lg';
  /** Leading glyph (e.g. 'search', 'mail'). */
  leftIcon?: IconName;
  /** Trailing glyph (ignored when `revealable` or `rightSlot` is set). */
  rightIcon?: IconName;
  /** Custom trailing content (e.g. a unit, a button). */
  rightSlot?: ReactNode;
  /** Fixed leading text inside the field (e.g. "₹", "+91"). */
  prefix?: ReactNode;
  /** For type="password": render a show/hide toggle. */
  revealable?: boolean;
}

/**
 * NEXLI text input. Composes the reference's surface/border tokens; supports
 * leading/trailing icons, a fixed prefix, and an inline password reveal.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    invalid,
    size = 'md',
    leftIcon,
    rightIcon,
    rightSlot,
    prefix,
    revealable,
    type = 'text',
    className,
    disabled,
    ...rest
  },
  ref,
) {
  const [reveal, setReveal] = useState(false);
  const isPassword = type === 'password';
  const effectiveType = isPassword && revealable && reveal ? 'text' : type;
  const hasLeft = !!leftIcon || prefix != null;
  const hasRight = !!rightIcon || rightSlot != null || (isPassword && revealable);

  return (
    <div
      className={cn(
        'nx-input-wrap',
        `nx-input-wrap--${size}`,
        invalid && 'is-invalid',
        disabled && 'is-disabled',
        hasLeft && 'has-left',
        hasRight && 'has-right',
        className,
      )}
    >
      {leftIcon && <Icon name={leftIcon} size={16} className="nx-input__icon nx-input__icon--left" />}
      {prefix != null && <span className="nx-input__affix">{prefix}</span>}
      <input ref={ref} type={effectiveType} className="nx-input" disabled={disabled} {...rest} />
      {isPassword && revealable ? (
        <button
          type="button"
          className="nx-input__reveal"
          onClick={() => setReveal((v) => !v)}
          aria-label={reveal ? 'Hide password' : 'Show password'}
          aria-pressed={reveal}
          tabIndex={-1}
        >
          <Icon name={reveal ? 'eye-off' : 'eye'} size={16} />
        </button>
      ) : rightSlot != null ? (
        <span className="nx-input__slot">{rightSlot}</span>
      ) : rightIcon ? (
        <Icon name={rightIcon} size={16} className="nx-input__icon nx-input__icon--right" />
      ) : null}
    </div>
  );
});
