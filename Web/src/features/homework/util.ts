import type { Grade, Section } from '@/types/models';
import type { Homework, HomeworkStatus, HomeworkSubmission } from '@/types/daily';
import { effectiveStatus } from './homeworkSchema';

/** "Class 6 A" from a section id, falling back gracefully. */
export function sectionLabelOf(sectionId: string | undefined, sections: Section[], grades: Grade[]): string {
  if (!sectionId) return '—';
  const s = sections.find((x) => x.id === sectionId);
  if (!s) return '—';
  const g = grades.find((x) => x.id === s.gradeId)?.name;
  return `${g ?? ''} ${s.name}`.trim();
}

export interface ProgressCounts {
  assigned: number;
  submitted: number;
  late: number;
  graded: number;
  missing: number;
  total: number;
  /** submitted + late + graded. */
  turnedIn: number;
}

/**
 * Tally effective statuses for a roster against a set of submissions for one
 * homework. `roster` is the count of students the homework is assigned to.
 */
export function progressFor(
  rosterIds: string[],
  submissions: HomeworkSubmission[],
  dueDate: number | undefined,
  now = Date.now(),
): ProgressCounts {
  const byStudent = new Map<string, HomeworkSubmission>();
  for (const sub of submissions) byStudent.set(sub.studentId, sub);

  const counts: ProgressCounts = { assigned: 0, submitted: 0, late: 0, graded: 0, missing: 0, total: rosterIds.length, turnedIn: 0 };
  for (const id of rosterIds) {
    const sub = byStudent.get(id);
    const st = effectiveStatus(sub?.status, dueDate, sub?.submittedAt, now);
    counts[st] += 1;
  }
  counts.turnedIn = counts.submitted + counts.late + counts.graded;
  return counts;
}

/** Order homework newest-first by due date (then assigned, then created). */
export function sortHomework<T extends Homework>(list: T[]): T[] {
  return [...list].sort(
    (a, b) => (b.dueDate ?? b.assignedDate ?? b.createdAt ?? 0) - (a.dueDate ?? a.assignedDate ?? a.createdAt ?? 0),
  );
}

/**
 * Status options for the staff list filter. The list derives a headline status
 * from the due date alone (open vs past-due) without fetching every section's
 * submissions, so only those two states are offered — true per-student progress
 * lives on the detail page.
 */
export const HOMEWORK_FILTER_STATUSES: { value: '' | HomeworkStatus; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'assigned', label: 'Open' },
  { value: 'missing', label: 'Past due' },
];
