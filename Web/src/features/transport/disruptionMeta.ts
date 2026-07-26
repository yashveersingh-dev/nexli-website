import type { BadgeVariant } from '@/components/Badge';
import type { IconName } from '@/components/Icon';
import type { DisruptionCause, DisruptionResolution, DisruptionStatus } from '@/types/ops';

/* Route-disruption SOP (§7d) display metadata. Kept local to the transport
 * module so the shared ops/meta.ts stays untouched. */

export const DISRUPTION_CAUSE_META: Record<DisruptionCause, { label: string; icon: IconName }> = {
  driver_absent: { label: 'Driver / conductor absent', icon: 'users' },
  vehicle_breakdown: { label: 'Vehicle breakdown', icon: 'bus' },
  other: { label: 'Other disruption', icon: 'alert-triangle' },
};

export const DISRUPTION_CAUSE_OPTIONS = (Object.keys(DISRUPTION_CAUSE_META) as DisruptionCause[])
  .map((v) => ({ value: v, label: DISRUPTION_CAUSE_META[v].label }));

export const DISRUPTION_RESOLUTION_META: Record<DisruptionResolution, { label: string; variant: BadgeVariant; icon: IconName }> = {
  pending: { label: 'Action pending', variant: 'warning', icon: 'alert-triangle' },
  backup: { label: 'Backup driver assigned', variant: 'success', icon: 'user-plus' },
  merged: { label: 'Merged / re-routed', variant: 'info', icon: 'refresh' },
  cancelled: { label: 'Route cancelled', variant: 'danger', icon: 'x' },
};

export const DISRUPTION_STATUS_META: Record<DisruptionStatus, { label: string; variant: BadgeVariant }> = {
  open: { label: 'Open', variant: 'danger' },
  resolved: { label: 'Resolved', variant: 'success' },
};
