import type {
  AssessmentItem,
  LikertScale,
  RiasecCode,
  StreamKey,
  AptitudeKey,
  CareerClusterKey,
} from '@/types/career';

/**
 * The transparent, self-contained Phase-1 question bank + scoring reference tables.
 *
 * Everything here is plain data — no AI, no network, fully reproducible. The bank
 * version is snapshotted onto each saved attempt so a profile can always be traced
 * back to the exact items + weights that produced it.
 */
export const BANK_VERSION = 1;

/** Shared 1–5 agreement scale for the interest (RIASEC) inventory. */
export const LIKERT_SCALE: readonly LikertScale[] = [
  { value: 1, label: 'Strongly dislike' },
  { value: 2, label: 'Dislike' },
  { value: 3, label: 'Neutral' },
  { value: 4, label: 'Like' },
  { value: 5, label: 'Strongly like' },
] as const;

/* ============================ RIASEC interest inventory ============================
 * 24 Likert items, 4 per construct. Two reverse-keyed items per construct guard
 * against straight-lining and keep the score honest.
 */
const INTEREST_ITEMS: AssessmentItem[] = [
  // Realistic (R) — hands-on, mechanical, physical
  { id: 'r1', section: 'interest', format: 'likert', riasec: 'R', prompt: 'Repair a machine, gadget or bicycle.' },
  { id: 'r2', section: 'interest', format: 'likert', riasec: 'R', prompt: 'Build or assemble something with tools.' },
  { id: 'r3', section: 'interest', format: 'likert', riasec: 'R', prompt: 'Work outdoors with plants, animals or the land.' },
  { id: 'r4', section: 'interest', format: 'likert', riasec: 'R', reverseKeyed: true, prompt: 'Avoid any work that gets your hands dirty.' },

  // Investigative (I) — analyse, research, science
  { id: 'i1', section: 'interest', format: 'likert', riasec: 'I', prompt: 'Solve a difficult maths or logic puzzle.' },
  { id: 'i2', section: 'interest', format: 'likert', riasec: 'I', prompt: 'Run a science experiment to test an idea.' },
  { id: 'i3', section: 'interest', format: 'likert', riasec: 'I', prompt: 'Read about how the human body or the universe works.' },
  { id: 'i4', section: 'interest', format: 'likert', riasec: 'I', reverseKeyed: true, prompt: 'Skip the explanation and just be told the answer.' },

  // Artistic (A) — creative, expressive
  { id: 'a1', section: 'interest', format: 'likert', riasec: 'A', prompt: 'Draw, paint or design something original.' },
  { id: 'a2', section: 'interest', format: 'likert', riasec: 'A', prompt: 'Write a story, poem or piece of music.' },
  { id: 'a3', section: 'interest', format: 'likert', riasec: 'A', prompt: 'Perform on stage — act, sing or dance.' },
  { id: 'a4', section: 'interest', format: 'likert', riasec: 'A', reverseKeyed: true, prompt: 'Stick to strict rules with no room to be creative.' },

  // Social (S) — help, teach, care
  { id: 's1', section: 'interest', format: 'likert', riasec: 'S', prompt: 'Teach or explain something to a younger student.' },
  { id: 's2', section: 'interest', format: 'likert', riasec: 'S', prompt: 'Help a friend who is upset feel better.' },
  { id: 's3', section: 'interest', format: 'likert', riasec: 'S', prompt: 'Volunteer for a community or social cause.' },
  { id: 's4', section: 'interest', format: 'likert', riasec: 'S', reverseKeyed: true, prompt: 'Work entirely alone, never with people.' },

  // Enterprising (E) — lead, persuade, business
  { id: 'e1', section: 'interest', format: 'likert', riasec: 'E', prompt: 'Lead a team or organise an event.' },
  { id: 'e2', section: 'interest', format: 'likert', riasec: 'E', prompt: 'Sell an idea or start a small business.' },
  { id: 'e3', section: 'interest', format: 'likert', riasec: 'E', prompt: 'Convince others to agree with your plan.' },
  { id: 'e4', section: 'interest', format: 'likert', riasec: 'E', reverseKeyed: true, prompt: 'Let someone else always make the decisions.' },

  // Conventional (C) — organise, data, detail
  { id: 'c1', section: 'interest', format: 'likert', riasec: 'C', prompt: 'Keep records, accounts or files neat and accurate.' },
  { id: 'c2', section: 'interest', format: 'likert', riasec: 'C', prompt: 'Follow a clear step-by-step procedure.' },
  { id: 'c3', section: 'interest', format: 'likert', riasec: 'C', prompt: 'Organise data in a spreadsheet or table.' },
  { id: 'c4', section: 'interest', format: 'likert', riasec: 'C', reverseKeyed: true, prompt: 'Leave things messy and disorganised.' },
];

