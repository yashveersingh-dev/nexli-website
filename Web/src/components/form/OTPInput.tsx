import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';

export interface OTPInputProps {
  /** Number of digit boxes. */
  length?: number;
  value: string;
  onChange: (value: string) => void;
  /** Fired when all boxes are filled. */
  onComplete?: (value: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  'aria-label'?: string;
  className?: string;
}

/**
 * Segmented one-time-code input (parent phone-OTP login, etc.). Numeric only,
 * with paste-fill, backspace traversal and arrow navigation. SMS autofill via
 * `autoComplete="one-time-code"` on the first box.
 */
export function OTPInput({
  length = 6,
  value,
  onChange,
  onComplete,
  invalid,
  disabled,
  autoFocus,
  className,
  ...aria
}: OTPInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.split('').slice(0, length);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const commit = (next: string) => {
    const clean = next.replace(/\D/g, '').slice(0, length);
    onChange(clean);
    if (clean.length === length) onComplete?.(clean);
  };

  const setAt = (index: number, digit: string) => {
    // Pad to `length` so a sparse write doesn't collapse earlier empty positions.
    const arr = Array.from({ length }, (_, i) => value[i] ?? '');
    arr[index] = digit;
    commit(arr.join('').slice(0, length));
    if (digit && index < length - 1) refs.current[index + 1]?.focus();
  };

  const onKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (digits[index]) {
        setAt(index, '');
      } else if (index > 0) {
        refs.current[index - 1]?.focus();
        setAt(index - 1, '');
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    commit(pasted);
    refs.current[Math.min(pasted.length, length - 1)]?.focus();
  };

  return (
    <div
      className={cn('nx-otp', invalid && 'is-invalid', disabled && 'is-disabled', className)}
      role="group"
      aria-label={aria['aria-label'] ?? `Enter ${length}-digit code`}
    >
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className="nx-otp__box"
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={digits[i] ?? ''}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, '').slice(-1);
            if (d) setAt(i, d);
          }}
          onKeyDown={(e) => onKeyDown(i, e)}
          onPaste={onPaste}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}
