import type { TenantRecord } from './models';

/**
 * Question Paper Generator — domain types (Phase 1, offline).
 *
 * Three tenant-scoped collections under `schools/{schoolId}/…`:
 *  - `questionBank`     one doc per tagged question
 *  - `questionPapers`   a generated paper (with denormalized item snapshots)
 *  - `paperBlueprints`  reusable section pattern
 *
 * Maths is plain text / Unicode in Phase 1 (e.g. `x² + 2x`, `√`, `≤`). No LaTeX.
 */

/* ============================ Enums + label maps ============================ */

export type QuestionType =
  | 'mcq'
  | 'mcq_multi'
  | 'assertion_reason'
  | 'true_false'
  | 'fill_blank'
  | 'match'
  | 'vsa'
  | 'sa'
  | 'la'
  | 'case'
  | 'numerical'
  | 'diagram'
  | 'other';

export const QUESTION_TYPE_META: Record<QuestionType, { label: string; short: string }> = {
  mcq: { label: 'Multiple Choice (single)', short: 'MCQ' },
  mcq_multi: { label: 'Multiple Choice (multi)', short: 'MCQ+' },
  assertion_reason: { label: 'Assertion–Reason', short: 'A–R' },
  true_false: { label: 'True / False', short: 'T/F' },
  fill_blank: { label: 'Fill in the Blank', short: 'Fill' },
  match: { label: 'Match the Following', short: 'Match' },
  vsa: { label: 'Very Short Answer', short: 'VSA' },
  sa: { label: 'Short Answer', short: 'SA' },
  la: { label: 'Long Answer', short: 'LA' },
  case: { label: 'Case / Passage based', short: 'Case' },
  numerical: { label: 'Numerical', short: 'Num' },
  diagram: { label: 'Diagram / Label', short: 'Diag' },
  other: { label: 'Other', short: 'Other' },
};

/** Types that carry an A/B/C/D options list. */
export const OPTION_TYPES: QuestionType[] = ['mcq', 'mcq_multi', 'assertion_reason'];

export const QUESTION_TYPE_OPTIONS = (Object.keys(QUESTION_TYPE_META) as QuestionType[]).map((t) => ({
  value: t,
  label: QUESTION_TYPE_META[t].label,
}));

export type Bloom = 'remember' | 'understand' | 'apply' | 'analyse' | 'evaluate' | 'create';

export const BLOOM_META: Record<Bloom, { label: string; order: number }> = {
  remember: { label: 'Remember', order: 1 },
  understand: { label: 'Understand', order: 2 },
  apply: { label: 'Apply', order: 3 },
  analyse: { label: 'Analyse', order: 4 },
  evaluate: { label: 'Evaluate', order: 5 },
  create: { label: 'Create', order: 6 },
};

export const BLOOM_OPTIONS = (Object.keys(BLOOM_META) as Bloom[])
  .sort((a, b) => BLOOM_META[a].order - BLOOM_META[b].order)
  .map((b) => ({ value: b, label: BLOOM_META[b].label }));

export type Difficulty = 'easy' | 'medium' | 'hard';

export const DIFFICULTY_META: Record<Difficulty, { label: string; variant: 'success' | 'warning' | 'danger' }> = {
  easy: { label: 'Easy', variant: 'success' },
  medium: { label: 'Medium', variant: 'warning' },
  hard: { label: 'Hard', variant: 'danger' },
};

export const DIFFICULTY_OPTIONS = (Object.keys(DIFFICULTY_META) as Difficulty[]).map((d) => ({
  value: d,
  label: DIFFICULTY_META[d].label,
}));

export type Board = 'CBSE' | 'ICSE' | 'State' | 'IB' | 'Cambridge' | 'NIOS';

export const BOARD_OPTIONS: { value: Board; label: string }[] = [
  { value: 'CBSE', label: 'CBSE' },
  { value: 'ICSE', label: 'ICSE / ISC' },
  { value: 'State', label: 'State board' },
  { value: 'IB', label: 'IB' },
  { value: 'Cambridge', label: 'Cambridge' },
  { value: 'NIOS', label: 'NIOS' },
];

export type QuestionStatus = 'draft' | 'pending' | 'approved' | 'archived';

