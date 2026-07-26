import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/Icon';

export interface PanelProps {
  title?: ReactNode;
  sub?: ReactNode;
  /** Right side of the header (select, action link, badge, etc.). */
  headerRight?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Centered gold footer link row. */
  footer?: { label: string; onClick?: () => void };
}

/** Generic card with header/body/footer (maps to the reference .panel). */
export function Panel({ title, sub, headerRight, children, className, bodyClassName, footer }: PanelProps) {
  return (
    <section className={cn('panel', className)}>
      {(title || headerRight) && (
        <div className="panel__head">
          {title != null && (
            <div className="panel__title">
              {title}
              {sub != null && <span className="sub">{sub}</span>}
            </div>
          )}
          {headerRight}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
      {footer && (
        <button type="button" className="panel__footer-link" onClick={footer.onClick}>
          {footer.label}
          <Icon name="arrow-right" size={14} />
        </button>
      )}
    </section>
  );
}

/** Gold "View all →" style action link for panel headers. */
export function PanelAction({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button type="button" className="panel__action" onClick={onClick}>
      {children}
    </button>
  );
}
