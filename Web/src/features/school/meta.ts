import type { BadgeVariant } from '@/components/Badge';
import type {
  AdmissionStage,
  BloodGroup,
  Gender,
  GuardianRelation,
  SocialCategory,
  StudentStatus,
  TCStatus,
} from '@/types/sis';
import type { EmploymentType, LeaveStatus, LeaveType, StaffStatus } from '@/types/hr';
import type { RoomType, SubjectType } from '@/types/academics';

/** Shared display metadata + option lists for the School Backbone (P3) modules. */

export const STUDENT_STATUS_META: Record<StudentStatus, { label: string; variant: BadgeVariant }> = {
  active: { label: 'Active', variant: 'success' },
  inactive: { label: 'Inactive', variant: 'muted' },
  transferred: { label: 'Transferred', variant: 'info' },
  graduated: { label: 'Graduated', variant: 'info' },
  left: { label: 'Left', variant: 'warning' },
};

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

export const CATEGORY_OPTIONS: { value: SocialCategory; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'obc', label: 'OBC' },
  { value: 'sc', label: 'SC' },
  { value: 'st', label: 'ST' },
  { value: 'ews', label: 'EWS' },
  { value: 'other', label: 'Other' },
];

export const BLOOD_GROUPS: { value: BloodGroup; label: string }[] = [
  { value: 'A+', label: 'A+' }, { value: 'A-', label: 'A−' },
  { value: 'B+', label: 'B+' }, { value: 'B-', label: 'B−' },
  { value: 'AB+', label: 'AB+' }, { value: 'AB-', label: 'AB−' },
  { value: 'O+', label: 'O+' }, { value: 'O-', label: 'O−' },
  { value: 'unknown', label: 'Unknown' },
];

export const GUARDIAN_RELATIONS: { value: GuardianRelation; label: string }[] = [
  { value: 'father', label: 'Father' },
  { value: 'mother', label: 'Mother' },
  { value: 'guardian', label: 'Guardian' },
  { value: 'grandparent', label: 'Grandparent' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'other', label: 'Other' },
];

export const ADMISSION_STAGE_META: Record<AdmissionStage, { label: string; variant: BadgeVariant; color: string }> = {
  enquiry: { label: 'Enquiry', variant: 'muted', color: 'var(--text-muted)' },
  application: { label: 'Application', variant: 'info', color: 'var(--info)' },
  document_verification: { label: 'Doc Verification', variant: 'info', color: 'var(--info)' },
  assessment: { label: 'Assessment', variant: 'warning', color: 'var(--warning)' },
  interview: { label: 'Interview', variant: 'warning', color: 'var(--warning)' },
  offer: { label: 'Offer', variant: 'info', color: 'var(--gold)' },
  admitted: { label: 'Admitted', variant: 'success', color: 'var(--success)' },
  rejected: { label: 'Rejected', variant: 'danger', color: 'var(--danger)' },
  waitlisted: { label: 'Waitlisted', variant: 'muted', color: 'var(--text-muted)' },
  withdrawn: { label: 'Withdrawn', variant: 'muted', color: 'var(--text-muted)' },
};

export const TC_STATUS_META: Record<TCStatus, { label: string; variant: BadgeVariant }> = {
  requested: { label: 'Requested', variant: 'info' },
  clearance_pending: { label: 'Clearance pending', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  issued: { label: 'Issued', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
};

export const EMPLOYMENT_TYPE_OPTIONS: { value: EmploymentType; label: string }[] = [
  { value: 'permanent', label: 'Permanent' },
  { value: 'probation', label: 'Probation' },
  { value: 'contract', label: 'Contract' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'visiting', label: 'Visiting' },
];

export const STAFF_STATUS_META: Record<StaffStatus, { label: string; variant: BadgeVariant }> = {
  active: { label: 'Active', variant: 'success' },
  on_leave: { label: 'On leave', variant: 'warning' },
  suspended: { label: 'Suspended', variant: 'danger' },
  resigned: { label: 'Resigned', variant: 'muted' },
  retired: { label: 'Retired', variant: 'muted' },
};

export const LEAVE_TYPE_OPTIONS: { value: LeaveType; label: string }[] = [
  { value: 'casual', label: 'Casual' },
  { value: 'sick', label: 'Sick' },
  { value: 'earned', label: 'Earned' },
  { value: 'maternity', label: 'Maternity' },
  { value: 'paternity', label: 'Paternity' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'duty', label: 'On duty' },
];

export const LEAVE_STATUS_META: Record<LeaveStatus, { label: string; variant: BadgeVariant }> = {
  pending: { label: 'Pending', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
  cancelled: { label: 'Cancelled', variant: 'muted' },
};

export const SUBJECT_TYPE_OPTIONS: { value: SubjectType; label: string }[] = [
  { value: 'core', label: 'Core' },
  { value: 'elective', label: 'Elective' },
  { value: 'language', label: 'Language' },
  { value: 'co_scholastic', label: 'Co-scholastic' },
  { value: 'vocational', label: 'Vocational' },
];

export const ROOM_TYPE_OPTIONS: { value: RoomType; label: string }[] = [
  { value: 'classroom', label: 'Classroom' },
  { value: 'lab', label: 'Laboratory' },
  { value: 'library', label: 'Library' },
  { value: 'sports', label: 'Sports' },
  { value: 'auditorium', label: 'Auditorium' },
  { value: 'activity', label: 'Activity room' },
  { value: 'other', label: 'Other' },
];

/** Common department list for staff/HR. */
export const DEPARTMENTS = [
  'Administration', 'Primary', 'Middle School', 'Senior School', 'Mathematics', 'Science',
  'Languages', 'Social Studies', 'Computer Science', 'Physical Education', 'Arts', 'Music',
  'Library', 'Counseling', 'Transport', 'Finance', 'IT', 'Support Staff',
];

/** House color palette suggestions. */
export const HOUSE_COLORS = ['#EF4444', '#22C55E', '#60a5fa', '#F59E0B', '#A855F7', '#EC4899'];
