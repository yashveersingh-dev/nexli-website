import type { ExamPaper } from '@/types/daily';

/** Result doc id is deterministic: one result per (exam, student). */
export const examResultId = (examId: string, studentId: string) => `${examId}_${studentId}`;

/** Sort papers chronologically by date, then start time, then subject name. */
export function sortPapers(papers: ExamPaper[]): ExamPaper[] {
  return papers.slice().sort((a, b) => {
    const da = a.date ?? Number.MAX_SAFE_INTEGER;
    const db = b.date ?? Number.MAX_SAFE_INTEGER;
    if (da !== db) return da - db;
    const ta = a.startTime ?? '';
    const tb = b.startTime ?? '';
    if (ta !== tb) return ta.localeCompare(tb);
    return (a.subjectName ?? '').localeCompare(b.subjectName ?? '');
  });
}

/** Human-readable date range for an exam term. */
export function dateRangeLabel(
  startDate: number | undefined,
  endDate: number | undefined,
  fmt: (ts: number) => string,
): string {
  if (startDate && endDate) return startDate === endDate ? fmt(startDate) : `${fmt(startDate)} – ${fmt(endDate)}`;
  if (startDate) return `From ${fmt(startDate)}`;
  if (endDate) return `Until ${fmt(endDate)}`;
  return 'Dates not set';
}

/** "08:00" + 90 mins → "09:30" (24h). Returns '' if no start time. */
export function endTimeLabel(startTime: string | undefined, durationMins: number | undefined): string {
  if (!startTime || !durationMins) return '';
  const [h, m] = startTime.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return '';
  const total = h * 60 + m + durationMins;
  const hh = Math.floor((total % (24 * 60)) / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
