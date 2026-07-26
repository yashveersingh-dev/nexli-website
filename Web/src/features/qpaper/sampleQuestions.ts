import type { Question } from '@/types/qpaper';
import type { TenantRecord } from '@/types/models';

/**
 * ~40 realistic CBSE-flavoured sample questions across Science, Mathematics, and
 * Social Science (Class IX–X), spanning every question type and the full tag set.
 * Used by the "Load sample questions" button to populate a tenant bank with one
 * click — entirely offline, no external service. Ids are deterministic
 * (`sample-*`) so re-loading overwrites rather than duplicating.
 */

/** Sample content omits tenant/audit fields — those are stamped at write time. */
export type SampleData = Omit<Question, keyof TenantRecord>;
export interface SampleQuestion {
  id: string;
  data: SampleData;
}

/** Compact builder so the list below stays readable. */
function q(
  id: string,
  subject: string,
  grade: string,
  data: Omit<SampleData, 'subjectName' | 'gradeNames' | 'status' | 'language' | 'boards'> &
    Partial<Pick<SampleData, 'status' | 'language' | 'boards'>>,
): SampleQuestion {
  return {
    id,
    data: {
      subjectName: subject,
      gradeNames: [grade],
      boards: data.boards ?? ['CBSE'],
      language: data.language ?? 'en',
      status: data.status ?? 'approved',
      ...data,
    },
  };
}

const mcq = (a: string, b: string, c: string, d: string) => [
  { key: 'A', text: a },
  { key: 'B', text: b },
  { key: 'C', text: c },
  { key: 'D', text: d },
];

