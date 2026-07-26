import { describe, it, expect } from 'vitest';
import {
  parseCsv,
  detectSubjectColumns,
  autoMapIdentity,
  isSubjectFailed,
  computeTotals,
  parseRow,
  type IdentityField,
  type SubjectColumns,
} from './csv';

/**
 * Board-exam result import: pure parsing + totals/pass-fail tests. Covers CSV
 * quirks, subject-column discovery from a free-form header, identity auto-mapping,
 * per-subject fail logic (numeric + grade), aggregate totals/percentage, and the
 * full row parser incl. malformed/edge rows.
 */

describe('parseCsv', () => {
  it('parses headers + rows, normalising width and dropping blank lines', () => {
    const out = parseCsv('A,B,C\r\n1,2,3\n4,5\n\n');
    expect(out.headers).toEqual(['A', 'B', 'C']);
    expect(out.rows).toEqual([
      ['1', '2', '3'],
      ['4', '5', ''], // short row padded
    ]);
  });

  it('handles quoted commas, escaped quotes and a BOM', () => {
    const out = parseCsv('﻿"Last, First",Note\n"He said ""hi""",ok');
    expect(out.headers).toEqual(['Last, First', 'Note']);
    expect(out.rows).toEqual([['He said "hi"', 'ok']]);
  });

  it('returns empty headers/rows for empty input', () => {
    expect(parseCsv('')).toEqual({ headers: [], rows: [] });
    expect(parseCsv('\n\n')).toEqual({ headers: [], rows: [] });
  });
});

describe('detectSubjectColumns', () => {
  it('groups marks/max/grade triples per subject, in header order', () => {
    const headers = [
      'Admission No', 'Board', 'Exam Name', 'Year',
      'English Marks', 'English Max', 'English Grade',
      'Maths Marks', 'Maths Max', 'Maths Grade',
    ];
    const subs = detectSubjectColumns(headers);
    expect(subs.map((s) => s.name)).toEqual(['English', 'Maths']);
    expect(subs[0]).toMatchObject({ marksIdx: 4, maxIdx: 5, gradeIdx: 6 });
    expect(subs[1]).toMatchObject({ marksIdx: 7, maxIdx: 8, gradeIdx: 9 });
  });

  it('accepts a subject with only a marks column (no max/grade)', () => {
    const subs = detectSubjectColumns(['Roll', 'Science Score']);
    expect(subs).toHaveLength(1);
    expect(subs[0]).toMatchObject({ name: 'Science', marksIdx: 1, maxIdx: -1, gradeIdx: -1 });
  });

  it('does not read "maxmarks" as a marks column (longest suffix wins)', () => {
    // "Hindi Max Marks" must be the MAX of Hindi, not a second marks column.
    const subs = detectSubjectColumns(['Hindi Marks', 'Hindi Max Marks']);
    expect(subs).toHaveLength(1);
    expect(subs[0]).toMatchObject({ name: 'Hindi', marksIdx: 0, maxIdx: 1 });
  });

  it('ignores a subject group that has no marks column', () => {
    // Only a grade column → not enough to be a scored subject.
    expect(detectSubjectColumns(['Art Grade'])).toEqual([]);
  });
});

describe('autoMapIdentity', () => {
  it('maps identity fields and never grabs a subject column', () => {
    const headers = [
      'Admission No', 'Board', 'Exam Name', 'Year',
      'English Marks', 'English Max',
    ];
    const m = autoMapIdentity(headers);
    expect(m.admissionNo).toBe(0);
    expect(m.board).toBe(1);
    expect(m.examName).toBe(2);
    expect(m.year).toBe(3);
    expect(m.studentId).toBe(-1); // no studentId column present
    // The "English Marks" column (index 4/5) is a subject — must not be mapped.
    expect(Object.values(m)).not.toContain(4);
    expect(Object.values(m)).not.toContain(5);
  });

  it('falls back to keyword matching (Roll No → admissionNo)', () => {
    const m = autoMapIdentity(['Roll No', 'Session']);
    expect(m.admissionNo).toBe(0);
    expect(m.year).toBe(1); // "Session" → year
  });
});

describe('isSubjectFailed', () => {
  it('fails below 33% of max', () => {
    expect(isSubjectFailed({ name: 'X', marks: 32, maxMarks: 100 })).toBe(true);
    expect(isSubjectFailed({ name: 'X', marks: 33, maxMarks: 100 })).toBe(false);
  });

  it('honours an explicit failing grade regardless of marks', () => {
    expect(isSubjectFailed({ name: 'X', marks: 90, maxMarks: 100, grade: 'E' })).toBe(true);
    expect(isSubjectFailed({ name: 'X', marks: 90, maxMarks: 100, grade: 'AB' })).toBe(true);
    expect(isSubjectFailed({ name: 'X', marks: 90, maxMarks: 100, grade: 'A1' })).toBe(false);
  });

  it('does not count a subject with no max and no failing grade', () => {
    expect(isSubjectFailed({ name: 'X', marks: 0, maxMarks: 0 })).toBe(false);
    expect(isSubjectFailed({ name: 'X', marks: 0, maxMarks: 0, grade: 'A' })).toBe(false);
  });
});

