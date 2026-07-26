import { updateDoc } from 'firebase/firestore';
import { schoolRef } from './db';

/**
 * Best-effort school usage telemetry. Writes only the denormalized counts +
 * last-active timestamp on the tenant's school document so the Super Admin
 * console can show live usage/statistics without Cloud Functions. Firestore
 * rules permit any active member to write ONLY these telemetry fields. Never
 * throws — telemetry must not affect UX.
 */
export interface SchoolUsagePatch {
  lastActiveAt?: number;
  studentCount?: number;
  staffCount?: number;
}

export async function touchSchoolUsage(schoolId: string, patch: SchoolUsagePatch): Promise<void> {
  try {
    await updateDoc(schoolRef(schoolId), { ...patch });
  } catch {
    /* best-effort telemetry — ignore (offline, rules, etc.) */
  }
}

/** Heartbeat interval: only refresh `lastActiveAt` when it's older than this. */
export const USAGE_HEARTBEAT_MS = 60 * 60 * 1000; // 1 hour
