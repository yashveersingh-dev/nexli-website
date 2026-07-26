import {
  addDoc, deleteDoc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc, where,
  limit as fsLimit, type QueryConstraint,
} from 'firebase/firestore';
import { tenantCol, tenantDoc, useCollection, useDocument } from '@/lib/db';
import { writeAuditEvent, type AuditAction } from '@/lib/audit';
import { attendanceSinceCutoff, type AttendanceWindow } from './attendanceWindow';
import type {
  AttendanceDay, Assessment, AssessmentResult, Homework, HomeworkSubmission,
  Exam, ExamPaper, ExamResult, LibraryBook, BookCirculation, Circular, PTMSlot,
} from '@/types/daily';

/**
 * Shared Daily Operations (P4) data layer. Tenant-scoped collections under
 * `schools/{schoolId}/…`. All P4 modules (attendance, gradebook, homework, exams,
 * library, communication) read/write through here. `schoolId` from `useSession()`;
 * `actor = { uid, name }`.
 */
export interface Actor { uid: string; name?: string }

function stripUndefined<T extends object>(o: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined) out[k as keyof T] = v as T[keyof T];
  return out;
}

export async function createIn<T extends object>(schoolId: string, sub: string, data: T, actor: Actor, audit?: { action: AuditAction; targetType?: string; summary?: string }): Promise<string> {
  const ref = await addDoc(tenantCol(schoolId, sub), { ...stripUndefined(data), schoolId, createdAt: Date.now(), createdBy: actor.uid, serverCreatedAt: serverTimestamp(), version: 1 });
  if (audit) void writeAuditEvent({ action: audit.action, schoolId, actor, targetType: audit.targetType, targetId: ref.id, summary: audit.summary });
  return ref.id;
}
export async function setIn<T extends object>(schoolId: string, sub: string, id: string, data: T, actor: Actor, audit?: { action: AuditAction; targetType?: string; summary?: string }): Promise<void> {
  await setDoc(tenantDoc(schoolId, sub, id), { ...stripUndefined(data), schoolId, lastModifiedAt: Date.now(), lastModifiedBy: actor.uid }, { merge: true });
  if (audit) void writeAuditEvent({ action: audit.action, schoolId, actor, targetType: audit.targetType, targetId: id, summary: audit.summary });
}
export async function updateIn<T extends object>(schoolId: string, sub: string, id: string, patch: Partial<T>, actor: Actor, audit?: { action: AuditAction; targetType?: string; summary?: string }): Promise<void> {
  await updateDoc(tenantDoc(schoolId, sub, id), { ...stripUndefined(patch), lastModifiedAt: Date.now(), lastModifiedBy: actor.uid });
  if (audit) void writeAuditEvent({ action: audit.action, schoolId, actor, targetType: audit.targetType, targetId: id, summary: audit.summary });
}
export async function removeIn(schoolId: string, sub: string, id: string, actor: Actor, audit?: { action: AuditAction; targetType?: string }): Promise<void> {
  await deleteDoc(tenantDoc(schoolId, sub, id));
  if (audit) void writeAuditEvent({ action: audit.action, schoolId, actor, targetType: audit.targetType, targetId: id });
}

/* ---------------- Attendance ---------------- */
export const attendanceDayId = (sectionId: string, date: string, period?: number) =>
  period != null ? `${sectionId}_${date}_p${period}` : `${sectionId}_${date}`;

export function useAttendanceDay(schoolId?: string, sectionId?: string, date?: string, period?: number) {
  return useDocument<AttendanceDay>(schoolId && sectionId && date ? tenantDoc(schoolId, 'attendance_days', attendanceDayId(sectionId, date, period)) : null);
}
export function useSectionAttendance(schoolId?: string, sectionId?: string) {
  return useCollection<AttendanceDay>(schoolId && sectionId ? query(tenantCol(schoolId, 'attendance_days'), where('sectionId', '==', sectionId)) : null, [schoolId, sectionId]);
}
/**
 * Attendance days for a specific set of section ids (up to 30 — Firestore `in`
 * limit). Designed for parent / student portals where only the family's own
 * sections should be queried (tightened rules deny non-staff a full collection
 * list). Falls back to idle when sectionIds is empty or undefined.
 */
export function useAttendanceBySections(schoolId?: string, sectionIds?: readonly string[]) {
  const key = sectionIds ? sectionIds.join(',') : '';
  return useCollection<AttendanceDay>(
    schoolId && sectionIds && sectionIds.length > 0
      ? query(tenantCol(schoolId, 'attendance_days'), where('sectionId', 'in', sectionIds.slice(0, 30)))
      : null,
    [schoolId, key],
  );
}
// Pure date-window helper lives in its own dependency-free module (testable
// without pulling Firebase init); re-exported here for existing import paths.
export { attendanceSinceCutoff };
export type { AttendanceWindow };

