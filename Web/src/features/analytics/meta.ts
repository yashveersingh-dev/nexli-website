import type { BadgeVariant } from '@/components/Badge';
import type { IconName } from '@/components/Icon';
import type {
  EventType, EventStatus, EventAudience, RegistrationStatus,
} from '@/types/community';
import type { IepGoalStatus, IepStatus, TherapyType, TherapyProgress, HpcTerm } from '@/types/special';

/* ------------------------------ Events ------------------------------------ */
export const EVENT_TYPE_META: Record<EventType, { label: string; icon: IconName }> = {
  academic: { label: 'Academic', icon: 'book' },
  sports: { label: 'Sports', icon: 'award' },
  cultural: { label: 'Cultural', icon: 'sparkles' },
  celebration: { label: 'Celebration', icon: 'sparkles' },
  excursion: { label: 'Excursion', icon: 'bus' },
  competition: { label: 'Competition', icon: 'trophy' },
  workshop: { label: 'Workshop', icon: 'edit' },
  ptm: { label: 'Parent-Teacher Meeting', icon: 'users' },
  holiday: { label: 'Holiday', icon: 'calendar' },
  other: { label: 'Other', icon: 'calendar' },
};
export const EVENT_TYPE_OPTIONS = (Object.keys(EVENT_TYPE_META) as EventType[]).map((v) => ({ value: v, label: EVENT_TYPE_META[v].label }));

export const EVENT_STATUS_META: Record<EventStatus, { label: string; variant: BadgeVariant }> = {
  upcoming: { label: 'Upcoming', variant: 'info' },
  ongoing: { label: 'Ongoing', variant: 'success' },
  completed: { label: 'Completed', variant: 'muted' },
  cancelled: { label: 'Cancelled', variant: 'danger' },
};

export const EVENT_AUDIENCE_OPTIONS: { value: EventAudience; label: string }[] = [
  { value: 'whole_school', label: 'Whole school' }, { value: 'students', label: 'Students' },
  { value: 'parents', label: 'Parents' }, { value: 'staff', label: 'Staff' },
  { value: 'grade', label: 'Specific grade' }, { value: 'invitees', label: 'Invitees only' },
];

export const REGISTRATION_STATUS_META: Record<RegistrationStatus, { label: string; variant: BadgeVariant }> = {
  registered: { label: 'Registered', variant: 'success' },
  waitlist: { label: 'Waitlisted', variant: 'warning' },
  attended: { label: 'Attended', variant: 'info' },
  cancelled: { label: 'Cancelled', variant: 'muted' },
};

/* -------------------------------- IEP ------------------------------------- */
export const IEP_GOAL_STATUS_META: Record<IepGoalStatus, { label: string; variant: BadgeVariant }> = {
  not_started: { label: 'Not started', variant: 'muted' },
  in_progress: { label: 'In progress', variant: 'info' },
  achieved: { label: 'Achieved', variant: 'success' },
  revised: { label: 'Revised', variant: 'warning' },
};
export const IEP_STATUS_META: Record<IepStatus, { label: string; variant: BadgeVariant }> = {
  draft: { label: 'Draft', variant: 'muted' },
  active: { label: 'Active', variant: 'success' },
  review_due: { label: 'Review due', variant: 'warning' },
  closed: { label: 'Closed', variant: 'muted' },
};
export const IEP_GOAL_AREAS = ['Communication', 'Academic', 'Motor skills', 'Social-emotional', 'Behaviour', 'Self-help', 'Sensory'];
export const THERAPY_TYPE_META: Record<TherapyType, { label: string }> = {
  speech: { label: 'Speech therapy' }, occupational: { label: 'Occupational therapy' },
  physiotherapy: { label: 'Physiotherapy' }, behavioural: { label: 'Behavioural therapy' },
  counseling: { label: 'Counseling' }, remedial: { label: 'Remedial' },
};
export const THERAPY_TYPE_OPTIONS = (Object.keys(THERAPY_TYPE_META) as TherapyType[]).map((v) => ({ value: v, label: THERAPY_TYPE_META[v].label }));
export const THERAPY_PROGRESS_META: Record<TherapyProgress, { label: string; variant: BadgeVariant }> = {
  poor: { label: 'Poor', variant: 'danger' }, fair: { label: 'Fair', variant: 'warning' },
  good: { label: 'Good', variant: 'success' }, excellent: { label: 'Excellent', variant: 'success' },
};

/* -------------------------------- HPC ------------------------------------- */
export const HPC_TERM_OPTIONS: { value: HpcTerm; label: string }[] = [
  { value: 'term1', label: 'Term 1' }, { value: 'term2', label: 'Term 2' }, { value: 'annual', label: 'Annual' },
];
/** NEP 2020 holistic domains for the radar. */
export const HPC_DOMAINS = ['Cognitive', 'Socio-emotional', 'Physical', 'Creative', 'Language', 'Values'];
export const HPC_RATING_DESCRIPTORS: Record<number, string> = {
  1: 'Beginning', 2: 'Progressing', 3: 'Proficient', 4: 'Advanced', 5: 'Exemplary',
};
