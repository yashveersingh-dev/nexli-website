import { describe, it, expect } from 'vitest';
import {
  band,
  scoreRiasec,
  hollandCode,
  scoreAptitude,
  recommendStreams,
  matchCareers,
  scoreAssessment,
} from './scoring';
import { RIASEC_CODES, APTITUDE_KEYS, STREAM_KEYS } from '@/types/career';
import type { AnswerMap } from '@/types/career';

/**
 * RIASEC / aptitude scoring tests. The engine is pure & deterministic, so we assert
 * exact normalised scores hand-derived from `bank.ts`:
 *   • RIASEC mean is on the 1–5 Likert scale → normalised ((mean - 1) / 4) * 100.
 *     Reverse-keyed items are inverted (6 - value) BEFORE averaging.
 *   • Aptitude: a key's score = (points won / times the key was offered) * 100.
 */

describe('band', () => {
  it('bands a 0–100 score into high/average/low', () => {
    expect(band(100)).toBe('high');
    expect(band(67)).toBe('high'); // inclusive lower bound
    expect(band(66)).toBe('average');
    expect(band(40)).toBe('average'); // inclusive lower bound
    expect(band(39)).toBe('low');
    expect(band(0)).toBe('low');
  });
});

describe('scoreRiasec', () => {
  it('an unanswered inventory scores every construct at 0', () => {
    const r = scoreRiasec({});
    for (const code of RIASEC_CODES) expect(r[code]).toBe(0);
  });

  it('maxing Realistic (incl. inverting its reverse-keyed item) gives R=100, others 0', () => {
    // R items: r1,r2,r3 normal (answer 5), r4 reverse-keyed (answer 1 → 6-1=5).
    const answers: AnswerMap = { r1: 5, r2: 5, r3: 5, r4: 1 };
    const r = scoreRiasec(answers);
    expect(r.R).toBe(100); // mean 5 → ((5-1)/4)*100
    expect(r.I).toBe(0);
    expect(r.A).toBe(0);
    expect(r.S).toBe(0);
    expect(r.E).toBe(0);
    expect(r.C).toBe(0);
  });

  it('answering EVERY R item "5" (including the reverse one) drags the mean down', () => {
    // r4 is reverse-keyed: a literal 5 becomes 6-5=1, so sum = 5+5+5+1 = 16, mean 4.
    const answers: AnswerMap = { r1: 5, r2: 5, r3: 5, r4: 5 };
    expect(scoreRiasec(answers).R).toBe(75); // ((4-1)/4)*100
  });

  it('all-neutral (3) on a construct normalises to 50', () => {
    // i4 is reverse-keyed → neutral 3 stays 3 (6-3). mean 3 → ((3-1)/4)*100 = 50.
    const answers: AnswerMap = { i1: 3, i2: 3, i3: 3, i4: 3 };
    expect(scoreRiasec(answers).I).toBe(50);
  });

  it('a partial run scores only the answered items (skips blanks)', () => {
    // Only r1 answered (=5); other R items skipped → mean over the 1 answered = 5.
    expect(scoreRiasec({ r1: 5 }).R).toBe(100);
  });
});

describe('hollandCode', () => {
  it('returns the top-3 letters, highest first', () => {
    const r = scoreRiasec({ r1: 5, r2: 5, r3: 5, r4: 1 }); // R=100, rest 0
    // Ties (all the 0s) break by canonical R-I-A-S-E-C order → I then A.
    expect(hollandCode(r)).toBe('RIA');
  });

  it('orders distinct scores correctly', () => {
    const r = scoreRiasec({
      s1: 5, s2: 5, s3: 5, s4: 1, // S = 100
      e1: 4, e2: 4, e3: 4, e4: 2, // E: sum 4+4+4+(6-2=4)=16, mean 4 → 75
      a1: 3, a2: 3, a3: 3, a4: 3, // A = 50
    });
    expect(hollandCode(r)).toBe('SEA');
  });
});

describe('scoreAptitude', () => {
  it('an unanswered set scores every key at 0', () => {
    const a = scoreAptitude({});
    for (const key of APTITUDE_KEYS) expect(a[key]).toBe(0);
  });

  it('choosing "a" on every item yields the hand-computed win shares', () => {
    const answers: AnswerMap = {
      ap1: 'a', ap2: 'a', ap3: 'a', ap4: 'a', ap5: 'a',
      ap6: 'a', ap7: 'a', ap8: 'a', ap9: 'a', ap10: 'a',
    };
    const a = scoreAptitude(answers);
    // Each key is "offered" 4 times across the 10 items; wins (with all-a) below:
    expect(a.numerical).toBe(50); // won 2 of 4 (ap1, ap4)
    expect(a.verbal).toBe(50); // won 2 of 4 (ap6, ap9)
    expect(a.logical).toBe(75); // won 3 of 4 (ap2, ap5, ap10)
    expect(a.spatial).toBe(50); // won 2 of 4 (ap3, ap8)
    expect(a.social).toBe(25); // won 1 of 4 (ap7)
  });

  it('ignores invalid/missing choices but still counts the item as offered', () => {
    // Only ap1 chosen 'b' (→ verbal). numerical is offered on ap1,ap4,ap6,ap8 = 4 times,
    // wins 0 → 0. verbal offered 4 times, wins 1 → 25.
    const a = scoreAptitude({ ap1: 'b' });
    expect(a.numerical).toBe(0);
    expect(a.verbal).toBe(25);
  });
});

