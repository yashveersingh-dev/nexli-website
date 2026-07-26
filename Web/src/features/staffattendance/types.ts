import type { TenantRecord } from '@/types/models';

/* ============================ Staff Attendance ============================ */

/**
 * Staff attendance domain types (module-local by design — we do NOT touch
 * `src/types/*`). A record is one staff member's mark for one calendar day,
 * keyed by `${staffId}_${date}` so a day is idempotent across every source.
 */

/** Daily disposition for a staff member. */
export type StaffAttendanceStatus =
  | 'present'
  | 'absent'
  | 'late'
  | 'half_day'
  | 'leave'
  | 'on_duty';

/**
 * How a mark was captured. Every source funnels through `recordStaffCheckIn`:
 *  - `manual`    — HR / reception override on the roster
 *  - `device`    — on-site self-check-in kiosk (reception session)
 *  - `otp`       — staff mobile OTP kiosk (secondary Firebase app)
 *  - `biometric` — future hardware webhook → Cloud Function → the same seam
 */
export type StaffAttendanceMethod = 'manual' | 'device' | 'otp' | 'biometric';

/**
 * One staff member's attendance for one day.
 * Tenant path: `schools/{schoolId}/staff_attendance/{staffId}_{date}`.
 */
export interface StaffAttendanceRecord extends TenantRecord {
  staffId: string;
  staffName: string;
  /** Calendar day, `yyyy-mm-dd` (local). Part of the doc id. */
  date: string;
  status: StaffAttendanceStatus;
  /** Epoch ms of first check-in (set on `direction: 'in'`). */
  checkInAt?: number;
  /** Epoch ms of last check-out (set on `direction: 'out'`). */
  checkOutAt?: number;
  method: StaffAttendanceMethod;
  /** Who recorded it (operator uid for manual/kiosk; system for biometric). */
  recordedByUid?: string;
  recordedByName?: string;
  note?: string;
}

/** A named timing block (break / lunch / custom) — `HH:mm` (24h). */
export interface ScheduleBlock {
  id: string;
  label: string;
  start: string;
  end: string;
}

/**
 * School operational schedule + attendance-timing config. Each school fully
 * configures its own day here (no technical change needed). Owned by leadership
 * + HR (`schedule.configure`): Principal, Vice Principals, HR. Drives the
 * present/late/half-day derivation in `recordStaffCheckIn`.
 *
 * Tenant path: `schools/{schoolId}/settings/staff_attendance_settings`.
 * Times are `HH:mm` (24h, local).
 */
export interface StaffAttendanceSettings {
  /** School start time. Check-ins at/before this (plus grace) count as on-time. */
  schoolStart?: string;
  /** School end time. */
  schoolEnd?: string;
  /** Late cutoff. Check-ins after this (plus grace) are marked `late`. */
  lateCutoff?: string;
  /** Half-day cutoff. Check-ins after this are marked `half_day`. */
  halfDayCutoff?: string;
  /** Grace minutes added to a cutoff before a check-in counts as late. */
  graceMinutes?: number;
  /** Lunch window. */
  lunch?: { start?: string; end?: string };
  /** Break windows (morning break, etc.). */
  breaks?: ScheduleBlock[];
  /** Free-form attendance / schedule timing rules (e.g. weekend, shift notes). */
  rules?: string;

  /** @deprecated superseded by `schoolStart`; still read as a fallback. */
  workStart?: string;
}

/** Direction of a single punch through the seam. */
export type CheckDirection = 'in' | 'out';

/** Operator/actor stamped on a seam write (uid + display name). */
export interface CheckInActor {
  uid: string;
  name?: string;
}

/**
 * The argument every source passes to `recordStaffCheckIn` — the SINGLE seam.
 * `at` is epoch ms (defaults to now); `by` is the operator/system actor.
 */
export interface RecordStaffCheckInInput {
  staffId: string;
  staffName: string;
  method: StaffAttendanceMethod;
  direction: CheckDirection;
  /** Epoch ms of the punch. Defaults to `Date.now()`. */
  at?: number;
  /** Operator (manual/kiosk) or `{ uid: 'system' }` for biometric. */
  by?: CheckInActor;
  note?: string;
}

/**
 * BIOMETRIC INTEGRATION SEAM (future, hardware-agnostic).
 *
 * A future Cloud Function biometric webhook (fingerprint / face / RFID device)
 * receives a vendor payload, resolves it to a staff member, and calls the SAME
 * `recordStaffCheckIn` entry point with `method: 'biometric'` and
 * `by: { uid: 'system', name: <device label> }`. This module depends on NO
 * hardware: the device adapter lives server-side and only needs to map its
 * payload onto `RecordStaffCheckInInput`. Shape the webhook body to this type so
 * the mapping is mechanical.
 */
export interface BiometricCheckInPayload {
  /** Resolved tenant. */
  schoolId: string;
  /** Resolved staff doc id (the device adapter maps deviceUserId → staffId). */
  staffId: string;
  staffName: string;
  direction: CheckDirection;
  /** Epoch ms reported by the device clock (fallback to server time). */
  at: number;
  /** Vendor device identifier, for audit/troubleshooting. */
  deviceId?: string;
  /** Raw enrolment id on the device, before staff resolution. */
  deviceUserId?: string;
}
