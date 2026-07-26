import { lazy } from 'react';
import { registerModule } from './moduleRegistry';

/**
 * Central module wiring. Each built feature module registers its lazy-loaded
 * route subtree here, keyed by audience + nav id (matching `app/nav.ts`).
 * Called once at app start (see `ProtectedApp`). Modules are added phase by phase.
 *
 * Pattern:
 *   registerModule('staff', 'students',
 *     lazy(() => import('@/features/students/routes')));
 */
let done = false;

export function registerAllModules(): void {
  if (done) return;
  done = true;

  // --- P2 Super Admin platform ---
  registerModule('platform', 'schools', lazy(() => import('@/features/platform/schools/routes')));
  registerModule(
    'platform',
    'onboarding',
    lazy(() => import('@/features/platform/schools/routes').then((m) => ({ default: m.OnboardingRoutes }))),
  );
  registerModule('platform', 'announcements', lazy(() => import('@/features/platform/announcements/routes')));
  registerModule('platform', 'plans', lazy(() => import('@/features/platform/plans/routes')));
  registerModule('platform', 'subscriptions', lazy(() => import('@/features/platform/subscriptions/routes')));
  registerModule('platform', 'analytics', lazy(() => import('@/features/platform/analytics/routes')));
  registerModule('platform', 'health', lazy(() => import('@/features/platform/health/routes')));
  registerModule('platform', 'settings', lazy(() => import('@/features/platform/settings/routes')));
  registerModule('platform', 'audit', lazy(() => import('@/features/platform/audit/routes')));
  registerModule('platform', 'activities', lazy(() => import('@/features/platform/activities/routes')));
  registerModule('platform', 'users', lazy(() => import('@/features/platform/users/routes')));
  registerModule('platform', 'roles', lazy(() => import('@/features/platform/roles/routes')));
  registerModule('platform', 'support', lazy(() => import('@/features/platform/support/routes')));

  // --- P3 School backbone ---
  registerModule('staff', 'students', lazy(() => import('@/features/students/routes')));
  registerModule('staff', 'admissions', lazy(() => import('@/features/admissions/routes')));
  registerModule('staff', 'certificates', lazy(() => import('@/features/certificates/routes')));
  registerModule('staff', 'academics', lazy(() => import('@/features/academics/routes')));
  registerModule('staff', 'hr', lazy(() => import('@/features/hr/routes')));

  // --- P4 Daily operations & dashboards ---
  registerModule('staff', 'attendance', lazy(() => import('@/features/attendance/routes')));
  registerModule('staff', 'staff_attendance', lazy(() => import('@/features/staffattendance/routes')));
  registerModule('parent', 'attendance', lazy(() => import('@/features/attendance/routes').then((m) => ({ default: m.MyAttendanceRoutes }))));
  registerModule('student', 'attendance', lazy(() => import('@/features/attendance/routes').then((m) => ({ default: m.MyAttendanceRoutes }))));

  // Parent "My Children" — family overview (reuses the dashboard's children grid).
  registerModule('parent', 'children', lazy(() => import('@/features/family/routes')));

  registerModule('staff', 'gradebook', lazy(() => import('@/features/gradebook/routes')));

  registerModule('staff', 'library', lazy(() => import('@/features/library/routes')));
  registerModule('student', 'library', lazy(() => import('@/features/library/routes').then((m) => ({ default: m.MyLibraryRoutes }))));

  registerModule('staff', 'communication', lazy(() => import('@/features/communication/routes')));
  registerModule('parent', 'communication', lazy(() => import('@/features/communication/routes').then((m) => ({ default: m.InboxRoutes }))));
  registerModule('student', 'communication', lazy(() => import('@/features/communication/routes').then((m) => ({ default: m.InboxRoutes }))));
  registerModule('staff', 'messages', lazy(() => import('@/features/messaging/routes')));
  // Families: the messaging hub is audience-aware (parents/students see "reach your
  // child's teachers", no escalation queue). Same route subtree, recipient policy
  // (`canInitiateTo`) limits who they can start a thread with.
  registerModule('parent', 'messages', lazy(() => import('@/features/messaging/routes')));
  registerModule('student', 'messages', lazy(() => import('@/features/messaging/routes')));

  registerModule('staff', 'homework', lazy(() => import('@/features/homework/routes')));
  registerModule('parent', 'assignments', lazy(() => import('@/features/homework/routes').then((m) => ({ default: m.MyHomeworkRoutes }))));
  registerModule('student', 'assignments', lazy(() => import('@/features/homework/routes').then((m) => ({ default: m.MyHomeworkRoutes }))));

  registerModule('staff', 'examinations', lazy(() => import('@/features/examinations/routes')));
  registerModule('staff', 'qpaper', lazy(() => import('@/features/qpaper/routes')));
  registerModule('staff', 'reportcard', lazy(() => import('@/features/reportcard/routes')));
  registerModule('parent', 'reportcard', lazy(() => import('@/features/reportcard/routes').then((m) => ({ default: m.MyReportCardRoutes }))));
  registerModule('student', 'reportcard', lazy(() => import('@/features/reportcard/routes').then((m) => ({ default: m.MyReportCardRoutes }))));
  registerModule('parent', 'examinations', lazy(() => import('@/features/examinations/routes').then((m) => ({ default: m.MyExaminationsRoutes }))));
  registerModule('student', 'examinations', lazy(() => import('@/features/examinations/routes').then((m) => ({ default: m.MyExaminationsRoutes }))));

  // --- P5 Finance ---
  registerModule('staff', 'fees', lazy(() => import('@/features/fees/routes')));
  registerModule('parent', 'fees', lazy(() => import('@/features/fees/routes').then((m) => ({ default: m.MyFeesRoutes }))));
  registerModule('student', 'fees', lazy(() => import('@/features/fees/routes').then((m) => ({ default: m.MyFeesRoutes }))));

  registerModule('staff', 'expense', lazy(() => import('@/features/expense/routes')));
  registerModule('staff', 'payroll', lazy(() => import('@/features/payroll/routes')));

  // --- P6 Operations & Safety ---
  registerModule('staff', 'visitor', lazy(() => import('@/features/visitor/routes')));
  registerModule('staff', 'transport', lazy(() => import('@/features/transport/routes')));
  registerModule('staff', 'hostel', lazy(() => import('@/features/hostel/routes')));
  registerModule('staff', 'medical', lazy(() => import('@/features/medical/routes')));
  registerModule('staff', 'canteen', lazy(() => import('@/features/canteen/routes')));
  registerModule('staff', 'facility', lazy(() => import('@/features/facility/routes')));

  // --- P7 Compliance & Governance ---
  registerModule('staff', 'compliance', lazy(() => import('@/features/compliance/routes')));
  registerModule('staff', 'udise', lazy(() => import('@/features/udise/routes')));
  registerModule('staff', 'rte', lazy(() => import('@/features/rte/routes')));
  registerModule('staff', 'safeguarding', lazy(() => import('@/features/safeguarding/routes')));
  registerModule('staff', 'consent', lazy(() => import('@/features/consent/routes')));
  registerModule('staff', 'counseling', lazy(() => import('@/features/counseling/routes')));
  registerModule('staff', 'smc', lazy(() => import('@/features/smc/routes')));

  // --- P8 Analytics, Special & AI surfaces ---
  registerModule('staff', 'reports', lazy(() => import('@/features/analytics/routes')));
  registerModule('staff', 'rankings', lazy(() => import('@/features/rankings/routes')));
  registerModule('staff', 'hpc', lazy(() => import('@/features/hpc/routes')));
  registerModule('parent', 'hpc', lazy(() => import('@/features/hpc/routes').then((m) => ({ default: m.MyHpcRoutes }))));
  registerModule('student', 'hpc', lazy(() => import('@/features/hpc/routes').then((m) => ({ default: m.MyHpcRoutes }))));
  registerModule('staff', 'sped', lazy(() => import('@/features/sped/routes')));
  registerModule('staff', 'events', lazy(() => import('@/features/events/routes')));
  registerModule('student', 'events', lazy(() => import('@/features/events/routes').then((m) => ({ default: m.MyEventsRoutes }))));
  registerModule('staff', 'alumni', lazy(() => import('@/features/alumni/routes')));
  registerModule('staff', 'insights', lazy(() => import('@/features/insights/routes')));

  // --- Alumni portal (dedicated audience — minimal, never the staff menu) ---
  registerModule('alumni', 'alumni', lazy(() => import('@/features/alumni/routes')));
  registerModule('alumni', 'events', lazy(() => import('@/features/events/routes').then((m) => ({ default: m.MyEventsRoutes }))));
  registerModule('alumni', 'communication', lazy(() => import('@/features/communication/routes').then((m) => ({ default: m.InboxRoutes }))));
  registerModule('staff', 'delegation', lazy(() => import('@/features/delegation/routes')));
  registerModule('staff', 'it_admin', lazy(() => import('@/features/itadmin/routes')));

  // --- Student portal screens (read-only) ---
  registerModule('student', 'profile', lazy(() => import('@/features/studentportal/routes').then((m) => ({ default: m.StudentProfileRoutes }))));
  registerModule('student', 'timetable', lazy(() => import('@/features/studentportal/routes').then((m) => ({ default: m.StudentTimetableRoutes }))));
  registerModule('student', 'academics', lazy(() => import('@/features/studentportal/routes').then((m) => ({ default: m.StudentAcademicsRoutes }))));
  registerModule('student', 'calendar', lazy(() => import('@/features/studentportal/routes').then((m) => ({ default: m.StudentCalendarRoutes }))));
  registerModule('student', 'achievements', lazy(() => import('@/features/studentportal/routes').then((m) => ({ default: m.StudentAchievementsRoutes }))));
  registerModule('student', 'rewards', lazy(() => import('@/features/gamification/routes')));
  registerModule('student', 'portfolio', lazy(() => import('@/features/portfolio/routes')));
  registerModule('staff', 'portfolio', lazy(() => import('@/features/portfolio/routes')));
  registerModule('student', 'career', lazy(() => import('@/features/career/routes').then((m) => ({ default: m.CareerStudentRoutes }))));
  registerModule('staff', 'career', lazy(() => import('@/features/career/routes').then((m) => ({ default: m.CareerStaffRoutes }))));
  registerModule('student', 'wellness', lazy(() => import('@/features/studentportal/routes').then((m) => ({ default: m.StudentWellnessRoutes }))));
  registerModule('student', 'support', lazy(() => import('@/features/studentportal/routes').then((m) => ({ default: m.StudentSupportRoutes }))));
}
