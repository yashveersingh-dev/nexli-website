import { query, where } from 'firebase/firestore';
import { tenantCol, useCollection } from '@/lib/db';
import type { Homework, HomeworkSubmission } from '@/types/daily';

/**
 * Module-local read helpers for the parent/student `/assignments` view. The
 * primary data layer (`@/features/daily/data`) covers staff reads/writes; these
 * thin wrappers cover the two student-scoped queries that surface there.
 */

/** Homework assigned to one section (the student's class). Empty when no section. */
export function useAllHomeworkForStudent(schoolId?: string, sectionId?: string) {
  return useCollection<Homework>(
    schoolId && sectionId ? query(tenantCol(schoolId, 'homework'), where('sectionId', '==', sectionId)) : null,
    [schoolId, sectionId],
  );
}

/** Every submission belonging to one student, keyed in the UI by homeworkId. */
export function useStudentSubmissions(schoolId?: string, studentId?: string) {
  return useCollection<HomeworkSubmission>(
    schoolId && studentId ? query(tenantCol(schoolId, 'homework_submissions'), where('studentId', '==', studentId)) : null,
    [schoolId, studentId],
  );
}
