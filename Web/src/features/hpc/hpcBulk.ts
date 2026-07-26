import { saveHpcCard, hpcCardId, type Actor } from '@/features/analytics/data';
import { HPC_DOMAINS, HPC_RATING_DESCRIPTORS } from '@/features/analytics/meta';
import type { Student } from '@/types/sis';
import type { HpcCard, HpcTerm } from '@/types/special';

/** Build a blank draft card payload for one student (domains seeded, unrated low). */
function blankCard(schoolId: string, student: Student, year: string, term: HpcTerm): Omit<HpcCard, 'id'> {
  return {
    schoolId,
    studentId: student.id,
    studentName: student.fullName,
    gradeName: student.gradeName,
    sectionName: student.sectionName,
    academicYear: year,
    term,
    domains: HPC_DOMAINS.map((domain) => ({ domain, rating: 3, descriptor: HPC_RATING_DESCRIPTORS[3] })),
    scholastic: [],
    coScholastic: [],
    approvalStatus: 'draft',
    published: false,
  };
}

export interface BulkGenerateResult {
  created: number;
  skipped: number;
}

/**
 * Generate draft HPC cards for every active student in a section for a term.
 * Idempotent: an existing card for the same student/year/term is skipped (never
 * overwrites teacher work). Sequential writes keep the free-tier load gentle.
 */
export async function bulkGenerateDrafts(
  schoolId: string,
  students: Student[],
  existing: HpcCard[],
  year: string,
  term: HpcTerm,
  actor: Actor,
): Promise<BulkGenerateResult> {
  const have = new Set(existing.map((c) => hpcCardId(c.studentId, c.academicYear, c.term)));
  let created = 0;
  let skipped = 0;
  for (const student of students) {
    const id = hpcCardId(student.id, year, term);
    if (have.has(id)) { skipped += 1; continue; }
    await saveHpcCard(schoolId, id, blankCard(schoolId, student, year, term), actor);
    created += 1;
  }
  return { created, skipped };
}
