/**
 * Pure, dependency-free helpers for the Board-Result VIEWER: grouping stored
 * results by student, shaping a single result into a printable "statement of
 * marks" model, and rendering that model as a fully self-contained, print-ready
 * HTML document.
 *
 * Everything here is side-effect free and unit-tested (see statement.test.ts);
 * the React viewer only does selection state + the synchronous popup open around
 * these functions. The HTML builder mirrors the `certificates/print.ts` pattern
 * (escaped interpolation, an inline print button) so it stays XSS-safe and prints
 * identically across browsers.
 */

import type { BoardResult, BoardResultSubject } from './data';
import type { BoardResultStatus } from './csv';

/* ----------------------------------------------------------------------- */
/* Grouping: stored results → one group per student                         */
/* ----------------------------------------------------------------------- */

/** A student's board results, newest exam first. */
export interface StudentBoardGroup {
  /** Stable group key: the studentId when present, else `adm:<admissionNo>`. */
  key: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  /** This student's results, most recent import first. */
  results: BoardResult[];
}

/** Trimmed identity key used to bucket a result under a student. */
function groupKeyFor(r: Pick<BoardResult, 'studentId' | 'admissionNo'>): string {
  const id = (r.studentId ?? '').trim();
  if (id) return id;
  const adm = (r.admissionNo ?? '').trim().toLowerCase();
  return adm ? `adm:${adm}` : '';
}

/**
 * Group stored board results by student. Results that share a studentId (or, when
 * that is blank, an admission number) collapse into one group. Each group's
 * results are sorted newest-import-first; groups are sorted by student name
 * (case-insensitive, numeric-aware). Results with no usable identity are dropped
 * (they can never be viewed per-student).
 */
export function groupResultsByStudent(results: readonly BoardResult[]): StudentBoardGroup[] {
  const byKey = new Map<string, StudentBoardGroup>();
  for (const r of results) {
    const key = groupKeyFor(r);
    if (!key) continue;
    let g = byKey.get(key);
    if (!g) {
      g = {
        key,
        studentId: (r.studentId ?? '').trim(),
        studentName: r.studentName || r.admissionNo || 'Unknown student',
        admissionNo: r.admissionNo ?? '',
        results: [],
      };
      byKey.set(key, g);
    }
    // Prefer a non-empty name / admission no. if a later doc fills one in.
    if (!g.studentName && r.studentName) g.studentName = r.studentName;
    if (!g.admissionNo && r.admissionNo) g.admissionNo = r.admissionNo;
    g.results.push(r);
  }
  const groups = [...byKey.values()];
  for (const g of groups) {
    g.results.sort((a, b) => (b.importedAt ?? 0) - (a.importedAt ?? 0));
  }
  groups.sort((a, b) => a.studentName.localeCompare(b.studentName, undefined, { numeric: true, sensitivity: 'base' }));
  return groups;
}

/* ----------------------------------------------------------------------- */
/* Filtering: distinct boards / exams / years across a result set           */
/* ----------------------------------------------------------------------- */

/** Distinct, sorted non-empty values for a string field across results. */
export function distinctValues(results: readonly BoardResult[], field: 'board' | 'examName' | 'year'): string[] {
  const set = new Set<string>();
  for (const r of results) {
    const v = (r[field] ?? '').trim();
    if (v) set.add(v);
  }
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
}

/* ----------------------------------------------------------------------- */
/* Statement model: one result shaped for display + print                   */
/* ----------------------------------------------------------------------- */

/** A single subject line in the statement, pre-formatted for display. */
export interface StatementSubjectRow {
  name: string;
  /** "—" when there is no max recorded. */
  maxText: string;
  marksText: string;
  /** "—" when no grade recorded. */
  gradeText: string;
}

/** Everything needed to render an in-app preview AND a printed statement. */
export interface StatementModel {
  schoolName: string;
  schoolLocation?: string;
  logoUrl?: string;
  studentName: string;
  admissionNo: string;
  board: string;
  examName: string;
  year: string;
  subjects: StatementSubjectRow[];
  /** "163 / 200" or "—" when nothing has a max. */
  totalText: string;
  /** "81.5%" or "—". */
  percentageText: string;
  result: BoardResultStatus;
  resultLabel: string;
  issuedDateText: string;
}

