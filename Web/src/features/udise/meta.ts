import type { IconName } from '@/components/Icon';
import type { Grade } from '@/types/models';
import type { Gender, SocialCategory, Student } from '@/types/sis';

/**
 * Extend the shared `UdiseProfile` (owned by the Compliance data layer) with the
 * additional UDISE+ infrastructure fields this module captures, WITHOUT editing the
 * compliance types file. TypeScript declaration merging adds these optional fields
 * to the same interface, so `saveUdiseProfile(UdiseProfile)` accepts them and the
 * profile/report read them type-safely.
 *
 * NOTE: UDISE+ DCF field names/groupings change between academic-year cycles —
 * verify the exact official labels against the live UDISE+ portal before filing.
 */
declare module '@/types/compliance' {
  interface UdiseProfile {
    // Toilets, split as the UDISE+ DCF expects.
    boysToilets?: number;
    girlsToilets?: number;
    /** Children With Special Needs (CWSN) accessible toilets. */
    cwsnToilets?: number;
    // Teaching-learning material / ICT.
    libraryBooks?: number;
    computers?: number;
    tablets?: number;
    // Additional facility yes/no flags (merged with the existing ones).
    internet?: boolean;
    /** Handrails alongside the CWSN ramp. */
    handrails?: boolean;
    /** Kitchen / Mid-Day-Meal shed present. */
    kitchenShed?: boolean;
    /** Whether a health/medical check-up was conducted this year. */
    medicalCheckup?: boolean;
  }
}

/* ============================================================================
 * UDISE+ reporting — pure aggregation helpers over live SIS data. No fabricated
 * numbers: every figure is derived from the school's own students/staff records.
 * ==========================================================================*/

/** Genders we report on, in UDISE order (DCF tables are M / F / T, "other" folded in). */
export const GENDERS: Gender[] = ['male', 'female', 'other'];
export const GENDER_LABEL: Record<Gender, string> = { male: 'Boys', female: 'Girls', other: 'Other' };
export const GENDER_SHORT: Record<Gender, string> = { male: 'M', female: 'F', other: 'O' };

/**
 * Social-category buckets. SIS stores `category` as
 * general | obc | sc | st | ews | other; we surface the five DCF heads plus an
 * explicit "Not specified" bucket for missing/unknown values.
 */
export type CategoryBucket = 'general' | 'sc' | 'st' | 'obc' | 'ews' | 'unspecified';

export const CATEGORY_BUCKETS: CategoryBucket[] = ['general', 'sc', 'st', 'obc', 'ews', 'unspecified'];
export const CATEGORY_LABEL: Record<CategoryBucket, string> = {
  general: 'General',
  sc: 'SC',
  st: 'ST',
  obc: 'OBC',
  ews: 'EWS',
  unspecified: 'Not specified',
};

/** Map a raw SIS category to a report bucket; `other`/missing → "Not specified". */
export function toCategoryBucket(c?: SocialCategory): CategoryBucket {
  switch (c) {
    case 'general':
      return 'general';
    case 'sc':
      return 'sc';
    case 'st':
      return 'st';
    case 'obc':
      return 'obc';
    case 'ews':
      return 'ews';
    default:
      return 'unspecified';
  }
}

/* ----------------------------- Facilities --------------------------------- */

export type FacilityKey =
  | 'drinkingWater' | 'electricity' | 'library' | 'computerLab'
  | 'playground' | 'ramp' | 'boundaryWall' | 'midDayMeal'
  // UDISE+ DCF facility flags (yes/no in the official format):
  | 'internet' | 'handrails' | 'kitchenShed' | 'medicalCheckup';

