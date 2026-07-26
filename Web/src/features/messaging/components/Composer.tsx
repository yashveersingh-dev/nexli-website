import { useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Icon } from '@/components/Icon';

interface ComposerProps {
  onSend: (text: string) => void | Promise<void>;
  disabled?: boolean;
  /** Name of the other participant, used for the textarea label. */
  recipientName: string;
}

const MAX_ROWS_PX = 132; // ~6 lines before the textarea scrolls internally.

/** Thread composer: auto-growing textarea + send. Enter sends, Shift+Enter newlines. */
export function Composer({ onSend, disabled, recipientName }: ComposerProps) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  // Auto-grow to fit content, capped, then scroll internally.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_ROWS_PX)}px`;
  }, [text]);

  const canSend = text.trim().length > 0 && !disabled && !busy;

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!canSend) return;
    const body = text.trim();
    setBusy(true);
    try {
      await onSend(body);
      setText('');
      ref.current?.focus();
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  return (
    <form className="nx-composer" onSubmit={submit}>
      <textarea
        ref={ref}
        className="nx-composer__input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        rows={1}
        placeholder={`Message ${recipientName}…`}
        aria-label={`Message ${recipientName}`}
        disabled={disabled}
      />
      <button
        type="submit"
        className="nx-composer__send"
        disabled={!canSend}
        aria-label="Send message"
      >
        <Icon name="send" size={17} strokeWidth={2.2} />
      </button>
    </form>
  );
}