describe('computeTotals', () => {
  it('sums marks/max and computes a 1-dp percentage', () => {
    const t = computeTotals([
      { name: 'Eng', marks: 88, maxMarks: 100 },
      { name: 'Mat', marks: 75, maxMarks: 100 },
    ]);
    expect(t).toEqual({ totalMarks: 163, totalMax: 200, percentage: 81.5, result: 'pass' });
  });

  it('marks the overall result fail when any subject fails', () => {
    const t = computeTotals([
      { name: 'Eng', marks: 88, maxMarks: 100 },
      { name: 'Mat', marks: 20, maxMarks: 100 }, // < 33%
    ]);
    expect(t.result).toBe('fail');
    expect(t.percentage).toBe(54); // (88+20)/200
  });

  it('excludes a max-less subject from the percentage denominator', () => {
    const t = computeTotals([
      { name: 'Eng', marks: 80, maxMarks: 100 },
      { name: 'WorkEd', marks: 0, maxMarks: 0, grade: 'A' }, // co-scholastic, no max
    ]);
    expect(t.totalMax).toBe(100);
    expect(t.percentage).toBe(80);
    expect(t.result).toBe('pass');
  });

  it('is fail when there is nothing gradeable', () => {
    expect(computeTotals([]).result).toBe('fail');
    expect(computeTotals([{ name: 'X', marks: 0, maxMarks: 0 }]).result).toBe('fail');
  });
});

describe('parseRow', () => {
  const identity: Record<IdentityField, number> = { admissionNo: 0, studentId: -1, board: 1, examName: 2, year: 3 };
  const subjectCols: SubjectColumns[] = [
    { name: 'English', marksIdx: 4, maxIdx: 5, gradeIdx: 6 },
    { name: 'Maths', marksIdx: 7, maxIdx: 8, gradeIdx: 9 },
  ];
  const defaults = { board: '', examName: '', year: '' };

  it('parses a clean row into subjects + totals', () => {
    const row = ['ADM-1', 'CBSE', 'Class X', '2026', '88', '100', 'A1', '95', '100', 'A1'];
    const r = parseRow(row, 1, identity, subjectCols, defaults);
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.admissionNo).toBe('ADM-1');
    expect(r.board).toBe('CBSE');
    expect(r.subjects).toHaveLength(2);
    expect(r.totals).toMatchObject({ totalMarks: 183, totalMax: 200, percentage: 91.5, result: 'pass' });
  });

  it('uses wizard defaults when board/exam/year cells are blank', () => {
    const row = ['ADM-2', '', '', '', '70', '100', 'B1', '60', '100', 'B2'];
    const r = parseRow(row, 2, identity, subjectCols, { board: 'ICSE', examName: 'Class XII', year: '2025' });
    expect(r.board).toBe('ICSE');
    expect(r.examName).toBe('Class XII');
    expect(r.year).toBe('2025');
    expect(r.valid).toBe(true);
  });

  it('flags a row with no student identifier', () => {
    const row = ['', 'CBSE', 'Class X', '2026', '88', '100', 'A1', '', '', ''];
    const r = parseRow(row, 3, identity, subjectCols, defaults);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => /admission no\. or student ID/i.test(e))).toBe(true);
  });

  it('flags marks above max and non-numeric marks', () => {
    const row = ['ADM-4', 'CBSE', 'Class X', '2026', '120', '100', '', 'abc', '100', ''];
    const r = parseRow(row, 4, identity, subjectCols, defaults);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => /exceed max/i.test(e))).toBe(true);
    expect(r.errors.some((e) => /is not a number/i.test(e))).toBe(true);
  });

  it('skips not-attempted subjects (blank marks AND grade) without error', () => {
    // Maths blank entirely → only English counts, still valid.
    const row = ['ADM-5', 'CBSE', 'Class X', '2026', '88', '100', 'A1', '', '', ''];
    const r = parseRow(row, 5, identity, subjectCols, defaults);
    expect(r.valid).toBe(true);
    expect(r.subjects).toHaveLength(1);
    expect(r.subjects[0].name).toBe('English');
  });

  it('errors when a student has no subject marks at all', () => {
    const row = ['ADM-6', 'CBSE', 'Class X', '2026', '', '', '', '', '', ''];
    const r = parseRow(row, 6, identity, subjectCols, defaults);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => /no subject marks/i.test(e))).toBe(true);
  });
});