export const FACILITY_META: { key: FacilityKey; label: string; icon: IconName }[] = [
  { key: 'drinkingWater', label: 'Drinking water (functional)', icon: 'check-circle' },
  { key: 'electricity', label: 'Electricity available', icon: 'check-circle' },
  { key: 'library', label: 'Library / reading corner', icon: 'book' },
  { key: 'computerLab', label: 'Computer lab', icon: 'database' },
  { key: 'playground', label: 'Playground', icon: 'check-circle' },
  // UDISE+ separates the ramp from the handrails it asks about for CWSN access.
  { key: 'ramp', label: 'Ramp for CWSN access', icon: 'check-circle' },
  { key: 'handrails', label: 'Handrails with ramp (CWSN)', icon: 'check-circle' },
  { key: 'boundaryWall', label: 'Boundary wall / fencing', icon: 'building' },
  { key: 'midDayMeal', label: 'Mid-day meal (MDM) provided', icon: 'check-circle' },
  { key: 'kitchenShed', label: 'Kitchen / MDM shed', icon: 'building' },
  { key: 'internet', label: 'Internet connection', icon: 'database' },
  { key: 'medicalCheckup', label: 'Medical check-up conducted', icon: 'check-circle' },
];

/* -------------------------- Infrastructure counts ------------------------- */

/**
 * Numeric UDISE+ infrastructure fields (counts), beyond classrooms/functional
 * toilets which the form already captured. Labels use UDISE+ DCF terminology;
 * NOTE: exact DCF field wording should be verified against the live UDISE+
 * portal each academic year (heads are renamed/regrouped between cycles).
 */
export type InfraCountKey =
  | 'boysToilets' | 'girlsToilets' | 'cwsnToilets'
  | 'libraryBooks' | 'computers' | 'tablets';

export const INFRA_COUNT_META: { key: InfraCountKey; label: string; hint?: string; placeholder?: string }[] = [
  { key: 'boysToilets', label: 'Boys toilets', hint: 'Functional, for boys', placeholder: 'e.g. 6' },
  { key: 'girlsToilets', label: 'Girls toilets', hint: 'Functional, for girls', placeholder: 'e.g. 6' },
  { key: 'cwsnToilets', label: 'CWSN toilets', hint: 'Accessible toilets for CWSN', placeholder: 'e.g. 2' },
  { key: 'libraryBooks', label: 'Library books', hint: 'Total titles/volumes', placeholder: 'e.g. 1200' },
  { key: 'computers', label: 'Computers / desktops', hint: 'For teaching-learning', placeholder: 'e.g. 20' },
  { key: 'tablets', label: 'Tablets', hint: 'For teaching-learning', placeholder: 'e.g. 5' },
];

/* ------------------------- Profile select options ------------------------- */

export const SCHOOL_CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'Primary (I-V)', label: 'Primary (I-V)' },
  { value: 'Upper Primary (I-VIII)', label: 'Upper Primary (I-VIII)' },
  { value: 'Secondary (I-X)', label: 'Secondary (I-X)' },
  { value: 'Higher Secondary (I-XII)', label: 'Higher Secondary (I-XII)' },
  { value: 'Upper Primary only (VI-VIII)', label: 'Upper Primary only (VI-VIII)' },
  { value: 'Secondary only (IX-X)', label: 'Secondary only (IX-X)' },
  { value: 'Higher Secondary only (XI-XII)', label: 'Higher Secondary only (XI-XII)' },
];

export const MANAGEMENT_OPTIONS: { value: string; label: string }[] = [
  { value: 'Department of Education', label: 'Dept. of Education' },
  { value: 'Local Body', label: 'Local Body' },
  { value: 'Private Unaided', label: 'Private Unaided (Recognised)' },
  { value: 'Private Aided', label: 'Private Aided' },
  { value: 'Central Government', label: 'Central Government' },
  { value: 'Other', label: 'Other' },
];

export const BOARD_OPTIONS: { value: string; label: string }[] = [
  { value: 'CBSE', label: 'CBSE' },
  { value: 'CISCE', label: 'CISCE (ICSE/ISC)' },
  { value: 'State Board', label: 'State Board' },
  { value: 'IB', label: 'IB' },
  { value: 'Cambridge', label: 'Cambridge (CAIE)' },
  { value: 'NIOS', label: 'NIOS' },
  { value: 'Other', label: 'Other' },
];

