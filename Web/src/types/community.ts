import type { TenantRecord } from './models';

/* ============================================================================
 * P8 — Events & Activities + Alumni.
 * ==========================================================================*/

/* --------------------------- Events & activities -------------------------- */

export type EventType =
  | 'academic' | 'sports' | 'cultural' | 'celebration' | 'excursion'
  | 'competition' | 'workshop' | 'ptm' | 'holiday' | 'other';

export type EventAudience = 'whole_school' | 'staff' | 'parents' | 'students' | 'grade' | 'invitees';
export type EventStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';

/**
 * Approval lifecycle (Principal/VP sign-off before an event is public):
 *   draft → requested → approved (published) | rejected.
 * An event is only publicly visible once `approvalStatus === 'approved'`.
 */
export type EventApprovalStatus = 'draft' | 'requested' | 'approved' | 'rejected';

export interface SchoolEvent extends TenantRecord {
  title: string;
  type: EventType;
  description?: string;
  startDate: number;
  endDate?: number;
  allDay?: boolean;
  venue?: string;
  audience?: EventAudience;
  gradeId?: string;
  organiser?: string;
  registrationRequired?: boolean;
  capacity?: number;
  fee?: number;
  bannerUrl?: string;
  status: EventStatus;

  /* ---- Approval workflow (Principal/VP review before publish) ---- */
  /** Lifecycle state. Absent on legacy events → treated as approved/published. */
  approvalStatus?: EventApprovalStatus;
  /** Who created/raised the event or request. */
  requestedByName?: string;
  requestedAt?: number;
  /** Principal/VP who approved or rejected. */
  approvedByName?: string;
  approvedAt?: number;
  /** Free-text note from the approver (rationale for rejection / approval note). */
  approvalNote?: string;
  /** A lighter "Teacher Event Request" raised by a teaching role (non-owner). */
  isTeacherRequest?: boolean;
  /** Rationale supplied by a teacher when requesting an event. */
  rationale?: string;
}

export type RegistrationStatus = 'registered' | 'waitlist' | 'attended' | 'cancelled';

export interface EventRegistration extends TenantRecord {
  eventId: string;
  eventTitle?: string;
  participantId?: string;
  participantName: string;
  participantType?: 'student' | 'staff' | 'parent';
  gradeName?: string;
  status: RegistrationStatus;
  registeredAt: number;
  note?: string;
}

/* -------------------------------- Alumni ---------------------------------- */

export interface Alumnus extends TenantRecord {
  name: string;
  batchYear?: string;
  gradeLeft?: string;
  email?: string;
  phone?: string;
  currentRole?: string;
  organisation?: string;
  city?: string;
  country?: string;
  industry?: string;
  higherEducation?: string;
  achievements?: string;
  linkedin?: string;
  photoUrl?: string;
  willingToMentor?: boolean;
  mentorAreas?: string[];
  verified?: boolean;
  notes?: string;
}
