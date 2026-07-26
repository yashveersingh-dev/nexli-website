import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'muted';

export interface BadgeProps {
  variant?: BadgeVariant;
  /** Pulsing "Live" indicator (overrides variant styling). */
  live?: boolean;
  children: ReactNode;
  className?: string;
}

/** Pill badge (maps to the reference .badge component). */
export function Badge({ variant = 'muted', live, children, className }: BadgeProps) {
  return (
    <span className={cn('badge', live ? 'badge--live' : `badge--${variant}`, className)}>{children}</span>
  );
}

export interface DotBadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

/** Inline status with a colored dot (reference .dot-badge). */
export function DotBadge({ variant = 'muted', children, className }: DotBadgeProps) {
  return <span className={cn('dot-badge', variant, className)}>{children}</span>;
}
