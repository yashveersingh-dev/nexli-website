import type { IconName } from '@/components/Icon';
import type { Permission } from '@/lib/rbac';
import type { FeatureFlagKey } from '@/lib/featureFlags';
import type { RoleId } from '@/types/roles';

/**
 * Single source of truth for navigation. Every menu (sidebar + mobile bottom-nav)
 * is generated from these manifests, filtered by role permission + feature flag.
 * This guarantees a user never sees a link they can't use, and keeps navigation
 * identical across all modules ("one team" consistency).
 */
export interface NavItem {
  id: string;
  label: string;
  icon: IconName;
  path: string;
  permission?: Permission;
  /** Show if the user holds ANY of these (OR). Used when one screen serves
   *  multiple distinct permissions, e.g. the safeguarding hub (POCSO vs grievances). */
  anyPermission?: Permission[];
  flag?: FeatureFlagKey;
  /** AI-powered surface (renders a subtle AI tag; content uses AILockedOverlay). */
  ai?: boolean;
  /** Announced-but-unbuilt destination: render as a disabled "Coming soon" item
   *  (never a link that goes nowhere). Shown even though no module is registered. */
  comingSoon?: boolean;
  end?: boolean;
}

export type NavAudience = 'platform' | 'staff' | 'parent' | 'student' | 'alumni';

/* ---------------- Platform (Super Admin) ---------------- */
export const PLATFORM_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', path: '/', end: true },
  { id: 'schools', label: 'Schools', icon: 'school', path: '/schools' },
  { id: 'subscriptions', label: 'Subscriptions', icon: 'credit-card', path: '/subscriptions' },
  { id: 'users', label: 'Users & Roles', icon: 'users', path: '/users' },
  { id: 'roles', label: 'Roles & Permissions', icon: 'shield-check', path: '/roles' },
  { id: 'plans', label: 'Plans & Pricing', icon: 'wallet', path: '/plans' },
  { id: 'onboarding', label: 'Onboarding', icon: 'user-plus', path: '/onboarding' },
  { id: 'settings', label: 'Platform Settings', icon: 'settings', path: '/settings' },
  { id: 'analytics', label: 'Analytics & Reports', icon: 'bar-chart', path: '/analytics' },
  { id: 'announcements', label: 'Notifications', icon: 'bell', path: '/announcements' },
  { id: 'activities', label: 'Activities', icon: 'activity', path: '/activities' },
  { id: 'health', label: 'System Health', icon: 'server', path: '/health' },
  { id: 'support', label: 'Support Tickets', icon: 'message', path: '/support' },
  { id: 'audit', label: 'Audit Logs', icon: 'shield-check', path: '/audit' },
];

