import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from '@/components/Icon';

export type ButtonVariant = 'gold' | 'ghost' | 'subtle' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  loading?: boolean;
  leftIcon?: IconName;
  rightIcon?: IconName;
  children?: ReactNode;
}

const iconSizeFor: Record<ButtonSize, number> = { sm: 13, md: 14, lg: 16 };

export function Button({
  variant = 'subtle',
  size = 'md',
  block,
  loading,
  leftIcon,
  rightIcon,
  children,
  className,
  disabled,
  ...rest
}: ButtonProps) {
  const isz = iconSizeFor[size];
  // Icon-only (no text label): lets containers like `.row-actions` size it as a
  // compact square, while labelled buttons keep their natural width.
  const iconOnly = !loading && !children && (!!leftIcon || !!rightIcon);
  return (
    <button
      className={cn('nx-btn', `nx-btn--${variant}`, `nx-btn--${size}`, block && 'nx-btn--block', iconOnly && 'nx-btn--icon', className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <span className="nx-btn__spin" aria-hidden="true" />
      ) : (
        leftIcon && <Icon name={leftIcon} size={isz} strokeWidth={2.2} />
      )}
      {children}
      {!loading && rightIcon && <Icon name={rightIcon} size={isz} strokeWidth={2.2} />}
    </button>
  );
}
