import { describe, it, expect } from 'vitest';
import {
  gradeFor,
  pointFor,
  computeSubject,
  computeTotals,
  computeResult,
  computeRanks,
} from './compute';
import type {
  ReportCardScheme,
  ReportCardComponentMark,
  ReportCardSubject,
  ReportCard,
} from '@/types/reportcard';

/**
 * Report-card scoring tests. Cover grade banding (incl. the boundary-gap fix),
 * per-subject %/pass math, overall totals + CGPA, result status, and class ranking
 * with shared ranks on ties.
 */

const gradeBands: ReportCardScheme['gradeBands'] = [
  { grade: 'A1', minPct: 90, maxPct: 100, point: 10 },
  { grade: 'B', minPct: 60, maxPct: 89, point: 8 },
  { grade: 'D', minPct: 33, maxPct: 59, point: 4 },
  { grade: 'E', minPct: 0, maxPct: 32, point: 0 },
];

const scheme: ReportCardScheme = {
  id: 'scheme1',
  schoolId: 'sch1',
  name: 'CBSE 9-point',
  board: 'CBSE',
  terms: [{ id: 't1', label: 'Term 1' }],
  components: [
    { id: 'pt', label: 'Periodic Test', max: 20 },
    { id: 'hy', label: 'Half Yearly', max: 80 },
  ],
  gradeBands,
  passPercent: 33,
};

const comps = (pt: number | null, hy: number | null): ReportCardComponentMark[] => [
  { componentId: 'pt', label: 'Periodic Test', max: 20, marks: pt },
  { componentId: 'hy', label: 'Half Yearly', max: 80, marks: hy },
];

describe('gradeFor / pointFor', () => {
  it('maps a percentage to the highest band it reaches', () => {
    expect(gradeFor(scheme, 95)).toBe('A1');
    expect(gradeFor(scheme, 90)).toBe('A1'); // inclusive lower bound
    expect(gradeFor(scheme, 75)).toBe('B');
    expect(gradeFor(scheme, 33)).toBe('D');
    expect(gradeFor(scheme, 0)).toBe('E');
  });

  it('a fractional score in a boundary GAP grades to the lower band, not through to failing', () => {
    // 59.5 is below the 60 "B" floor but above the 33 "D" floor → D (the fix).
    expect(gradeFor(scheme, 59.5)).toBe('D');
    // 89.9 is just under the 90 A1 floor → B.
    expect(gradeFor(scheme, 89.9)).toBe('B');
  });

  it('clamps out-of-range percentages', () => {
    expect(gradeFor(scheme, 150)).toBe('A1');
    expect(gradeFor(scheme, -5)).toBe('E');
  });

  it('returns the grade point for a percentage', () => {
    expect(pointFor(scheme, 95)).toBe(10);
    expect(pointFor(scheme, 70)).toBe(8);
    expect(pointFor(scheme, 10)).toBe(0);
  });
});

describe('computeSubject', () => {
  it('computes total, max, percentage, grade and pass', () => {
    const s = computeSubject(scheme, 'Maths', comps(18, 64)); // 82 / 100
    expect(s.max).toBe(100);
    expect(s.total).toBe(82);
    expect(s.percentage).toBe(82);
    expect(s.grade).toBe('B');
    expect(s.passMark).toBe(33); // ceil(33% of 100)
    expect(s.passed).toBe(true);
  });

  it('treats null component marks as 0', () => {
    const s = computeSubject(scheme, 'Sci', comps(10, null)); // 10 / 100
    expect(s.total).toBe(10);
    expect(s.percentage).toBe(10);
    expect(s.passed).toBe(false); // 10 < passMark 33
    expect(s.grade).toBe('E');
  });

  it('rounds percentage to one decimal place', () => {
    // total 1 of max 3 → 33.333% → 33.3
    const oddScheme: ReportCardScheme = { ...scheme, components: [{ id: 'x', label: 'X', max: 3 }] };
    const s = computeSubject(oddScheme, 'Odd', [{ componentId: 'x', label: 'X', max: 3, marks: 1 }]);
    expect(s.max).toBe(3);
    expect(s.percentage).toBe(33.3);
    expect(s.passMark).toBe(1); // ceil(33% of 3) = ceil(0.99) = 1
  });

  it('a subject with no max (0) is treated as passed (nothing to fail)', () => {
    const emptyScheme: ReportCardScheme = { ...scheme, components: [{ id: 'z', label: 'Z', max: 0 }] };
    const s = computeSubject(emptyScheme, 'Empty', [{ componentId: 'z', label: 'Z', max: 0, marks: null }]);
    expect(s.max).toBe(0);
    expect(s.percentage).toBe(0);
    expect(s.passed).toBe(true);
  });
});

describe('computeTotals', () => {
  it('sums obtained/max, computes overall % and CGPA (mean of points)', () => {
    const subjects: ReportCardSubject[] = [
      computeSubject(scheme, 'Maths', comps(18, 64)), // 82% → point 8
      computeSubject(scheme, 'Eng', comps(20, 76)), // 96% → point 10
    ];
    const t = computeTotals(scheme, subjects);
    expect(t.obtained).toBe(82 + 96); // 178
    expect(t.max).toBe(200);
    expect(t.percentage).toBe(89); // 178/200 = 89.0
    expect(t.cgpa).toBe(9); // mean(8, 10) = 9
  });

  it('no subjects → zeros and undefined CGPA', () => {
    const t = computeTotals(scheme, []);
    expect(t).toEqual({ obtained: 0, max: 0, percentage: 0, cgpa: undefined });
  });
});

describe('computeResult', () => {
  const pass = computeSubject(scheme, 'A', comps(18, 64)); // passed
  const fail = computeSubject(scheme, 'B', comps(2, 5)); // 7% → failed

  it('all subjects pass and overall >= 33 → pass', () => {
    expect(computeResult([pass], 82)).toBe('pass');
  });
  it('1–2 failed subjects with overall >= 33 → compartment', () => {
    expect(computeResult([pass, fail], 50)).toBe('compartment');
  });
  it('overall below 33 → fail regardless of subject pass flags', () => {
    expect(computeResult([pass], 30)).toBe('fail');
  });
  it('3+ failed subjects → fail even when overall >= 33', () => {
    expect(computeResult([fail, fail, fail], 40)).toBe('fail');
  });
});

describe('computeRanks', () => {
  const card = (id: string, percentage: number, max = 200): Pick<ReportCard, 'id' | 'totals'> => ({
    id,
    totals: { obtained: 0, max, percentage },
  });

  it('ranks highest percentage first', () => {
    const r = computeRanks([card('a', 70), card('b', 92), card('c', 81)]);
    expect(r.get('b')).toEqual({ rank: 1, classSize: 3 });
    expect(r.get('c')).toEqual({ rank: 2, classSize: 3 });
    expect(r.get('a')).toEqual({ rank: 3, classSize: 3 });
  });

  it('ties share a rank', () => {
    const r = computeRanks([card('a', 90), card('b', 90), card('c', 70)]);
    expect(r.get('a')?.rank).toBe(1);
    expect(r.get('b')?.rank).toBe(1);
    expect(r.get('c')?.rank).toBe(3); // standard competition ranking — skips 2
  });

  it('excludes cards with no recorded marks (max 0) from ranking', () => {
    const r = computeRanks([card('a', 90), card('z', 0, 0)]);
    expect(r.has('z')).toBe(false);
    expect(r.get('a')).toEqual({ rank: 1, classSize: 1 });
  });
});
