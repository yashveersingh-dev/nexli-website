/**
 * Dependency-free CSV toolkit for the Staff bulk-import wizard. Mirrors the
 * students importer (`features/students/import/csv.ts`): handles quoted fields,
 * escaped quotes (""), CRLF/LF and a trailing newline — good enough for
 * spreadsheet exports (Excel / Google Sheets / Numbers).
 *
 * The PURE parse + auto-map live here; validation (which needs the role
 * catalogue + existing members) lives in `./validate`.
 */

/** The template column headers, in order. Also drives auto-mapping. */
export const TEMPLATE_COLUMNS = [
  'Name',
  'Email',
  'Role',
  'Department',
  'Phone',
  'Designation',
] as const;

/** Canonical field keys the importer maps onto. */
export type StaffImportField = 'name' | 'email' | 'role' | 'department' | 'phone' | 'designation';

export interface StaffFieldDef {
  key: StaffImportField;
  label: string;
  required?: boolean;
  /** Header keywords that auto-match to this field (normalised: lowercase, no punctuation). */
  match: string[];
}

/** Ordered field definitions used for mapping + validation. */
export const STAFF_IMPORT_FIELDS: StaffFieldDef[] = [
  { key: 'name', label: 'Full name', required: true, match: ['name', 'fullname', 'staffname', 'employeename'] },
  { key: 'email', label: 'Email', required: true, match: ['email', 'emailaddress', 'mail', 'officialemail'] },
  { key: 'role', label: 'Role', required: true, match: ['role', 'roleid', 'designation', 'position', 'jobrole'] },
  { key: 'department', label: 'Department', match: ['department', 'dept', 'team'] },
  { key: 'phone', label: 'Phone', match: ['phone', 'mobile', 'contact', 'phonenumber'] },
  { key: 'designation', label: 'Designation', match: ['designation', 'jobtitle', 'title'] },
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
export function buildStaffTemplateCsv(): string {
  const example = ['Priya Menon', 'priya.menon@example.com', 'Subject Teacher', 'Science', '9876543210', 'PGT Physics'];
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

/** Normalise a header for fuzzy matching. */
function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Auto-map parsed headers → import fields. Returns a record keyed by field with
 * the matched header index (or -1 when no confident match was found). Each
 * source column is used at most once.
 */
export function autoMap(headers: string[]): Record<StaffImportField, number> {
  const normalized = headers.map(norm);
  const used = new Set<number>();
  const result = {} as Record<StaffImportField, number>;

  for (const def of STAFF_IMPORT_FIELDS) {
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
