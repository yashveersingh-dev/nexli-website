// In-browser sample data for the interactive demo. Everything here is fictional
// "Nexli Demo School" data, no real students, no backend, no auth. Hardcoded so
// the demo runs entirely client-side.

export const SCHOOL = {
  name: "Nexli Demo School",
  session: "2026–27",
  board: "CBSE",
  location: "Demo City",
};

export const ROLES = [
  { slug: "principal", title: "Principal", icon: "analytics", blurb: "School-wide overview, academics, fees and attendance health." },
  { slug: "vice-principal", title: "Vice Principal", icon: "shield", blurb: "Discipline, staff oversight and daily operations." },
  { slug: "teacher", title: "Teacher", icon: "academics", blurb: "Class dashboard, take attendance, enter marks, set homework." },
  { slug: "coordinator", title: "Coordinator", icon: "operations", blurb: "Academic coordination: coverage, exams and section health." },
  { slug: "student", title: "Student", icon: "admissions", blurb: "Timetable, attendance, report card and assignments." },
  { slug: "parent", title: "Parent", icon: "communication", blurb: "Your child's overview, fees, attendance and messages." },
];

export const PRINCIPAL_KPIS = [
  { label: "Students", value: "1,284", sub: "Nursery–Class 12", icon: "admissions" },
  { label: "Staff present", value: "92 / 96", sub: "Today", icon: "hr" },
  { label: "Attendance", value: "94.6%", sub: "School average today", icon: "attendance" },
  { label: "Fees collected", value: "78%", sub: "This term", icon: "fees" },
];

// weekly attendance % (Mon–Sat)
export const ATTENDANCE_WEEK = [
  { day: "Mon", pct: 95 }, { day: "Tue", pct: 96 }, { day: "Wed", pct: 93 },
  { day: "Thu", pct: 94 }, { day: "Fri", pct: 92 }, { day: "Sat", pct: 89 },
];

export const ENROLLMENT = [
  { grade: "Pre-primary", count: 196 }, { grade: "Class 1–5", count: 512 },
  { grade: "Class 6–8", count: 318 }, { grade: "Class 9–10", count: 168 },
  { grade: "Class 11–12", count: 90 },
];

export const FEE_OVERVIEW = {
  collectedPct: 78,
  bands: [
    { label: "Collected", pct: 78, tone: "good" },
    { label: "Partially paid", pct: 13, tone: "warn" },
    { label: "Outstanding", pct: 9, tone: "bad" },
  ],
  defaulters: [
    { name: "Aarav Sharma", cls: "8-B", amount: "Term 2", days: 12 },
    { name: "Diya Nair", cls: "6-A", amount: "Term 2", days: 9 },
    { name: "Kabir Singh", cls: "10-C", amount: "Term 2", days: 7 },
  ],
};

export const AT_RISK = [
  { name: "Rohan Mehta", cls: "9-A", reason: "Attendance 68% · below 75%", tone: "bad" },
  { name: "Ananya Rao", cls: "7-B", reason: "Marks dropped 14% this term", tone: "warn" },
  { name: "Vivaan Gupta", cls: "10-B", reason: "3 homework submissions missed", tone: "warn" },
];

// Teacher's class: Class 8-B
export const CLASS_ROSTER = [
  { roll: 1, name: "Aanya Kapoor", attendance: 96, avg: 88, fees: "Paid" },
  { roll: 2, name: "Aarav Sharma", attendance: 71, avg: 74, fees: "Due" },
  { roll: 3, name: "Ishaan Verma", attendance: 98, avg: 91, fees: "Paid" },
  { roll: 4, name: "Kiara Reddy", attendance: 94, avg: 85, fees: "Paid" },
  { roll: 5, name: "Myra Joshi", attendance: 89, avg: 79, fees: "Paid" },
  { roll: 6, name: "Reyansh Iyer", attendance: 92, avg: 82, fees: "Paid" },
  { roll: 7, name: "Saanvi Menon", attendance: 97, avg: 93, fees: "Paid" },
  { roll: 8, name: "Vihaan Bose", attendance: 84, avg: 76, fees: "Due" },
];

export const TIMETABLE = [
  { period: 1, time: "08:00", subject: "Mathematics", teacher: "Mr. Rao", room: "R-204" },
  { period: 2, time: "08:50", subject: "Science", teacher: "Ms. Nair", room: "Lab 2" },
  { period: 3, time: "09:40", subject: "English", teacher: "Mrs. DeSouza", room: "R-204" },
  { period: 4, time: "10:50", subject: "Social Science", teacher: "Mr. Khan", room: "R-204" },
  { period: 5, time: "11:40", subject: "Hindi", teacher: "Ms. Sharma", room: "R-204" },
  { period: 6, time: "12:30", subject: "Computer Sci.", teacher: "Mr. Patel", room: "Lab 1" },
];

