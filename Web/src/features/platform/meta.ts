import type { IconName } from '@/components/Icon';
import type { BadgeVariant } from '@/components/Badge';
import type {
  AnnouncementType,
  BoardType,
  SchoolType,
  SubscriptionAction,
  SubscriptionStatus,
} from '@/types/models';

/** Shared option lists + display metadata for the Super Admin platform modules. */

export const SUBSCRIPTION_STATUS_META: Record<
  SubscriptionStatus,
  { label: string; variant: BadgeVariant; dot: string }
> = {
  trial: { label: 'Trial', variant: 'info', dot: 'var(--info)' },
  active: { label: 'Active', variant: 'success', dot: 'var(--success)' },
  paused: { label: 'Paused', variant: 'warning', dot: 'var(--warning)' },
  suspended: { label: 'Suspended', variant: 'danger', dot: 'var(--danger)' },
  expired: { label: 'Expired', variant: 'warning', dot: 'var(--warning)' },
  terminated: { label: 'Terminated', variant: 'muted', dot: 'var(--text-muted)' },
};

export const SUBSCRIPTION_ACTIONS: Record<
  SubscriptionAction,
  { label: string; icon: IconName; tone: 'gold' | 'danger' | 'warning'; description: string; destructive?: boolean }
> = {
  activate: { label: 'Activate', icon: 'check-circle', tone: 'gold', description: 'Restore full platform access; all modules enabled per plan.' },
  pause: { label: 'Pause', icon: 'clock', tone: 'warning', description: 'Temporary hold — login allowed but data entry locked (read-only).' },
  suspend: { label: 'Suspend', icon: 'shield', tone: 'danger', description: 'Block all logins. Data preserved but inaccessible.' },
  resume: { label: 'Resume', icon: 'refresh', tone: 'gold', description: 'Restore full access after a suspension is resolved.' },
  expire: { label: 'Expire', icon: 'clock', tone: 'warning', description: 'Mark the subscription lapsed at end of term — login allowed, data entry locked until renewed.' },
  renew: { label: 'Renew', icon: 'refresh', tone: 'gold', description: 'Extend the subscription by one billing cycle and restore full access.' },
  terminate: { label: 'Terminate', icon: 'alert-triangle', tone: 'danger', description: '30-day soft delete. Data export possible, then permanent deletion.', destructive: true },
};

export const BOARD_OPTIONS: { value: BoardType; label: string }[] = [
  { value: 'CBSE', label: 'CBSE' },
  { value: 'ICSE', label: 'ICSE / CISCE' },
  { value: 'State', label: 'State Board' },
  { value: 'IB', label: 'IB' },
  { value: 'Cambridge', label: 'Cambridge (CAIE)' },
  { value: 'NIOS', label: 'NIOS' },
];

export const SCHOOL_TYPE_OPTIONS: { value: SchoolType; label: string }[] = [
  { value: 'day', label: 'Day School' },
  { value: 'boarding', label: 'Boarding School' },
  { value: 'day_cum_boarding', label: 'Day-cum-Boarding' },
  { value: 'chain_branch', label: 'Chain / Branch' },
  { value: 'government', label: 'Government' },
];

export const ANNOUNCEMENT_TYPE_META: Record<
  AnnouncementType,
  { label: string; icon: IconName; variant: BadgeVariant }
> = {
  maintenance: { label: 'Maintenance', icon: 'settings', variant: 'warning' },
  feature: { label: 'New Feature', icon: 'sparkles', variant: 'info' },
  policy: { label: 'Policy Update', icon: 'file-text', variant: 'muted' },
  billing: { label: 'Billing', icon: 'credit-card', variant: 'warning' },
  emergency: { label: 'Emergency', icon: 'alert-triangle', variant: 'danger' },
};

/** Indian states/UTs for school registration + announcement targeting. */
export const INDIAN_STATES: string[] = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
  'West Bengal', 'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh',
  'Andaman & Nicobar Islands', 'Dadra & Nagar Haveli and Daman & Diu', 'Lakshadweep',
];

/** Default plan tiers used to seed Plans & Pricing on first run. */
export const DEFAULT_PLAN_TEMPLATES = [
  { id: 'starter', name: 'Starter', order: 1, studentLimit: 500, staffLimit: 60, priceMonthly: 4999, priceAnnual: 49990, trialDays: 30 },
  { id: 'growth', name: 'Growth', order: 2, studentLimit: 1500, staffLimit: 180, priceMonthly: 9999, priceAnnual: 99990, trialDays: 30, highlighted: true },
  { id: 'professional', name: 'Professional', order: 3, studentLimit: 4000, staffLimit: 450, priceMonthly: 19999, priceAnnual: 199990, trialDays: 14 },
  { id: 'enterprise', name: 'Enterprise', order: 4, studentLimit: 0, staffLimit: 0, priceMonthly: 0, priceAnnual: 0, trialDays: 0 },
] as const;
