import type {
  ReportCardGradeBand, ReportCardGradingSystem, ReportCardScheme,
} from '@/types/reportcard';

/**
 * Bundled seed grading schemes. These work on day one (no setup): the hub seeds
 * them into `reportCardSchemes` on first use, and the generate flow can use them
 * directly even before they are persisted. Three real Indian variants:
 *   1. CBSE 9-point term scheme (PT + Notebook + Subject Enrichment + Term exam).
 *   2. A simple percentage scheme (single annual exam, A–E bands).
 *   3. A state-board half-yearly / annual variant.
 *
 * Ids are stable so re-seeding is idempotent (upsert on the same doc id).
 */

/** CBSE 9-point grade bands (A1 90–100 … E below 33). */
const CBSE_BANDS = [
  { grade: 'A1', minPct: 91, maxPct: 100, point: 10 },
  { grade: 'A2', minPct: 81, maxPct: 90, point: 9 },
  { grade: 'B1', minPct: 71, maxPct: 80, point: 8 },
  { grade: 'B2', minPct: 61, maxPct: 70, point: 7 },
  { grade: 'C1', minPct: 51, maxPct: 60, point: 6 },
  { grade: 'C2', minPct: 41, maxPct: 50, point: 5 },
  { grade: 'D', minPct: 33, maxPct: 40, point: 4 },
  { grade: 'E', minPct: 0, maxPct: 32, point: 0 },
];

/** Simple percentage bands (A excellent … F fail). */
const PERCENT_BANDS = [
  { grade: 'A', minPct: 75, maxPct: 100 },
  { grade: 'B', minPct: 60, maxPct: 74 },
  { grade: 'C', minPct: 45, maxPct: 59 },
  { grade: 'D', minPct: 33, maxPct: 44 },
  { grade: 'F', minPct: 0, maxPct: 32 },
];

const CO_SCHOLASTIC = ['Work Education', 'Art Education', 'Health & Physical Education', 'Discipline'];

/**
 * The three seed schemes. `schoolId` is filled at persist time; here it is an
 * empty string so the constants stay tenant-agnostic.
 */
export const SEED_SCHEMES: ReportCardScheme[] = [
  {
    id: 'seed-cbse-9point',
    schoolId: '',
    name: 'CBSE 9-Point (Term)',
    board: 'CBSE',
    terms: [
      { id: 'term1', label: 'Term 1' },
      { id: 'term2', label: 'Term 2' },
      { id: 'annual', label: 'Annual' },
    ],
    components: [
      { id: 'pt', label: 'Periodic Test', max: 10, weight: 10 },
      { id: 'notebook', label: 'Notebook', max: 5, weight: 5 },
      { id: 'enrichment', label: 'Subject Enrichment', max: 5, weight: 5 },
      { id: 'term', label: 'Term Exam', max: 80, weight: 80 },
    ],
    gradeBands: CBSE_BANDS,
    coScholasticAreas: CO_SCHOLASTIC,
    passPercent: 33,
    showRank: true,
  },
  {
    id: 'seed-percentage',
    schoolId: '',
    name: 'Percentage (Annual)',
    board: 'Other',
    terms: [
      { id: 'annual', label: 'Annual Exam' },
    ],
    components: [
      { id: 'annual', label: 'Annual Exam', max: 100, weight: 100 },
    ],
    gradeBands: PERCENT_BANDS,
    coScholasticAreas: ['Conduct', 'Games & Sports'],
    passPercent: 33,
    showRank: true,
  },
  {
    id: 'seed-state-board',
    schoolId: '',
    name: 'State Board (Half-Yearly / Annual)',
    board: 'State',
    terms: [
      { id: 'halfyearly', label: 'Half-Yearly' },
      { id: 'annual', label: 'Annual' },
    ],
    components: [
      { id: 'fa', label: 'Formative (FA)', max: 20, weight: 20 },
      { id: 'sa', label: 'Summative (SA)', max: 80, weight: 80 },
    ],
    gradeBands: PERCENT_BANDS,
    coScholasticAreas: ['Values & Discipline', 'Co-curricular'],
    passPercent: 35,
    showRank: false,
  },
];