/**
 * School-wide attendance days. BACKWARD-COMPATIBLE: with no `opts` it reads the
 * whole `attendance_days` collection exactly as before (the only caller that
 * relies on this is `MarkAttendancePage`'s pre-selection summary).
 *
 * Pass a bound — `{ sinceDays }` (rolling window) or `{ since }` (explicit
 * `'yyyy-mm-dd'`) — and a server-side `where('date', '>=', cutoff)` is added so
 * the read is scoped to the period the screen actually shows, instead of all
 * history. The query key tracks the cutoff so the listener re-subscribes when
 * the window changes.
 */
export function useAllAttendance(schoolId?: string, opts?: AttendanceWindow) {
  const cutoff = attendanceSinceCutoff(opts);
  const q = schoolId
    ? cutoff
      ? query(tenantCol(schoolId, 'attendance_days'), where('date', '>=', cutoff))
      : tenantCol(schoolId, 'attendance_days')
    : null;
  return useCollection<AttendanceDay>(q, [schoolId, cutoff], schoolId ? `${schoolId}|${cutoff ?? ''}` : undefined);
}
export async function saveAttendanceDay(schoolId: string, day: Omit<AttendanceDay, 'id'>, actor: Actor): Promise<void> {
  const id = attendanceDayId(day.sectionId, day.date, day.period);
  await setIn(schoolId, 'attendance_days', id, { ...day, markedByUid: actor.uid, markedByName: actor.name, markedAt: Date.now() }, actor, { action: 'attendance.modified', targetType: 'attendance', summary: `${day.sectionName ?? day.sectionId} ${day.date}` });
}

/* ---------------- Assessment / Gradebook ---------------- */
export function useAssessments(schoolId?: string, sectionId?: string) {
  return useCollection<Assessment>(schoolId ? (sectionId ? query(tenantCol(schoolId, 'assessments'), where('sectionId', '==', sectionId)) : tenantCol(schoolId, 'assessments')) : null, [schoolId, sectionId]);
}
export const createAssessment = (s: string, d: Omit<Assessment, 'id'>, a: Actor) => createIn(s, 'assessments', d, a, { action: 'assessment.created', targetType: 'assessment', summary: d.name });
export const updateAssessment = (s: string, id: string, p: Partial<Assessment>, a: Actor) => updateIn(s, 'assessments', id, p, a);
export const deleteAssessment = (s: string, id: string, a: Actor) => removeIn(s, 'assessments', id, a, { action: 'assessment.deleted', targetType: 'assessment' });
export function useAssessmentResult(schoolId?: string, assessmentId?: string) {
  return useDocument<AssessmentResult>(schoolId && assessmentId ? tenantDoc(schoolId, 'assessment_results', assessmentId) : null);
}
export const saveAssessmentResult = (s: string, assessmentId: string, d: Omit<AssessmentResult, 'id'>, a: Actor) => setIn(s, 'assessment_results', assessmentId, d, a, { action: 'grade.published', targetType: 'assessment' });

/* ---------------- Homework ---------------- */
export function useHomework(schoolId?: string, sectionId?: string) {
  return useCollection<Homework>(schoolId ? (sectionId ? query(tenantCol(schoolId, 'homework'), where('sectionId', '==', sectionId)) : tenantCol(schoolId, 'homework')) : null, [schoolId, sectionId]);
}
/**
 * Homework for a set of section ids (up to 30 — Firestore `in` limit). Used by
 * parent portals so only the children's own sections are queried, avoiding a
 * whole-collection read that tightened rules deny to non-staff.
 */
export function useHomeworkBySections(schoolId?: string, sectionIds?: readonly string[]) {
  const key = sectionIds ? sectionIds.join(',') : '';
  return useCollection<Homework>(
    schoolId && sectionIds && sectionIds.length > 0
      ? query(tenantCol(schoolId, 'homework'), where('sectionId', 'in', sectionIds.slice(0, 30)))
      : null,
    [schoolId, key],
  );
}
export const createHomework = (s: string, d: Omit<Homework, 'id'>, a: Actor) => createIn(s, 'homework', d, a, { action: 'homework.created', targetType: 'homework', summary: d.title });
export const updateHomework = (s: string, id: string, p: Partial<Homework>, a: Actor) => updateIn(s, 'homework', id, p, a);
export const deleteHomework = (s: string, id: string, a: Actor) => removeIn(s, 'homework', id, a, { action: 'homework.deleted', targetType: 'homework' });
export function useHomeworkSubmissions(schoolId?: string, homeworkId?: string) {
  return useCollection<HomeworkSubmission>(schoolId && homeworkId ? query(tenantCol(schoolId, 'homework_submissions'), where('homeworkId', '==', homeworkId)) : null, [schoolId, homeworkId]);
}
export const upsertSubmission = (s: string, id: string, d: Omit<HomeworkSubmission, 'id'>, a: Actor) => setIn(s, 'homework_submissions', id, d, a);

