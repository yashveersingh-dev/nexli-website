/**
 * Pure, dependency-free CSV toolkit + computation for the Board-Exam Result import.
 *
 * Board results (CBSE / ICSE / State) are imported from an external spreadsheet:
 * one row per student, fixed identity columns (admission no / studentId, board,
 * exam name, year) followed by REPEATING per-subject triples
 * (`<Subject> Marks`, `<Subject> Max`, `<Subject> Grade`). The subject set is
 * discovered from the header — schools sit different subjects per board/stream, so
 * the columns are not hard-wired.
 *
 * Everything here is side-effect free and unit-tested (see csv.test.ts): the React
 * import wizard only does file I/O + Firestore writes around these functions.
 */

/* ----------------------------------------------------------------------- */
/* CSV parsing (mirrors students/import/csv.ts: quotes, "", CRLF/LF, BOM)   */
/* ----------------------------------------------------------------------- */

export interface ParsedCsv {
  headers: string[];
  /** Each row is an array of cell strings aligned to `headers` length. */
  rows: string[][];
}

/** Escape one cell for CSV output. */
function escapeCell(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** Build a CSV string from a header row + data rows. */
export function toCsv(headers: readonly string[], rows: string[][] = []): string {
  const lines = [headers.map(escapeCell).join(',')];
  for (const row of rows) lines.push(row.map(escapeCell).join(','));
  return lines.join('\r\n');
}

/**
 * Parse CSV text into headers + rows. Robust to quoted commas/newlines, escaped
 * quotes (`""`), CRLF or LF, a UTF-8 BOM, and a trailing newline. Returns trimmed
 * headers; cells are kept verbatim (callers trim where needed).
 */
export function parseCsv(text: string): ParsedCsv {
  const input = text.replace(/^﻿/, ''); // strip BOM
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\r') {
      if (input[i + 1] !== '\n') {
        row.push(field);
        field = '';
        rows.push(row);
        row = [];
      }
    } else if (ch === '\n') {
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const cleaned = rows.filter((r) => r.some((c) => c.trim() !== ''));
  if (cleaned.length === 0) return { headers: [], rows: [] };

  const headers = cleaned[0].map((h) => h.trim());
  const dataRows = cleaned.slice(1).map((r) => {
    const out = r.slice(0, headers.length);
    while (out.length < headers.length) out.push('');
    return out;
  });
  return { headers, rows: dataRows };
}

/** Normalise a header for fuzzy matching (lowercase, alnum only). */
function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/* ----------------------------------------------------------------------- */
/* Header model: fixed identity fields + discovered subject columns         */
/* ----------------------------------------------------------------------- */

/** Canonical identity field keys (everything that is NOT a subject column). */
export type IdentityField = 'admissionNo' | 'studentId' | 'board' | 'examName' | 'year';

export interface IdentityFieldDef {
  key: IdentityField;
  label: string;
  /** Header keywords that auto-match (normalised). */
  match: string[];
}

/** Ordered identity field definitions used for column mapping. */
export const IDENTITY_FIELDS: IdentityFieldDef[] = [
  { key: 'admissionNo', label: 'Admission No', match: ['admissionno', 'admno', 'admission', 'enrollmentno', 'rollno', 'roll'] },
  { key: 'studentId', label: 'Student ID', match: ['studentid', 'sisid', 'id', 'uid'] },
  { key: 'board', label: 'Board', match: ['board', 'examboard', 'examiningbody'] },
  { key: 'examName', label: 'Exam name', match: ['examname', 'exam', 'examination', 'testname'] },
  { key: 'year', label: 'Year', match: ['year', 'session', 'academicyear', 'batch'] },
];

/**
 * A subject column-group: the three header indices (or -1) detected for a single
 * subject. `marks` is required to count as a subject; `max`/`grade` are optional.
 */
export interface SubjectColumns {
  name: string;
  marksIdx: number;
  maxIdx: number;
  gradeIdx: number;
}

const SUBJECT_SUFFIX = {
  marks: ['marks', 'mark', 'score', 'obtained', 'marksobtained', 'obt'],
  max: ['max', 'maxmarks', 'outof', 'total', 'fullmarks', 'maximum'],
  grade: ['grade', 'gr', 'letter'],
} as const;

/**
 * Detect which suffix (marks/max/grade) a header ends with, returning the bare
 * subject name + the kind. e.g. "Maths Marks" → { subject: 'Maths', kind: 'marks' }.
 * Returns null when the header has no recognised suffix.
 */
function classifySubjectHeader(header: string): { subject: string; kind: 'marks' | 'max' | 'grade' } | null {
  const n = norm(header);
  // Longest suffix wins so "maxmarks" isn't read as "marks".
  const candidates: { kind: 'marks' | 'max' | 'grade'; suffix: string }[] = [];
  for (const kind of ['marks', 'max', 'grade'] as const) {
    for (const suf of SUBJECT_SUFFIX[kind]) candidates.push({ kind, suffix: suf });
  }
  candidates.sort((a, b) => b.suffix.length - a.suffix.length);
  for (const c of candidates) {
    if (n.endsWith(c.suffix) && n.length > c.suffix.length) {
      const subjectNorm = n.slice(0, n.length - c.suffix.length);
      if (!subjectNorm) continue;
      // Recover a human label from the original header (strip the suffix words).
      const label = humanSubjectLabel(header);
      return { subject: label, kind: c.kind };
    }
  }
  return null;
}

/** Strip trailing "marks/max/grade/score…" words from a header to get a label. */
function humanSubjectLabel(header: string): string {
  const cleaned = header
    .trim()
    .replace(/[_\-/]+/g, ' ')
    .replace(/\b(max\s*marks|maximum|max|out\s*of|full\s*marks|total|marks?\s*obtained|obtained|marks?|score|grade|letter|gr|obt)\b\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || header.trim();
}

/**
 * Discover subject column-groups from a header row. Headers are grouped by their
 * (normalised) subject stem; a group becomes a subject only if it has a `marks`
 * column. Order follows first appearance in the header row.
 */
export function detectSubjectColumns(headers: string[]): SubjectColumns[] {
  const order: string[] = [];
  const byKey = new Map<string, SubjectColumns>();
  headers.forEach((h, idx) => {
    const c = classifySubjectHeader(h);
    if (!c) return;
    const key = norm(c.subject);
    if (!key) return;
    let group = byKey.get(key);
    if (!group) {
      group = { name: c.subject, marksIdx: -1, maxIdx: -1, gradeIdx: -1 };
      byKey.set(key, group);
      order.push(key);
    }
    if (c.kind === 'marks' && group.marksIdx === -1) group.marksIdx = idx;
    else if (c.kind === 'max' && group.maxIdx === -1) group.maxIdx = idx;
    else if (c.kind === 'grade' && group.gradeIdx === -1) group.gradeIdx = idx;
  });
  return order.map((k) => byKey.get(k)!).filter((g) => g.marksIdx !== -1);
}

/**
 * Auto-map identity headers → field index (or -1). First exact label/key match,
 * then keyword contains-match. Subject columns are excluded so a "Math Marks"
 * column never gets grabbed as, say, the studentId.
 */
export function autoMapIdentity(headers: string[]): Record<IdentityField, number> {
  const subjectIdx = new Set(
    detectSubjectColumns(headers).flatMap((s) => [s.marksIdx, s.maxIdx, s.gradeIdx].filter((i) => i >= 0)),
  );
  const normalized = headers.map((h, i) => (subjectIdx.has(i) ? ' ' : norm(h)));
  const used = new Set<number>();
  const result = {} as Record<IdentityField, number>;

  for (const def of IDENTITY_FIELDS) {
    let found = -1;
    for (let i = 0; i < normalized.length; i++) {
      if (used.has(i) || normalized[i] === ' ') continue;
      if (normalized[i] === norm(def.label) || normalized[i] === norm(def.key)) {
        found = i;
        break;
      }
    }
    if (found === -1) {
      for (let i = 0; i < normalized.length; i++) {
        if (used.has(i) || normalized[i] === ' ') continue;
        if (def.match.some((m) => normalized[i] === m)) {
          found = i;
          break;
        }
      }
    }
    if (found === -1) {
      for (let i = 0; i < normalized.length; i++) {
        if (used.has(i) || normalized[i] === ' ') continue;
        if (def.match.some((m) => normalized[i].includes(m))) {
          found = i;
          break;
        }
      }
    }
    if (found !== -1) used.add(found);
    result[def.key] = found;
  }
  return result;
}

/* ----------------------------------------------------------------------- */
/* Per-subject + per-row computation                                        */
/* ----------------------------------------------------------------------- */

export interface ParsedSubject {
  name: string;
  marks: number;
  maxMarks: number;
  grade?: string;
}

export type BoardResultStatus = 'pass' | 'fail';

export interface ComputedTotals {
  totalMarks: number;
  totalMax: number;
  /** Rounded to 1 decimal place; 0 when there is no max to divide by. */
  percentage: number;
  result: BoardResultStatus;
}

/** Default pass threshold for a subject as a fraction of its max (33%). */
export const SUBJECT_PASS_FRACTION = 0.33;

/**
 * A subject is failed when an explicit grade marks it failed (E / F / FAIL / AB /
 * absent), OR when numeric marks fall below `SUBJECT_PASS_FRACTION` of the max.
 * When neither marks/max nor a grade are meaningful, the subject does not count
 * against the student (returns false).
 */
export function isSubjectFailed(s: ParsedSubject): boolean {
  const g = (s.grade ?? '').trim().toUpperCase();
  if (g) {
    if (g === 'E' || g === 'F' || g === 'FAIL' || g === 'AB' || g === 'ABSENT' || g === 'A.B.') return true;
    // A recognised pass grade with no usable max: trust the grade.
    if (s.maxMarks <= 0) return false;
  }
  if (s.maxMarks <= 0) return false;
  return s.marks < s.maxMarks * SUBJECT_PASS_FRACTION;
}

/**
 * Aggregate a student's subjects into totals + overall percentage + pass/fail.
 * Overall is pass iff EVERY subject (that has a max) passes. Percentage is over
 * the summed max of subjects that have one — a subject with no max contributes
 * neither marks nor max, so a partial set is never divided by a phantom total.
 */
export function computeTotals(subjects: ParsedSubject[]): ComputedTotals {
  let totalMarks = 0;
  let totalMax = 0;
  let anyFailed = false;
  let counted = 0;
  for (const s of subjects) {
    if (s.maxMarks > 0) {
      totalMarks += s.marks;
      totalMax += s.maxMarks;
      counted++;
    }
    if (isSubjectFailed(s)) anyFailed = true;
  }
  const percentage = totalMax > 0 ? Math.round((totalMarks / totalMax) * 1000) / 10 : 0;
  // With no gradeable subjects at all, treat as fail (nothing demonstrably passed).
  const result: BoardResultStatus = counted === 0 ? 'fail' : anyFailed ? 'fail' : 'pass';
  return { totalMarks, totalMax, percentage, result };
}

/* ----------------------------------------------------------------------- */
/* Row → parsed board-result row                                            */
/* ----------------------------------------------------------------------- */

export interface ParsedBoardRow {
  /** 1-based source row number (after the header), for user-facing messages. */
  index: number;
  admissionNo: string;
  studentId: string;
  board: string;
  examName: string;
  year: string;
  subjects: ParsedSubject[];
  totals: ComputedTotals;
  errors: string[];
  /** True when there are no blocking errors (still importable). */
  valid: boolean;
}

/** Parse a numeric cell; returns NaN for blank/garbage so callers can flag it. */
function num(cell: string | undefined): number {
  const t = (cell ?? '').trim();
  if (t === '') return NaN;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Turn one raw CSV row into a fully parsed + validated board-result row using the
 * identity mapping + detected subject columns. Validation is intentionally lenient
 * about MISSING optional data (a subject may lack a max or a grade) but flags hard
 * problems: no student identifier, no parseable subject marks at all, marks that
 * exceed the max, or a non-numeric marks cell.
 *
 * `examName`/`board`/`year` fall back to the wizard-level defaults when the row's
 * own cell is blank (common when a whole file is one exam).
 */
export function parseRow(
  row: string[],
  index: number,
  identity: Record<IdentityField, number>,
  subjectCols: SubjectColumns[],
  defaults: { board: string; examName: string; year: string },
): ParsedBoardRow {
  const cell = (i: number) => (i >= 0 ? (row[i] ?? '').trim() : '');
  const admissionNo = cell(identity.admissionNo);
  const studentId = cell(identity.studentId);
  const board = cell(identity.board) || defaults.board.trim();
  const examName = cell(identity.examName) || defaults.examName.trim();
  const year = cell(identity.year) || defaults.year.trim();

  const errors: string[] = [];
  if (!admissionNo && !studentId) errors.push('No admission no. or student ID — cannot match a student.');
  if (!board) errors.push('Board is required.');
  if (!examName) errors.push('Exam name is required.');

  const subjects: ParsedSubject[] = [];
  for (const sc of subjectCols) {
    const marksRaw = cell(sc.marksIdx);
    const maxRaw = sc.maxIdx >= 0 ? cell(sc.maxIdx) : '';
    const gradeRaw = sc.gradeIdx >= 0 ? cell(sc.gradeIdx) : '';
    // A subject with no marks AND no grade for this student is simply not attempted.
    if (marksRaw === '' && gradeRaw === '') continue;

    let marks = num(marksRaw);
    const maxMarks = maxRaw === '' ? 0 : num(maxRaw);
    if (marksRaw !== '' && Number.isNaN(marks)) {
      errors.push(`"${sc.name}": marks "${marksRaw}" is not a number.`);
      marks = 0;
    }
    if (maxRaw !== '' && Number.isNaN(maxMarks)) {
      errors.push(`"${sc.name}": max "${maxRaw}" is not a number.`);
    }
    if (!Number.isNaN(marks) && marks < 0) errors.push(`"${sc.name}": marks cannot be negative.`);
    if (maxMarks > 0 && !Number.isNaN(marks) && marks > maxMarks) {
      errors.push(`"${sc.name}": marks ${marks} exceed max ${maxMarks}.`);
    }
    subjects.push({
      name: sc.name,
      marks: Number.isNaN(marks) ? 0 : marks,
      maxMarks: Number.isNaN(maxMarks) ? 0 : maxMarks,
      grade: gradeRaw || undefined,
    });
  }

  if (subjects.length === 0) errors.push('No subject marks found for this student.');

  const totals = computeTotals(subjects);
  return { index, admissionNo, studentId, board, examName, year, subjects, totals, errors, valid: errors.length === 0 };
}

/* ----------------------------------------------------------------------- */
/* Downloadable template                                                    */
/* ----------------------------------------------------------------------- */

/** Build a blank board-results template (identity columns + 2 example subjects). */
export function buildTemplateCsv(): string {
  const headers = [
    'Admission No',
    'Board',
    'Exam Name',
    'Year',
    'English Marks', 'English Max', 'English Grade',
    'Mathematics Marks', 'Mathematics Max', 'Mathematics Grade',
  ];
  const example = [
    'ADM2026-0001',
    'CBSE',
    'Class X Board',
    '2026',
    '88', '100', 'A1',
    '95', '100', 'A1',
  ];
  return toCsv(headers, [example]);
}
