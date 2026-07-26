import { getDoc, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { tenantCol, tenantDoc, useCollection, useDocument } from '@/lib/db';
import { writeAuditEvent } from '@/lib/audit';
import type {
  CheckInActor,
  RecordStaffCheckInInput,
  StaffAttendanceRecord,
  StaffAttendanceSettings,
  StaffAttendanceStatus,
} from './types';

/**
 * Staff Attendance data layer (tenant-scoped via `lib/db`). Every workflow —
 * manual override, device kiosk, OTP kiosk, and the future biometric webhook —
 * writes through the SINGLE seam `recordStaffCheckIn`, so the day-doc contract is
 * single-sourced and idempotent. Collection: `staff_attendance`; doc id
 * `${staffId}_${date}` (date = yyyy-mm-dd). Config doc lives at
 * `settings/staff_attendance_settings`.
 */

const SUB = 'staff_attendance';
const SETTINGS_DOC = 'staff_attendance_settings';

/* ---------------- Date / time helpers ---------------- */

/** Local calendar day as `yyyy-mm-dd` (Firestore doc-id component). */
export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Stable day-doc id. */
export function dayDocId(staffId: string, date: string): string {
  return `${staffId}_${date}`;
}

/** `HH:mm` (24h) for a given epoch ms, in local time. */
function clockHHmm(at: number): string {
  const d = new Date(at);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Add N minutes to an `HH:mm` clock string (clamped to 23:59). */
function addMinutes(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const total = Math.min(23 * 60 + 59, Math.max(0, h * 60 + m + (mins || 0)));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * Derive the day's disposition from the check-in time + school config:
 *  - after `halfDayCutoff` → `half_day`
 *  - after `lateCutoff` (falling back to `schoolStart`/legacy `workStart`),
 *    plus any `graceMinutes` → `late`
 *  - otherwise → `present`
 * With no config, everyone who checks in is `present`.
 */
export function deriveCheckInStatus(
  at: number,
  settings?: StaffAttendanceSettings | null,
): Extract<StaffAttendanceStatus, 'present' | 'late' | 'half_day'> {
  const now = clockHHmm(at);
  const grace = settings?.graceMinutes ?? 0;
  if (settings?.halfDayCutoff && now > addMinutes(settings.halfDayCutoff, grace)) return 'half_day';
  const lateBase = settings?.lateCutoff ?? settings?.schoolStart ?? settings?.workStart;
  if (lateBase && now > addMinutes(lateBase, grace)) return 'late';
  return 'present';
}

function stripUndefined<T extends object>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k as keyof T] = v as T[keyof T];
  return out;
}

/* ============================ THE SEAM ============================ */

/**
 * `recordStaffCheckIn` — the SINGLE entry point every source uses (manual
 * override, device kiosk, OTP kiosk, and the future biometric webhook).
 *
 * - On `direction: 'in'`  → sets `checkInAt` (only if not already set today) and
 *   derives `present`/`late` from the cutoff config.
 * - On `direction: 'out'` → sets `checkOutAt`.
 * - Idempotent per day: the doc id is `${staffId}_${date}`, and we merge — a
 *   second `in` won't overwrite the first punch; `out` always records the latest.
 * - Audited as `staff.attendance_marked`.
 *
 * Biometric note: a future Cloud-Function webhook (fingerprint/face/RFID) maps
 * its vendor payload (`BiometricCheckInPayload`) onto this same call with
 * `method: 'biometric'` and `by: { uid: 'system' }`. No hardware dependency here.
 */
export async function recordStaffCheckIn(
  schoolId: string,
  input: RecordStaffCheckInInput,
): Promise<StaffAttendanceRecord> {
  const at = input.at ?? Date.now();
  const date = todayKey(new Date(at));
  const id = dayDocId(input.staffId, date);
  const ref = tenantDoc(schoolId, SUB, id);

  // Read existing day + settings to stay idempotent and to derive status.
  const [existingSnap, settingsSnap] = await Promise.all([
    getDoc(ref),
    getDoc(tenantDoc(schoolId, 'settings', SETTINGS_DOC)),
  ]);
  const existing = existingSnap.exists() ? (existingSnap.data() as StaffAttendanceRecord) : null;
  const settings = settingsSnap.exists() ? (settingsSnap.data() as StaffAttendanceSettings) : null;

  const patch: Partial<StaffAttendanceRecord> = {
    staffId: input.staffId,
    staffName: input.staffName,
    date,
    method: input.method,
    recordedByUid: input.by?.uid,
    recordedByName: input.by?.name,
    note: input.note,
  };

  if (input.direction === 'in') {
    // First punch wins for checkInAt; status follows the earliest check-in.
    patch.checkInAt = existing?.checkInAt ?? at;
    patch.status = existing?.checkInAt
      ? (existing.status ?? deriveCheckInStatus(existing.checkInAt, settings))
      : deriveCheckInStatus(at, settings);
  } else {
    patch.checkOutAt = at;
    // Don't downgrade an existing disposition; default to present if none yet.
    patch.status = existing?.status ?? 'present';
    if (existing?.checkInAt) patch.checkInAt = existing.checkInAt;
  }

  await setDoc(
    ref,
    {
      ...stripUndefined(patch),
      schoolId,
      lastModifiedAt: Date.now(),
      lastModifiedBy: input.by?.uid ?? 'system',
      serverModifiedAt: serverTimestamp(),
      ...(existing ? {} : { createdAt: Date.now(), createdBy: input.by?.uid ?? 'system', version: 1 }),
    },
    { merge: true },
  );

  void writeAuditEvent({
    action: 'staff.attendance_marked',
    schoolId,
    actor: { uid: input.by?.uid ?? 'system', name: input.by?.name },
    targetType: 'staff_attendance',
    targetId: id,
    summary: `${input.staffName} ${input.direction === 'in' ? 'checked in' : 'checked out'} (${input.method})`,
    details: { staffId: input.staffId, date, direction: input.direction, method: input.method, status: patch.status },
  });

  return { id, ...stripUndefined(patch), schoolId } as StaffAttendanceRecord;
}

/**
 * Manual roster save: set an explicit day status for a staff member (used by the
 * HR manual workflow's segmented control). Goes through the same day doc so the
 * hub/kiosks see a single source of truth. Idempotent per day.
 */
export async function setStaffDayStatus(
  schoolId: string,
  args: { staffId: string; staffName: string; date: string; status: StaffAttendanceStatus },
  by: CheckInActor,
): Promise<void> {
  const id = dayDocId(args.staffId, args.date);
  const ref = tenantDoc(schoolId, SUB, id);
  const existingSnap = await getDoc(ref);
  const existing = existingSnap.exists();
  await setDoc(
    ref,
    {
      ...stripUndefined({
        staffId: args.staffId,
        staffName: args.staffName,
        date: args.date,
        status: args.status,
        method: 'manual' as const,
        recordedByUid: by.uid,
        recordedByName: by.name,
      }),
      schoolId,
      lastModifiedAt: Date.now(),
      lastModifiedBy: by.uid,
      serverModifiedAt: serverTimestamp(),
      ...(existing ? {} : { createdAt: Date.now(), createdBy: by.uid, version: 1 }),
    },
    { merge: true },
  );
}

/* ---------------- Settings ---------------- */

export function useStaffAttendanceSettings(schoolId?: string) {
  return useDocument<StaffAttendanceSettings & { id: string }>(
    schoolId ? tenantDoc(schoolId, 'settings', SETTINGS_DOC) : null,
  );
}

/**
 * Save the school's operational schedule + attendance-timing config. Owned by
 * leadership + HR (`schedule.configure`). Merge-write + audited.
 */
export async function saveStaffAttendanceSettings(
  schoolId: string,
  settings: StaffAttendanceSettings,
  by: CheckInActor,
): Promise<void> {
  await setDoc(
    tenantDoc(schoolId, 'settings', SETTINGS_DOC),
    {
      ...stripUndefined(settings),
      schoolId,
      lastModifiedAt: Date.now(),
      lastModifiedBy: by.uid,
      serverModifiedAt: serverTimestamp(),
    },
    { merge: true },
  );
  void writeAuditEvent({
    action: 'settings.changed',
    schoolId,
    actor: by,
    targetType: 'staff_attendance_settings',
    targetId: SETTINGS_DOC,
    summary: 'Attendance & schedule timings updated',
    details: {
      schoolStart: settings.schoolStart,
      schoolEnd: settings.schoolEnd,
      lateCutoff: settings.lateCutoff,
      halfDayCutoff: settings.halfDayCutoff,
    },
  });
}

/* ---------------- Reads ---------------- */

/** All staff-attendance records for a given day (hub + manual roster seed). */
export function useStaffAttendanceForDate(schoolId?: string, date?: string) {
  // Scope the read to the requested day server-side. A single equality filter on
  // `date` needs only the automatic single-field index — no composite index on
  // Spark — and keeps this bounded to one day's docs instead of streaming the
  // whole (ever-growing) collection. Without a date we have nothing to scope to,
  // so stay idle rather than subscribe to everything.
  const state = useCollection<StaffAttendanceRecord>(
    schoolId && date ? query(tenantCol(schoolId, SUB), where('date', '==', date)) : null,
    [schoolId, date],
  );
  return state;
}
