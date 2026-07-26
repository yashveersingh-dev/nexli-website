import { query, where } from 'firebase/firestore';
import { tenantCol, useCollection } from '@/lib/db';
import type { BookCirculation, HomeworkSubmission } from '@/types/daily';

/**
 * Gamification data layer (Phase 1) — READ-ONLY over existing tenant collections.
 *
 * Phase 1 writes nothing: points / streaks / badges are computed live by the
 * pure engine from these subscriptions. We reuse `useAllAttendance` and
 * `useHouses` from the existing daily/school layers; here we add the two reads
 * those layers don't expose at the "all rows for a student" granularity.
 */

/** A student's own homework submissions (scoped by studentId — own-record safe). */
export function useMySubmissions(schoolId?: string, studentId?: string) {
  return useCollection<HomeworkSubmission>(
    schoolId && studentId
      ? query(tenantCol(schoolId, 'homework_submissions'), where('studentId', '==', studentId))
      : null,
    [schoolId, studentId],
  );
}

/** A student's own library circulation (scoped by borrowerId — own-record safe). */
export function useMyCirculation(schoolId?: string, studentId?: string) {
  return useCollection<BookCirculation>(
    schoolId && studentId
      ? query(tenantCol(schoolId, 'book_circulation'), where('borrowerId', '==', studentId))
      : null,
    [schoolId, studentId],
  );
}

// Reused, unchanged: attendance (all section docs include this student's marks)
// and houses (for the class-appropriate house standing).
export { useAllAttendance } from '@/features/daily/data';
export { useHouses } from '@/features/school/data';
