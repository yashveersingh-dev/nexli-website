import type {
  AnswerMap,
  AssessmentProfile,
  RiasecScores,
  RiasecCode,
  AptitudeScores,
  AptitudeKey,
  StreamFit,
  StreamKey,
  CareerMatch,
  ScoreBand,
} from '@/types/career';
import { RIASEC_CODES, APTITUDE_KEYS, STREAM_KEYS } from '@/types/career';
import {
  ASSESSMENT_ITEMS,
  STREAM_RULES,
  CAREER_CLUSTERS,
  CLUSTER_META,
  STREAM_META,
  RIASEC_META,
  APTITUDE_META,
  type ClusterRule,
} from './bank';

/**
 * The offline scoring core. Every function here is PURE and DETERMINISTIC —
 * re-running `scoreAssessment` on the same answers always returns an identical
 * profile (no randomness, no AI, no I/O). This is the part the Phase-1 plan
 * explicitly calls out as fully offline-buildable.
 */

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

function band(score: number): ScoreBand {
  if (score >= 67) return 'high';
  if (score >= 40) return 'average';
  return 'low';
}
export { band };

/* ---------- RIASEC ---------- */

/**
 * Score the six RIASEC constructs from Likert answers, on a 0–100 scale.
 * Reverse-keyed items are inverted (6 - value) so disagreement counts correctly.
 * Unanswered items are skipped, so a partial run still scores fairly.
 */
export function scoreRiasec(answers: AnswerMap): RiasecScores {
  const sum: Record<RiasecCode, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  const count: Record<RiasecCode, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };

  for (const item of ASSESSMENT_ITEMS) {
    if (item.section !== 'interest' || !item.riasec) continue;
    const raw = answers[item.id];
    if (typeof raw !== 'number') continue;
    const value = item.reverseKeyed ? 6 - raw : raw;
    sum[item.riasec] += value;
    count[item.riasec] += 1;
  }

  const out = {} as RiasecScores;
  for (const code of RIASEC_CODES) {
    // Mean on 1–5 → normalise to 0–100: (mean - 1) / 4 * 100.
    const mean = count[code] ? sum[code] / count[code] : 1;
    out[code] = round(((mean - 1) / 4) * 100);
  }
  return out;
}

/** Top-3 RIASEC letters, highest first, ties broken by canonical R-I-A-S-E-C order. */
export function hollandCode(riasec: RiasecScores): string {
  return [...RIASEC_CODES]
    .sort((a, b) => riasec[b] - riasec[a] || RIASEC_CODES.indexOf(a) - RIASEC_CODES.indexOf(b))
    .slice(0, 3)
    .join('');
}

/* ---------- Aptitude ---------- */

/**
 * Score the five aptitude keys from A/B forced-choice answers, on a 0–100 scale.
 * Each item awards one point to the chosen key; a key's score is the share of the
 * points it could have won, scaled to 100.
 */
export function scoreAptitude(answers: AnswerMap): AptitudeScores {
  const won: Record<AptitudeKey, number> = { numerical: 0, verbal: 0, logical: 0, spatial: 0, social: 0 };
  const possible: Record<AptitudeKey, number> = { numerical: 0, verbal: 0, logical: 0, spatial: 0, social: 0 };

  for (const item of ASSESSMENT_ITEMS) {
    if (item.section !== 'aptitude' || !item.abMap) continue;
    // Both keys on this item are "in play" (could have been won) once it's offered.
    possible[item.abMap.a] += 1;
    possible[item.abMap.b] += 1;
    const choice = answers[item.id];
    if (choice !== 'a' && choice !== 'b') continue;
    won[item.abMap[choice]] += 1;
  }

  const out = {} as AptitudeScores;
  for (const key of APTITUDE_KEYS) {
    out[key] = possible[key] ? round((won[key] / possible[key]) * 100) : 0;
  }
  return out;
}

/* ---------- Stream recommendation ---------- */

function streamDrivers(stream: StreamKey, riasec: RiasecScores, aptitude: AptitudeScores): string[] {
  const rule = STREAM_RULES[stream];
  const drivers: string[] = [];
  // Surface the highest-weighted contributing signals that are actually strong.
  const riasecEntries = (Object.entries(rule.riasec) as [RiasecCode, number][])
    .filter(([code]) => riasec[code] >= 50)
    .sort((a, b) => b[1] - a[1]);
  for (const [code] of riasecEntries) {
    drivers.push(`${RIASEC_META[code].label} interest (${riasec[code]})`);
  }
  const aptEntries = (Object.entries(rule.aptitude) as [AptitudeKey, number][])
    .filter(([key]) => aptitude[key] >= 50)
    .sort((a, b) => b[1] - a[1]);
  for (const [key] of aptEntries) {
    drivers.push(`${APTITUDE_META[key].label} aptitude (${aptitude[key]})`);
  }
  if (drivers.length === 0) drivers.push('Balanced profile — no single strong driver');
  return drivers;
}

/**
 * Weighted stream fit. Each stream's fit is `Σ(weight × score)` over its RIASEC and
 * aptitude weights (which sum to 1.0 per stream), giving a 0–100 fit. Deterministic
 * tie-break by canonical stream order. Returns all four, highest first.
 */
