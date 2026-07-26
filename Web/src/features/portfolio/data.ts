import { addDoc, deleteDoc, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { tenantCol, tenantDoc, useCollection } from '@/lib/db';
import type {
  AchievementCategory,
  PortfolioEntry,
  SkillsSummary,
} from '@/types/portfolio';

/**
 * Digital Skills Passport data layer.
 *
 * Achievement entries live in the tenant-scoped `portfolio` collection (one doc
 * per achievement, keyed by `studentId`). Students write their OWN entries with
 * `status: 'submitted'`; verifier staff endorse them to `'verified'` (or reject)
 * — the `verification` block (verifier name + uid + time) is the trust layer and
 * is only written from the staff verification queue.
 *
 * Evidence is a pasted URL in Phase 1; uploading the file itself needs Firebase
 * Storage (Spark-tier limited) and is deferred.
 */
export interface Actor {
  uid: string;
  name?: string;
}

export const CATEGORY_META: Record<
  AchievementCategory,
  { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'muted'; icon: 'award' | 'trophy' | 'file-text' | 'users' | 'calendar' }
> = {
  academic: { label: 'Academic', variant: 'info', icon: 'file-text' },
  sports: { label: 'Sports', variant: 'success', icon: 'trophy' },
  arts: { label: 'Arts', variant: 'info', icon: 'award' },
  'co-curricular': { label: 'Co-curricular', variant: 'info', icon: 'users' },
  volunteering: { label: 'Volunteering', variant: 'success', icon: 'users' },
  internship: { label: 'Internship', variant: 'warning', icon: 'calendar' },
  award: { label: 'Award', variant: 'success', icon: 'trophy' },
  other: { label: 'Other', variant: 'muted', icon: 'file-text' },
};

export const CATEGORY_ORDER: AchievementCategory[] = [
  'academic',
  'sports',
  'arts',
  'co-curricular',
  'volunteering',
  'internship',
  'award',
  'other',
];

export const CATEGORY_OPTIONS = CATEGORY_ORDER.map((k) => ({ value: k, label: CATEGORY_META[k].label }));

function stripUndefined<T extends object>(o: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined) out[k as keyof T] = v as T[keyof T];
  return out;
}

/** Normalise a comma/newline-separated tag string into a clean, de-duped list. */
export function parseSkills(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[,\n]/)) {
    const t = part.trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

/**
 * A student's own portfolio entries (own-record scope: `where studentId == <id>`).
 * No `orderBy` here — a where+orderBy on different fields needs a composite index
 * (not declared), which would make the query fail and the passport load empty.
 * Callers sort client-side by `date` (matches the rankings/career convention).
 */
export function useStudentPortfolio(schoolId?: string, studentId?: string) {
  return useCollection<PortfolioEntry>(
    schoolId && studentId
      ? query(tenantCol(schoolId, 'portfolio'), where('studentId', '==', studentId))
      : null,
    [schoolId, studentId],
  );
}

/** All portfolio entries for the school (staff verification queue / overview). */
export function useAllPortfolio(schoolId?: string) {
  return useCollection<PortfolioEntry>(
    schoolId ? query(tenantCol(schoolId, 'portfolio'), orderBy('createdAt', 'desc')) : null,
    [schoolId],
  );
}

export type NewEntryInput = Omit<
  PortfolioEntry,
  'id' | 'schoolId' | 'status' | 'verification' | 'createdAt' | 'createdBy' | 'lastModifiedAt'
>;

/** Create a student-submitted achievement (`status: 'submitted'`). */
export async function createEntry(schoolId: string, data: NewEntryInput, actor: Actor): Promise<string> {
  const ref = await addDoc(tenantCol(schoolId, 'portfolio'), {
    ...stripUndefined(data),
    schoolId,
    status: 'submitted',
    createdAt: Date.now(),
    createdBy: actor.uid,
    serverCreatedAt: serverTimestamp(),
  });
  return ref.id;
}

export type EntryPatch = Partial<Pick<PortfolioEntry, 'category' | 'title' | 'description' | 'date' | 'organisation' | 'skills' | 'evidenceUrl'>>;

/** Edit an entry's content. Editing re-opens verification (back to 'submitted'). */
export function updateEntry(schoolId: string, id: string, patch: EntryPatch): Promise<void> {
  return updateDoc(tenantDoc(schoolId, 'portfolio', id), {
    ...stripUndefined(patch),
    status: 'submitted',
    verification: null,
    lastModifiedAt: Date.now(),
  });
}

export function deleteEntry(schoolId: string, id: string): Promise<void> {
  return deleteDoc(tenantDoc(schoolId, 'portfolio', id));
}

/** Endorse a submitted entry — flips it to 'verified' and stamps the verifier. */
export function verifyEntry(schoolId: string, id: string, actor: Actor, note?: string): Promise<void> {
  return updateDoc(tenantDoc(schoolId, 'portfolio', id), {
    status: 'verified',
    verification: stripUndefined({
      verifierName: actor.name ?? 'Staff',
      verifierUid: actor.uid,
      verifiedAt: Date.now(),
      note: note?.trim() || undefined,
    }),
    lastModifiedAt: Date.now(),
  });
}

/** Reject a submitted entry with an optional note. */
export function rejectEntry(schoolId: string, id: string, actor: Actor, note?: string): Promise<void> {
  return updateDoc(tenantDoc(schoolId, 'portfolio', id), {
    status: 'rejected',
    verification: stripUndefined({
      verifierName: actor.name ?? 'Staff',
      verifierUid: actor.uid,
      verifiedAt: Date.now(),
      note: note?.trim() || undefined,
    }),
    lastModifiedAt: Date.now(),
  });
}

const emptyByCategory = (): Record<AchievementCategory, number> => ({
  academic: 0,
  sports: 0,
  arts: 0,
  'co-curricular': 0,
  volunteering: 0,
  internship: 0,
  award: 0,
  other: 0,
});

/** Deterministic skills summary: counts by category + skill-tag frequencies. */
export function computeSkillsSummary(entries: PortfolioEntry[]): SkillsSummary {
  const byCategory = emptyByCategory();
  const tagCounts = new Map<string, { label: string; count: number }>();
  let verified = 0;

  for (const e of entries) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + 1;
    if (e.status === 'verified') verified += 1;
    for (const skill of e.skills ?? []) {
      const key = skill.trim().toLowerCase();
      if (!key) continue;
      const existing = tagCounts.get(key);
      if (existing) existing.count += 1;
      else tagCounts.set(key, { label: skill.trim(), count: 1 });
    }
  }

  const skillTags = [...tagCounts.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .map((t) => ({ skill: t.label, count: t.count }));

  return {
    total: entries.length,
    verified,
    distinctSkills: skillTags.length,
    byCategory,
    skillTags,
  };
}

export { useStudents } from '@/features/school/data';