describe('recommendStreams', () => {
  it('returns all four streams, each a 0–100 fit, sorted descending', () => {
    const riasec = scoreRiasec({ r1: 5, r2: 5, r3: 5, r4: 1 });
    const apt = scoreAptitude({ ap1: 'a', ap2: 'a', ap3: 'a', ap4: 'a', ap5: 'a' });
    const streams = recommendStreams(riasec, apt);
    expect(streams).toHaveLength(STREAM_KEYS.length);
    for (const s of streams) {
      expect(s.fit).toBeGreaterThanOrEqual(0);
      expect(s.fit).toBeLessThanOrEqual(100);
      expect(Array.isArray(s.drivers)).toBe(true);
    }
    // Sorted descending by fit.
    for (let i = 1; i < streams.length; i++) {
      expect(streams[i - 1].fit).toBeGreaterThanOrEqual(streams[i].fit);
    }
  });

  it('a strongly Realistic profile favours the Vocational stream (R-weighted)', () => {
    // Vocational has the heaviest R weight (0.4); with R=100 and others 0 it leads.
    const riasec = scoreRiasec({ r1: 5, r2: 5, r3: 5, r4: 1 });
    const apt = scoreAptitude({}); // all aptitude 0 → only RIASEC drives fit
    const streams = recommendStreams(riasec, apt);
    expect(streams[0].stream).toBe('vocational');
    expect(streams[0].fit).toBe(40); // R(100) * 0.4 + C(0) * 0.1
  });

  it('is deterministic — same input, same output', () => {
    const riasec = scoreRiasec({ i1: 5, i2: 5, i3: 5, i4: 1 });
    const apt = scoreAptitude({ ap1: 'a' });
    expect(recommendStreams(riasec, apt)).toEqual(recommendStreams(riasec, apt));
  });
});

describe('matchCareers', () => {
  it('returns the top 4 clusters, each a 0–100 fit, sorted descending', () => {
    const riasec = scoreRiasec({ i1: 5, i2: 5, i3: 5, i4: 1 });
    const apt = scoreAptitude({ ap1: 'a', ap2: 'a' });
    const careers = matchCareers(riasec, apt);
    expect(careers).toHaveLength(4);
    for (let i = 1; i < careers.length; i++) {
      expect(careers[i - 1].fit).toBeGreaterThanOrEqual(careers[i].fit);
    }
    for (const c of careers) {
      expect(c.fit).toBeGreaterThanOrEqual(0);
      expect(c.fit).toBeLessThanOrEqual(100);
      expect(typeof c.why).toBe('string');
      expect(c.why.length).toBeGreaterThan(0);
    }
  });
});

describe('scoreAssessment (top-level engine)', () => {
  it('wires riasec + aptitude + holland + streams + careers + flags together', () => {
    const answers: AnswerMap = {
      r1: 5, r2: 5, r3: 5, r4: 1,
      ap1: 'a', ap2: 'a', ap3: 'a',
    };
    const profile = scoreAssessment(answers);
    expect(profile.riasec.R).toBe(100);
    expect(profile.hollandCode).toBe('RIA');
    expect(profile.streams).toHaveLength(STREAM_KEYS.length);
    expect(profile.careers).toHaveLength(4);
    expect(Array.isArray(profile.flags)).toBe(true);
  });

  it('flags straight-lining when every interest item has the same answer', () => {
    // All 24 interest items answered "4".
    const answers: AnswerMap = {};
    for (const id of ['r1', 'r2', 'r3', 'r4', 'i1', 'i2', 'i3', 'i4', 'a1', 'a2', 'a3', 'a4',
      's1', 's2', 's3', 's4', 'e1', 'e2', 'e3', 'e4', 'c1', 'c2', 'c3', 'c4']) {
      answers[id] = 4;
    }
    const flags = scoreAssessment(answers).flags;
    expect(flags.some((f) => f.toLowerCase().includes('straight-lining'))).toBe(true);
  });
});