/* ============================== Aggregation =============================== */

export interface GradeRow {
  gradeId: string;
  gradeName: string;
  order: number;
  byGender: Record<Gender, number>;
  total: number;
}

export interface EnrolmentReport {
  totalStudents: number;
  byGenderTotal: Record<Gender, number>;
  gradeRows: GradeRow[];
  byCategory: Record<CategoryBucket, number>;
  rteCount: number;
  teacherCount: number;
  nonTeacherCount: number;
  staffTotal: number;
  /** Pupil-teacher ratio (students ÷ teachers); null when no teachers. */
  ptr: number | null;
}

/** A student is "enrolled" for UDISE purposes when status is active. */
function isEnrolled(s: Student): boolean {
  return s.status === 'active';
}

const UNASSIGNED = '__unassigned__';

/**
 * Aggregate the live SIS rosters into the UDISE enrolment report. Only active
 * students are counted. Teachers vs. non-teaching staff are split on the staff
 * record's department / role hints (best-effort, transparent to the user).
 */
export function buildEnrolmentReport(
  students: Student[],
  staff: { status?: string; designation?: string; department?: string; subjectsTaught?: string[]; classesAssigned?: string[] }[],
  grades: Grade[],
): EnrolmentReport {
  const enrolled = students.filter(isEnrolled);

  const emptyGender = (): Record<Gender, number> => ({ male: 0, female: 0, other: 0 });
  const byGenderTotal = emptyGender();
  const byCategory: Record<CategoryBucket, number> = {
    general: 0, sc: 0, st: 0, obc: 0, ews: 0, unspecified: 0,
  };
  let rteCount = 0;

  // Grade buckets — seeded from the academic structure so empty grades still show,
  // plus a catch-all for students whose grade is missing/stale.
  const gradeMap = new Map<string, GradeRow>();
  for (const g of grades) {
    gradeMap.set(g.id, { gradeId: g.id, gradeName: g.name, order: g.order, byGender: emptyGender(), total: 0 });
  }

  for (const s of enrolled) {
    const gender: Gender = s.gender ?? 'other';
    byGenderTotal[gender] += 1;
    byCategory[toCategoryBucket(s.category)] += 1;
    if (s.rteQuota === true) rteCount += 1;

    const key = s.gradeId && gradeMap.has(s.gradeId) ? s.gradeId : UNASSIGNED;
    let row = gradeMap.get(key);
    if (!row) {
      row = {
        gradeId: UNASSIGNED,
        gradeName: s.gradeName?.trim() || 'Unassigned',
        order: Number.MAX_SAFE_INTEGER,
        byGender: emptyGender(),
        total: 0,
      };
      gradeMap.set(UNASSIGNED, row);
    }
    row.byGender[gender] += 1;
    row.total += 1;
  }

  const gradeRows = [...gradeMap.values()]
    .filter((r) => r.gradeId !== UNASSIGNED || r.total > 0)
    .sort((a, b) => a.order - b.order || a.gradeName.localeCompare(b.gradeName));

  // Staff split. "Teacher" = active staff whose designation/department/teaching
  // assignments mark them as teaching. Everyone else active = non-teaching.
  const activeStaff = staff.filter((m) => (m.status ?? 'active') !== 'resigned' && m.status !== 'retired');
  let teacherCount = 0;
  for (const m of activeStaff) {
    const hay = `${m.designation ?? ''} ${m.department ?? ''}`.toLowerCase();
    const teaches = !!(m.subjectsTaught?.length || m.classesAssigned?.length)
      || /teacher|faculty|principal|headmaster|head teacher|vice principal|academic|coordinator|lecturer/.test(hay);
    if (teaches) teacherCount += 1;
  }
  const staffTotal = activeStaff.length;
  const nonTeacherCount = Math.max(0, staffTotal - teacherCount);

  return {
    totalStudents: enrolled.length,
    byGenderTotal,
    gradeRows,
    byCategory,
    rteCount,
    teacherCount,
    nonTeacherCount,
    staffTotal,
    ptr: teacherCount > 0 ? enrolled.length / teacherCount : null,
  };
}

