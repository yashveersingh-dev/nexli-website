import { query, where } from 'firebase/firestore';
import { tenantCol, useCollection } from '@/lib/db';
import type { AssessmentResult } from '@/types/daily';

/**
 * All assessment-result docs for the student's section. Each doc holds the WHOLE
 * class roster (`entries[studentId]` for every classmate); the caller filters to
 * the signed-in student's own `studentId`. Scoping the query to the student's
 * `sectionId` is the tightest a class-roster-shaped doc allows from the client.
 *
 * ⚠ DATA-SCOPING CAVEAT (P9 — Firestore rules + schema): because each result doc
 * embeds every classmate's marks, this read returns peers' marks to the student's
 * browser even though the UI only renders their own. The client CANNOT prevent
 * this — the authoritative fix is server-side: either (a) per-student result docs
 * so a student can be granted read on only their own, or (b) field-level rules
 * masking `entries` to the requesting student. Until then, a student can read
 * classmates' marks via the network/devtools. See the build report's RULES flag.
 */
export function useSectionAssessmentResults(schoolId?: string, sectionId?: string) {
  return useCollection<AssessmentResult>(
    schoolId && sectionId
      ? query(tenantCol(schoolId, 'assessment_results'), where('sectionId', '==', sectionId))
      : null,
    [schoolId, sectionId],
  );
}
