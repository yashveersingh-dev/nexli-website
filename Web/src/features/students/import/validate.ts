import type { Gender, Guardian, GuardianRelation, SocialCategory, Student } from '@/types/sis';
import type { Grade, Section } from '@/types/models';
import type { ImportField } from './csv';

/** A single mapped + validated import row. */
export interface ImportRow {
  /** 1-based source row number (after the header), for user-facing messages. */
  index: number;
  raw: Record<ImportField, string>;
  errors: string[];
  /** True when there are no blocking errors. */
  valid: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENDER_MAP: Record<string, Gender> = {
  m: 'male', male: 'male', boy: 'male',
  f: 'female', female: 'female', girl: 'female',
  o: 'other', other: 'other',
};
const CATEGORY_VALUES: SocialCategory[] = ['general', 'obc', 'sc', 'st', 'ews', 'other'];

/** Parse a gender cell into a canonical Gender, or undefined if unrecognised. */
export function parseGender(value: string): Gender | undefined {
  return GENDER_MAP[value.trim().toLowerCase()];
}

/**
 * Infer a guardian's relation from a hint (the mapped column's header, e.g.
 * "Father Name", or a value like "Mother"). Defaults to 'guardian' when no
 * specific relation is recognised — so a generic "Guardian Name" column is
 * preserved as 'guardian', while a "Father"/"Mother" column keeps that relation
 * (previously every imported guardian was force-set to 'guardian').
 */
export function parseGuardianRelation(hint?: string): GuardianRelation {
  const h = (hint ?? '').toLowerCase();
  if (h.includes('father') || /\bdad\b/.test(h)) return 'father';
  if (h.includes('mother') || /\bmom\b/.test(h)) return 'mother';
  if (h.includes('grand')) return 'grandparent';
  if (h.includes('sibling') || h.includes('brother') || h.includes('sister')) return 'sibling';
  return 'guardian';
}

/** Parse a YYYY-MM-DD (or similar) date cell into ms, or undefined if unparseable. */
export function parseDob(value: string): number | undefined {
  const v = value.trim();
  if (!v) return undefined;
  // Accept YYYY-MM-DD, YYYY/MM/DD, DD-MM-YYYY, DD/MM/YYYY.
  let y: number, mo: number, d: number;
  const iso = v.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  const dmy = v.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (iso) {
    y = +iso[1]; mo = +iso[2]; d = +iso[3];
  } else if (dmy) {
    d = +dmy[1]; mo = +dmy[2]; y = +dmy[3];
  } else {
    return undefined;
  }
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return undefined;
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return undefined;
  return date.getTime();
}

/** Find a grade by (case-insensitive) name. */
export function findGrade(grades: Grade[], name: string): Grade | undefined {
  const n = name.trim().toLowerCase();
  if (!n) return undefined;
  return grades.find((g) => g.name.trim().toLowerCase() === n);
}

/** Find a section by name within an (optional) grade. */
export function findSection(sections: Section[], name: string, gradeId?: string): Section | undefined {
  const n = name.trim().toLowerCase();
  if (!n) return undefined;
  return sections.find((s) => s.name.trim().toLowerCase() === n && (!gradeId || s.gradeId === gradeId));
}

/** Validate one mapped row against the grade/section catalogues. */
export function validateRow(raw: Record<ImportField, string>, index: number, grades: Grade[], sections: Section[]): ImportRow {
  const errors: string[] = [];
  const firstName = raw.firstName?.trim() ?? '';
  if (!firstName) errors.push('First name is required.');

  const gender = parseGender(raw.gender ?? '');
  if (!raw.gender?.trim()) errors.push('Gender is required.');
  else if (!gender) errors.push(`Unrecognised gender "${raw.gender.trim()}".`);

  if (raw.dob?.trim() && parseDob(raw.dob) === undefined) {
    errors.push(`Date of birth "${raw.dob.trim()}" is not a valid date (use YYYY-MM-DD).`);
  }

  if (raw.grade?.trim() && !findGrade(grades, raw.grade)) {
    errors.push(`Grade "${raw.grade.trim()}" does not match any class.`);
  }

  if (raw.section?.trim() && raw.grade?.trim()) {
    const grade = findGrade(grades, raw.grade);
    if (grade && sections.length && !findSection(sections, raw.section, grade.id)) {
      errors.push(`Section "${raw.section.trim()}" not found for ${raw.grade.trim()}.`);
    }
  }

  if (raw.guardianEmail?.trim() && !EMAIL_RE.test(raw.guardianEmail.trim())) {
    errors.push(`Guardian email "${raw.guardianEmail.trim()}" is invalid.`);
  }

  if (raw.category?.trim() && !CATEGORY_VALUES.includes(raw.category.trim().toLowerCase() as SocialCategory)) {
    errors.push(`Category "${raw.category.trim()}" is not recognised.`);
  }

  return { index, raw, errors, valid: errors.length === 0 };
}

/**
 * Build a Student payload (minus id/schoolId) from a validated row.
 * `admissionNo` is supplied by the caller (generated when blank).
 */
export function rowToStudent(
  raw: Record<ImportField, string>,
  admissionNo: string,
  grades: Grade[],
  sections: Section[],
  /** Optional relation hint (e.g. the mapped guardian column's header) so a
   *  "Father"/"Mother" column keeps its relation instead of defaulting to 'guardian'. */
  guardianRelationHint?: string,
): Omit<Student, 'id' | 'schoolId'> {
  const firstName = raw.firstName.trim();
  const lastName = raw.lastName?.trim() || undefined;
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  const grade = raw.grade?.trim() ? findGrade(grades, raw.grade) : undefined;
  const section = grade && raw.section?.trim() ? findSection(sections, raw.section, grade.id) : undefined;
  const category = raw.category?.trim().toLowerCase();

  const guardians: Guardian[] = [];
  if (raw.guardianName?.trim()) {
    guardians.push({
      relation: parseGuardianRelation(guardianRelationHint),
      name: raw.guardianName.trim(),
      phone: raw.guardianPhone?.trim() || undefined,
      email: raw.guardianEmail?.trim() || undefined,
      isPrimary: true,
    });
  }

  return {
    firstName,
    lastName,
    fullName,
    gender: parseGender(raw.gender) ?? 'other',
    dob: parseDob(raw.dob ?? ''),
    admissionNo,
    rollNo: raw.rollNo?.trim() || undefined,
    gradeId: grade?.id,
    gradeName: grade?.name,
    sectionId: section?.id,
    sectionName: section?.name,
    status: 'active',
    admissionDate: Date.now(),
    category: (CATEGORY_VALUES.includes(category as SocialCategory) ? (category as SocialCategory) : undefined),
    guardians: guardians.length ? guardians : undefined,
  };
}

/** Minimal shape needed to detect a duplicate against existing students. */
export type ExistingStudentKey = Pick<Student, 'admissionNo' | 'fullName' | 'dob'>;

const normName = (s?: string) => (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Detect whether a mapped import row already exists among the school's students.
 * Matches on (a) an exact admission number, or (b) the same full name AND date of
 * birth (when both are present on the row) — a strong identity signal that avoids
 * re-importing the same child. Returns a human-readable reason, or `undefined` when
 * no duplicate is found. Pass the existing students fetched from Firestore.
 */
export function findDuplicateStudent(
  raw: Record<ImportField, string>,
  existing: readonly ExistingStudentKey[],
): string | undefined {
  const adm = raw.admissionNo?.trim().toLowerCase();
  if (adm) {
    const hit = existing.find((s) => s.admissionNo?.trim().toLowerCase() === adm);
    if (hit) return `Admission no. "${raw.admissionNo!.trim()}" already exists.`;
  }
  const firstName = raw.firstName?.trim() ?? '';
  const lastName = raw.lastName?.trim() ?? '';
  const fullName = normName([firstName, lastName].filter(Boolean).join(' '));
  const dob = parseDob(raw.dob ?? '');
  if (fullName && dob != null) {
    const hit = existing.find((s) => normName(s.fullName) === fullName && s.dob === dob);
    if (hit) return `A student named "${[firstName, lastName].filter(Boolean).join(' ')}" with the same date of birth already exists.`;
  }
  return undefined;
}