/* ---------------- Examinations ---------------- */
export function useExams(schoolId?: string) {
  return useCollection<Exam>(schoolId ? tenantCol(schoolId, 'exams') : null, [schoolId]);
}
export const createExam = (s: string, d: Omit<Exam, 'id'>, a: Actor) => createIn(s, 'exams', d, a, { action: 'exam.created', targetType: 'exam', summary: d.name });
export const updateExam = (s: string, id: string, p: Partial<Exam>, a: Actor) => updateIn(s, 'exams', id, p, a);
export const deleteExam = (s: string, id: string, a: Actor) => removeIn(s, 'exams', id, a, { action: 'exam.deleted', targetType: 'exam' });
export function useExamPapers(schoolId?: string, examId?: string) {
  return useCollection<ExamPaper>(schoolId && examId ? query(tenantCol(schoolId, 'exam_papers'), where('examId', '==', examId)) : null, [schoolId, examId]);
}
export const createExamPaper = (s: string, d: Omit<ExamPaper, 'id'>, a: Actor) => createIn(s, 'exam_papers', d, a);
export const updateExamPaper = (s: string, id: string, p: Partial<ExamPaper>, a: Actor) => updateIn(s, 'exam_papers', id, p, a);
export const deleteExamPaper = (s: string, id: string, a: Actor) => removeIn(s, 'exam_papers', id, a);
export function useExamResults(schoolId?: string, examId?: string) {
  return useCollection<ExamResult>(schoolId && examId ? query(tenantCol(schoolId, 'exam_results'), where('examId', '==', examId)) : null, [schoolId, examId]);
}
export const saveExamResult = (s: string, id: string, d: Omit<ExamResult, 'id'>, a: Actor) => setIn(s, 'exam_results', id, d, a, { action: 'grade.published', targetType: 'exam' });

/* ---------------- Library ---------------- */
export function useBooks(schoolId?: string) {
  return useCollection<LibraryBook>(schoolId ? tenantCol(schoolId, 'library_books') : null, [schoolId]);
}
export function useBook(schoolId?: string, id?: string) {
  return useDocument<LibraryBook>(schoolId && id ? tenantDoc(schoolId, 'library_books', id) : null);
}
export const createBook = (s: string, d: Omit<LibraryBook, 'id'>, a: Actor) => createIn(s, 'library_books', d, a, { action: 'book.created', targetType: 'book', summary: d.title });
export const updateBook = (s: string, id: string, p: Partial<LibraryBook>, a: Actor) => updateIn(s, 'library_books', id, p, a);
export const deleteBook = (s: string, id: string, a: Actor) => removeIn(s, 'library_books', id, a, { action: 'book.deleted', targetType: 'book' });
export function useCirculation(schoolId?: string) {
  return useCollection<BookCirculation>(schoolId ? tenantCol(schoolId, 'book_circulation') : null, [schoolId]);
}
export const createCirculation = (s: string, d: Omit<BookCirculation, 'id'>, a: Actor) => createIn(s, 'book_circulation', d, a, { action: 'book.issued', targetType: 'circulation' });
export const updateCirculation = (s: string, id: string, p: Partial<BookCirculation>, a: Actor) => updateIn(s, 'book_circulation', id, p, a);

/* ---------------- Communication ---------------- */
export function useCirculars(schoolId?: string) {
  return useCollection<Circular>(schoolId ? query(tenantCol(schoolId, 'circulars'), orderBy('publishedAt', 'desc')) : null, [schoolId]);
}
export function useCircular(schoolId?: string, id?: string) {
  return useDocument<Circular>(schoolId && id ? tenantDoc(schoolId, 'circulars', id) : null);
}
export const createCircular = (s: string, d: Omit<Circular, 'id'>, a: Actor) => createIn(s, 'circulars', d, a, { action: 'announcement.sent', targetType: 'circular', summary: d.title });
export const updateCircular = (s: string, id: string, p: Partial<Circular>, a: Actor) => updateIn(s, 'circulars', id, p, a);
export const deleteCircular = (s: string, id: string, a: Actor) => removeIn(s, 'circulars', id, a, { action: 'announcement.deleted', targetType: 'circular' });
export function usePTMSlots(schoolId?: string) {
  return useCollection<PTMSlot>(schoolId ? tenantCol(schoolId, 'ptm_slots') : null, [schoolId]);
}
export const createPTM = (s: string, d: Omit<PTMSlot, 'id'>, a: Actor) => createIn(s, 'ptm_slots', d, a);
export const updatePTM = (s: string, id: string, p: Partial<PTMSlot>, a: Actor) => updateIn(s, 'ptm_slots', id, p, a);

/* ---------------- one-shot ---------------- */
export async function dailyQueryOnce<T>(schoolId: string, sub: string, ...c: QueryConstraint[]): Promise<T[]> {
  const snap = await getDocs(query(tenantCol(schoolId, sub), ...c, fsLimit(2000)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }) as T);
}
export { where, orderBy };
