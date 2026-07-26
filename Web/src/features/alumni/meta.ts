import type { IconName } from '@/components/Icon';
import type { Alumnus } from '@/types/community';

/**
 * Alumni module metadata. A curated, India-relevant industry taxonomy used for
 * the form picker, directory filter, mentorship grouping and insights.
 */
export const INDUSTRIES = [
  'Technology / IT',
  'Engineering',
  'Healthcare / Medicine',
  'Finance / Banking',
  'Education / Academia',
  'Law',
  'Civil Services / Government',
  'Defence',
  'Business / Entrepreneurship',
  'Consulting',
  'Design / Creative',
  'Media / Journalism',
  'Arts / Entertainment',
  'Sports',
  'Science / Research',
  'Architecture',
  'Hospitality / Tourism',
  'Agriculture',
  'Social / Non-profit',
  'Manufacturing',
  'Marketing / Advertising',
  'Other',
] as const;

export const INDUSTRY_OPTIONS = INDUSTRIES.map((v) => ({ value: v, label: v }));

/** Suggested mentorship focus areas (chips). Free-text is also allowed. */
export const MENTOR_AREA_SUGGESTIONS = [
  'Career guidance',
  'Higher studies abroad',
  'Entrance exam prep',
  'Interview prep',
  'Internships',
  'Entrepreneurship',
  'Resume review',
  'Public speaking',
  'Research guidance',
  'Coding / Tech',
];

/** A short "role @ organisation" line, gracefully degrading when partial. */
export function roleLine(a: Alumnus): string {
  if (a.currentRole && a.organisation) return `${a.currentRole} @ ${a.organisation}`;
  return a.currentRole || a.organisation || '';
}

/** A short location line. */
export function locationLine(a: Alumnus): string {
  return [a.city, a.country].filter(Boolean).join(', ');
}

/** Decade bucket label for a 4-digit batch year, e.g. "2010s". */
export function batchDecade(batchYear?: string): string | null {
  if (!batchYear || !/^\d{4}$/.test(batchYear)) return null;
  const y = Number(batchYear);
  return `${Math.floor(y / 10) * 10}s`;
}

/** Distinct, sorted batch years present in a set of alumni (descending). */
export function batchYears(alumni: Alumnus[]): string[] {
  const set = new Set<string>();
  for (const a of alumni) if (a.batchYear && /^\d{4}$/.test(a.batchYear)) set.add(a.batchYear);
  return [...set].sort((a, b) => Number(b) - Number(a));
}

/** Whether the alumnus is searchable against a lower-cased query. */
export function matchesQuery(a: Alumnus, q: string): boolean {
  if (!q) return true;
  return (
    a.name?.toLowerCase().includes(q) ||
    a.organisation?.toLowerCase().includes(q) ||
    a.currentRole?.toLowerCase().includes(q) ||
    a.industry?.toLowerCase().includes(q) ||
    a.city?.toLowerCase().includes(q)
  ) ?? false;
}

export const MENTOR_ICON: IconName = 'sparkles';