/** Look up a seed scheme by id (used when a scheme isn't persisted yet). */
export function findSeedScheme(id: string): ReportCardScheme | undefined {
  return SEED_SCHEMES.find((s) => s.id === id);
}

/* --------------------------- Grading systems --------------------------- */

/** The grading system a scheme uses, with 'marks' as the legacy default. */
export const gradingSystemOf = (scheme: Pick<ReportCardScheme, 'gradingSystem'>): ReportCardGradingSystem =>
  scheme.gradingSystem ?? 'marks';

/** Selector labels + helper copy for each grading system. */
export const GRADING_SYSTEM_META: Record<ReportCardGradingSystem, { label: string; hint: string }> = {
  marks: { label: 'Marks (numerical → grade)', hint: 'Teachers enter component marks; the percentage, grade and result compute automatically from the bands below.' },
  grade_abcd: { label: 'Direct grades — A / B / C / D', hint: 'Teachers pick a letter grade per subject directly. No marks or percentages are computed.' },
  grade_a1b1: { label: 'Direct grades — A1 / A2 … D (CBSE)', hint: 'CBSE-style direct grades per subject. Edit the descriptions or marks ranges as needed.' },
  grade_custom: { label: 'Custom grade symbols', hint: 'Define your own grade symbols and labels. Teachers pick a symbol per subject.' },
};

export const GRADING_SYSTEM_OPTIONS = (Object.keys(GRADING_SYSTEM_META) as ReportCardGradingSystem[])
  .map((value) => ({ value, label: GRADING_SYSTEM_META[value].label }));

/** True when the scheme grades by symbol entry rather than computed marks. */
export const isDirectGradeSystem = (sys: ReportCardGradingSystem): boolean => sys !== 'marks';

/** A/B/C/D preset bands (descriptions editable; ranges are indicative). */
export const ABCD_BANDS: ReportCardGradeBand[] = [
  { grade: 'A', minPct: 75, maxPct: 100, description: 'Outstanding' },
  { grade: 'B', minPct: 60, maxPct: 74, description: 'Very good' },
  { grade: 'C', minPct: 45, maxPct: 59, description: 'Good' },
  { grade: 'D', minPct: 0, maxPct: 44, description: 'Scope to improve' },
];

/** CBSE-style A1/A2/B1/B2/C1/C2/D preset bands with descriptions. */
export const A1B1_BANDS: ReportCardGradeBand[] = [
  { grade: 'A1', minPct: 91, maxPct: 100, point: 10, description: 'Exceptional' },
  { grade: 'A2', minPct: 81, maxPct: 90, point: 9, description: 'Excellent' },
  { grade: 'B1', minPct: 71, maxPct: 80, point: 8, description: 'Very good' },
  { grade: 'B2', minPct: 61, maxPct: 70, point: 7, description: 'Good' },
  { grade: 'C1', minPct: 51, maxPct: 60, point: 6, description: 'Fair' },
  { grade: 'C2', minPct: 41, maxPct: 50, point: 5, description: 'Satisfactory' },
  { grade: 'D', minPct: 0, maxPct: 40, point: 4, description: 'Needs improvement' },
];

/** Default bands to seed when switching a scheme into a given grading system. */
export function defaultBandsFor(sys: ReportCardGradingSystem, current: ReportCardGradeBand[]): ReportCardGradeBand[] {
  switch (sys) {
    case 'grade_abcd':
      return ABCD_BANDS.map((b) => ({ ...b }));
    case 'grade_a1b1':
      return A1B1_BANDS.map((b) => ({ ...b }));
    case 'grade_custom':
      // Keep whatever exists so the user can tweak it; seed one row if empty.
      return current.length ? current.map((b) => ({ ...b })) : [{ grade: 'A', minPct: 0, maxPct: 100, description: '' }];
    case 'marks':
    default:
      return current.map((b) => ({ ...b }));
  }
}
