/**
 * Tiny dependency-free CSV toolkit for the Student Import wizard.
 * Handles quoted fields, escaped quotes (""), CRLF/LF, and a trailing newline.
 * Good enough for spreadsheet exports (Excel / Google Sheets / Numbers).
 */

/** The template column headers, in order. Also drives auto-mapping. */
export const TEMPLATE_COLUMNS = [
  'Admission No',
  'First Name',
  'Last Name',
  'Gender',
  'DOB (YYYY-MM-DD)',
  'Grade',
  'Section',
  'Roll No',
  'Category',
  'Guardian Name',
  'Guardian Phone',
  'Guardian Email',
] as const;

/** Canonical field keys the importer maps onto. */
export type ImportField =
  | 'admissionNo'
  | 'firstName'
  | 'lastName'
  | 'gender'
  | 'dob'
  | 'grade'
  | 'section'
  | 'rollNo'
  | 'category'
  | 'guardianName'
  | 'guardianPhone'
  | 'guardianEmail';

export interface FieldDef {
  key: ImportField;
  label: string;
  required?: boolean;
  /** Header keywords that auto-match to this field (lowercased, no spaces). */
  match: string[];
}

/** Ordered field definitions used for mapping + validation. */
export const IMPORT_FIELDS: FieldDef[] = [
  { key: 'admissionNo', label: 'Admission No', match: ['admissionno', 'admno', 'admission', 'enrollmentno'] },
  { key: 'firstName', label: 'First Name', required: true, match: ['firstname', 'first', 'givenname', 'name'] },
  { key: 'lastName', label: 'Last Name', match: ['lastname', 'last', 'surname', 'familyname'] },
  { key: 'gender', label: 'Gender', required: true, match: ['gender', 'sex'] },
  { key: 'dob', label: 'Date of birth', match: ['dob', 'dateofbirth', 'birthdate', 'birthday'] },
  { key: 'grade', label: 'Grade', match: ['grade', 'class', 'standard', 'std'] },
  { key: 'section', label: 'Section', match: ['section', 'division'] },
  { key: 'rollNo', label: 'Roll No', match: ['rollno', 'roll', 'rollnumber'] },
  { key: 'category', label: 'Category', match: ['category', 'socialcategory', 'caste'] },
  { key: 'guardianName', label: 'Guardian Name', match: ['guardianname', 'guardian', 'parentname', 'father', 'mother', 'fathername'] },
  { key: 'guardianPhone', label: 'Guardian Phone', match: ['guardianphone', 'phone', 'mobile', 'contact', 'parentphone'] },
  { key: 'guardianEmail', label: 'Guardian Email', match: ['guardianemail', 'email', 'parentemail', 'mail'] },
];

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

/** Build the downloadable blank template (headers + one example row). */
export function buildTemplateCsv(): string {
  const example = [
    'ADM2026-0001',
    'Aarav',
    'Sharma',
    'male',
    '2014-05-12',
    'Class 5',
    'A',
    '12',
    'general',
    'Rohit Sharma',
    '9876543210',
    'rohit@example.com',
  ];
  return toCsv(TEMPLATE_COLUMNS, [example]);
}

/**
 * Parse CSV text into headers + rows. Robust to quoted commas/newlines and
 * empty trailing lines. Returns trimmed headers; cells are kept verbatim
 * (callers trim where needed).
 */
export function parseCsv(text: string): ParsedCsv {
  // Strip a UTF-8 BOM if present.
  const input = text.replace(/^﻿/, '');
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
      // handled by \n; ignore (covers lone \r too via the \n branch)
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
  // Flush the final field/row if there is dangling content.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Drop fully-empty rows (e.g. trailing newline).
  const cleaned = rows.filter((r) => r.some((c) => c.trim() !== ''));
  if (cleaned.length === 0) return { headers: [], rows: [] };

  const headers = cleaned[0].map((h) => h.trim());
  const dataRows = cleaned.slice(1).map((r) => {
    // Normalise width to header count.
    const out = r.slice(0, headers.length);
    while (out.length < headers.length) out.push('');
    return out;
  });
  return { headers, rows: dataRows };
}

/** Normalise a header for fuzzy matching. */
function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Auto-map parsed headers → import fields. Returns a record keyed by field with
 * the matched header index (or -1 when no confident match was found).
 */
export function autoMap(headers: string[]): Record<ImportField, number> {
  const normalized = headers.map(norm);
  const used = new Set<number>();
  const result = {} as Record<ImportField, number>;

  for (const def of IMPORT_FIELDS) {
    let found = -1;
    // 1) exact header-key/label match first
    for (let i = 0; i < normalized.length; i++) {
      if (used.has(i)) continue;
      if (normalized[i] === norm(def.label) || normalized[i] === norm(def.key)) {
        found = i;
        break;
      }
    }
    // 2) keyword contains match
    if (found === -1) {
      for (let i = 0; i < normalized.length; i++) {
        if (used.has(i)) continue;
        if (def.match.some((m) => normalized[i] === m || normalized[i].includes(m))) {
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
