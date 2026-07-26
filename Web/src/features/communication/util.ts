import type { Grade, Section } from '@/types/models';
import type { Circular } from '@/types/daily';
import { CIRCULAR_AUDIENCE_OPTIONS } from '@/features/daily/meta';

/** Human-readable audience summary, resolving grade/section names where possible. */
export function audienceSummary(c: Circular, grades: Grade[], sections: Section[]): string {
  if (c.audience === 'grade') {
    const g = grades.find((x) => x.id === c.gradeId);
    return g ? `Grade · ${g.name}` : 'Specific grade';
  }
  if (c.audience === 'section') {
    const s = sections.find((x) => x.id === c.sectionId);
    if (s) {
      const g = grades.find((x) => x.id === s.gradeId);
      return `Section · ${[g?.name, s.name].filter(Boolean).join(' ')}`.trim();
    }
    return 'Specific section';
  }
  return CIRCULAR_AUDIENCE_OPTIONS.find((o) => o.value === c.audience)?.label ?? c.audience;
}

/**
 * Emergency or pinned first, then newest publishedAt first (input is already desc
 * by publishedAt). Emergency circulars are surfaced at the top alongside pinned
 * ones — matching the promise made on compose ("pinned to the top of every
 * recipient's inbox") even when the author didn't separately toggle Pin.
 */
export function sortCirculars(list: Circular[]): Circular[] {
  const isTop = (c: Circular) => !!c.pinned || !!c.emergency || c.category === 'emergency';
  return [...list].sort((a, b) => {
    const at = isTop(a);
    const bt = isTop(b);
    if (at !== bt) return at ? -1 : 1;
    return (b.publishedAt ?? 0) - (a.publishedAt ?? 0);
  });
}

/** A short single-line excerpt of the body for cards. */
export function excerpt(body: string, max = 160): string {
  const flat = body.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}
