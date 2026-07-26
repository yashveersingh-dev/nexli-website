import type { TenantRecord } from './models';
import type { RoleId } from './roles';
import type { Gender, BloodGroup } from './sis';

/* ============================ Staff records / HRMS ============================ */

export type EmploymentType = 'permanent' | 'probation' | 'contract' | 'part_time' | 'visiting';
export type StaffStatus = 'active' | 'on_leave' | 'suspended' | 'resigned' | 'retired';

export interface Qualification {
  degree: string;
  institution?: string;
  year?: number;
  specialization?: string;
}

export interface Contract {
  type: EmploymentType;
  startDate?: number;
  endDate?: number;
  terms?: string;
}

/**
 * A staff/employee profile (tenant-scoped: /schools/{id}/staff/{uid}). Linked to
 * the member doc by uid (member = auth/role; staff = HR record). Payroll/salary
 * details live in the finance module (P5), not here.
 */
export interface StaffProfile extends TenantRecord {
  uid?: string;
  employeeId: string;
  name: string;
  roleId?: RoleId;
  designation?: string;
  department?: string;
  employmentType?: EmploymentType;
  status: StaffStatus;
  joiningDate?: number;
  photoUrl?: string;

  // Personal
  gender?: Gender;
  dob?: number;
  bloodGroup?: BloodGroup;
  maritalStatus?: 'single' | 'married' | 'other';

  // Contact
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;

  // Professional
  qualifications?: Qualification[];
  experienceYears?: number;
  subjectsTaught?: string[];
  classesAssigned?: string[];
  reportingToUid?: string;
  reportingToName?: string;
  contract?: Contract;

  // Govt / statutory (masked)
  aadhaarLast4?: string;
  panMasked?: string;
  uanNumber?: string;

  tags?: string[];
}

export type LeaveType = 'casual' | 'sick' | 'earned' | 'maternity' | 'paternity' | 'unpaid' | 'duty';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface LeaveRequest extends TenantRecord {
  staffUid: string;
  staffName: string;
  type: LeaveType;
  fromDate: number;
  toDate: number;
  days: number;
  reason?: string;
  status: LeaveStatus;
  approverUid?: string;
  approverName?: string;
  appliedDate?: number;
}