export const SAMPLE_QUESTIONS: SampleQuestion[] = [
  /* ---------------- Science · Class X ---------------- */
  q('sample-sci-001', 'Science', 'Class 10', {
    type: 'mcq',
    stem: 'Which of the following is a combination reaction?',
    options: mcq('2H₂ + O₂ → 2H₂O', 'CaCO₃ → CaO + CO₂', 'Zn + CuSO₄ → ZnSO₄ + Cu', 'AgNO₃ + NaCl → AgCl + NaNO₃'),
    correct: ['A'],
    solution: 'A combination reaction is one in which two or more reactants combine to form a single product.',
    chapter: 'Chemical Reactions and Equations', topic: 'Types of reactions',
    bloom: 'understand', difficulty: 'easy', marks: 1, competency: false,
  }),
  q('sample-sci-002', 'Science', 'Class 10', {
    type: 'mcq',
    stem: 'The pH of a neutral solution at 25°C is:',
    options: mcq('0', '7', '14', '1'),
    correct: ['B'],
    chapter: 'Acids, Bases and Salts', topic: 'pH scale',
    bloom: 'remember', difficulty: 'easy', marks: 1,
  }),
  q('sample-sci-003', 'Science', 'Class 10', {
    type: 'assertion_reason',
    stem: 'Assertion (A): Iron articles are galvanised to prevent rusting.\nReason (R): Zinc has a lower reduction potential than iron and so corrodes preferentially.',
    options: mcq(
      'Both A and R are true and R is the correct explanation of A',
      'Both A and R are true but R is NOT the correct explanation of A',
      'A is true but R is false',
      'A is false but R is true',
    ),
    correct: ['A'],
    chapter: 'Metals and Non-metals', topic: 'Corrosion',
    bloom: 'analyse', difficulty: 'medium', marks: 1, competency: true,
  }),
  q('sample-sci-004', 'Science', 'Class 10', {
    type: 'true_false',
    stem: 'Chlorophyll is required for photosynthesis to occur.',
    correct: ['True'], answer: 'True',
    chapter: 'Life Processes', topic: 'Nutrition',
    bloom: 'remember', difficulty: 'easy', marks: 1,
  }),
  q('sample-sci-005', 'Science', 'Class 10', {
    type: 'vsa',
    stem: 'State Ohm\'s law.',
    answer: 'At constant temperature, the current through a conductor is directly proportional to the potential difference across its ends: V = IR.',
    chapter: 'Electricity', topic: 'Ohm\'s law',
    bloom: 'remember', difficulty: 'easy', marks: 2,
  }),
  q('sample-sci-006', 'Science', 'Class 10', {
    type: 'vsa',
    stem: 'Why is the colour of copper sulphate solution blue?',
    answer: 'Because of the presence of hydrated Cu²⁺ ions, which absorb light in the red region and transmit blue.',
    chapter: 'Chemical Reactions and Equations', topic: 'Hydrated salts',
    bloom: 'understand', difficulty: 'medium', marks: 2,
  }),
  q('sample-sci-007', 'Science', 'Class 10', {
    type: 'sa',
    stem: 'Distinguish between an electric cell and a battery. State one use of each.',
    answer: 'A cell is a single unit that converts chemical energy to electrical energy; a battery is a combination of two or more cells. Cell: torch; Battery: inverter.',
    markingScheme: '1 mark for difference, 1 mark each for the two uses.',
    chapter: 'Electricity', topic: 'Cells and batteries',
    bloom: 'understand', difficulty: 'medium', marks: 3,
  }),
  q('sample-sci-008', 'Science', 'Class 10', {
    type: 'numerical',
    stem: 'A resistor of 10 Ω is connected across a 5 V battery. Calculate the current flowing through it.',
    answer: 'I = V/R = 5/10 = 0.5 A',
    solution: 'Using Ohm\'s law, I = V/R = 5 V ÷ 10 Ω = 0.5 A.',
    chapter: 'Electricity', topic: 'Ohm\'s law',
    bloom: 'apply', difficulty: 'easy', marks: 2,
  }),
  q('sample-sci-009', 'Science', 'Class 10', {
    type: 'la',
    stem: 'Explain the process of double circulation in humans with the help of a labelled diagram. Why is it necessary?',
    answer: 'Blood passes through the heart twice per cycle: pulmonary circulation (heart→lungs→heart) and systemic circulation (heart→body→heart). It keeps oxygenated and deoxygenated blood separate, ensuring efficient oxygen supply for warm-blooded animals.',
    markingScheme: '2 marks for explanation, 2 marks for diagram, 1 mark for necessity.',
    chapter: 'Life Processes', topic: 'Transportation',
    bloom: 'understand', difficulty: 'hard', marks: 5, competency: false,
  }),
  q('sample-sci-010', 'Science', 'Class 10', {
    type: 'case',
    stem: 'Read the passage and answer:\n"A student set up a circuit with a 2 V cell, an ammeter, and three resistors of 1 Ω, 2 Ω and 3 Ω connected in series."\n(a) What is the total resistance?\n(b) What current does the ammeter read?\n(c) Across which resistor is the potential difference greatest?',
    answer: '(a) 6 Ω  (b) I = 2/6 = 0.33 A  (c) the 3 Ω resistor (largest R in series).',
    solution: 'Series resistances add: 1+2+3 = 6 Ω. I = V/R = 2/6 ≈ 0.33 A. In series the same current flows, so V = IR is greatest across the largest resistance.',
    chapter: 'Electricity', topic: 'Series circuits',
    bloom: 'apply', difficulty: 'hard', marks: 4, competency: true,
  }),

  /* ---------------- Mathematics · Class X ---------------- */
  q('sample-mat-001', 'Mathematics', 'Class 10', {
    type: 'mcq',
    stem: 'The HCF of 12 and 18 is:',
    options: mcq('2', '6', '36', '3'),
    correct: ['B'],
    chapter: 'Real Numbers', topic: 'HCF and LCM',
    bloom: 'apply', difficulty: 'easy', marks: 1,
  }),
  q('sample-mat-002', 'Mathematics', 'Class 10', {
    type: 'mcq',
    stem: 'The roots of the quadratic equation x² − 5x + 6 = 0 are:',
    options: mcq('2 and 3', '−2 and −3', '1 and 6', '−1 and −6'),
    correct: ['A'],
    solution: 'x² − 5x + 6 = (x−2)(x−3) = 0 ⟹ x = 2 or x = 3.',
    chapter: 'Quadratic Equations', topic: 'Factorisation',
    bloom: 'apply', difficulty: 'easy', marks: 1,
  }),
  q('sample-mat-003', 'Mathematics', 'Class 10', {
    type: 'mcq_multi',
    stem: 'Which of the following are irrational numbers? (Select all that apply.)',
    options: mcq('√2', '22/7', 'π', '0.75'),
    correct: ['A', 'C'],
    solution: '√2 and π are non-terminating, non-repeating; 22/7 and 0.75 are rational.',
    chapter: 'Real Numbers', topic: 'Irrational numbers',
    bloom: 'understand', difficulty: 'medium', marks: 1, competency: true,
  }),
  q('sample-mat-004', 'Mathematics', 'Class 10', {
    type: 'fill_blank',
    stem: 'The sum of the first n natural numbers is given by the formula ________.',
    answer: 'n(n + 1)/2',
    chapter: 'Arithmetic Progressions', topic: 'Sum of an AP',
    bloom: 'remember', difficulty: 'easy', marks: 1,
  }),
  q('sample-mat-005', 'Mathematics', 'Class 10', {
    type: 'vsa',
    stem: 'Find the discriminant of 2x² − 4x + 3 = 0 and state the nature of its roots.',
    answer: 'D = b² − 4ac = 16 − 24 = −8 < 0, so the roots are not real (imaginary).',
    chapter: 'Quadratic Equations', topic: 'Discriminant',
    bloom: 'apply', difficulty: 'medium', marks: 2,
  }),
  q('sample-mat-006', 'Mathematics', 'Class 10', {
    type: 'sa',
    stem: 'Prove that 3 + 2√5 is irrational, given that √5 is irrational.',
    answer: 'Assume 3 + 2√5 = p/q (rational). Then √5 = (p/q − 3)/2, which would be rational — a contradiction. Hence 3 + 2√5 is irrational.',
    markingScheme: '1 mark for assumption, 2 marks for the contradiction.',
    chapter: 'Real Numbers', topic: 'Proof of irrationality',
    bloom: 'analyse', difficulty: 'hard', marks: 3, competency: true,
  }),
  q('sample-mat-007', 'Mathematics', 'Class 10', {
    type: 'sa',
    stem: 'Find the 10th term of the AP: 2, 7, 12, 17, …',
    answer: 'a = 2, d = 5. aₙ = a + (n−1)d = 2 + 9×5 = 47.',
    chapter: 'Arithmetic Progressions', topic: 'nth term',
    bloom: 'apply', difficulty: 'easy', marks: 3,
  }),
  q('sample-mat-008', 'Mathematics', 'Class 10', {
    type: 'la',
    stem: 'A train travels 360 km at a uniform speed. If the speed had been 5 km/h more, it would have taken 1 hour less. Find the speed of the train.',
    answer: 'Let speed = x. 360/x − 360/(x+5) = 1 ⟹ x² + 5x − 1800 = 0 ⟹ x = 40 km/h.',
    solution: '360/x − 360/(x+5) = 1. Multiply: 360(x+5) − 360x = x(x+5) ⟹ 1800 = x² + 5x ⟹ x² + 5x − 1800 = 0 ⟹ (x−40)(x+45)=0 ⟹ x = 40 km/h.',
    markingScheme: '2 marks for forming the equation, 2 marks for solving, 1 mark for the answer.',
    chapter: 'Quadratic Equations', topic: 'Word problems',
    bloom: 'apply', difficulty: 'hard', marks: 5,
  }),
  q('sample-mat-009', 'Mathematics', 'Class 10', {
    type: 'case',
    stem: 'A ladder 5 m long leans against a wall and reaches a height of 4 m.\n(a) How far is the foot of the ladder from the wall?\n(b) Which theorem did you use?',
    answer: '(a) √(5² − 4²) = √9 = 3 m.  (b) Pythagoras theorem.',
    solution: 'The ladder, wall and ground form a right triangle. base = √(hyp² − height²) = √(25−16) = 3 m.',
    chapter: 'Triangles', topic: 'Pythagoras theorem',
    bloom: 'apply', difficulty: 'medium', marks: 4, competency: true,
  }),
  q('sample-mat-010', 'Mathematics', 'Class 10', {
    type: 'numerical',
    stem: 'Evaluate: sin 30° + cos 60°.',
    answer: '1/2 + 1/2 = 1',
    chapter: 'Introduction to Trigonometry', topic: 'Standard angles',
    bloom: 'remember', difficulty: 'easy', marks: 2,
  }),
  q('sample-mat-011', 'Mathematics', 'Class 10', {
    type: 'match',
    stem: 'Match the trigonometric ratio with its value (standard angle):\nColumn A: (i) sin 0°  (ii) cos 0°  (iii) tan 45°  (iv) sin 90°\nColumn B: (p) 1  (q) 0  (r) 1  (s) 1',
    answer: '(i)→0, (ii)→1, (iii)→1, (iv)→1',
    chapter: 'Introduction to Trigonometry', topic: 'Standard angles',
    bloom: 'remember', difficulty: 'easy', marks: 2,
  }),

  /* ---------------- Social Science · Class X ---------------- */
  q('sample-sst-001', 'Social Science', 'Class 10', {
    type: 'mcq',
    stem: 'Who wrote the book "Hind Swaraj" (1909)?',
    options: mcq('Jawaharlal Nehru', 'Mahatma Gandhi', 'B. R. Ambedkar', 'Subhas Chandra Bose'),
    correct: ['B'],
    chapter: 'Nationalism in India', topic: 'Gandhian ideas',
    bloom: 'remember', difficulty: 'easy', marks: 1,
  }),
  q('sample-sst-002', 'Social Science', 'Class 10', {
    type: 'mcq',
    stem: 'The Tropic of Cancer does NOT pass through which of these Indian states?',
    options: mcq('Gujarat', 'Madhya Pradesh', 'Rajasthan', 'Odisha'),
    correct: ['D'],
    chapter: 'Resources and Development', topic: 'India — location',
    bloom: 'understand', difficulty: 'medium', marks: 1,
  }),
  q('sample-sst-003', 'Social Science', 'Class 10', {
    type: 'true_false',
    stem: 'The Reserve Bank of India issues all currency notes in India except the one-rupee note.',
    correct: ['True'], answer: 'True (the one-rupee note is issued by the Government of India).',
    chapter: 'Money and Credit', topic: 'Currency',
    bloom: 'remember', difficulty: 'medium', marks: 1,
  }),
  q('sample-sst-004', 'Social Science', 'Class 10', {
    type: 'vsa',
    stem: 'What is meant by "sustainable development"?',
    answer: 'Development that meets the needs of the present without compromising the ability of future generations to meet their own needs.',
    chapter: 'Resources and Development', topic: 'Sustainability',
    bloom: 'understand', difficulty: 'easy', marks: 2, competency: true,
  }),
  q('sample-sst-005', 'Social Science', 'Class 10', {
    type: 'sa',
    stem: 'Explain any three features of federalism.',
    answer: '(1) Two or more levels of government. (2) Each tier has its own jurisdiction, specified in the constitution. (3) Powers and finances are divided; courts settle disputes.',
    markingScheme: '1 mark for each feature.',
    chapter: 'Federalism', topic: 'Features',
    bloom: 'understand', difficulty: 'medium', marks: 3,
  }),
  q('sample-sst-006', 'Social Science', 'Class 10', {
    type: 'la',
    stem: 'Describe the major causes of the rise of nationalism in Europe in the nineteenth century.',
    answer: 'The French Revolution and the idea of the nation-state, the spread of liberalism, the role of culture (language, art, music), economic integration (Zollverein), and the revolutions of 1830 and 1848.',
    markingScheme: '1 mark each for any five well-explained causes.',
    chapter: 'The Rise of Nationalism in Europe', topic: 'Causes',
    bloom: 'analyse', difficulty: 'hard', marks: 5,
  }),
  q('sample-sst-007', 'Social Science', 'Class 10', {
    type: 'case',
    stem: 'Read: "Power sharing is the very spirit of democracy."\n(a) Give one prudential reason for power sharing.\n(b) Give one moral reason for power sharing.',
    answer: '(a) Prudential: it reduces conflict between social groups and ensures stability. (b) Moral: power sharing is the very spirit of democracy — those affected by power should have a say.',
    chapter: 'Power Sharing', topic: 'Reasons',
    bloom: 'evaluate', difficulty: 'medium', marks: 4, competency: true,
  }),

  /* ---------------- Science · Class IX ---------------- */
  q('sample-sci9-001', 'Science', 'Class 9', {
    type: 'mcq',
    stem: 'The SI unit of force is the:',
    options: mcq('joule', 'newton', 'watt', 'pascal'),
    correct: ['B'],
    chapter: 'Force and Laws of Motion', topic: 'SI units',
    bloom: 'remember', difficulty: 'easy', marks: 1,
  }),
  q('sample-sci9-002', 'Science', 'Class 9', {
    type: 'mcq',
    stem: 'Which of the following is NOT a state of matter studied in Class IX?',
    options: mcq('Solid', 'Liquid', 'Gas', 'Mixture'),
    correct: ['D'],
    chapter: 'Matter in Our Surroundings', topic: 'States of matter',
    bloom: 'understand', difficulty: 'easy', marks: 1,
  }),
  q('sample-sci9-003', 'Science', 'Class 9', {
    type: 'fill_blank',
    stem: 'The process of conversion of a solid directly into vapour is called ________.',
    answer: 'sublimation',
    chapter: 'Matter in Our Surroundings', topic: 'Change of state',
    bloom: 'remember', difficulty: 'easy', marks: 1,
  }),
  q('sample-sci9-004', 'Science', 'Class 9', {
    type: 'vsa',
    stem: 'State Newton\'s first law of motion.',
    answer: 'A body continues in its state of rest or of uniform motion in a straight line unless acted upon by an external unbalanced force.',
    chapter: 'Force and Laws of Motion', topic: 'Newton\'s laws',
    bloom: 'remember', difficulty: 'easy', marks: 2,
  }),
  q('sample-sci9-005', 'Science', 'Class 9', {
    type: 'numerical',
    stem: 'A body of mass 5 kg is acted upon by a force of 20 N. Find its acceleration.',
    answer: 'a = F/m = 20/5 = 4 m/s²',
    solution: 'Using Newton\'s second law, F = ma ⟹ a = F/m = 20 N ÷ 5 kg = 4 m/s².',
    chapter: 'Force and Laws of Motion', topic: 'Second law',
    bloom: 'apply', difficulty: 'easy', marks: 2,
  }),
  q('sample-sci9-006', 'Science', 'Class 9', {
    type: 'sa',
    stem: 'Differentiate between a mixture and a compound, giving one example of each.',
    answer: 'A mixture has components in any ratio with no chemical bonding (e.g. air); a compound has a fixed ratio formed by chemical bonding (e.g. water). Mixtures can be separated physically; compounds cannot.',
    markingScheme: '2 marks for differences, 1 mark for examples.',
    chapter: 'Is Matter Around Us Pure', topic: 'Mixtures and compounds',
    bloom: 'understand', difficulty: 'medium', marks: 3,
  }),

  /* ---------------- Mathematics · Class IX ---------------- */
  q('sample-mat9-001', 'Mathematics', 'Class 9', {
    type: 'mcq',
    stem: 'The value of (√3 + √2)(√3 − √2) is:',
    options: mcq('1', '5', '√6', '6'),
    correct: ['A'],
    solution: '(a+b)(a−b) = a² − b² = 3 − 2 = 1.',
    chapter: 'Number Systems', topic: 'Rationalisation',
    bloom: 'apply', difficulty: 'medium', marks: 1,
  }),
  q('sample-mat9-002', 'Mathematics', 'Class 9', {
    type: 'mcq',
    stem: 'The degree of the polynomial 4x³ − 2x² + 7 is:',
    options: mcq('1', '2', '3', '0'),
    correct: ['C'],
    chapter: 'Polynomials', topic: 'Degree',
    bloom: 'remember', difficulty: 'easy', marks: 1,
  }),
  q('sample-mat9-003', 'Mathematics', 'Class 9', {
    type: 'vsa',
    stem: 'If p(x) = x² − 3x + 2, find p(2).',
    answer: 'p(2) = 4 − 6 + 2 = 0',
    chapter: 'Polynomials', topic: 'Value of a polynomial',
    bloom: 'apply', difficulty: 'easy', marks: 2,
  }),
  q('sample-mat9-004', 'Mathematics', 'Class 9', {
    type: 'sa',
    stem: 'Factorise: x² + 9x + 18.',
    answer: '(x + 3)(x + 6)',
    solution: 'Find two numbers with product 18 and sum 9: 3 and 6. So x² + 9x + 18 = (x+3)(x+6).',
    chapter: 'Polynomials', topic: 'Factorisation',
    bloom: 'apply', difficulty: 'medium', marks: 3,
  }),
  q('sample-mat9-005', 'Mathematics', 'Class 9', {
    type: 'la',
    stem: 'Prove that the angles opposite to equal sides of an isosceles triangle are equal.',
    answer: 'Given △ABC with AB = AC. Draw the bisector AD of ∠A meeting BC at D. In △ABD and △ACD: AB = AC, ∠BAD = ∠CAD, AD common ⟹ △ABD ≅ △ACD (SAS) ⟹ ∠B = ∠C.',
    markingScheme: '1 mark figure, 2 marks construction & congruence, 2 marks conclusion.',
    chapter: 'Triangles', topic: 'Isosceles triangle theorem',
    bloom: 'analyse', difficulty: 'hard', marks: 5,
  }),
  q('sample-mat9-006', 'Mathematics', 'Class 9', {
    type: 'numerical',
    stem: 'Find the area of a triangle whose sides are 5 cm, 12 cm and 13 cm.',
    answer: '30 cm² (it is a right triangle: ½ × 5 × 12 = 30).',
    solution: 'Since 5² + 12² = 13², it is right-angled. Area = ½ × base × height = ½ × 5 × 12 = 30 cm². (Heron\'s formula gives the same.)',
    chapter: 'Heron\'s Formula', topic: 'Area of triangles',
    bloom: 'apply', difficulty: 'medium', marks: 3,
  }),

  /* ---------------- English · Class X ---------------- */
  q('sample-eng-001', 'English', 'Class 10', {
    type: 'mcq',
    stem: 'Choose the correctly punctuated sentence:',
    options: mcq(
      'Where are you going.',
      'Where are you going?',
      'where are you going?',
      'Where are you going!',
    ),
    correct: ['B'],
    chapter: 'Grammar', topic: 'Punctuation',
    bloom: 'apply', difficulty: 'easy', marks: 1,
  }),
  q('sample-eng-002', 'English', 'Class 10', {
    type: 'fill_blank',
    stem: 'Fill in the blank with the correct article: "She is ____ honest woman."',
    answer: 'an',
    chapter: 'Grammar', topic: 'Articles',
    bloom: 'apply', difficulty: 'easy', marks: 1,
  }),
  q('sample-eng-003', 'English', 'Class 10', {
    type: 'sa',
    stem: 'Write a short paragraph (40–50 words) on the importance of trees.',
    answer: 'Open response. Look for relevant content (oxygen, shade, soil, rainfall), coherence, correct grammar, and the word limit.',
    markingScheme: '1 mark content, 1 mark expression, 1 mark accuracy.',
    chapter: 'Writing Skills', topic: 'Paragraph writing',
    bloom: 'create', difficulty: 'medium', marks: 3, competency: true,
  }),
  q('sample-eng-004', 'English', 'Class 10', {
    type: 'la',
    stem: 'You are Rahul/Riya of Class X. Write a letter to the editor of a newspaper about the problem of waterlogging in your locality. (100–120 words)',
    answer: 'Open response. Expect correct letter format (sender, date, salutation, body, closing), a clear statement of the problem, and a polite request for action.',
    markingScheme: '2 marks format, 2 marks content, 1 mark expression.',
    chapter: 'Writing Skills', topic: 'Letter to the editor',
    bloom: 'create', difficulty: 'hard', marks: 5, competency: true,
  }),
];

export const SAMPLE_COUNT = SAMPLE_QUESTIONS.length;
