import type { BadgeVariant } from '@/components/Badge';
import type { IconName } from '@/components/Icon';
import type {
  AttendanceStatus, AssessmentType, HomeworkStatus, CircularCategory, CircularAudience, CirculationStatus,
} from '@/types/daily';

export const ATTENDANCE_STATUS_META: Record<AttendanceStatus, { label: string; short: string; variant: BadgeVariant; color: string }> = {
  present: { label: 'Present', short: 'P', variant: 'success', color: 'var(--success)' },
  absent: { label: 'Absent', short: 'A', variant: 'danger', color: 'var(--danger)' },
  late: { label: 'Late', short: 'L', variant: 'warning', color: 'var(--warning)' },
  half_day: { label: 'Half day', short: 'H', variant: 'warning', color: 'var(--warning)' },
  leave: { label: 'Leave', short: 'Lv', variant: 'info', color: 'var(--info)' },
  holiday: { label: 'Holiday', short: 'Ho', variant: 'muted', color: 'var(--text-muted)' },
};

export const ASSESSMENT_TYPE_OPTIONS: { value: AssessmentType; label: string }[] = [
  { value: 'class_test', label: 'Class test' },
  { value: 'unit_test', label: 'Unit test' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'project', label: 'Project' },
  { value: 'practical', label: 'Practical' },
  { value: 'periodic', label: 'Periodic' },
];

export const HOMEWORK_STATUS_META: Record<HomeworkStatus, { label: string; variant: BadgeVariant }> = {
  assigned: { label: 'Assigned', variant: 'info' },
  submitted: { label: 'Submitted', variant: 'success' },
  graded: { label: 'Graded', variant: 'success' },
  late: { label: 'Late', variant: 'warning' },
  missing: { label: 'Missing', variant: 'danger' },
};

export const CIRCULAR_CATEGORY_META: Record<CircularCategory, { label: string; icon: IconName; variant: BadgeVariant }> = {
  general: { label: 'General', icon: 'megaphone', variant: 'muted' },
  academic: { label: 'Academic', icon: 'book', variant: 'info' },
  event: { label: 'Event', icon: 'calendar', variant: 'info' },
  holiday: { label: 'Holiday', icon: 'sparkles', variant: 'success' },
  fee: { label: 'Fee', icon: 'credit-card', variant: 'warning' },
  exam: { label: 'Exam', icon: 'file-text', variant: 'warning' },
  emergency: { label: 'Emergency', icon: 'alert-triangle', variant: 'danger' },
};

export const CIRCULAR_AUDIENCE_OPTIONS: { value: CircularAudience; label: string }[] = [
  { value: 'whole_school', label: 'Whole school' },
  { value: 'staff', label: 'Staff only' },
  { value: 'parents', label: 'All parents' },
  { value: 'students', label: 'All students' },
  { value: 'grade', label: 'Specific grade' },
  { value: 'section', label: 'Specific section' },
];

export const CIRCULATION_STATUS_META: Record<CirculationStatus, { label: string; variant: BadgeVariant }> = {
  issued: { label: 'Issued', variant: 'info' },
  returned: { label: 'Returned', variant: 'success' },
  overdue: { label: 'Overdue', variant: 'danger' },
  lost: { label: 'Lost', variant: 'danger' },
};

export const BOOK_CATEGORIES = [
  'Fiction', 'Non-fiction', 'Reference', 'Textbook', 'Science', 'Mathematics', 'History',
  'Biography', 'Children', 'Comics', 'Periodicals', 'Competitive', 'Regional',
];

/** Indian attendance threshold for eligibility alerts. */
export const ATTENDANCE_MIN_PERCENT = 75;
