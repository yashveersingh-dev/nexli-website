// Module / feature landing pages: the high-intent SEO pages under /platform/<slug>.
// EVERY claim here must be defensible against Web/Blog/NEXLI_FACTS.md. No invented features.
// Rendered by src/pages/platform/[module].astro and linked from the Platform nav dropdown.

export interface ModuleFeature {
  title: string;
  desc: string;
}
export interface ModuleFaq {
  q: string;
  a: string;
}
export interface ModulePage {
  slug: string;
  /** Short label for nav + cards */
  nav: string;
  /** Icon name from Icon.astro */
  icon: string;
  /** H1 / hero headline */
  title: string;
  /** Hero sub-headline */
  tagline: string;
  /** <title> + meta description */
  seoTitle: string;
  seoDescription: string;
  /** One-line summary for nav dropdown + module grid */
  summary: string;
  /** Opening paragraph(s) on the page */
  intro: string[];
  /** Capability cards, all grounded in NEXLI_FACTS.md */
  features: ModuleFeature[];
  /** "Works with": connected modules (slugs) */
  connects: string[];
  /** Knowledge-base category slug this module maps to */
  kb: string;
  faqs: ModuleFaq[];
}

export const MODULE_PAGES: ModulePage[] = [
  {
    slug: "admissions",
    nav: "Admissions",
    icon: "admissions",
    title: "Admissions, from first enquiry to enrolment",
    tagline: "A single pipeline for every applicant, so no enquiry is ever lost and every follow-up happens on time.",
    seoTitle: "School Admissions Management Software",
    seoDescription:
      "Run school admissions end to end in Nexli: enquiry, application, document verification, testing, interview, offer and enrolment, with bulk import and RTE/EWS tracking.",
    summary: "Enquiry to enrolment in one tracked pipeline.",
    intro: [
      "Most schools lose applicants not because parents change their minds, but because an enquiry slips through a WhatsApp group or an email chain. Nexli puts every applicant into one pipeline that every stakeholder can see.",
      "From the first enquiry to the day a student is enrolled, each stage is visible, each follow-up is owned, and each document is checked, so admissions becomes a process you can measure rather than a scramble you survive.",
    ],
    features: [
      { title: "Enquiry to enrolment pipeline", desc: "Inquiry → Application → Document Verification → Testing → Interview → Offer → Enrolment, with automated stage workflows." },
      { title: "Online application forms", desc: "Parents apply online; data flows straight into the applicant record, with no re-keying and no lost forms." },
      { title: "Document verification", desc: "Track which documents are submitted, pending or verified before an offer is made." },
      { title: "Bulk student import", desc: "Migrate existing students from CSV/Excel with validation, duplicate detection and error reporting." },
      { title: "RTE / EWS tracking", desc: "A separate pipeline for EWS applications with quota monitoring for the 25% reserved seats." },
      { title: "Source tracking", desc: "See which enquiry channels actually convert, so marketing spend follows results." },
    ],
    connects: ["fees", "compliance", "communication"],
    kb: "02-student-admissions",
    faqs: [
      { q: "Can parents apply online?", a: "Yes. Online application forms feed directly into the admissions pipeline, so the data is captured once and follows the applicant through every stage." },
      { q: "Does Nexli handle the RTE 25% quota?", a: "Yes. EWS applications run through a separate pipeline with quota monitoring, kept distinct from general admissions." },
      { q: "Can we import students we already have?", a: "Yes. Bulk import from CSV or Excel includes validation, duplicate detection and an error report so migrations are clean." },
    ],
  },
  {
    slug: "fees",
    nav: "Fees & Finance",
    icon: "fees",
    title: "Fee management that actually collects",
    tagline: "Schools rarely fail to collect fees because parents can't pay; they fail because collection is chaotic. Nexli makes it simple.",
    seoTitle: "School Fee Management & Collection Software",
    seoDescription:
      "Per-class fee structures, online UPI and offline receipts, concessions, automated reminders, defaulter reports, refunds and RTE reimbursement tracking, all in Nexli.",
    summary: "Fee plans, online payments, reminders and a clean ledger.",
    intro: [
      "Nexli's fee module is built around the real reason collection slips: administrative friction. Every charge, payment and concession lives in one per-student ledger, so the picture is always current.",
      "Parents pay online in seconds, receipts generate automatically, and reminders go out without anyone sending them by hand.",
    ],
    features: [
      { title: "Flexible fee structures", desc: "Per-class structures with term and installment schedules that match how your school actually bills." },
      { title: "Online & offline payments", desc: "Collect by UPI, cards and net banking, or record cash and cheque with a digital receipt you can share with parents." },
      { title: "Per-student ledger", desc: "Charges, payments, concessions and net due tracked per student, per academic year." },
      { title: "Automated reminders", desc: "Due-date and overdue reminders sent automatically by SMS and app notification." },
      { title: "Concessions & refunds", desc: "Need-based concession approvals and a formal refund request, approval and bank-transfer record." },
      { title: "Defaulter & RTE reports", desc: "Class- and section-wise pending dues, plus separate RTE reimbursement claim tracking for EWS seats." },
    ],
    connects: ["admissions", "communication", "compliance"],
    kb: "05-finance",
    faqs: [
      { q: "Which payment methods are supported?", a: "Online UPI, cards and net banking through Indian payment gateways, plus offline cash and cheque recorded with a digital receipt you can share with parents." },
      { q: "Does Nexli process the payments itself?", a: "No. Nexli integrates with Indian payment gateways as middleware and does not hold payment-processing secrets; the gateway handles the money." },
      { q: "Can we track RTE reimbursements?", a: "Yes. RTE reimbursement claims for EWS seats are tracked separately from regular fee collection." },
    ],
  },
  {
    slug: "attendance",
    nav: "Attendance",
    icon: "attendance",
    title: "Attendance that warns you early",
    tagline: "Not just a register. An early-warning system that flags the student who is quietly slipping before it becomes a problem.",
    seoTitle: "School Attendance Management Software",
    seoDescription:
      "Period-wise and daily consolidated attendance with optional biometric/RFID, 75% threshold tracking, and automatic absence alerts to parents, built into Nexli.",
    summary: "Period-wise and daily attendance with threshold alerts.",
    intro: [
      "Attendance in Nexli is recorded two ways that never conflict: period-wise by the subject teacher and daily consolidated by the class teacher.",
      "The point isn't only to mark presence; it's to surface the early signal. When a student crosses the 75% line, the system flags it, and parents are alerted the day a child is marked absent.",
    ],
    features: [
      { title: "Period-wise + daily", desc: "Subject teachers mark period-wise; class teachers confirm a daily consolidated record." },
      { title: "Optional biometric / RFID", desc: "Integrate biometric or RFID devices where you use them, or mark manually where you don't." },
      { title: "75% threshold tracking", desc: "Automatic tracking against the 75% rule, with alerts when a student falls below." },
      { title: "Parent absence alerts", desc: "Parents are notified automatically when their child is marked absent: fewer phone calls, faster awareness." },
      { title: "Attendance rankings", desc: "A dedicated attendance-ranking engine that tracks consistency, kept separate from marks." },
      { title: "Live view", desc: "Students and parents see attendance in their own portal, scoped to them only." },
    ],
    connects: ["academics", "communication", "transport"],
    kb: "04-attendance",
    faqs: [
      { q: "Is biometric attendance required?", a: "No. Biometric and RFID integration is optional. Attendance can be marked manually, and the platform does not collect biometric templates itself." },
      { q: "How are parents told about absences?", a: "When a child is marked absent, an automatic alert is sent to the parent, so they know the same day rather than weeks later." },
      { q: "Does attendance affect rankings?", a: "There is a separate attendance-ranking engine that tracks consistency. It is never mixed with marks-based rankings." },
    ],
  },
  {
    slug: "academics",
    nav: "Academics & Exams",
    icon: "academics",
    title: "Academics and examinations, end to end",
    tagline: "Timetables, lesson plans, gradebooks and the full examination cycle, connected, so marks flow to report cards without re-entry.",
    seoTitle: "Academics & Examination Management Software for Schools",
    seoDescription:
      "Constraint-based timetables, lesson plans with curriculum tracking, gradebooks, the full exam cycle with CBSE LOC export, and a question-paper generator, in Nexli.",
    summary: "Timetables, lesson plans, exams and gradebooks in one flow.",
    intro: [
      "The academic core of Nexli connects the things that are usually scattered: the timetable a substitute needs, the lesson plan a coordinator reviews, the marks a report card depends on.",
      "Because they share one data layer, marks entered once flow into the gradebook, the report card, the ranking engine and the analytics: one truth, not four versions.",
    ],
    features: [
      { title: "Constraint-based timetable", desc: "Generate timetables with no double-booking, manage substitutions, and publish a live view for students and parents." },
      { title: "Lesson plans + coverage", desc: "Weekly templates aligned to NCERT/board, a curriculum-coverage tracker, and HOD review." },
      { title: "Gradebook & marks entry", desc: "Multiple assessment types with automatic grade calculation per board rules." },
      { title: "Full examination cycle", desc: "Exam schedules, invigilation duty, admit cards, answer-script tracking, result entry, tabulation and CBSE LOC export." },
      { title: "Question-paper generator", desc: "Blueprint-driven generation with subject/chapter/difficulty tagging, answer keys and OMR support." },
      { title: "Homework & assignments", desc: "Assign work, collect digital submissions and monitor completion and load." },
    ],
    connects: ["attendance", "report-cards", "communication"],
    kb: "03-academics",
    faqs: [
      { q: "Can Nexli export CBSE LOC?", a: "Yes. The examination module exports the List of Candidates in the format required for Class 10 and 12 board exams." },
      { q: "Do marks have to be entered twice?", a: "No. Marks entered once flow into the gradebook, report cards, rankings and analytics from the same record." },
      { q: "Does the timetable handle substitutions?", a: "Yes. Substitution management is built in, and a substitute can see exactly what was being taught from the lesson plan." },
    ],
  },
  {
    slug: "report-cards",
    nav: "Report Cards",
    icon: "academics",
    title: "Report cards teachers review, not retype",
    tagline: "Auto-populated from the gradebook, formatted to your board, and built to print, including the NEP 2020 Holistic Progress Card.",
    seoTitle: "Report Card & Holistic Progress Card Software for Schools",
    seoDescription:
      "CBSE 9-point report cards, custom grading systems, competitive ranking, term trends and the NEP 2020 Holistic Progress Card (HPC), print-ready and phone-responsive in Nexli.",
    summary: "CBSE cards, custom grading and the NEP Holistic Progress Card.",
    intro: [
      "A report card should be the end of a process, not a fresh data-entry job. Nexli populates cards from the marks already in the gradebook, so teachers review and approve rather than retype.",
      "Beyond the standard CBSE 9-point format, Nexli implements the NEP 2020 Holistic Progress Card in full: multi-domain, multi-source, and visual.",
    ],
    features: [
      { title: "CBSE 9-point + custom grading", desc: "CBSE 9-point format, or custom systems (A/B/C/D, A1/A2/B1/B2) with co-scholastic fields." },
      { title: "Holistic Progress Card (NEP 2020)", desc: "Cognitive, social-emotional, physical, arts, vocational and life-skills domains, with self, peer, teacher and parent input." },
      { title: "Competitive ranking", desc: "School-, class-, batch- and section-wise ranks, normalised by percentage with tie-breaking." },
      { title: "Term-over-term trends", desc: "A trend chart that shows how a student is moving across terms, not just a single snapshot." },
      { title: "Print-ready PDF", desc: "Cards generate print-ready with school branding, and the layout is responsive on a phone." },
      { title: "Sports, activities & remarks", desc: "Co-scholastic fields for sports, activities and teacher remarks alongside academics." },
    ],
    connects: ["academics", "communication"],
    kb: "03-academics",
    faqs: [
      { q: "Does Nexli support the NEP Holistic Progress Card?", a: "Yes, in full: multiple domains, multi-source input (self, peer, teacher, parent) and a visual output, not just a compliance form." },
      { q: "Can we use our own grading system?", a: "Yes. Alongside the CBSE 9-point format you can configure custom grading such as A/B/C/D or A1/A2/B1/B2." },
      { q: "Are report cards print-ready?", a: "Yes. Cards generate as print-ready PDFs with your school branding and remain readable on a phone." },
    ],
  },
  {
    slug: "hr-payroll",
    nav: "HR & Payroll",
    icon: "hr",
    title: "HR and payroll for the whole school",
    tagline: "Staff records, attendance, leave and statutory payroll, managed with the same role-based discipline as everything else.",
    seoTitle: "School HR & Payroll Management Software",
    seoDescription:
      "Staff directory, biometric staff attendance, leave workflows, recruitment and probation tracking, plus payroll with EPF/ESI/TDS compliance, in Nexli.",
    summary: "Staff records, leave, recruitment and statutory payroll.",
    intro: [
      "A school's staff are its largest cost and its biggest asset, yet HR is often run on spreadsheets. Nexli brings staff records, attendance, leave and payroll into the same system as the rest of the school.",
      "Payroll is calculated with EPF, ESI and TDS handled, and the figures stay visible only to the roles that should see them.",
    ],
    features: [
      { title: "Staff directory", desc: "Full HR profiles with qualifications, experience, background verification and attendance, searchable by name, department or status." },
      { title: "Staff attendance", desc: "Biometric device integration with manual override and late/early flagging, linked to leave." },
      { title: "Payroll with compliance", desc: "Salary calculation, deductions and EPF/ESI/TDS compliance with monthly disbursement." },
      { title: "Leave management", desc: "Applications, approval workflow and encashment calculations." },
      { title: "Recruitment", desc: "Pipeline tracking and offer-letter generation." },
      { title: "Probation tracking", desc: "Completion monitoring with automated reminders." },
    ],
    connects: ["compliance", "communication"],
    kb: "16-hr",
    faqs: [
      { q: "Does payroll handle EPF, ESI and TDS?", a: "Yes. Payroll calculates salaries and deductions with EPF, ESI and TDS compliance and monthly disbursement." },
      { q: "Who can see salary data?", a: "Payroll structure is visible to HR roles and read-only to the appropriate approval chain; role-based access keeps it restricted." },
      { q: "Can we track recruitment and probation?", a: "Yes. There is a recruitment pipeline with offer-letter generation and probation completion tracking with reminders." },
    ],
  },
  {
    slug: "communication",
    nav: "Communication",
    icon: "communication",
    title: "Communication that reaches parents",
    tagline: "Targeted circulars, role-scoped portals and structured messaging, so the right people get the right update, and children stay safe.",
    seoTitle: "School Communication & Parent Portal Software",
    seoDescription:
      "Targeted circulars and announcements over SMS and app, child-scoped parent and student portals, and OTP-verified visitor management, in Nexli.",
    summary: "Circulars, parent and student portals, visitor management.",
    intro: [
      "Communication in Nexli is built around how parents actually behave and how children must be protected. Circulars target exactly the right audience, and portals show each person only what concerns them.",
      "Direct messaging between students is disabled by design; communication is structured, not a free-for-all chat.",
    ],
    features: [
      { title: "Targeted circulars", desc: "Publish to a class, grade, role or custom group and deliver over SMS and app notification." },
      { title: "Parent portal", desc: "Child-scoped only: attendance, homework, fees, report cards, timetable and announcements, nothing else." },
      { title: "Student portal", desc: "A student's own timetable, homework, marks, library and canteen menu." },
      { title: "Visitor management", desc: "OTP-verified digital gate register with a visitor log and blacklist." },
      { title: "Structured messaging", desc: "Class-level announcements and structured parent-teacher communication, not open chat." },
      { title: "Child-safe by design", desc: "Direct student-to-student messaging is disabled by default as a child-safety measure." },
    ],
    connects: ["attendance", "fees", "medical-safety"],
    kb: "06-communication",
    faqs: [
      { q: "Can students message each other?", a: "No. Direct messaging between students is disabled by default as a child-safety policy. Communication is structured at the class and school level." },
      { q: "What can parents see?", a: "Parents see only their own child's data: attendance, homework, fees, report cards, timetable and announcements. They cannot see other students or staff records." },
      { q: "How are messages delivered?", a: "Critical updates go by SMS and app notification, where parents actually see them, with email for less-urgent information." },
    ],
  },
  {
    slug: "transport",
    nav: "Transport",
    icon: "transport",
    title: "Transport that keeps families informed",
    tagline: "Routes, vehicles and live GPS tracking, so the transport office can see where every bus is.",
    seoTitle: "School Transport & Bus Tracking Software",
    seoDescription:
      "Route management, driver and conductor records, vehicle maintenance schedules and live GPS tracking via OpenStreetMap, built into Nexli's transport module.",
    summary: "Routes, fleet, maintenance and live GPS tracking.",
    intro: [
      "Transport is where safety and operations meet. Nexli manages the routes, the people and the vehicles, and puts live location on a map so the office can respond to delays.",
      "GPS tracking uses OpenStreetMap, and RFID boarding can flag when a student boards.",
    ],
    features: [
      { title: "Route management", desc: "Plan and manage routes and stops, and assign students to them." },
      { title: "Driver & conductor records", desc: "Maintain records for drivers and conductors alongside the vehicles they operate." },
      { title: "Vehicle maintenance", desc: "Track maintenance schedules so buses stay roadworthy." },
      { title: "Live GPS tracking", desc: "Live bus location on a map via OpenStreetMap integration for the transport office." },
      { title: "RFID boarding", desc: "Optional RFID boarding to record when a student boards the bus." },
      { title: "Transport fees", desc: "Transport fees and concessions handled through the same fee ledger." },
    ],
    connects: ["fees", "attendance", "medical-safety"],
    kb: "10-safety",
    faqs: [
      { q: "Does Nexli track buses live?", a: "Yes. Live GPS tracking shows bus location on a map (via OpenStreetMap) for the transport office to monitor and respond to delays." },
      { q: "Is there a live map in the parent app?", a: "GPS tracking is available to the transport office today. A live map inside the parent portal is on the roadmap, not yet released; we don't claim features that aren't built." },
      { q: "Can transport fees be managed here?", a: "Yes. Transport fees and concessions are handled through the same fee ledger as the rest of the school." },
    ],
  },
  {
    slug: "hostel",
    nav: "Hostel",
    icon: "hostel",
    title: "Hostel management, room to roll-call",
    tagline: "Block and room allocation, morning and night roll-call, and weekend leave: the boarding day, accounted for.",
    seoTitle: "Hostel & Boarding Management Software for Schools",
    seoDescription:
      "Block assignment, room allocation, morning and night roll-call and exeat (weekend leave) tracking for boarding schools, in Nexli's hostel module.",
    summary: "Allocation, roll-call and exeat for boarding schools.",
    intro: [
      "For boarding schools, accountability is everything. Nexli's hostel module covers who sleeps where, who is present at roll-call, and who has leave to be away.",
      "Morning and night roll-call are recorded, and exeat (weekend leave) is tracked so no student is unaccounted for.",
    ],
    features: [
      { title: "Block & room allocation", desc: "Assign students to blocks and rooms and keep allocations current." },
      { title: "Morning & night roll-call", desc: "Record roll-call twice a day so presence in the hostel is always known." },
      { title: "Exeat / weekend leave", desc: "Track weekend leave so departures and returns are logged and approved." },
      { title: "Warden tools", desc: "The tools a warden needs to run the block, in one place." },
      { title: "Medical & counselling links", desc: "Boarders' health and counselling are connected to the same welfare records." },
      { title: "Parent communication", desc: "Keep parents of boarders informed through the same communication channels." },
    ],
    connects: ["medical-safety", "communication", "attendance"],
    kb: "10-safety",
    faqs: [
      { q: "Does Nexli handle roll-call?", a: "Yes. Both morning and night roll-call are recorded so the hostel always knows who is present." },
      { q: "How is weekend leave managed?", a: "Exeat (weekend leave) is tracked, logging when boarders leave and return under approval." },
      { q: "Is hostel connected to welfare records?", a: "Yes. Boarders' medical and counselling records sit in the same welfare system, accessible only to authorised roles." },
    ],
  },
  {
    slug: "library",
    nav: "Library",
    icon: "book",
    title: "A library that runs itself",
    tagline: "Catalogue, circulation and overdue reminders, so the library is a service, not a stack of registers.",
    seoTitle: "School Library Management Software",
    seoDescription:
      "Catalogue, circulation (issue, return, renewal), overdue alerts, reservations and reading programs: Nexli's library module for schools.",
    summary: "Catalogue, circulation, reservations and reading programs.",
    intro: [
      "Nexli's library module turns circulation into something the librarian manages by exception. The catalogue is searchable, issues and returns are tracked, and overdue reminders go out automatically.",
      "Students see their borrowing in their own portal, and reading programs encourage them back to the shelves.",
    ],
    features: [
      { title: "Catalogue", desc: "A searchable catalogue of the library's collection." },
      { title: "Circulation", desc: "Issue, return and renewal tracked for every copy." },
      { title: "Overdue alerts", desc: "Automatic reminders when a book is overdue." },
      { title: "Reservations", desc: "Students can reserve books that are currently out." },
      { title: "Reading programs", desc: "Run reading programs that encourage and track student reading." },
      { title: "Student view", desc: "Each student sees their own borrowing and due dates in their portal." },
    ],
    connects: ["academics", "communication"],
    kb: "08-technology",
    faqs: [
      { q: "Can students reserve books?", a: "Yes. Students can reserve titles that are currently issued, and they see their own borrowing in their portal." },
      { q: "Are overdue reminders automatic?", a: "Yes. The library sends overdue alerts automatically so the librarian manages by exception." },
      { q: "Does it support reading programs?", a: "Yes. Reading programs can be run and tracked to encourage student reading." },
    ],
  },
  {
    slug: "medical-safety",
    nav: "Medical & Safety",
    icon: "safety",
    title: "Student welfare and safeguarding",
    tagline: "Health records, counselling and POCSO safeguarding: the most sensitive data, held with the most care.",
    seoTitle: "School Medical, Counselling & Safeguarding Software",
    seoDescription:
      "Clinic visit logs, health records, allergen flags, a confidential counselling workspace, POCSO/safeguarding case management and special-education (IEP) tracking, in Nexli.",
    summary: "Clinic, counselling, POCSO safeguarding and special education.",
    intro: [
      "Some of a school's most important data is also its most sensitive. Nexli treats medical, counselling and child-protection records with restricted access and encryption, not as an afterthought.",
      "Health visits are logged, allergens are flagged, counselling notes sit in a confidential locker, and POCSO complaints follow a protected, escalating workflow.",
    ],
    features: [
      { title: "Medical & clinic", desc: "Visit logs, health records, immunisations, allergen flags and chronic-condition notes." },
      { title: "Confidential counselling", desc: "A counselling workspace with a confidential session-notes locker and at-risk flagging, accessible only to authorised roles." },
      { title: "POCSO / safeguarding", desc: "Child-protection complaint filing with CPO-exclusive access, encrypted case files and automatic escalation." },
      { title: "Special education (SPED)", desc: "IEP tracking, therapy logs and a CwSN register for children with special needs." },
      { title: "Encrypted by default", desc: "Sensitive minor data such as medical notes is encrypted in storage." },
      { title: "Restricted access", desc: "The most sensitive records are limited to a small set of authorised roles, with audit logging." },
    ],
    connects: ["compliance", "communication", "hostel"],
    kb: "10-safety",
    faqs: [
      { q: "Who can see POCSO case files?", a: "Child-protection complaints are accessible only to the Child Protection Officer role, with encrypted case files and automatic escalation built in." },
      { q: "Is medical data protected?", a: "Yes. Sensitive minor data such as medical notes is encrypted in storage and restricted to authorised roles." },
      { q: "Does Nexli support special education?", a: "Yes. There is IEP tracking, therapy logs and a CwSN register for children with special needs." },
    ],
  },
  {
    slug: "compliance",
    nav: "Compliance",
    icon: "shield",
    title: "Compliance, woven in, not bolted on",
    tagline: "DPDP, POCSO, RTE, CBSE, UDISE+ and FSSAI handled as part of daily operations, so compliance becomes a byproduct.",
    seoTitle: "School Compliance Software: DPDP, POCSO, RTE, UDISE+",
    seoDescription:
      "DPDP Act consent management, POCSO case workflows, RTE quota tracking, CBSE LOC, UDISE+ reporting, FSSAI and a compliance calendar, built into Nexli, not optional.",
    summary: "DPDP, POCSO, RTE, CBSE, UDISE+ and a compliance calendar.",
    intro: [
      "Compliance overhead is one reason schools resist going digital. Nexli flips the model: instead of bolting compliance onto an ERP, it is woven into the core, so routine operation produces compliant records.",
      "The result is less to remember and fewer last-minute scrambles before an inspection or a deadline.",
    ],
    features: [
      { title: "DPDP consent management", desc: "Parental consent with OTP verification, a consent registry, withdrawal tracking and data-access audit logs." },
      { title: "POCSO case management", desc: "Child-protection workflows with restricted access, encrypted files and mandatory-reporting steps." },
      { title: "RTE quota tracking", desc: "A separate pipeline for EWS applications and quota monitoring." },
      { title: "CBSE LOC & UDISE+", desc: "CBSE List of Candidates export and UDISE+ annual data reporting fields." },
      { title: "Compliance calendar", desc: "Automated alerts for CBSE LOC, UDISE+, fire NOC, FSSAI, staff verification, EPF/ESI/TDS, GST, POSH and more." },
      { title: "DPO audit trail", desc: "A Data Protection Officer role with access to the data-processing audit trail (metadata only)." },
    ],
    connects: ["admissions", "fees", "medical-safety"],
    kb: "07-compliance",
    faqs: [
      { q: "Is compliance an add-on?", a: "No. DPDP, POCSO, RTE, CBSE, UDISE+ and FSSAI support are built into the core, so compliant records come out of normal operations." },
      { q: "How does DPDP consent work?", a: "Parental consent is collected with OTP verification and held in a consent registry with withdrawal tracking and data-access audit logs." },
      { q: "Does the compliance calendar send reminders?", a: "Yes. It raises automated alerts for deadlines such as CBSE LOC, UDISE+, fire NOC, FSSAI, staff verification and statutory filings." },
    ],
  },
];

export const MODULE_BY_SLUG = Object.fromEntries(MODULE_PAGES.map((m) => [m.slug, m]));
