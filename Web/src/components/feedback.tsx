import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from '@/components/Icon';

export function Skeleton({
  width,
  height = 14,
  radius = 8,
  className,
  style,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn('nx-skel', className)}
      style={{ width: width ?? '100%', height, borderRadius: radius, ...style }}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height={12} width={i === lines - 1 ? '60%' : '100%'} />
      ))}
    </div>
  );
}

export function Spinner({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn('nx-btn__spin', className)}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    />
  );
}

export function EmptyState({
  icon = 'info',
  title,
  message,
  action,
}: {
  icon?: IconName;
  title: string;
  message?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="nx-empty">
      <div className="nx-empty__icon">
        <Icon name={icon} size={24} />
      </div>
      <div className="nx-empty__title">{title}</div>
      {message != null && <div className="nx-empty__msg">{message}</div>}
      {action && <div style={{ marginTop: 10 }}>{action}</div>}
    </div>
  );
}

/** Professional placeholder for not-yet-integrated channels (WhatsApp/SMS/email/payments). */
export function InfoCard({ icon = 'info', title, children }: { icon?: IconName; title: string; children: ReactNode }) {
  return (
    <div className="nx-info-card">
      <div className="nx-info-card__icon">
        <Icon name={icon} size={16} />
      </div>
      <div>
        <div className="nx-info-card__title">{title}</div>
        <div className="nx-info-card__msg">{children}</div>
      </div>
    </div>
  );
}