/* ============================ Aptitude / MI items ============================
 * 10 A/B forced-choice items. Each choice scores toward one aptitude key, so every
 * answer always contributes a point — there are no "wrong" answers, only preferences.
 */
const APTITUDE_ITEMS: AssessmentItem[] = [
  {
    id: 'ap1', section: 'aptitude', format: 'ab', abMap: { a: 'numerical', b: 'verbal' },
    prompt: 'Which task feels easier for you?',
  },
  {
    id: 'ap2', section: 'aptitude', format: 'ab', abMap: { a: 'logical', b: 'social' },
    prompt: 'Which would you rather spend an hour on?',
  },
  {
    id: 'ap3', section: 'aptitude', format: 'ab', abMap: { a: 'spatial', b: 'verbal' },
    prompt: 'Which puzzle is more fun?',
  },
  {
    id: 'ap4', section: 'aptitude', format: 'ab', abMap: { a: 'numerical', b: 'social' },
    prompt: 'In a group project, you naturally take on…',
  },
  {
    id: 'ap5', section: 'aptitude', format: 'ab', abMap: { a: 'logical', b: 'spatial' },
    prompt: 'You understand a new idea best when it is…',
  },
  {
    id: 'ap6', section: 'aptitude', format: 'ab', abMap: { a: 'verbal', b: 'numerical' },
    prompt: 'Which subject comes more easily?',
  },
  {
    id: 'ap7', section: 'aptitude', format: 'ab', abMap: { a: 'social', b: 'logical' },
    prompt: 'A good day at work would mostly involve…',
  },
  {
    id: 'ap8', section: 'aptitude', format: 'ab', abMap: { a: 'spatial', b: 'numerical' },
    prompt: 'You would rather…',
  },
  {
    id: 'ap9', section: 'aptitude', format: 'ab', abMap: { a: 'verbal', b: 'spatial' },
    prompt: 'Which are you better at?',
  },
  {
    id: 'ap10', section: 'aptitude', format: 'ab', abMap: { a: 'logical', b: 'social' },
    prompt: 'When solving a problem you prefer to…',
  },
];

/**
 * Option labels for A/B items. Kept beside the item so the runner can render the two
 * choices; the construct each choice maps to lives in `abMap` (used by the scorer).
 */
export const AB_LABELS: Record<string, { a: string; b: string }> = {
  ap1: { a: 'Work out a calculation', b: 'Write a clear paragraph' },
  ap2: { a: 'A logic / coding challenge', b: 'Helping a friend with a problem' },
  ap3: { a: 'A 3-D shape / jigsaw puzzle', b: 'A crossword or word game' },
  ap4: { a: 'Crunching the numbers / budget', b: 'Keeping everyone working together' },
  ap5: { a: 'Explained step by step in logic', b: 'Drawn out as a diagram or picture' },
  ap6: { a: 'English / languages', b: 'Mathematics' },
  ap7: { a: 'Talking with and helping people', b: 'Analysing data and patterns' },
  ap8: { a: 'Design a poster or model', b: 'Manage a list of figures' },
  ap9: { a: 'Explaining things in words', b: 'Imagining how objects fit together' },
  ap10: { a: 'Reason it out logically alone', b: 'Discuss it with a group' },
};

/** The full ordered bank (interest first, then aptitude). */
export const ASSESSMENT_ITEMS: readonly AssessmentItem[] = [...INTEREST_ITEMS, ...APTITUDE_ITEMS];

export const RIASEC_META: Record<RiasecCode, { label: string; blurb: string }> = {
  R: { label: 'Realistic', blurb: 'Practical, hands-on, building & doing.' },
  I: { label: 'Investigative', blurb: 'Analytical, scientific, problem-solving.' },
  A: { label: 'Artistic', blurb: 'Creative, expressive, original.' },
  S: { label: 'Social', blurb: 'Helping, teaching, caring for people.' },
  E: { label: 'Enterprising', blurb: 'Leading, persuading, business-minded.' },
  C: { label: 'Conventional', blurb: 'Organised, detail-oriented, structured.' },
};