export const QUESTION_STATUS_META: Record<QuestionStatus, { label: string; variant: 'muted' | 'warning' | 'success' | 'danger' }> = {
  draft: { label: 'Draft', variant: 'muted' },
  pending: { label: 'Pending', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  archived: { label: 'Archived', variant: 'danger' },
};

export const QUESTION_STATUS_OPTIONS = (Object.keys(QUESTION_STATUS_META) as QuestionStatus[]).map((s) => ({
  value: s,
  label: QUESTION_STATUS_META[s].label,
}));

export type PaperStatus = 'draft' | 'submitted' | 'approved' | 'locked';

export const PAPER_STATUS_META: Record<PaperStatus, { label: string; variant: 'muted' | 'warning' | 'success' | 'info' }> = {
  draft: { label: 'Draft', variant: 'muted' },
  submitted: { label: 'Submitted', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  locked: { label: 'Locked', variant: 'info' },
};

/* ============================ Question ============================ */

export interface QuestionOption {
  key: string; // 'A' | 'B' | 'C' | 'D' | …
  text: string;
}

export interface Question extends TenantRecord {
  type: QuestionType;
  stem: string; // question text (plain / Unicode in P1)
  options?: QuestionOption[]; // for MCQ types
  correct?: string[]; // option keys (MCQ) or short answer keys
  answer?: string; // model answer / one-word
  solution?: string; // worked solution (for the key)
  markingScheme?: string; // step marks notes
  imageUrls?: string[]; // pasted URLs only in P1

  // ---- tags (the differentiator) ----
  subjectId?: string;
  subjectName?: string;
  gradeIds?: string[];
  gradeNames?: string[];
  chapter?: string;
  topic?: string;
  subTopic?: string;
  loCode?: string; // NCERT learning-outcome code
  bloom: Bloom;
  difficulty: Difficulty;
  competency?: boolean; // NEP competency-based vs rote
  marks: number;
  expectedTimeMins?: number;
  boards?: Board[];
  source?: string;
  pyqYear?: number;
  language?: string; // 'en' | 'hi' | …

  // ---- governance ----
  status: QuestionStatus;
  usageCount?: number;
  lastUsedAt?: number;
}

/** Filters for the question bank list / paper picker. */
export interface QuestionFilters {
  search?: string;
  subjectId?: string;
  gradeId?: string;
  chapter?: string;
  type?: QuestionType;
  bloom?: Bloom;
  difficulty?: Difficulty;
  competency?: boolean;
  board?: Board;
  status?: QuestionStatus;
}

/* ============================ Paper ============================ */

/** A denormalized snapshot of one question inside a paper section. */
export interface PaperItem {
  questionId: string;
  stem: string;
  type: QuestionType;
  marks: number;
  options?: QuestionOption[];
  correct?: string[];
  answer?: string;
  solution?: string;
}

export interface PaperSection {
  label: string; // "Section A"
  instruction?: string;
  items: PaperItem[];
}

export interface QuestionPaper extends TenantRecord {
  title: string;
  subjectId?: string;
  subjectName?: string;
  gradeId?: string;
  gradeName?: string;
  sectionName?: string;
  examName?: string;
  examId?: string;
  academicYear?: string;
  board?: Board;
  totalMarks: number;
  durationMins: number;
  instructions?: string[];
  blueprintId?: string;
  sections: PaperSection[];
  status: PaperStatus;
}

/* ============================ Blueprint ============================ */

export interface BlueprintSection {
  label: string;
  instruction?: string;
  questionType: QuestionType;
  marksEach: number;
  count: number;
  /** "attempt any N of count" — informational in P1. */
  choiceOf?: number;
}

export interface PaperBlueprint extends TenantRecord {
  name: string;
  board?: Board;
  gradeIds?: string[];
  subjectId?: string;
  totalMarks: number;
  durationMins: number;
  sections: BlueprintSection[];
  bloomTargets?: Partial<Record<Bloom, number>>;
  difficultyTargets?: Partial<Record<Difficulty, number>>;
}

/** Local seed blueprints shipped with the app (id assigned by the seed list). */
export type SeedBlueprint = Omit<PaperBlueprint, keyof TenantRecord> & { id: string };
