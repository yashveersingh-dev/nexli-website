// Solutions-by-school-type pages under /solutions/<slug>.
// Grounded in NEXLI_FACTS.md: configurable data-driven roles, board-ready report cards,
// HPC, compliance, hostel/transport. No invented board-specific features.

export interface SolutionFaq {
  q: string;
  a: string;
}
export interface SolutionPage {
  slug: string;
  nav: string;
  icon: string;
  title: string;
  tagline: string;
  seoTitle: string;
  seoDescription: string;
  summary: string;
  intro: string[];
  /** What matters most for this school type (all factual) */
  points: { title: string; desc: string }[];
  /** Module slugs most relevant to this school type */
  modules: string[];
  /** Knowledge-base category slugs to explore */
  kb: string[];
  faqs: SolutionFaq[];
}

export const SOLUTION_PAGES: SolutionPage[] = [
  {
    slug: "cbse",
    nav: "CBSE Schools",
    icon: "academics",
    title: "Nexli for CBSE schools",
    tagline: "Report cards, examinations and statutory reporting built around the way CBSE schools actually run.",
    seoTitle: "School ERP for CBSE Schools",
    seoDescription:
      "Nexli supports CBSE schools with 9-point report cards, the NEP Holistic Progress Card, CBSE LOC export, UDISE+ reporting and DPDP/POCSO compliance, all in one platform.",
    summary: "9-point cards, LOC export and NEP HPC for CBSE schools.",
    intro: [
      "CBSE schools carry a specific set of obligations: the 9-point grading format, the List of Candidates for board classes, UDISE+ returns and the NEP 2020 progression. Nexli is built with these in mind rather than adapted to them after the fact.",
      "Everything from admissions to the report card uses the formats a CBSE school expects, so the system fits your year rather than fighting it.",
    ],
    points: [
      { title: "CBSE 9-point report cards", desc: "The CBSE 9-point format out of the box, with co-scholastic fields and print-ready output." },
      { title: "NEP 2020 Holistic Progress Card", desc: "A full HPC implementation across cognitive, social-emotional, physical, arts, vocational and life-skills domains." },
      { title: "CBSE LOC export", desc: "Export the List of Candidates for Class 10 and 12 board exams in the required format." },
      { title: "UDISE+ reporting", desc: "UDISE+ annual data fields, pre-populated from the records you already keep." },
    ],
    modules: ["report-cards", "academics", "compliance", "admissions"],
    kb: ["13-school-types", "03-academics", "07-compliance"],
    faqs: [
      { q: "Does Nexli produce CBSE 9-point report cards?", a: "Yes. The CBSE 9-point grading format is built in, alongside co-scholastic fields, ranks and print-ready output." },
      { q: "Can we export the CBSE LOC?", a: "Yes. The List of Candidates exports in the format required for Class 10 and 12 board examinations." },
    ],
  },
  {
    slug: "icse",
    nav: "ICSE / CISCE",
    icon: "book",
    title: "Nexli for ICSE & CISCE schools",
    tagline: "Configurable grading and assessment that adapts to the CISCE framework, without forcing a CBSE mould.",
    seoTitle: "School ERP for ICSE / CISCE Schools",
    seoDescription:
      "Nexli adapts to ICSE/CISCE schools with configurable grading systems, flexible assessment, full academics and examinations, and DPDP/POCSO compliance built in.",
    summary: "Configurable grading and assessment for ICSE/CISCE schools.",
    intro: [
      "ICSE and CISCE schools assess differently, and a system that assumes CBSE everywhere gets in the way. Nexli's grading is configurable, so the marksheet and report card reflect your board, not someone else's.",
      "The academic and examination engine is the same depth either way (timetables, gradebooks, the full exam cycle), with the grading layer set to suit you.",
    ],
    points: [
      { title: "Configurable grading", desc: "Custom grading systems (A/B/C/D, A1/A2/B1/B2 and more) instead of a fixed CBSE scale." },
      { title: "Full examination cycle", desc: "Exam schedules, invigilation, admit cards, tabulation and result entry." },
      { title: "Curriculum & lesson plans", desc: "Lesson-plan templates with curriculum-coverage tracking and HOD review." },
      { title: "Compliance built in", desc: "DPDP consent, POCSO safeguarding and the compliance calendar apply regardless of board." },
    ],
    modules: ["report-cards", "academics", "compliance", "communication"],
    kb: ["13-school-types", "03-academics"],
    faqs: [
      { q: "Can Nexli match our ICSE grading?", a: "Yes. Grading systems are configurable, so report cards and marksheets use your board's scheme rather than a fixed CBSE format." },
      { q: "Is the examination module board-specific?", a: "The examination cycle (schedules, admit cards, tabulation and results) works across boards, with grading configured to suit ICSE/CISCE." },
    ],
  },
  {
    slug: "state-board",
    nav: "State Board",
    icon: "globe",
    title: "Nexli for State Board schools",
    tagline: "RTE, regional requirements and affordable operations, handled with the same depth as any metro school.",
    seoTitle: "School ERP for State Board Schools",
    seoDescription:
      "Nexli supports State Board schools with RTE 25% quota tracking, configurable grading, fee management with concessions, and full DPDP/POCSO compliance.",
    summary: "RTE quota, configurable grading and affordable operations.",
    intro: [
      "State Board schools often carry the heaviest RTE and reporting load on the tightest budgets. Nexli gives them the same operational depth as any large private school, with the RTE pipeline and concessions built in.",
      "Grading and fee structures are configurable, so the system fits your state's expectations and your families' realities.",
    ],
    points: [
      { title: "RTE 25% quota", desc: "A separate EWS pipeline with quota monitoring and RTE reimbursement claim tracking." },
      { title: "Configurable grading", desc: "Set grading to match your state board's marksheet and assessment pattern." },
      { title: "Fees & concessions", desc: "Flexible fee structures with need-based concession approvals and clear ledgers." },
      { title: "Compliance & PM POSHAN", desc: "Compliance calendar, UDISE+ reporting and canteen records that support PM POSHAN headcounts." },
    ],
    modules: ["admissions", "fees", "compliance", "report-cards"],
    kb: ["13-school-types", "07-compliance", "05-finance"],
    faqs: [
      { q: "Does Nexli handle the RTE 25% quota?", a: "Yes. EWS applications run through a separate pipeline with quota monitoring, and RTE reimbursement claims are tracked separately." },
      { q: "Is Nexli affordable for a State Board school?", a: "Pricing is by school size, with every feature included on every plan, so a smaller school gets the full platform. Contact us for a quote." },
    ],
  },
  {
    slug: "boarding",
    nav: "Boarding Schools",
    icon: "hostel",
    title: "Nexli for boarding schools",
    tagline: "Hostel, roll-call, welfare and weekend leave: the residential day fully accounted for.",
    seoTitle: "School ERP for Boarding Schools",
    seoDescription:
      "Nexli supports boarding schools with hostel allocation, morning and night roll-call, exeat (weekend leave), medical and counselling welfare records, and transport.",
    summary: "Hostel, roll-call, exeat and welfare for residential schools.",
    intro: [
      "A boarding school runs around the clock, and accountability for every child is the first duty. Nexli's hostel module covers allocation, roll-call and leave, connected to the welfare records that keep boarders safe.",
      "Because hostel, medical, counselling and transport share one system, a warden, a nurse and a parent can each see what they need to.",
    ],
    points: [
      { title: "Hostel allocation & roll-call", desc: "Block and room allocation with morning and night roll-call recorded daily." },
      { title: "Exeat / weekend leave", desc: "Track when boarders leave and return, under approval." },
      { title: "Welfare records", desc: "Medical visits, health flags and confidential counselling for boarders, restricted to authorised roles." },
      { title: "Transport & communication", desc: "Routes and GPS for day scholars and the channels to keep boarding parents informed." },
    ],
    modules: ["hostel", "medical-safety", "transport", "communication"],
    kb: ["10-safety", "13-school-types"],
    faqs: [
      { q: "Does Nexli record roll-call for hostels?", a: "Yes. Both morning and night roll-call are recorded so the hostel always knows who is present." },
      { q: "Are boarders' welfare records protected?", a: "Yes. Medical and counselling records are restricted to authorised roles, with the most sensitive data encrypted." },
    ],
  },
  {
    slug: "international",
    nav: "International Schools",
    icon: "globe",
    title: "Nexli for international schools",
    tagline: "Configurable structure for multi-board, multi-stream schools, without losing India-readiness.",
    seoTitle: "School ERP for International Schools in India",
    seoDescription:
      "Nexli's data-driven roles, configurable grading and 118+ role permission model suit international schools, while keeping DPDP, POCSO and Indian compliance built in.",
    summary: "Configurable grading and roles for multi-board schools.",
    intro: [
      "International schools in India sit between two worlds: globally-minded assessment and Indian regulatory reality. Nexli is configurable enough for the first and built for the second.",
      "Because even the role system is data-driven, you can model the structure your school actually uses, while DPDP, POCSO and RTE remain handled underneath.",
    ],
    points: [
      { title: "Configurable grading", desc: "Custom grading systems and assessment patterns to match your curriculum's framework." },
      { title: "Data-driven roles", desc: "118+ configurable roles with a fine-grained permission matrix, so your org chart maps cleanly onto the system." },
      { title: "Holistic assessment", desc: "Multi-domain holistic progress reporting alongside academic grades." },
      { title: "India-ready compliance", desc: "DPDP consent, POCSO safeguarding and Indian statutory reporting stay built in." },
    ],
    modules: ["academics", "report-cards", "compliance", "communication"],
    kb: ["13-school-types", "03-academics"],
    faqs: [
      { q: "Can Nexli model our school's structure?", a: "Yes. Roles are data-driven and configurable (118+ roles with a permission matrix), so your structure maps onto the system without code changes." },
      { q: "Does an international school still get Indian compliance?", a: "Yes. DPDP, POCSO and Indian statutory reporting are built in regardless of curriculum, so you stay India-ready." },
    ],
  },
];

export const SOLUTION_BY_SLUG = Object.fromEntries(SOLUTION_PAGES.map((s) => [s.slug, s]));