export const APTITUDE_META: Record<AptitudeKey, { label: string }> = {
  numerical: { label: 'Numerical' },
  verbal: { label: 'Verbal' },
  logical: { label: 'Logical' },
  spatial: { label: 'Spatial' },
  social: { label: 'Interpersonal' },
};

export const STREAM_META: Record<StreamKey, { label: string; subjects: string }> = {
  science: { label: 'Science', subjects: 'Physics, Chemistry, Maths / Biology' },
  commerce: { label: 'Commerce', subjects: 'Accountancy, Business Studies, Economics' },
  arts: { label: 'Arts / Humanities', subjects: 'History, Political Science, Languages, Psychology' },
  vocational: { label: 'Vocational / Skill', subjects: 'IT, Design, Trades, Applied skills' },
};

export const CLUSTER_META: Record<CareerClusterKey, { title: string }> = {
  engineering_tech: { title: 'Engineering & Technology' },
  medical_life_sciences: { title: 'Medical & Life Sciences' },
  business_finance: { title: 'Business, Finance & Management' },
  creative_media: { title: 'Creative Arts & Media' },
  social_education: { title: 'Social Work, Law & Education' },
  skilled_trades: { title: 'Skilled Trades & Applied Vocations' },
};

/* ============================ Transparent scoring reference tables ============================
 *
 * STREAM_RULES: each stream's fit is a weighted blend of RIASEC interest scores and
 * aptitude scores. Weights sum to 1.0 per stream so the fit stays on a 0–100 scale.
 * The weights ARE the rubric — they are the visible, defensible logic the report cites.
 */
export interface StreamRule {
  riasec: Partial<Record<RiasecCode, number>>;
  aptitude: Partial<Record<AptitudeKey, number>>;
}

export const STREAM_RULES: Record<StreamKey, StreamRule> = {
  // Science: investigative interest + numerical/logical aptitude.
  science: {
    riasec: { I: 0.35, R: 0.1 },
    aptitude: { numerical: 0.25, logical: 0.2, spatial: 0.1 },
  },
  // Commerce: enterprising + conventional interest + numerical aptitude.
  commerce: {
    riasec: { E: 0.3, C: 0.25 },
    aptitude: { numerical: 0.25, logical: 0.2 },
  },
  // Arts / Humanities: artistic + social interest + verbal/interpersonal aptitude.
  arts: {
    riasec: { A: 0.3, S: 0.25 },
    aptitude: { verbal: 0.3, social: 0.15 },
  },
  // Vocational: realistic interest + spatial/numerical hands-on aptitude.
  vocational: {
    riasec: { R: 0.4, C: 0.1 },
    aptitude: { spatial: 0.25, numerical: 0.1, logical: 0.15 },
  },
};

/**
 * CAREER_CLUSTERS: each cluster is matched by a small set of RIASEC + aptitude
 * signals. Fit is the mean of the listed signal scores — transparent and stable.
 */
export interface ClusterRule {
  riasec: RiasecCode[];
  aptitude: AptitudeKey[];
  /** Streams this cluster typically sits under (for the "why" sentence). */
  streams: StreamKey[];
}

export const CAREER_CLUSTERS: Record<CareerClusterKey, ClusterRule> = {
  engineering_tech: { riasec: ['I', 'R'], aptitude: ['numerical', 'logical', 'spatial'], streams: ['science', 'vocational'] },
  medical_life_sciences: { riasec: ['I', 'S'], aptitude: ['numerical', 'logical'], streams: ['science'] },
  business_finance: { riasec: ['E', 'C'], aptitude: ['numerical', 'logical'], streams: ['commerce'] },
  creative_media: { riasec: ['A', 'E'], aptitude: ['spatial', 'verbal'], streams: ['arts', 'vocational'] },
  social_education: { riasec: ['S', 'A'], aptitude: ['verbal', 'social'], streams: ['arts'] },
  skilled_trades: { riasec: ['R', 'C'], aptitude: ['spatial', 'numerical'], streams: ['vocational'] },
};

export const TOTAL_ITEMS = ASSESSMENT_ITEMS.length;
