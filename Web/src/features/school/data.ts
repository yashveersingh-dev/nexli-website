import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  limit as fsLimit,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { tenantCol, tenantDoc, useCollection, useDocument, useTenantDocsByIds } from '@/lib/db';
import { writeAuditEvent, type AuditAction } from '@/lib/audit';
import type { Grade, Section } from '@/types/models';
import type { Admission, Student, TransferCertificate } from '@/types/sis';
import type { House, Room, Subject, Substitution, TimetableSlot } from '@/types/academics';
import type { LeaveRequest, StaffProfile } from '@/types/hr';

/**
 * Shared School Backbone (P3) data layer. Every collection lives under
 * `schools/{schoolId}/…` — tenant isolation is structural (see `lib/db`). All P3
 * modules (students, admissions, TC, academic structure, timetable, HR) read +
 * write through here, so the data contract stays single-sourced. Pass `schoolId`
 * from `useSession()`; pass `actor = { uid, name }` to writers (they audit).
 */

export interface Actor {
  uid: string;
  name?: string;
}

function stripUndefined<T extends object>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k as keyof T] = v as T[keyof T];
  return out;
}

/** Generic tenant create (auto-id). Returns the new doc id. */
async function createIn<T extends object>(
  schoolId: string,
  sub: string,
  data: T,
  actor: Actor,
  audit?: { action: AuditAction; targetType?: string; summary?: string },
): Promise<string> {
  const ref = await addDoc(tenantCol(schoolId, sub), {
    ...stripUndefined(data),
    schoolId,
    createdAt: Date.now(),
    createdBy: actor.uid,
    serverCreatedAt: serverTimestamp(),
    version: 1,
  });
  if (audit) void writeAuditEvent({ action: audit.action, schoolId, actor, targetType: audit.targetType, targetId: ref.id, summary: audit.summary });
  return ref.id;
}

/** Generic tenant create with an explicit id (upsert). */
async function setIn<T extends object>(schoolId: string, sub: string, id: string, data: T, actor: Actor): Promise<void> {
  await setDoc(
    tenantDoc(schoolId, sub, id),
    { ...stripUndefined(data), schoolId, lastModifiedAt: Date.now(), lastModifiedBy: actor.uid },
    { merge: true },
  );
}

async function updateIn<T extends object>(
  schoolId: string,
  sub: string,
  id: string,
  patch: Partial<T>,
  actor: Actor,
  audit?: { action: AuditAction; targetType?: string; summary?: string },
): Promise<void> {
  await updateDoc(tenantDoc(schoolId, sub, id), {
    ...stripUndefined(patch),
    lastModifiedAt: Date.now(),
    lastModifiedBy: actor.uid,
  });
  if (audit) void writeAuditEvent({ action: audit.action, schoolId, actor, targetType: audit.targetType, targetId: id, summary: audit.summary });
}

async function removeIn(schoolId: string, sub: string, id: string, actor: Actor, audit?: { action: AuditAction; targetType?: string }): Promise<void> {
  await deleteDoc(tenantDoc(schoolId, sub, id));
  if (audit) void writeAuditEvent({ action: audit.action, schoolId, actor, targetType: audit.targetType, targetId: id });
}

/* ============================ Students ============================ */

export function useStudents(schoolId?: string) {
  return useCollection<Student>(schoolId ? tenantCol(schoolId, 'students') : null, [schoolId]);
}
export function useStudent(schoolId?: string, id?: string) {
  return useDocument<Student>(schoolId && id ? tenantDoc(schoolId, 'students', id) : null);
}
/**
 * Fetch ONLY the given student records by id — own-record scoping for parents
 * (their `childStudentIds`) and students (their own `studentId`). Use this on
 * family/student screens instead of `useStudents` (whole collection), which the
 * tightened security rules now forbid to non-staff.
 */
export function useStudentsByIds(schoolId?: string, ids?: readonly string[]) {
  return useTenantDocsByIds<Student>(schoolId, 'students', ids);
}
export function createStudent(schoolId: string, data: Omit<Student, 'id'>, actor: Actor) {
  return createIn(schoolId, 'students', data, actor, { action: 'student.created', targetType: 'student', summary: data.fullName });
}
export function updateStudent(schoolId: string, id: string, patch: Partial<Student>, actor: Actor) {
  return updateIn(schoolId, 'students', id, patch, actor, { action: 'student.edited', targetType: 'student' });
}
export function setStudentDoc(schoolId: string, id: string, data: Partial<Student>, actor: Actor) {
  return setIn(schoolId, 'students', id, data, actor);
}