/** Format a number for marks/max — integers print bare, decimals keep up to 2dp. */
function fmtNum(n: number): string {
  if (!Number.isFinite(n)) return '0';
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

/** Shape one stored subject into a display row. */
function subjectRow(s: BoardResultSubject): StatementSubjectRow {
  return {
    name: s.name,
    maxText: s.maxMarks > 0 ? fmtNum(s.maxMarks) : '—',
    marksText: fmtNum(s.marks),
    gradeText: s.grade && s.grade.trim() ? s.grade.trim() : '—',
  };
}

export interface StatementSchool {
  name?: string;
  location?: string;
  logoUrl?: string;
}

/**
 * Build the printable/displayable statement model for a single stored result.
 * `school` supplies the header (name/location/logo); `issuedDateText` is the
 * pre-formatted "issued on" date so this stays free of locale/Date side effects.
 */
export function buildStatementModel(
  result: BoardResult,
  school: StatementSchool,
  issuedDateText: string,
): StatementModel {
  const hasMax = result.totalMax > 0;
  return {
    schoolName: school.name?.trim() || 'School',
    schoolLocation: school.location?.trim() || undefined,
    logoUrl: school.logoUrl?.trim() || undefined,
    studentName: result.studentName || '—',
    admissionNo: result.admissionNo ?? '',
    board: result.board ?? '',
    examName: result.examName ?? '',
    year: result.year ?? '',
    subjects: result.subjects.map(subjectRow),
    totalText: hasMax ? `${fmtNum(result.totalMarks)} / ${fmtNum(result.totalMax)}` : '—',
    percentageText: hasMax ? `${result.percentage}%` : '—',
    result: result.result,
    resultLabel: result.result === 'pass' ? 'PASS' : 'FAIL',
    issuedDateText,
  };
}

/* ----------------------------------------------------------------------- */
/* Print HTML                                                               */
/* ----------------------------------------------------------------------- */

/** Gold accent shared with the certificate documents. */
const ACCENT = '#C6A55C';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** A short "Board · Exam · Year" subtitle line (skips blank parts). */
export function statementSubtitle(m: Pick<StatementModel, 'board' | 'examName' | 'year'>): string {
  return [m.board, m.examName, m.year].map((p) => p.trim()).filter(Boolean).join(' · ');
}

/**
 * Build a fully self-contained, print-ready HTML document for a board-result
 * statement of marks. All interpolated values are escaped. Includes an inline
 * "Print / Save as PDF" button that is hidden when printing.
 */
export function buildStatementHtml(m: StatementModel): string {
  const subtitle = statementSubtitle(m);
  const logo = m.logoUrl
    ? `<img class="brs__logo" src="${esc(m.logoUrl)}" alt="" referrerpolicy="no-referrer" />`
    : '';
  const rows = m.subjects
    .map(
      (s) => `<tr>
        <td class="brs__subj">${esc(s.name)}</td>
        <td class="brs__num">${esc(s.maxText)}</td>
        <td class="brs__num">${esc(s.marksText)}</td>
        <td class="brs__grade">${esc(s.gradeText)}</td>
      </tr>`,
    )
    .join('');
  const resultClass = m.result === 'pass' ? 'is-pass' : 'is-fail';

  return `<!doctype html><html><head><meta charset="utf-8"><title>Statement of Marks — ${esc(m.studentName)}</title>
<style>
  @page { size: A4 portrait; margin: 18mm; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #14110c; margin: 0; padding: 24px; background: #f4f1ea; }
  .brs { max-width: 760px; margin: 0 auto; background: #fff; border: 2px solid ${ACCENT}; padding: 36px 44px; box-shadow: 0 2px 12px rgba(0,0,0,.08); }
  .brs__head { text-align: center; border-bottom: 1px solid #ddd; padding-bottom: 16px; margin-bottom: 22px; }
  .brs__logo { display: block; max-height: 72px; max-width: 220px; margin: 0 auto 12px; object-fit: contain; }
  .brs__school { font-size: 25px; font-weight: 700; letter-spacing: .5px; color: #1a1206; }
  .brs__loc { font-size: 13px; color: #6b6354; margin-top: 4px; }
  .brs__title { text-align: center; font-size: 17px; font-weight: 700; letter-spacing: 3px; color: ${ACCENT}; margin: 6px 0 4px; text-decoration: underline; }
  .brs__subtitle { text-align: center; font-size: 13px; color: #6b6354; margin: 0 0 22px; }
  .brs__meta { display: flex; flex-wrap: wrap; gap: 6px 28px; font-size: 14px; margin-bottom: 18px; }
  .brs__meta div { min-width: 0; }
  .brs__meta .k { color: #6b6354; }
  .brs__meta .v { font-weight: 700; color: #1a1206; }
  table.brs__table { width: 100%; border-collapse: collapse; margin: 6px 0 18px; }
  .brs__table th, .brs__table td { border: 1px solid #ddd; padding: 8px 12px; font-size: 14px; }
  .brs__table th { background: #faf7ef; color: #6b6354; text-align: left; font-weight: 700; }
  .brs__table th.brs__num, .brs__table td.brs__num, .brs__table th.brs__grade, .brs__table td.brs__grade { text-align: center; }
  .brs__table td.brs__num { font-variant-numeric: tabular-nums; }
  .brs__subj { width: 46%; }
  .brs__totals { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 10px 26px; font-size: 15px; margin-bottom: 8px; }
  .brs__totals .k { color: #6b6354; }
  .brs__totals .v { font-weight: 700; color: #1a1206; font-variant-numeric: tabular-nums; }
  .brs__result { display: inline-block; padding: 4px 14px; border-radius: 6px; font-weight: 700; letter-spacing: 1px; }
  .brs__result.is-pass { background: rgba(34,197,94,.14); color: #166534; border: 1px solid rgba(34,197,94,.5); }
  .brs__result.is-fail { background: rgba(220,38,38,.12); color: #991b1b; border: 1px solid rgba(220,38,38,.5); }
  .brs__foot { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 46px; font-size: 13px; }
  .brs__sign { text-align: center; }
  .brs__sign-line { border-top: 1px solid #333; padding-top: 6px; min-width: 180px; }
  .brs__issued { color: #6b6354; }
  .brs__note { margin-top: 18px; font-size: 11px; color: #8a8170; text-align: center; }
  .brs__print-btn { display: block; margin: 18px auto 0; padding: 10px 22px; font-size: 14px; background: ${ACCENT}; color: #1a1206; border: 0; border-radius: 8px; cursor: pointer; }
  @media print { body { background: #fff; padding: 0; } .brs { border: 2px solid ${ACCENT}; box-shadow: none; } .brs__print-btn { display: none; } }
</style></head>
<body>
  <div class="brs">
    <div class="brs__head">
      ${logo}
      <div class="brs__school">${esc(m.schoolName)}</div>
      ${m.schoolLocation ? `<div class="brs__loc">${esc(m.schoolLocation)}</div>` : ''}
    </div>
    <div class="brs__title">STATEMENT OF MARKS</div>
    ${subtitle ? `<div class="brs__subtitle">${esc(subtitle)}</div>` : '<div class="brs__subtitle"></div>'}
    <div class="brs__meta">
      <div><span class="k">Name:</span> <span class="v">${esc(m.studentName)}</span></div>
      ${m.admissionNo ? `<div><span class="k">Admission No.:</span> <span class="v">${esc(m.admissionNo)}</span></div>` : ''}
    </div>
    <table class="brs__table">
      <thead>
        <tr><th class="brs__subj">Subject</th><th class="brs__num">Max</th><th class="brs__num">Marks</th><th class="brs__grade">Grade</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="brs__totals">
      <div><span class="k">Total:</span> <span class="v">${esc(m.totalText)}</span></div>
      <div><span class="k">Percentage:</span> <span class="v">${esc(m.percentageText)}</span></div>
      <div><span class="brs__result ${resultClass}">${esc(m.resultLabel)}</span></div>
    </div>
    <div class="brs__foot">
      <div class="brs__issued">Issued on: ${esc(m.issuedDateText)}</div>
      <div class="brs__sign"><div class="brs__sign-line">Principal / Authorised Signatory</div></div>
    </div>
    <div class="brs__note">This statement is generated from imported board records and is for reference only.</div>
  </div>
  <button class="brs__print-btn" onclick="window.print()">Print / Save as PDF</button>
</body></html>`;
}

/**
 * Open a blank print window. Returns null if a popup blocker stopped it.
 *
 * POPUP-BLOCKER NOTE: browsers only allow `window.open` during the synchronous
 * portion of a user-gesture handler. Call this at the very start of the click
 * handler (before any await), then `writeStatementWindow(win, html)` once the
 * HTML is ready. Mirrors the `certificates/print.ts` contract.
 */
export function openPrintWindow(): Window | null {
  return window.open('', '_blank', 'width=900,height=1180');
}

/** Write statement HTML into an already-opened print window and focus it. */
export function writeStatementWindow(w: Window, html: string): void {
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
}
