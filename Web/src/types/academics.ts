import type { TenantRecord } from './models';

/* ============================ Academic structure ============================ */

export type SubjectType = 'core' | 'elective' | 'language' | 'co_scholastic' | 'vocational';

export interface Subject extends TenantRecord {
  name: string;
  code?: string;
  type: SubjectType;
  /** Grades this subject is taught in (grade ids). */
  gradeIds?: string[];
  isScholastic?: boolean;
  color?: string;
}

export interface House extends TenantRecord {
  name: string;
  color: string;
  motto?: string;
  masterUid?: string;
  masterName?: string;
  points?: number;
}

export type RoomType = 'classroom' | 'lab' | 'library' | 'sports' | 'auditorium' | 'activity' | 'other';

export interface Room extends TenantRecord {
  name: string;
  type: RoomType;
  capacity?: number;
  building?: string;
  floor?: string;
}

/* ============================ Timetable ============================ */

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export const WEEKDAYS: { id: Weekday; label: string; short: string }[] = [
  { id: 'mon', label: 'Monday', short: 'Mon' },
  { id: 'tue', label: 'Tuesday', short: 'Tue' },
  { id: 'wed', label: 'Wednesday', short: 'Wed' },
  { id: 'thu', label: 'Thursday', short: 'Thu' },
  { id: 'fri', label: 'Friday', short: 'Fri' },
  { id: 'sat', label: 'Saturday', short: 'Sat' },
];

/** A bell-schedule period definition (a row in the timetable grid). */
export interface PeriodDef {
  no: number;
  label: string; // "Period 1", "Break", "Lunch"
  startTime: string; // "08:00"
  endTime: string; // "08:45"
  isBreak?: boolean;
}

/** A single scheduled class slot. */
export interface TimetableSlot extends TenantRecord {
  sectionId: string;
  sectionName?: string;
  day: Weekday;
  periodNo: number;
  subjectId?: string;
  subjectName?: string;
  teacherUid?: string;
  teacherName?: string;
  roomId?: string;
  roomName?: string;
}

/** A substitution for an absent teacher on a given date. */
export interface Substitution extends TenantRecord {
  date: number;
  day: Weekday;
  periodNo: number;
  sectionId: string;
  sectionName?: string;
  absentTeacherUid?: string;
  absentTeacherName?: string;
  substituteTeacherUid?: string;
  substituteTeacherName?: string;
  subjectName?: string;
  reason?: string;
}

export const DEFAULT_PERIODS: PeriodDef[] = [
  { no: 1, label: 'Period 1', startTime: '08:00', endTime: '08:45' },
  { no: 2, label: 'Period 2', startTime: '08:45', endTime: '09:30' },
  { no: 3, label: 'Period 3', startTime: '09:30', endTime: '10:15' },
  { no: 0, label: 'Short Break', startTime: '10:15', endTime: '10:30', isBreak: true },
  { no: 4, label: 'Period 4', startTime: '10:30', endTime: '11:15' },
  { no: 5, label: 'Period 5', startTime: '11:15', endTime: '12:00' },
  { no: -1, label: 'Lunch', startTime: '12:00', endTime: '12:40', isBreak: true },
  { no: 6, label: 'Period 6', startTime: '12:40', endTime: '13:25' },
  { no: 7, label: 'Period 7', startTime: '13:25', endTime: '14:10' },
  { no: 8, label: 'Period 8', startTime: '14:10', endTime: '14:55' },
];