export const HOMEWORK = [
  { subject: "Mathematics", title: "Algebra worksheet 4: linear equations", due: "Tomorrow", submitted: 24, total: 32 },
  { subject: "Science", title: "Lab record: photosynthesis experiment", due: "in 3 days", submitted: 18, total: 32 },
  { subject: "English", title: "Essay: 'A place I love'", due: "in 5 days", submitted: 9, total: 32 },
];

export const ASSIGNMENTS_STUDENT = [
  { subject: "Mathematics", title: "Algebra worksheet 4", due: "Tomorrow", status: "Pending" },
  { subject: "Science", title: "Lab record: photosynthesis", due: "in 3 days", status: "Pending" },
  { subject: "English", title: "Essay: 'A place I love'", due: "in 5 days", status: "Draft" },
  { subject: "Social Science", title: "Map work: rivers of India", due: "Submitted", status: "Done" },
];

export const REPORT_CARD = {
  student: "Ishaan Verma",
  cls: "Class 8-B",
  term: "Term 1, 2026–27",
  subjects: [
    { name: "Mathematics", marks: 92, max: 100, grade: "A1" },
    { name: "Science", marks: 88, max: 100, grade: "A2" },
    { name: "English", marks: 90, max: 100, grade: "A1" },
    { name: "Social Science", marks: 85, max: 100, grade: "A2" },
    { name: "Hindi", marks: 94, max: 100, grade: "A1" },
    { name: "Computer Sci.", marks: 96, max: 100, grade: "A1" },
  ],
  result: "Pass · Grade A1 · Rank 3 of 32",
};

export const MESSAGES = [
  { from: "Class Teacher, 8B", time: "Today, 9:12 AM", text: "Reminder: Algebra worksheet 4 is due tomorrow. Please ensure Ishaan submits on time." },
  { from: "Accounts Office", time: "Yesterday", text: "Term 2 fee invoice has been generated. Due by the 15th. Pay online from the Fees tab." },
  { from: "Principal's Office", time: "2 days ago", text: "Annual Sports Day is on the 28th. Circular shared with consent form, kindly respond." },
];

export const CHILD = {
  name: "Ishaan Verma",
  cls: "Class 8-B",
  roll: 3,
  attendance: 98,
  avg: 91,
  rank: "3 of 32",
};

export const FEES_LEDGER = [
  { term: "Term 1", amount: "₹ 42,000", status: "Paid", date: "12 Apr 2026" },
  { term: "Term 2", amount: "₹ 42,000", status: "Due", date: "by 15 Oct 2026" },
  { term: "Transport (Term 1)", amount: "₹ 9,000", status: "Paid", date: "12 Apr 2026" },
];

// Vice Principal / Coordinator oversight
export const STAFF_TODAY = [
  { name: "Mr. Rao", dept: "Mathematics", status: "Present", note: "On duty" },
  { name: "Ms. Nair", dept: "Science", status: "Present", note: "On duty" },
  { name: "Mrs. DeSouza", dept: "English", status: "On leave", note: "Approved: casual" },
  { name: "Mr. Khan", dept: "Social Science", status: "Present", note: "Substitution P4 8-B" },
  { name: "Ms. Sharma", dept: "Hindi", status: "Late", note: "Marked 08:22" },
];

export const INCIDENTS = [
  { type: "Discipline", detail: "Repeated late arrival, Class 9-A", owner: "VP", tone: "warn" },
  { type: "Safety", detail: "Lab safety drill scheduled, Block C", owner: "Coordinator", tone: "good" },
  { type: "Maintenance", detail: "Projector fault reported, R-204", owner: "Facilities", tone: "warn" },
];

export const COVERAGE = [
  { subject: "Mathematics", planned: 42, done: 40, pct: 95 },
  { subject: "Science", planned: 44, done: 39, pct: 89 },
  { subject: "English", planned: 38, done: 37, pct: 97 },
  { subject: "Social Science", planned: 40, done: 33, pct: 83 },
];

export const EXAM_PIPELINE = [
  { stage: "Schedule published", done: true },
  { stage: "Admit cards issued", done: true },
  { stage: "Invigilation duty set", done: true },
  { stage: "Marks entry", done: false },
  { stage: "Tabulation & report cards", done: false },
];
