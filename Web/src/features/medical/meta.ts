import type { BadgeVariant } from '@/components/Badge';

/** Day in ms — used for immunization due/overdue windows. */
const DAY = 86_400_000;

export type ImmunizationStatus = 'given' | 'due' | 'overdue';

export interface ImmunizationStatusMeta {
  label: string;
  variant: BadgeVariant;
}

export const IMMUNIZATION_STATUS_META: Record<ImmunizationStatus, ImmunizationStatusMeta> = {
  given: { label: 'Given', variant: 'success' },
  due: { label: 'Due soon', variant: 'warning' },
  overdue: { label: 'Overdue', variant: 'danger' },
};

/**
 * Derive immunization status from `nextDueDate`. Overdue once the due date has
 * passed; "due soon" within the next 30 days; otherwise treated as given/on-track.
 */
export function immunizationStatus(nextDueDate?: number, now = Date.now()): ImmunizationStatus {
  if (!nextDueDate) return 'given';
  if (nextDueDate < now) return 'overdue';
  if (nextDueDate - now <= 30 * DAY) return 'due';
  return 'given';
}
