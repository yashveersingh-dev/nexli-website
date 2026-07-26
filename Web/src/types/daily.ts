import type { TenantRecord } from './models';

/* ============================ Attendance ============================ */

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day' | 'leave' | 'holiday';

/**
 * One attendance document per section per date (per period when period-wise).
 * Efficient + offline-friendly: a single doc holds the whole class roster's marks.
 * Doc id: `${sectionId}_${date}` (daily) or `${sectionId}_${date}_p${period}`.
 */
export interface AttendanceDay extends TenantRecord {
  date: string; // yyyy-mm-dd
  sectionId: string;
  sectionName?: string;
  gradeName?: string;
  period?: number;
  /** studentId → status. */
  entries: Record<string, AttendanceStatus>;
  presentCount?: number;
  absentCount?: number;
  total?: number;
  markedByUid?: string;
  markedByName?: string;
  markedAt?: number;
  remarks?: Record<string, string>;
}

/* ============================ Assessment / Gradebook ============================ */

export type AssessmentType = 'class_test' | 'unit_test' | 'assignment' | 'project' | 'practical' | 'periodic';

export interface Assessment extends TenantRecord {
  name: string;
  type: AssessmentType;
  subjectId?: string;
  subjectName?: string;
  sectionId: string;
  sectionName?: string;
  maxMarks: number;
  date?: number;
  published?: boolean;
}

export interface AssessmentMark {
  marks?: number | null;
  grade?: string;
  remark?: string;
  absent?: boolean;
}

/** Results for one assessment: studentId → mark. */
export interface AssessmentResult extends TenantRecord {
  assessmentId: string;
  sectionId: string;
  entries: Record<string, AssessmentMark>;
}

/* ============================ Homework ============================ */

export type HomeworkStatus = 'assigned' | 'submitted' | 'graded' | 'late' | 'missing';

/** Supported attachment file types, inferred from the URL/filename extension. */
export type HomeworkAttachmentType =
  | 'pdf'
  | 'doc'
  | 'docx'
  | 'xls'
  | 'xlsx'
  | 'jpg'
  | 'png'
  | 'webp'
  | 'other';

/**
 * A homework attachment. Today a hosted-link reference (Drive / ImageKit / any
 * public URL); the shape is upload-ready so a future ImageKit/Blaze upload can
 * populate the same `{ name, url, type }` with no model change.
 */
export interface HomeworkAttachment {
  name: string;
  url: string;
  type: HomeworkAttachmentType;
}

export interface Homework extends TenantRecord {
  title: string;
  description?: string;
  subjectId?: string;
  subjectName?: string;
  sectionId: string;
  sectionName?: string;
  assignedDate?: number;
  dueDate?: number;
  maxMarks?: number;
  /** @deprecated Legacy single attachment; superseded by `attachments`. */
  attachmentUrl?: string;
  attachments?: HomeworkAttachment[];
  assignedByUid?: string;
  assignedByName?: string;
}

export interface HomeworkSubmission extends TenantRecord {
  homeworkId: string;
  studentId: string;
  studentName?: string;
  status: HomeworkStatus;
  submittedAt?: number;
  marks?: number;
  feedback?: string;
  attachmentUrl?: string;
}

/* ============================ Examinations ============================ */

export interface Exam extends TenantRecord {
  name: string; // "Term 1", "Half Yearly"
  academicYear?: string;
  gradeIds?: string[];
  startDate?: number;
  endDate?: number;
  published?: boolean;
}

export interface ExamPaper extends TenantRecord {
  examId: string;
  gradeId?: string;
  gradeName?: string;
  subjectId?: string;
  subjectName?: string;
  date?: number;
  startTime?: string;
  durationMins?: number;
  maxMarks?: number;
  passMarks?: number;
  roomName?: string;
}

/** A student's exam result. */
export interface ExamResult extends TenantRecord {
  examId: string;
  studentId: string;
  studentName?: string;
  sectionId?: string;
  gradeName?: string;
  /** paperId (ExamPaper doc id) → obtained marks. */
  marks: Record<string, number>;
  total?: number;
  percentage?: number;
  rank?: number;
  resultStatus?: 'pass' | 'fail' | 'compartment';
}

/* ============================ Library ============================ */

export type BookStatus = 'available' | 'issued' | 'reserved' | 'lost' | 'damaged';

export interface LibraryBook extends TenantRecord {
  title: string;
  author?: string;
  isbn?: string;
  category?: string;
  publisher?: string;
  language?: string;
  copiesTotal: number;
  copiesAvailable: number;
  shelf?: string;
  coverUrl?: string;
}

export type CirculationStatus = 'issued' | 'returned' | 'overdue' | 'lost';

export interface BookCirculation extends TenantRecord {
  bookId: string;
  bookTitle?: string;
  borrowerId: string; // studentId or staff uid
  borrowerName?: string;
  borrowerType?: 'student' | 'staff';
  issuedDate: number;
  dueDate: number;
  returnedDate?: number;
  status: CirculationStatus;
  fine?: number;
}

/* ============================ Communication ============================ */

export type CircularAudience = 'whole_school' | 'staff' | 'grade' | 'section' | 'parents' | 'students';
export type CircularCategory = 'general' | 'academic' | 'event' | 'holiday' | 'fee' | 'exam' | 'emergency';

export interface Circular extends TenantRecord {
  title: string;
  body: string;
  category: CircularCategory;
  audience: CircularAudience;
  gradeId?: string;
  sectionId?: string;
  attachmentUrl?: string;
  pinned?: boolean;
  publishedAt?: number;
  publishedByUid?: string;
  publishedByName?: string;
  emergency?: boolean;
}

export type PTMStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled';

export interface PTMSlot extends TenantRecord {
  teacherUid?: string;
  teacherName?: string;
  sectionId?: string;
  date: number;
  startTime?: string;
  endTime?: string;
  studentId?: string;
  studentName?: string;
  parentName?: string;
  status: PTMStatus;
  notes?: string;
}
