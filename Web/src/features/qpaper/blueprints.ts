import type {
  PaperItem,
  PaperSection,
  Question,
  SeedBlueprint,
} from '@/types/qpaper';

/**
 * Seed blueprints shipped as local constants so the feature works on day one
 * (no backend writes needed). Plus the pure client-side auto-fill that turns a
 * blueprint + a candidate pool into ordered paper sections.
 */

export const SEED_BLUEPRINTS: SeedBlueprint[] = [
  {
    id: 'seed-cbse-x-80',
    name: 'CBSE Class X — 80 marks (Standard)',
    board: 'CBSE',
    totalMarks: 80,
    durationMins: 180,
    sections: [
      { label: 'Section A', instruction: 'All questions are compulsory. Each carries 1 mark.', questionType: 'mcq', marksEach: 1, count: 20 },
      { label: 'Section B', instruction: 'Very short answer questions. 2 marks each.', questionType: 'vsa', marksEach: 2, count: 6 },
      { label: 'Section C', instruction: 'Short answer questions. 3 marks each.', questionType: 'sa', marksEach: 3, count: 7 },
      { label: 'Section D', instruction: 'Long answer questions. 5 marks each.', questionType: 'la', marksEach: 5, count: 3 },
      { label: 'Section E', instruction: 'Case-based / source-based questions. 4 marks each.', questionType: 'case', marksEach: 4, count: 3 },
    ],
    bloomTargets: { remember: 20, understand: 30, apply: 30, analyse: 20 },
    difficultyTargets: { easy: 40, medium: 40, hard: 20 },
  },
  {
    id: 'seed-unit-40',
    name: 'Unit Test — 40 marks',
    board: 'CBSE',
    totalMarks: 40,
    durationMins: 90,
    sections: [
      { label: 'Section A', instruction: 'Objective questions. 1 mark each.', questionType: 'mcq', marksEach: 1, count: 10 },
      { label: 'Section B', instruction: 'Short answer questions. 3 marks each.', questionType: 'sa', marksEach: 3, count: 6 },
      { label: 'Section C', instruction: 'Long answer questions. 4 marks each.', questionType: 'la', marksEach: 4, count: 3 },
    ],
    difficultyTargets: { easy: 50, medium: 35, hard: 15 },
  },
  {
    id: 'seed-mcq-20',
    name: 'MCQ Quick Test — 20 marks',
    board: 'CBSE',
    totalMarks: 20,
    durationMins: 40,
    sections: [
      { label: 'Section A', instruction: 'Choose the correct option. 1 mark each.', questionType: 'mcq', marksEach: 1, count: 20 },
    ],
  },
];

export function findSeedBlueprint(id: string): SeedBlueprint | undefined {
  return SEED_BLUEPRINTS.find((b) => b.id === id);
}

/** Fisher–Yates shuffle (returns a new array). */
function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function questionToItem(q: Question): PaperItem {
  return {
    questionId: q.id,
    stem: q.stem,
    type: q.type,
    marks: q.marks,
    options: q.options,
    correct: q.correct,
    answer: q.answer,
    solution: q.solution,
  };
}

export interface AutoFillResult {
  sections: PaperSection[];
  /** Per blueprint-section, how many slots could be filled vs. wanted. */
  gaps: { label: string; filled: number; wanted: number }[];
}

/**
 * Auto-fill a paper from a blueprint using a candidate pool (already filtered to
 * subject/grade by the caller). For each blueprint section, pick random
 * `approved` questions matching the section's type + marks, with NO repeats
 * across the whole paper. Pure & deterministic-free (uses Math.random) so
 * "Regenerate" reshuffles.
 */
export function autoFillFromBlueprint(
  blueprint: { sections: { label: string; instruction?: string; questionType: string; marksEach: number; count: number }[] },
  pool: Question[],
): AutoFillResult {
  const used = new Set<string>();
  const sections: PaperSection[] = [];
  const gaps: { label: string; filled: number; wanted: number }[] = [];

  for (const bs of blueprint.sections) {
    const candidates = shuffle(
      pool.filter(
        (q) =>
          !used.has(q.id) &&
          q.type === bs.questionType &&
          q.marks === bs.marksEach &&
          (q.status === 'approved' || q.status === undefined),
      ),
    );
    const picked = candidates.slice(0, bs.count);
    picked.forEach((q) => used.add(q.id));
    sections.push({
      label: bs.label,
      instruction: bs.instruction,
      items: picked.map(questionToItem),
    });
    gaps.push({ label: bs.label, filled: picked.length, wanted: bs.count });
  }

  return { sections, gaps };
}

/** Sum of marks across all section items. */
export function paperMarksTotal(sections: PaperSection[]): number {
  return sections.reduce((sum, s) => sum + s.items.reduce((a, it) => a + (it.marks || 0), 0), 0);
}
