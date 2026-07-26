import { useMemo } from 'react';
import { useSession } from '@/app/providers/SessionProvider';
import { useStudent, useSections, useGrades } from '@/features/school/data';
import type { Student } from '@/types/sis';
import type { Grade, Section } from '@/types/models';

/**
 * Resolves the signed-in student's own context for the read-only Student Portal.
 *
 * A student account is linked to exactly one student record via `member.studentId`
 * (see `Member` in types/models). Every portal screen needs the same scaffolding —
 * the linked student doc, their section/grade, and a clear set of states to render
 * ("account not linked", loading, missing record). Centralising it here keeps the
 * seven screens consistent and avoids each one re-deriving the same guards.
 *
 * `status` collapses the common branches every page must handle:
 *   • `not_linked`  — the account has no `studentId` (school hasn't linked it yet)
 *   • `loading`     — the student doc / academic structure is still resolving
 *   • `missing`     — linked, but the student record could not be found
 *   • `ready`       — `student` is present and safe to render
 */
export type StudentContextStatus = 'not_linked' | 'loading' | 'missing' | 'ready';

export interface StudentContext {
  status: StudentContextStatus;
  schoolId?: string;
  studentId?: string;
  student?: Student;
  /** The student's section (when enrolled + resolvable). */
  section?: Section;
  /** The student's grade (when enrolled + resolvable). */
  grade?: Grade;
  sections: Section[];
  grades: Grade[];
  error?: Error;
}

export function useStudentContext(): StudentContext {
  const { schoolId, member } = useSession();
  const studentId = member?.studentId;

  const { data: student, loading: stuLoading, error: stuError } = useStudent(schoolId, studentId);
  const { data: sections, loading: secLoading } = useSections(schoolId);
  const { data: grades, loading: gradeLoading } = useGrades(schoolId);

  return useMemo<StudentContext>(() => {
    if (!studentId) {
      return { status: 'not_linked', schoolId, sections, grades };
    }
    if (stuLoading || secLoading || gradeLoading) {
      return { status: 'loading', schoolId, studentId, sections, grades, error: stuError };
    }
    if (!student) {
      return { status: 'missing', schoolId, studentId, sections, grades, error: stuError };
    }
    const section = student.sectionId ? sections.find((s) => s.id === student.sectionId) : undefined;
    const grade = student.gradeId ? grades.find((g) => g.id === student.gradeId) : undefined;
    return { status: 'ready', schoolId, studentId, student, section, grade, sections, grades };
  }, [schoolId, studentId, student, stuLoading, secLoading, gradeLoading, stuError, sections, grades]);
}
