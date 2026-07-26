import { forwardRef, useEffect, useRef, type MutableRefObject, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
  /** Grows with content up to `maxRows` instead of scrolling. */
  autoResize?: boolean;
  maxRows?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid, autoResize, maxRows = 10, className, rows = 4, onChange, value, ...rest },
  ref,
) {
  const innerRef = useRef<HTMLTextAreaElement | null>(null);

  const setRef = (node: HTMLTextAreaElement | null) => {
    innerRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) (ref as MutableRefObject<HTMLTextAreaElement | null>).current = node;
  };

  const resize = () => {
    const el = innerRef.current;
    if (!el || !autoResize) return;
    el.style.height = 'auto';
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight || '20');
    const max = lineHeight * maxRows + 24;
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
    el.style.overflowY = el.scrollHeight > max ? 'auto' : 'hidden';
  };

  useEffect(() => {
    resize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, autoResize]);

  return (
    <textarea
      ref={setRef}
      rows={rows}
      value={value}
      className={cn('nx-input nx-textarea', invalid && 'is-invalid', className)}
      onChange={(e) => {
        onChange?.(e);
        resize();
      }}
      {...rest}
    />
  );
});
