import { Icon } from '@/components/Icon';
import { Badge } from '@/components/Badge';
import { formatRelative } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { Circular } from '@/types/daily';
import { CIRCULAR_CATEGORY_META } from '@/features/daily/meta';
import { excerpt } from './util';

/** Compact circular card used in the staff list and parent/student inbox. */
export function CircularCard({
  circular,
  audience,
  onClick,
  expandable,
}: {
  circular: Circular;
  audience: string;
  onClick?: () => void;
  /** When true (inbox) the card is a button that expands/opens the full body. */
  expandable?: boolean;
}) {
  const meta = CIRCULAR_CATEGORY_META[circular.category];
  const emergency = !!circular.emergency || circular.category === 'emergency';

  const inner = (
    <>
      <div className="nx-circ-card__top">
        <Badge variant={meta.variant}>
          <Icon name={meta.icon} size={12} aria-hidden="true" />
          <span>{meta.label}</span>
        </Badge>
        {circular.pinned && (
          <span className="nx-circ-card__pin" title="Pinned">
            <Icon name="bell" size={13} aria-hidden="true" />
          </span>
        )}
        {emergency && <Badge variant="danger">Emergency</Badge>}
      </div>

      <h3 className="nx-circ-card__title">{circular.title}</h3>
      <p className="nx-circ-card__excerpt">{excerpt(circular.body)}</p>

      <div className="nx-circ-card__foot">
        <span className="nx-circ-card__aud">{audience}</span>
        <span className="dot" aria-hidden="true" />
        <span>{circular.publishedAt ? formatRelative(circular.publishedAt) : 'Draft'}</span>
        {circular.publishedByName && (
          <>
            <span className="dot" aria-hidden="true" />
            <span className="nx-circ-card__by">{circular.publishedByName}</span>
          </>
        )}
      </div>
    </>
  );

  const className = cn('nx-circ-card', emergency && 'is-emergency', circular.pinned && 'is-pinned');

  if (expandable) {
    return (
      <button type="button" className={cn(className, 'nx-circ-card--btn')} onClick={onClick}>
        {inner}
      </button>
    );
  }
  return (
    <article className={className} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}>
      {inner}
    </article>
  );
}