/**
 * Next sequential admission number, e.g. ADM2026-0042. Allocated ATOMICALLY via a
 * per-year counter document (`admission_counters/{year}`) using a transaction —
 * the same pattern as fee receipts / certificate serials / POCSO case numbers.
 *
 * The previous implementation counted existing student docs (`getDocs().size + 1`,
 * capped at 1000): two clerks admitting at the same moment both read the same
 * size and minted the SAME admission number, and the 1000-cap silently recycled
 * numbers once a school crossed 1000 students. The counter removes both races.
 */
export async function nextAdmissionNo(schoolId: string, year?: string): Promise<string> {
  const yr = (year ?? `${new Date().getFullYear()}`).slice(0, 4);
  const counterRef = tenantDoc(schoolId, 'admission_counters', yr);
  const next = await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    const n = ((snap.data()?.value as number | undefined) ?? 0) + 1;
    tx.set(counterRef, { value: n, schoolId }, { merge: true });
    return n;
  });
  return `ADM${yr}-${String(next).padStart(4, '0')}`;
}

/**
 * Convert an admission into a student ATOMICALLY. The student create and the
 * admission update (`stage: 'admitted'` + `convertedStudentId`) are committed in a
 * single `writeBatch`, so a network drop can never leave an orphaned student with
 * no `convertedStudentId` (or an admission marked admitted with no student).
 * Returns the new student id. Audit events are written best-effort post-commit.
 */
export async function admitApplicant(
  schoolId: string,
  admissionId: string,
  studentData: Omit<Student, 'id'>,
  actor: Actor,
  admissionSummary?: string,
): Promise<string> {
  const studentRef = doc(collection(db, 'schools', schoolId, 'students'));
  const batch = writeBatch(db);
  batch.set(studentRef, {
    ...stripUndefined(studentData),
    schoolId,
    createdAt: Date.now(),
    createdBy: actor.uid,
    serverCreatedAt: serverTimestamp(),
    version: 1,
  });
  batch.update(tenantDoc(schoolId, 'admissions', admissionId), {
    ...stripUndefined({ stage: 'admitted', convertedStudentId: studentRef.id } as Partial<Admission>),
    lastModifiedAt: Date.now(),
    lastModifiedBy: actor.uid,
  });
  await batch.commit();
  void writeAuditEvent({ action: 'student.created', schoolId, actor, targetType: 'student', targetId: studentRef.id, summary: studentData.fullName });
  void writeAuditEvent({ action: 'admission.updated', schoolId, actor, targetType: 'admission', targetId: admissionId, summary: admissionSummary });
  return studentRef.id;
}

/**
 * Next transfer-certificate number, e.g. TC/2026/0042. Allocated ATOMICALLY via a
 * per-year counter (`tc_counters/{year}`) transaction — same pattern as admission
 * numbers / fee receipts. Replaces `Date.now().slice(-4)`, which collided for any
 * two TCs issued within the same ~10-second window (and wrapped every ~10s).
 */
export async function nextTcNumber(schoolId: string, year?: string): Promise<string> {
  const yr = (year ?? `${new Date().getFullYear()}`).slice(0, 4);
  const counterRef = tenantDoc(schoolId, 'tc_counters', yr);
  const next = await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    const n = ((snap.data()?.value as number | undefined) ?? 0) + 1;
    tx.set(counterRef, { value: n, schoolId }, { merge: true });
    return n;
  });
  return `TC/${yr}/${String(next).padStart(4, '0')}`;
}

/* ============================ Admissions ============================ */

