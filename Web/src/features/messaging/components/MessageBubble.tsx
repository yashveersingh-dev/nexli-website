import { formatDate, formatRelative } from '@/lib/format';
import type { Message } from '../types';

/** A single chat bubble. Mine = right + gold-tinted, theirs = left + neutral. */
export function MessageBubble({ message, mine }: { message: Message; mine: boolean }) {
  return (
    <div className={mine ? 'nx-msg nx-msg--mine' : 'nx-msg'}>
      <div className="nx-msg__bubble">
        <p className="nx-msg__text">{message.text}</p>
        <time className="nx-msg__time" dateTime={new Date(message.sentAt).toISOString()} title={formatDate(message.sentAt, 'DD MMM YYYY, h:mm A')}>
          {formatRelative(message.sentAt)}
        </time>
      </div>
    </div>
  );
}