/* ---------------- School staff (superset; permission/flag-filtered) ---------------- */
export const STAFF_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', path: '/', end: true },
  { id: 'students', label: 'Students', icon: 'users', path: '/students', permission: 'students.read' },
  { id: 'admissions', label: 'Admissions', icon: 'user-plus', path: '/admissions', permission: 'admissions.read' },
  { id: 'certificates', label: 'Certificates', icon: 'award', path: '/certificates', permission: 'certificates.read' },
  { id: 'portfolio', label: 'Skills Passport', icon: 'award', path: '/portfolio', permission: 'students.read' },
  { id: 'career', label: 'Career Guidance', icon: 'briefcase', path: '/career', permission: 'counseling.read' },
  { id: 'academics', label: 'Academics', icon: 'book', path: '/academics', permission: 'academics.read' },
  { id: 'attendance', label: 'Attendance', icon: 'clock', path: '/attendance', permission: 'attendance.read' },
  { id: 'staff_attendance', label: 'Staff Attendance', icon: 'clock', path: '/staff-attendance', permission: 'hr.read' },
  { id: 'gradebook', label: 'Class Assessments', icon: 'edit', path: '/gradebook', permission: 'gradebook.read' },
  { id: 'homework', label: 'Homework', icon: 'clipboard', path: '/homework', permission: 'homework.read' },
  { id: 'examinations', label: 'Examinations', icon: 'file-text', path: '/examinations', permission: 'exams.read' },
  { id: 'qpaper', label: 'Question Papers', icon: 'file-text', path: '/question-papers', permission: 'exams.read' },
  { id: 'reportcard', label: 'Report Cards', icon: 'file-text', path: '/report-cards', permission: 'gradebook.read' },
  { id: 'hpc', label: 'Holistic Progress Card', icon: 'trophy', path: '/hpc', permission: 'gradebook.read' },
  { id: 'library', label: 'Library', icon: 'book', path: '/library', permission: 'library.read', flag: 'library' },
  { id: 'fees', label: 'Fees & Finance', icon: 'credit-card', path: '/fees', permission: 'fees.read' },
  { id: 'expense', label: 'Expense & Procurement', icon: 'box', path: '/expense', permission: 'expense.read' },
  { id: 'hr', label: 'Human Resources', icon: 'briefcase', path: '/hr', permission: 'hr.read' },
  { id: 'payroll', label: 'Payroll', icon: 'wallet', path: '/payroll', permission: 'payroll.read' },
  { id: 'communication', label: 'Communication', icon: 'megaphone', path: '/communication' },
  { id: 'messages', label: 'Messages', icon: 'message', path: '/messages' },
  { id: 'transport', label: 'Transport', icon: 'bus', path: '/transport', permission: 'transport.read', flag: 'transport' },
  { id: 'hostel', label: 'Hostel', icon: 'building', path: '/hostel', permission: 'hostel.read', flag: 'hostel' },
  { id: 'medical', label: 'Medical', icon: 'heart-pulse', path: '/medical', permission: 'medical.read', flag: 'medical' },
  { id: 'sped', label: 'Special Education', icon: 'heart-pulse', path: '/sped', permission: 'iep.read' },
  { id: 'reports', label: 'Reports & Analytics', icon: 'bar-chart', path: '/reports', permission: 'reports.read' },
  { id: 'rankings', label: 'Rankings', icon: 'trophy', path: '/rankings', permission: 'exams.read' },
  { id: 'insights', label: 'AI Insights', icon: 'sparkles', path: '/insights', flag: 'ai', ai: true },
  { id: 'compliance', label: 'Compliance', icon: 'shield-check', path: '/compliance', permission: 'compliance.read' },
  { id: 'udise', label: 'UDISE+ Reporting', icon: 'database', path: '/udise', permission: 'compliance.read' },
  { id: 'rte', label: 'RTE Quota', icon: 'award', path: '/rte', permission: 'compliance.read' },
  { id: 'safeguarding', label: 'Child Protection', icon: 'shield', path: '/safeguarding', anyPermission: ['pocso.read', 'grievances.read'] },
  { id: 'counseling', label: 'Counselling', icon: 'heart-pulse', path: '/counselling', permission: 'counseling.read' },
  { id: 'consent', label: 'Privacy & Consent', icon: 'lock', path: '/consent', permission: 'consent.read' },
  { id: 'smc', label: 'SMC Portal', icon: 'briefcase', path: '/smc', permission: 'compliance.read', flag: 'smc' },
  { id: 'visitor', label: 'Visitor & Gate', icon: 'shield-check', path: '/visitor', permission: 'visitors.read' },
  { id: 'canteen', label: 'Canteen', icon: 'utensils', path: '/canteen', permission: 'canteen.read', flag: 'canteen' },
  { id: 'facility', label: 'Assets & Facility', icon: 'box', path: '/facility', permission: 'facility.read' },
  { id: 'events', label: 'Events & Activities', icon: 'calendar', path: '/events' },
  { id: 'alumni', label: 'Alumni', icon: 'award', path: '/alumni', permission: 'alumni.read', flag: 'alumni' },
  { id: 'delegation', label: 'Delegation', icon: 'user-plus', path: '/delegation', permission: 'delegation.manage' },
  { id: 'it_admin', label: 'IT Administration', icon: 'server', path: '/it-admin', permission: 'settings.manage' },
  { id: 'settings', label: 'Settings', icon: 'settings', path: '/settings', permission: 'settings.manage' },
];

/* ---------------- Parent ---------------- */
export const PARENT_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', path: '/', end: true },
  { id: 'children', label: 'My Children', icon: 'users', path: '/children' },
  { id: 'attendance', label: 'Attendance', icon: 'clock', path: '/attendance' },
  { id: 'academics', label: 'Academics', icon: 'book', path: '/academics' },
  { id: 'assignments', label: 'Assignments', icon: 'file-text', path: '/assignments' },
  { id: 'examinations', label: 'Examinations', icon: 'award', path: '/examinations' },
  { id: 'hpc', label: 'Progress Card', icon: 'trophy', path: '/hpc' },
  { id: 'reportcard', label: 'Report Card', icon: 'file-text', path: '/report-cards' },
  { id: 'fees', label: 'Fees & Payments', icon: 'credit-card', path: '/fees' },
  { id: 'transport', label: 'Transport', icon: 'bus', path: '/transport', flag: 'transport' },
  { id: 'communication', label: 'Communication', icon: 'megaphone', path: '/communication' },
  { id: 'messages', label: 'Messages', icon: 'message', path: '/messages' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar', path: '/calendar' },
  { id: 'notices', label: 'School Notices', icon: 'megaphone', path: '/notices' },
  { id: 'wellness', label: 'Wellness', icon: 'heart-pulse', path: '/wellness' },
  { id: 'ptm', label: 'Parent-Teacher Meeting', icon: 'user-plus', path: '/ptm', comingSoon: true },
  { id: 'settings', label: 'Settings', icon: 'settings', path: '/settings' },
];