export function recommendStreams(riasec: RiasecScores, aptitude: AptitudeScores): StreamFit[] {
  const fits = STREAM_KEYS.map<StreamFit>((stream) => {
    const rule = STREAM_RULES[stream];
    let fit = 0;
    for (const [code, w] of Object.entries(rule.riasec) as [RiasecCode, number][]) {
      fit += w * riasec[code];
    }
    for (const [key, w] of Object.entries(rule.aptitude) as [AptitudeKey, number][]) {
      fit += w * aptitude[key];
    }
    return { stream, fit: round(fit), drivers: streamDrivers(stream, riasec, aptitude) };
  });
  return fits.sort((a, b) => b.fit - a.fit || STREAM_KEYS.indexOf(a.stream) - STREAM_KEYS.indexOf(b.stream));
}

/* ---------- Career-cluster matching ---------- */

function clusterFit(rule: ClusterRule, riasec: RiasecScores, aptitude: AptitudeScores): number {
  const signals = [...rule.riasec.map((c) => riasec[c]), ...rule.aptitude.map((k) => aptitude[k])];
  if (signals.length === 0) return 0;
  return round(signals.reduce((s, v) => s + v, 0) / signals.length);
}

/**
 * Rank the career clusters by mean signal strength. Returns the top 4, each with a
 * plain-language "why" naming the RIASEC + aptitude signals behind the match.
 */
export function matchCareers(riasec: RiasecScores, aptitude: AptitudeScores): CareerMatch[] {
  const matches = (Object.keys(CAREER_CLUSTERS) as (keyof typeof CAREER_CLUSTERS)[]).map<CareerMatch>((cluster) => {
    const rule = CAREER_CLUSTERS[cluster];
    const fit = clusterFit(rule, riasec, aptitude);
    const riasecWhy = rule.riasec.map((c) => RIASEC_META[c].label).join(' + ');
    const aptWhy = rule.aptitude.map((k) => APTITUDE_META[k].label).join(', ');
    const streamWhy = rule.streams.map((s) => STREAM_META[s].label).join(' / ');
    return {
      cluster,
      title: CLUSTER_META[cluster].title,
      fit,
      why: `Driven by your ${riasecWhy} interests and ${aptWhy} aptitude — typically a ${streamWhy} path.`,
    };
  });
  return matches
    .sort((a, b) => b.fit - a.fit || a.cluster.localeCompare(b.cluster))
    .slice(0, 4);
}

/* ---------- Consistency / effort checks ---------- */

/**
 * Light, transparent consistency checks. Flags are advisory only — they never
 * change the score, they just tell the counsellor to interpret with care.
 */
export function consistencyChecks(answers: AnswerMap): string[] {
  const flags: string[] = [];

  // Straight-lining: the same Likert value on (nearly) every interest item.
  const likertValues = ASSESSMENT_ITEMS.filter((i) => i.section === 'interest')
    .map((i) => answers[i.id])
    .filter((v): v is number => typeof v === 'number');
  if (likertValues.length >= 8) {
    const first = likertValues[0];
    const allSame = likertValues.every((v) => v === first);
    if (allSame) flags.push('Possible straight-lining — every interest item has the same answer.');
  }

  // Reverse-key contradiction: agreeing strongly with both a statement and its reverse.
  // (e.g. liking "help people" AND liking "work entirely alone".)
  const social = answers['s2'];
  const antiSocial = answers['s4'];
  if (typeof social === 'number' && typeof antiSocial === 'number' && social >= 4 && antiSocial >= 4) {
    flags.push('Mixed signals on working with people — worth discussing in counselling.');
  }

  return flags;
}

/* ---------- Top-level engine ---------- */

/** Compute the complete, deterministic profile from a raw answer map. */
export function scoreAssessment(answers: AnswerMap): AssessmentProfile {
  const riasec = scoreRiasec(answers);
  const aptitude = scoreAptitude(answers);
  return {
    riasec,
    hollandCode: hollandCode(riasec),
    aptitude,
    streams: recommendStreams(riasec, aptitude),
    careers: matchCareers(riasec, aptitude),
    flags: consistencyChecks(answers),
  };
}

/**
 * A rules-based (NOT AI) narrative summary, woven from the computed profile. This is
 * the honest, deterministic prose Phase 1 ships; the richer personalised AI essay is
 * a separate, blocked add-on shown behind the AILockedOverlay.
 */
export function buildTemplatedNarrative(profile: AssessmentProfile): string {
  const top = profile.streams[0];
  const alt = profile.streams[1];
  const topCareer = profile.careers[0];
  const topCode = profile.hollandCode[0] as RiasecCode;
  const lines = [
    `Your strongest interest pattern is "${profile.hollandCode}", led by ${RIASEC_META[topCode].label.toLowerCase()} interests — ${RIASEC_META[topCode].blurb.toLowerCase()}`,
    top && alt
      ? `Based on a transparent weighting of your interests and aptitudes, the ${STREAM_META[top.stream].label} stream is your closest fit (${top.fit}%), with ${STREAM_META[alt.stream].label} as a strong alternative (${alt.fit}%).`
      : top
        ? `Based on a transparent weighting of your interests and aptitudes, the ${STREAM_META[top.stream].label} stream is your closest fit (${top.fit}%).`
        : '',
    topCareer
      ? `A career cluster to explore is ${topCareer.title} (${topCareer.fit}% match). ${topCareer.why}`
      : '',
    'This is a starting point, not a verdict — discuss it with your counsellor and revisit it as your interests grow.',
  ];
  return lines.filter(Boolean).join(' ');
}