export function useAdmissions(schoolId?: string) {
  return useCollection<Admission>(schoolId ? tenantCol(schoolId, 'admissions') : null, [schoolId]);
}
export function useAdmission(schoolId?: string, id?: string) {
  return useDocument<Admission>(schoolId && id ? tenantDoc(schoolId, 'admissions', id) : null);
}
export function createAdmission(schoolId: string, data: Omit<Admission, 'id'>, actor: Actor) {
  return createIn(schoolId, 'admissions', data, actor, { action: 'admission.created', targetType: 'admission', summary: data.applicantName });
}
export function updateAdmission(schoolId: string, id: string, patch: Partial<Admission>, actor: Actor) {
  return updateIn(schoolId, 'admissions', id, patch, actor, { action: 'admission.updated', targetType: 'admission' });
}

/* ============================ Transfer Certificates ============================ */

export function useTransferCertificates(schoolId?: string) {
  return useCollection<TransferCertificate>(schoolId ? tenantCol(schoolId, 'transfer_certificates') : null, [schoolId]);
}
export function useTransferCertificate(schoolId?: string, id?: string) {
  return useDocument<TransferCertificate>(schoolId && id ? tenantDoc(schoolId, 'transfer_certificates', id) : null);
}
export function createTC(schoolId: string, data: Omit<TransferCertificate, 'id'>, actor: Actor) {
  return createIn(schoolId, 'transfer_certificates', data, actor, { action: 'tc.requested', targetType: 'tc', summary: data.studentName });
}
export function updateTC(schoolId: string, id: string, patch: Partial<TransferCertificate>, actor: Actor) {
  return updateIn(schoolId, 'transfer_certificates', id, patch, actor, { action: 'tc.updated', targetType: 'tc' });
}

/* ============================ Academic structure ============================ */

export function useGrades(schoolId?: string) {
  return useCollection<Grade>(schoolId ? query(tenantCol(schoolId, 'grades'), orderBy('order', 'asc')) : null, [schoolId]);
}
export function useSections(schoolId?: string) {
  return useCollection<Section>(schoolId ? tenantCol(schoolId, 'sections') : null, [schoolId]);
}
export function useSubjects(schoolId?: string) {
  return useCollection<Subject>(schoolId ? tenantCol(schoolId, 'subjects') : null, [schoolId]);
}
export function useHouses(schoolId?: string) {
  return useCollection<House>(schoolId ? tenantCol(schoolId, 'houses') : null, [schoolId]);
}
export function useRooms(schoolId?: string) {
  return useCollection<Room>(schoolId ? tenantCol(schoolId, 'rooms') : null, [schoolId]);
}

export const createGrade = (schoolId: string, d: Omit<Grade, 'id'>, a: Actor) => createIn(schoolId, 'grades', d, a, { action: 'grade.created', targetType: 'grade', summary: d.name });
export const updateGrade = (schoolId: string, id: string, p: Partial<Grade>, a: Actor) => updateIn(schoolId, 'grades', id, p, a);
export const deleteGrade = (schoolId: string, id: string, a: Actor) => removeIn(schoolId, 'grades', id, a, { action: 'grade.deleted', targetType: 'grade' });

export const createSection = (schoolId: string, d: Omit<Section, 'id'>, a: Actor) => createIn(schoolId, 'sections', d, a, { action: 'section.created', targetType: 'section', summary: d.name });
export const updateSection = (schoolId: string, id: string, p: Partial<Section>, a: Actor) => updateIn(schoolId, 'sections', id, p, a);
export const deleteSection = (schoolId: string, id: string, a: Actor) => removeIn(schoolId, 'sections', id, a, { action: 'section.deleted', targetType: 'section' });

export const createSubject = (schoolId: string, d: Omit<Subject, 'id'>, a: Actor) => createIn(schoolId, 'subjects', d, a, { action: 'subject.created', targetType: 'subject', summary: d.name });
export const updateSubject = (schoolId: string, id: string, p: Partial<Subject>, a: Actor) => updateIn(schoolId, 'subjects', id, p, a);
export const deleteSubject = (schoolId: string, id: string, a: Actor) => removeIn(schoolId, 'subjects', id, a, { action: 'subject.deleted', targetType: 'subject' });

export const createHouse = (schoolId: string, d: Omit<House, 'id'>, a: Actor) => createIn(schoolId, 'houses', d, a, { action: 'house.created', targetType: 'house', summary: d.name });
export const updateHouse = (schoolId: string, id: string, p: Partial<House>, a: Actor) => updateIn(schoolId, 'houses', id, p, a);
export const deleteHouse = (schoolId: string, id: string, a: Actor) => removeIn(schoolId, 'houses', id, a, { action: 'house.deleted', targetType: 'house' });

