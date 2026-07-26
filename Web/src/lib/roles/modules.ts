import type { RoleAction } from './types';

/**
 * The parts of the app a role can be granted actions on (the columns of the
 * permission matrix). `legacy` is the permission prefix the existing app/nav
 * gates on (`${legacy}.read`, `${legacy}.write`, …) — usually identical to the
 * matrix key, but a few differ (health→medical, childprotection→pocso, …).
 */
export interface AppModule {
  key: string;
  label: string;
  legacy: string;
}

export const APP_MODULES: AppModule[] = [
  { key: 'students', label: 'Students — records & profiles', legacy: 'students' },
  { key: 'certificates', label: 'Certificates — issue & register', legacy: 'certificates' },
  { key: 'admissions', label: 'Admissions', legacy: 'admissions' },
  { key: 'attendance', label: 'Student attendance', legacy: 'attendance' },
  { key: 'academics', label: 'Academics & timetable', legacy: 'academics' },
  { key: 'gradebook', label: 'Class assessments', legacy: 'gradebook' },
  { key: 'homework', label: 'Homework', legacy: 'homework' },
  { key: 'exams', label: 'Examinations', legacy: 'exams' },
  { key: 'qpaper', label: 'Question papers', legacy: 'exams' },
  { key: 'hpc', label: 'Progress cards (HPC)', legacy: 'gradebook' },
  { key: 'reportcard', label: 'Report cards', legacy: 'gradebook' },
  { key: 'library', label: 'Library', legacy: 'library' },
  { key: 'fees', label: 'Fees & finance', legacy: 'fees' },
  { key: 'expense', label: 'Expense & procurement', legacy: 'expense' },
  { key: 'payroll', label: 'Payroll', legacy: 'payroll' },
  { key: 'hr', label: 'Human resources', legacy: 'hr' },
  { key: 'transport', label: 'Transport', legacy: 'transport' },
  { key: 'hostel', label: 'Hostel', legacy: 'hostel' },
  { key: 'health', label: 'Health / medical', legacy: 'medical' },
  { key: 'counseling', label: 'Counselling', legacy: 'counseling' },
  { key: 'childprotection', label: 'Child protection (POCSO)', legacy: 'pocso' },
  { key: 'sped', label: 'Special education (IEP)', legacy: 'iep' },
  { key: 'communication', label: 'Communication & notices', legacy: 'communication' },
  { key: 'events', label: 'Events & activities', legacy: 'events' },
  { key: 'reports', label: 'Reports & analytics', legacy: 'reports' },
  { key: 'compliance', label: 'Compliance (UDISE / RTE / SMC)', legacy: 'compliance' },
  { key: 'consent', label: 'Privacy & consent', legacy: 'consent' },
  { key: 'visitors', label: 'Visitors & gate', legacy: 'visitors' },
  { key: 'security', label: 'Security', legacy: 'security' },
  { key: 'canteen', label: 'Canteen', legacy: 'canteen' },
  { key: 'facility', label: 'Assets & facility', legacy: 'facility' },
  { key: 'delegation', label: 'Delegation (grant cover access)', legacy: 'delegation' },
  { key: 'settings', label: 'School settings', legacy: 'settings' },
  { key: 'users', label: 'Users & roles', legacy: 'users' },
  { key: 'audit', label: 'Audit logs', legacy: 'audit' },
];

export const MODULE_LABEL: Record<string, string> = Object.fromEntries(
  APP_MODULES.map((m) => [m.key, m.label]),
);

export const ROLE_ACTION_LABEL: Record<RoleAction, string> = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  approve: 'Approve',
  export: 'Export',
  delete: 'Delete',
  manage: 'Manage',
};
