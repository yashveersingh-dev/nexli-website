import type { BadgeVariant } from '@/components/Badge';
import type { StaffAttendanceMethod, StaffAttendanceStatus } from './types';

/** Display metadata for each status: label, short code, badge variant, css key. */
export const STAFF_STATUS_META: Record<
  StaffAttendanceStatus,
  { label: string; short: string; variant: BadgeVariant; key: string }
> = {
  present: { label: 'Present', short: 'P', variant: 'success', key: 'present' },
  late: { label: 'Late', short: 'L', variant: 'warning', key: 'late' },
  half_day: { label: 'Half day', short: '½', variant: 'warning', key: 'half' },
  on_duty: { label: 'On duty', short: 'OD', variant: 'info', key: 'onduty' },
  leave: { label: 'Leave', short: 'Lv', variant: 'info', key: 'leave' },
  absent: { label: 'Absent', short: 'A', variant: 'danger', key: 'absent' },
};

/** Statuses the manual roster offers as a segmented control (in order). */
export const MANUAL_STATUSES: StaffAttendanceStatus[] = [
  'present',
  'absent',
  'late',
  'leave',
  'on_duty',
];

export const METHOD_LABEL: Record<StaffAttendanceMethod, string> = {
  manual: 'Manual',
  device: 'Kiosk',
  otp: 'Mobile OTP',
  biometric: 'Biometric',
};

/** `HH:mm` → friendly `h:mm AM/PM`. */
export function formatTime(at?: number): string {
  if (!at) return '—';
  return new Date(at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}