/* ================================= CSV =================================== */

/** Escape one CSV cell (RFC 4180: wrap + double embedded quotes when needed). */
function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const csvRow = (cells: (string | number)[]) => cells.map(csvCell).join(',');

/** UDISE+ profile shape needed for the CSV infrastructure section (numeric + flag heads). */
type InfraProfile = Partial<Record<InfraCountKey | FacilityKey | 'classrooms' | 'functionalToilets', number | boolean>>;

/**
 * Serialise the report to a UDISE-style CSV. Sectioned, RFC-4180 quoted, with a
 * header line carrying the school name + as-of timestamp. Returned as a plain
 * string for the caller to Blob + download. When a UDISE+ profile is supplied, an
 * Infrastructure section (counts + facility yes/no flags) is appended.
 */
export function reportToCsv(
  report: EnrolmentReport,
  opts: { schoolName?: string; asOf: number; profile?: InfraProfile },
): string {
  const lines: string[] = [];
  const date = new Date(opts.asOf).toISOString().slice(0, 10);
  lines.push(csvRow(['UDISE+ Enrolment Report']));
  if (opts.schoolName) lines.push(csvRow(['School', opts.schoolName]));
  lines.push(csvRow(['Generated on', date]));
  lines.push('');

  // Enrolment by grade x gender
  lines.push(csvRow(['Enrolment by grade and gender']));
  lines.push(csvRow(['Grade', ...GENDERS.map((g) => GENDER_LABEL[g]), 'Total']));
  for (const r of report.gradeRows) {
    lines.push(csvRow([r.gradeName, ...GENDERS.map((g) => r.byGender[g]), r.total]));
  }
  lines.push(csvRow([
    'Total',
    ...GENDERS.map((g) => report.byGenderTotal[g]),
    report.totalStudents,
  ]));
  lines.push('');

  // By social category
  lines.push(csvRow(['Enrolment by social category']));
  lines.push(csvRow(['Category', 'Students']));
  for (const b of CATEGORY_BUCKETS) lines.push(csvRow([CATEGORY_LABEL[b], report.byCategory[b]]));
  lines.push(csvRow(['Total', report.totalStudents]));
  lines.push('');

  // Summary
  lines.push(csvRow(['Summary']));
  lines.push(csvRow(['Metric', 'Value']));
  lines.push(csvRow(['Total enrolment', report.totalStudents]));
  lines.push(csvRow(['RTE-quota students', report.rteCount]));
  lines.push(csvRow(['Teachers', report.teacherCount]));
  lines.push(csvRow(['Non-teaching staff', report.nonTeacherCount]));
  lines.push(csvRow(['Total staff', report.staffTotal]));
  lines.push(csvRow(['Pupil-teacher ratio', report.ptr != null ? `${report.ptr.toFixed(1)}:1` : 'N/A']));

  // Infrastructure (from the UDISE+ profile doc), when available.
  const p = opts.profile;
  if (p) {
    const numOrBlank = (v: number | boolean | undefined) => (typeof v === 'number' ? v : '');
    const yesNo = (v: number | boolean | undefined) => (v === true ? 'Yes' : 'No');
    lines.push('');
    lines.push(csvRow(['Infrastructure']));
    lines.push(csvRow(['Item', 'Value']));
    lines.push(csvRow(['Classrooms', numOrBlank(p.classrooms)]));
    lines.push(csvRow(['Functional toilets', numOrBlank(p.functionalToilets)]));
    for (const c of INFRA_COUNT_META) lines.push(csvRow([c.label, numOrBlank(p[c.key])]));
    for (const f of FACILITY_META) lines.push(csvRow([f.label, yesNo(p[f.key])]));
  }

  return lines.join('\r\n');
}

/** Build a stable file name for the CSV download. */
export function reportFileName(asOf: number): string {
  return `udise-enrolment-${new Date(asOf).toISOString().slice(0, 10)}.csv`;
}
