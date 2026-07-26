import { describe, it, expect } from 'vitest';
import {
  groupResultsByStudent,
  distinctValues,
  buildStatementModel,
  statementSubtitle,
  buildStatementHtml,
} from './statement';
import type { BoardResult } from './data';

/**
 * Board-result VIEWER pure helpers: grouping stored results by student, distinct
 * filter values, statement-model shaping, and the printable HTML (escaping +
 * structure). No Firestore / DOM here — just the side-effect-free transforms.
 */

function mk(p: Partial<BoardResult>): BoardResult {
  return {
    id: p.id ?? Math.random().toString(36).slice(2),
    schoolId: 's1',
    studentId: p.studentId ?? '',
    studentName: p.studentName ?? '',
    admissionNo: p.admissionNo ?? '',
    board: p.board ?? 'CBSE',
    examName: p.examName ?? 'Class X Board',
    year: p.year ?? '2026',
    subjects: p.subjects ?? [{ name: 'English', maxMarks: 100, marks: 88, grade: 'A1' }],
    totalMarks: p.totalMarks ?? 88,
    totalMax: p.totalMax ?? 100,
    percentage: p.percentage ?? 88,
    result: p.result ?? 'pass',
    importedAt: p.importedAt ?? 0,
    importedByUid: p.importedByUid ?? 'u1',
  };
}

describe('groupResultsByStudent', () => {
  it('groups by studentId and sorts results newest-first', () => {
    const groups = groupResultsByStudent([
      mk({ studentId: 'a', studentName: 'Asha', importedAt: 100 }),
      mk({ studentId: 'a', studentName: 'Asha', importedAt: 300, examName: 'Improvement' }),
      mk({ studentId: 'a', studentName: 'Asha', importedAt: 200 }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].results.map((r) => r.importedAt)).toEqual([300, 200, 100]);
    expect(groups[0].studentId).toBe('a');
  });

  it('buckets by admission no. (case-insensitive) when studentId is blank', () => {
    const groups = groupResultsByStudent([
      mk({ admissionNo: 'ADM-1', studentName: 'Ravi' }),
      mk({ admissionNo: 'adm-1', studentName: 'Ravi' }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].results).toHaveLength(2);
    expect(groups[0].key).toBe('adm:adm-1');
  });

  it('keeps studentId and admissionNo groups separate and sorts by name', () => {
    const groups = groupResultsByStudent([
      mk({ studentId: 'z', studentName: 'Zara' }),
      mk({ admissionNo: 'ADM-9', studentName: 'Aman' }),
    ]);
    expect(groups.map((g) => g.studentName)).toEqual(['Aman', 'Zara']);
  });

  it('drops results with no usable identity', () => {
    expect(groupResultsByStudent([mk({ studentId: '', admissionNo: '' })])).toEqual([]);
  });
});

describe('distinctValues', () => {
  it('returns sorted, de-duplicated, non-empty values', () => {
    const rows = [
      mk({ board: 'CBSE', year: '2026' }),
      mk({ board: 'ICSE', year: '2025' }),
      mk({ board: 'CBSE', year: '' }),
    ];
    expect(distinctValues(rows, 'board')).toEqual(['CBSE', 'ICSE']);
    expect(distinctValues(rows, 'year')).toEqual(['2025', '2026']);
  });
});

describe('statementSubtitle', () => {
  it('joins non-empty parts with a middot', () => {
    expect(statementSubtitle({ board: 'CBSE', examName: 'Class X', year: '2026' })).toBe('CBSE · Class X · 2026');
    expect(statementSubtitle({ board: 'CBSE', examName: '', year: '2026' })).toBe('CBSE · 2026');
  });
});

describe('buildStatementModel', () => {
  it('formats subjects, totals, percentage and result', () => {
    const r = mk({
      studentName: 'Asha Rao',
      admissionNo: 'ADM-1',
      subjects: [
        { name: 'English', maxMarks: 100, marks: 88, grade: 'A1' },
        { name: 'Maths', maxMarks: 100, marks: 95 }, // no grade
      ],
      totalMarks: 183,
      totalMax: 200,
      percentage: 91.5,
      result: 'pass',
    });
    const m = buildStatementModel(r, { name: 'Nexli School', location: 'Pune' }, '19 Jun 2026');
    expect(m.schoolName).toBe('Nexli School');
    expect(m.schoolLocation).toBe('Pune');
    expect(m.totalText).toBe('183 / 200');
    expect(m.percentageText).toBe('91.5%');
    expect(m.resultLabel).toBe('PASS');
    expect(m.subjects[0]).toEqual({ name: 'English', maxText: '100', marksText: '88', gradeText: 'A1' });
    expect(m.subjects[1].gradeText).toBe('—'); // missing grade
    expect(m.issuedDateText).toBe('19 Jun 2026');
  });

  it('shows dashes for totals/percentage when nothing has a max', () => {
    const r = mk({
      subjects: [{ name: 'Project', maxMarks: 0, marks: 0, grade: 'A' }],
      totalMarks: 0,
      totalMax: 0,
      percentage: 0,
      result: 'fail',
    });
    const m = buildStatementModel(r, {}, 'today');
    expect(m.totalText).toBe('—');
    expect(m.percentageText).toBe('—');
    expect(m.schoolName).toBe('School'); // fallback
    expect(m.subjects[0].maxText).toBe('—');
    expect(m.resultLabel).toBe('FAIL');
  });
});

describe('buildStatementHtml', () => {
  const baseModel = () =>
    buildStatementModel(
      mk({ studentName: 'Asha Rao', admissionNo: 'ADM-1', board: 'CBSE', examName: 'Class X', year: '2026' }),
      { name: 'Nexli School', location: 'Pune' },
      '19 Jun 2026',
    );

  it('produces a self-contained doc with the key statement fields', () => {
    const html = buildStatementHtml(baseModel());
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('STATEMENT OF MARKS');
    expect(html).toContain('Nexli School');
    expect(html).toContain('CBSE · Class X · 2026');
    expect(html).toContain('Asha Rao');
    expect(html).toContain('ADM-1');
    expect(html).toContain('window.print()');
    expect(html).toContain('is-pass');
  });

  it('escapes HTML in interpolated values (no injection)', () => {
    const m = buildStatementModel(
      mk({ studentName: '<script>alert(1)</script>', subjects: [{ name: 'A & B "x"', maxMarks: 100, marks: 50 }] }),
      { name: 'S<b>' },
      'today',
    );
    const html = buildStatementHtml(m);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('A &amp; B &quot;x&quot;');
    expect(html).toContain('S&lt;b&gt;');
  });
});