/* ---------------- Student ---------------- */
export const STUDENT_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', path: '/', end: true },
  { id: 'profile', label: 'My Profile', icon: 'user', path: '/profile' },
  { id: 'timetable', label: 'Timetable', icon: 'calendar', path: '/timetable' },
  { id: 'attendance', label: 'Attendance', icon: 'clock', path: '/attendance' },
  { id: 'academics', label: 'Academics', icon: 'book', path: '/academics' },
  { id: 'assignments', label: 'Assignments', icon: 'file-text', path: '/assignments' },
  { id: 'examinations', label: 'Examinations', icon: 'award', path: '/examinations' },
  { id: 'hpc', label: 'Progress Card', icon: 'trophy', path: '/hpc' },
  { id: 'reportcard', label: 'Report Card', icon: 'file-text', path: '/report-cards' },
  { id: 'library', label: 'Library', icon: 'book', path: '/library', flag: 'library' },
  { id: 'fees', label: 'Fee Details', icon: 'credit-card', path: '/fees' },
  { id: 'transport', label: 'Transport', icon: 'bus', path: '/transport', flag: 'transport' },
  { id: 'communication', label: 'Communications', icon: 'megaphone', path: '/communication' },
  { id: 'messages', label: 'Messages', icon: 'message', path: '/messages' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar', path: '/calendar' },
  { id: 'events', label: 'Events', icon: 'calendar', path: '/events' },
  { id: 'achievements', label: 'Achievements', icon: 'trophy', path: '/achievements' },
  { id: 'rewards', label: 'Rewards', icon: 'award', path: '/rewards' },
  { id: 'portfolio', label: 'Skills Passport', icon: 'award', path: '/portfolio' },
  { id: 'career', label: 'Career Guidance', icon: 'briefcase', path: '/career' },
  { id: 'wellness', label: 'Wellness', icon: 'heart-pulse', path: '/wellness' },
  { id: 'support', label: 'Support', icon: 'help-circle', path: '/support' },
];

/* ---------------- Alumni ---------------- */
// Alumni are NOT staff: they get their own minimal portal, never the staff menu
// (which previously leaked Staff Attendance + AI Insights to them).
export const ALUMNI_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', path: '/', end: true },
  { id: 'alumni', label: 'Alumni Network', icon: 'award', path: '/alumni' },
  { id: 'events', label: 'Events', icon: 'calendar', path: '/events' },
  { id: 'communication', label: 'Communication', icon: 'megaphone', path: '/communication' },
];

/* ---------------- Curated mobile bottom-nav (≤4 + auto "More") ---------------- */
const byIds = (items: NavItem[], ids: string[]): NavItem[] =>
  ids.map((id) => items.find((i) => i.id === id)).filter((i): i is NavItem => !!i);

export function audienceForRole(role: RoleId | undefined, isSuperAdmin: boolean): NavAudience {
  if (isSuperAdmin || role === 'super_admin') return 'platform';
  if (role === 'parent') return 'parent';
  // Student-leader roles (prefect, house_captain) are family/student roles and must
  // get the student portal — NOT the staff nav. Without this they fell through to
  // 'staff' and received unrestricted staff navigation.
  if (role === 'student' || role === 'prefect' || role === 'house_captain') return 'student';
  if (role === 'alumni') return 'alumni';
  return 'staff';
}

export function navForAudience(a: NavAudience): NavItem[] {
  switch (a) {
    case 'platform':
      return PLATFORM_NAV;
    case 'parent':
      return PARENT_NAV;
    case 'student':
      return STUDENT_NAV;
    case 'alumni':
      return ALUMNI_NAV;
    default:
      return STAFF_NAV;
  }
}

export function bottomNavForAudience(a: NavAudience): NavItem[] {
  switch (a) {
    case 'platform':
      return byIds(PLATFORM_NAV, ['dashboard', 'schools', 'subscriptions', 'analytics']);
    case 'parent':
      return byIds(PARENT_NAV, ['dashboard', 'attendance', 'fees', 'communication']);
    case 'student':
      return byIds(STUDENT_NAV, ['dashboard', 'timetable', 'assignments', 'examinations']);
    case 'alumni':
      return byIds(ALUMNI_NAV, ['dashboard', 'alumni', 'events', 'communication']);
    default:
      return byIds(STAFF_NAV, ['dashboard', 'students', 'attendance', 'communication']);
  }
}

export interface NavFilterCtx {
  isSuperAdmin: boolean;
  can: (p: Permission) => boolean;
  hasFlag: (k: FeatureFlagKey) => boolean;
  /** Module keys (nav ids) the user holds via an active temporary delegation. */
  delegatedModules?: string[];
}

/** Filter a nav list by feature flags + role permissions (+ active delegations). */
export function filterNav(items: NavItem[], ctx: NavFilterCtx): NavItem[] {
  return items.filter((it) => {
    if (it.flag && !ctx.hasFlag(it.flag)) return false;
    // A live delegation surfaces the module even without the base read permission,
    // so the substitute can actually reach what they've been asked to operate.
    if (ctx.delegatedModules?.includes(it.id)) return true;
    if (it.permission && !ctx.isSuperAdmin && !ctx.can(it.permission)) return false;
    if (it.anyPermission && !ctx.isSuperAdmin && !it.anyPermission.some((p) => ctx.can(p))) return false;
    return true;
  });
}
