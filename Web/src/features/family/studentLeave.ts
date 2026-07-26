import { query, where } from 'firebase/firestore';
import { tenantCol, tenantDoc, useCollection } from '@/lib/db';
import { createIn, updateIn, type Actor } from './data';

/**
 * Student leave requests — a parent submits a leave request for their child;
 * staff (class teacher / admin) approve or reject. Lives in the NEW tenant
 * collection `schools/{schoolId}/student_leave_requests`.
 *
 * The PURE date-range validation (`validateLeaveDates`) is unit-tested in
 * `./studentLeave.test.ts`; the data hooks/writers wrap the generic tenant CRUD
 * in `./data`.
 */

const SUB = 'student_leave_requests';

export type StudentLeaveStatus = 'pending' | 'approved' | 'rejected';

export interface StudentLeaveRequest {
  id: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  /** Denormalised so staff can scope/triage without a student join. */
  sectionId?: string;
  gradeName?: string;
  sectionName?: string;
  requestedByUid: string;
  requestedByName: string;
  fromDate: number;
  toDate: number;
  reason: string;
  status: StudentLeaveStatus;
  decidedByUid?: string;
  decidedByName?: string;
  decidedAt?: number;
  note?: string;
  createdAt?: number;
}

/** Start of today (local) in epoch ms — past-date guard reference. */
export function startOfToday(now = Date.now()): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export interface LeaveDateError {
  field: 'fromDate' | 'toDate' | 'reason';
  message: string;
}

/**
 * PURE validation for a leave request's date range + reason. Rules:
 *  - both dates required;
 *  - `from <= to`;
 *  - `from` not in the past (a leave cannot start before today);
 *  - a non-empty reason.
 * `from`/`to` are `yyyy-MM-dd` strings (from a date input) or epoch ms.
 * Returns all violations (empty array → valid).
 */
export function validateLeaveDates(
  from: string | number | undefined,
  to: string | number | undefined,
  reason: string | undefined,
  now = Date.now(),
): LeaveDateError[] {
  const errors: LeaveDateError[] = [];
  const fromMs = toMs(from);
  const toMsVal = toMs(to);

  if (fromMs == null) {
    errors.push({ field: 'fromDate', message: 'Select a start date.' });
  } else if (dayStart(fromMs) < startOfToday(now)) {
    errors.push({ field: 'fromDate', message: 'Leave cannot start in the past.' });
  }

  if (toMsVal == null) {
    errors.push({ field: 'toDate', message: 'Select an end date.' });
  } else if (fromMs != null && dayStart(toMsVal) < dayStart(fromMs)) {
    errors.push({ field: 'toDate', message: 'End date must be on or after the start date.' });
  }

  if (!reason || !reason.trim()) {
    errors.push({ field: 'reason', message: 'Add a reason for the leave.' });
  }

  return errors;
}

/** Inclusive whole-day span of a leave request (1 = same-day). */
export function leaveDays(fromMs: number, toMs: number): number {
  const d = Math.round((dayStart(toMs) - dayStart(fromMs)) / 86_400_000) + 1;
  return d > 0 ? d : 0;
}

function dayStart(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function toMs(v: string | number | undefined): number | undefined {
  if (v == null || v === '') return undefined;
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  const ms = new Date(v.includes('T') ? v : `${v}T00:00:00`).getTime();
  return Number.isFinite(ms) ? ms : undefined;
}

/* ---------------- Data hooks / writers ---------------- */

/** All student-leave requests for the school (staff/admin view). */
export function useStudentLeaveRequests(schoolId?: string) {
  return useCollection<StudentLeaveRequest>(schoolId ? tenantCol(schoolId, SUB) : null, [schoolId]);
}

/**
 * Leave requests for a SPECIFIC set of students (a parent's children). Scoped
 * with `where('studentId','in', ids)` so a parent reads only their children's
 * requests (the tightened rules forbid a full-collection list to non-staff).
 * Firestore `in` caps at 30 values; parents have a handful of children, so the
 * slice is a safety net rather than a real limit. Empty ids → idle (`[]`).
 */
export function useStudentLeaveForStudents(schoolId?: string, studentIds?: readonly string[]) {
  const ids = (studentIds ?? []).slice(0, 30);
  const key = ids.join(',');
  return useCollection<StudentLeaveRequest>(
    schoolId && ids.length ? query(tenantCol(schoolId, SUB), where('studentId', 'in', ids)) : null,
    [schoolId, key],
  );
}

export function createStudentLeaveRequest(
  schoolId: string,
  data: Omit<StudentLeaveRequest, 'id'>,
  actor: Actor,
) {
  return createIn(schoolId, SUB, data, actor);
}

export function updateStudentLeaveRequest(
  schoolId: string,
  id: string,
  patch: Partial<StudentLeaveRequest>,
  actor: Actor,
) {
  return updateIn(schoolId, SUB, id, patch, actor);
}

/** Decision helper: stamp the approver + status in one patch. */
export function decideStudentLeave(
  schoolId: string,
  id: string,
  status: Exclude<StudentLeaveStatus, 'pending'>,
  actor: Actor,
  note?: string,
) {
  return updateIn<StudentLeaveRequest>(schoolId, SUB, id, {
    status,
    decidedByUid: actor.uid,
    decidedByName: actor.name,
    decidedAt: Date.now(),
    note: note?.trim() || undefined,
  }, actor);
}

export const studentLeaveDocRef = (schoolId: string, id: string) => tenantDoc(schoolId, SUB, id);