export const createRoom = (schoolId: string, d: Omit<Room, 'id'>, a: Actor) => createIn(schoolId, 'rooms', d, a, { action: 'room.created', targetType: 'room', summary: d.name });
export const updateRoom = (schoolId: string, id: string, p: Partial<Room>, a: Actor) => updateIn(schoolId, 'rooms', id, p, a);
export const deleteRoom = (schoolId: string, id: string, a: Actor) => removeIn(schoolId, 'rooms', id, a, { action: 'room.deleted', targetType: 'room' });

/* ============================ Timetable ============================ */

export function useTimetable(schoolId?: string, sectionId?: string) {
  return useCollection<TimetableSlot>(
    schoolId && sectionId ? query(tenantCol(schoolId, 'timetable_slots'), where('sectionId', '==', sectionId)) : null,
    [schoolId, sectionId],
  );
}
export function useAllTimetable(schoolId?: string) {
  return useCollection<TimetableSlot>(schoolId ? tenantCol(schoolId, 'timetable_slots') : null, [schoolId]);
}
export const setTimetableSlot = (schoolId: string, id: string, d: Partial<TimetableSlot>, a: Actor) => setIn(schoolId, 'timetable_slots', id, d, a);
export const createTimetableSlot = (schoolId: string, d: Omit<TimetableSlot, 'id'>, a: Actor) => createIn(schoolId, 'timetable_slots', d, a);
export const deleteTimetableSlot = (schoolId: string, id: string, a: Actor) => removeIn(schoolId, 'timetable_slots', id, a);

export function useSubstitutions(schoolId?: string) {
  return useCollection<Substitution>(schoolId ? tenantCol(schoolId, 'substitutions') : null, [schoolId]);
}
export const createSubstitution = (schoolId: string, d: Omit<Substitution, 'id'>, a: Actor) => createIn(schoolId, 'substitutions', d, a, { action: 'substitution.created', targetType: 'substitution' });
export const deleteSubstitution = (schoolId: string, id: string, a: Actor) => removeIn(schoolId, 'substitutions', id, a);

/* ============================ Staff / HR ============================ */

export function useStaff(schoolId?: string) {
  return useCollection<StaffProfile>(schoolId ? tenantCol(schoolId, 'staff') : null, [schoolId]);
}
export function useStaffMember(schoolId?: string, id?: string) {
  return useDocument<StaffProfile>(schoolId && id ? tenantDoc(schoolId, 'staff', id) : null);
}
export function createStaff(schoolId: string, data: Omit<StaffProfile, 'id'>, actor: Actor) {
  return createIn(schoolId, 'staff', data, actor, { action: 'staff.created', targetType: 'staff', summary: data.name });
}
export function updateStaff(schoolId: string, id: string, patch: Partial<StaffProfile>, actor: Actor) {
  return updateIn(schoolId, 'staff', id, patch, actor, { action: 'staff.edited', targetType: 'staff' });
}
export function setStaffDoc(schoolId: string, id: string, data: Partial<StaffProfile>, actor: Actor) {
  return setIn(schoolId, 'staff', id, data, actor);
}

export function useLeaveRequests(schoolId?: string) {
  return useCollection<LeaveRequest>(schoolId ? tenantCol(schoolId, 'leave_requests') : null, [schoolId]);
}
export const createLeaveRequest = (schoolId: string, d: Omit<LeaveRequest, 'id'>, a: Actor) => createIn(schoolId, 'leave_requests', d, a, { action: 'leave.requested', targetType: 'leave' });
export const updateLeaveRequest = (schoolId: string, id: string, p: Partial<LeaveRequest>, a: Actor) => updateIn(schoolId, 'leave_requests', id, p, a);

/* ============================ One-shot query ============================ */
export async function queryOnce<T>(schoolId: string, sub: string, ...constraints: QueryConstraint[]): Promise<T[]> {
  const snap = await getDocs(query(tenantCol(schoolId, sub), ...constraints, fsLimit(1000)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }) as T);
}

export { doc, where, orderBy };
