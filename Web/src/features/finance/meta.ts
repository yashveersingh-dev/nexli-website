import type { BadgeVariant } from '@/components/Badge';
import type { IconName } from '@/components/Icon';
import type {
  FeeCategory, FeeFrequency, StudentFeeCategory, InvoiceStatus, PaymentMethod, PaymentStatus, RefundMethod,
  ConcessionType, RequisitionStatus, POStatus, GRNStatus, ExpenseCategory, ExpenseStatus, PayrollRunStatus,
} from '@/types/finance';

/* ------------------------------- Fees ------------------------------------- */

export const FEE_CATEGORY_META: Record<FeeCategory, { label: string; icon: IconName }> = {
  tuition: { label: 'Tuition', icon: 'book' },
  admission: { label: 'Admission', icon: 'user-plus' },
  exam: { label: 'Examination', icon: 'file-text' },
  transport: { label: 'Transport', icon: 'bus' },
  hostel: { label: 'Hostel', icon: 'building' },
  lab: { label: 'Laboratory', icon: 'flask' },
  library: { label: 'Library', icon: 'book' },
  sports: { label: 'Sports', icon: 'award' },
  activity: { label: 'Activity', icon: 'sparkles' },
  development: { label: 'Development', icon: 'trending-up' },
  misc: { label: 'Miscellaneous', icon: 'box' },
};
export const FEE_CATEGORY_OPTIONS = (Object.keys(FEE_CATEGORY_META) as FeeCategory[]).map((v) => ({ value: v, label: FEE_CATEGORY_META[v].label }));

export const FEE_FREQUENCY_META: Record<FeeFrequency, { label: string; short: string; perYear: number }> = {
  one_time: { label: 'One-time', short: '1×', perYear: 1 },
  annual: { label: 'Annual', short: '/yr', perYear: 1 },
  term: { label: 'Per term', short: '/term', perYear: 3 },
  monthly: { label: 'Monthly', short: '/mo', perYear: 12 },
};
export const FEE_FREQUENCY_OPTIONS = (Object.keys(FEE_FREQUENCY_META) as FeeFrequency[]).map((v) => ({ value: v, label: FEE_FREQUENCY_META[v].label }));

export const STUDENT_FEE_CATEGORY_META: Record<StudentFeeCategory, { label: string; variant: BadgeVariant }> = {
  general: { label: 'General', variant: 'muted' },
  rte: { label: 'RTE / EWS', variant: 'info' },
  staff_ward: { label: 'Staff ward', variant: 'info' },
  sibling: { label: 'Sibling', variant: 'info' },
  concession: { label: 'Concession', variant: 'warning' },
};
export const STUDENT_FEE_CATEGORY_OPTIONS = (Object.keys(STUDENT_FEE_CATEGORY_META) as StudentFeeCategory[]).map((v) => ({ value: v, label: STUDENT_FEE_CATEGORY_META[v].label }));

export const CONCESSION_TYPE_OPTIONS: { value: ConcessionType; label: string }[] = [
  { value: 'rte', label: 'RTE / EWS quota' },
  { value: 'staff_ward', label: 'Staff ward' },
  { value: 'sibling', label: 'Sibling discount' },
  { value: 'need_based', label: 'Need-based / hardship' },
  { value: 'merit', label: 'Merit scholarship' },
  { value: 'other', label: 'Other' },
];

export const INVOICE_STATUS_META: Record<InvoiceStatus, { label: string; variant: BadgeVariant }> = {
  unpaid: { label: 'Unpaid', variant: 'danger' },
  partial: { label: 'Partial', variant: 'warning' },
  paid: { label: 'Paid', variant: 'success' },
  overdue: { label: 'Overdue', variant: 'danger' },
  cancelled: { label: 'Cancelled', variant: 'muted' },
};

export const PAYMENT_METHOD_META: Record<PaymentMethod, { label: string; icon: IconName }> = {
  cash: { label: 'Cash', icon: 'wallet' },
  cheque: { label: 'Cheque', icon: 'file-text' },
  dd: { label: 'Demand draft', icon: 'file-text' },
  upi: { label: 'UPI', icon: 'phone' },
  bank_transfer: { label: 'Bank transfer', icon: 'building' },
  card: { label: 'Card', icon: 'credit-card' },
  online: { label: 'Online', icon: 'credit-card' },
};
export const PAYMENT_METHOD_OPTIONS = (Object.keys(PAYMENT_METHOD_META) as PaymentMethod[]).map((v) => ({ value: v, label: PAYMENT_METHOD_META[v].label }));

export const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; variant: BadgeVariant }> = {
  cleared: { label: 'Cleared', variant: 'success' },
  pending: { label: 'Pending', variant: 'warning' },
  bounced: { label: 'Bounced', variant: 'danger' },
  refunded: { label: 'Refunded', variant: 'info' },
};

export const REFUND_METHOD_META: Record<RefundMethod, { label: string; icon: IconName }> = {
  cash: { label: 'Cash', icon: 'wallet' },
  cheque: { label: 'Cheque', icon: 'file-text' },
  bank_transfer: { label: 'Bank transfer', icon: 'building' },
  upi: { label: 'UPI', icon: 'phone' },
  adjustment: { label: 'Adjustment', icon: 'edit' },
};
export const REFUND_METHOD_OPTIONS = (Object.keys(REFUND_METHOD_META) as RefundMethod[]).map((v) => ({ value: v, label: REFUND_METHOD_META[v].label }));

/* --------------------- Expense & procurement ------------------------------ */

export const REQUISITION_STATUS_META: Record<RequisitionStatus, { label: string; variant: BadgeVariant }> = {
  draft: { label: 'Draft', variant: 'muted' },
  submitted: { label: 'Submitted', variant: 'info' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
  clarification_requested: { label: 'Clarification needed', variant: 'warning' },
  returned: { label: 'Returned', variant: 'warning' },
  ordered: { label: 'Ordered', variant: 'info' },
  closed: { label: 'Closed', variant: 'muted' },
};

export const PO_STATUS_META: Record<POStatus, { label: string; variant: BadgeVariant }> = {
  issued: { label: 'Issued', variant: 'info' },
  partial: { label: 'Partly received', variant: 'warning' },
  received: { label: 'Received', variant: 'success' },
  closed: { label: 'Closed', variant: 'muted' },
  cancelled: { label: 'Cancelled', variant: 'danger' },
};

export const GRN_STATUS_META: Record<GRNStatus, { label: string; variant: BadgeVariant }> = {
  partial: { label: 'Partial', variant: 'warning' },
  complete: { label: 'Complete', variant: 'success' },
};

export const EXPENSE_CATEGORY_META: Record<ExpenseCategory, { label: string; icon: IconName }> = {
  utilities: { label: 'Utilities', icon: 'wifi' },
  maintenance: { label: 'Maintenance', icon: 'settings' },
  stationery: { label: 'Stationery', icon: 'edit' },
  lab: { label: 'Lab consumables', icon: 'flask' },
  sports: { label: 'Sports', icon: 'award' },
  transport: { label: 'Transport', icon: 'bus' },
  events: { label: 'Events', icon: 'calendar' },
  rent: { label: 'Rent / lease', icon: 'building' },
  salary: { label: 'Salary', icon: 'users' },
  procurement: { label: 'Procurement', icon: 'box' },
  misc: { label: 'Miscellaneous', icon: 'box' },
};
export const EXPENSE_CATEGORY_OPTIONS = (Object.keys(EXPENSE_CATEGORY_META) as ExpenseCategory[]).map((v) => ({ value: v, label: EXPENSE_CATEGORY_META[v].label }));

export const EXPENSE_STATUS_META: Record<ExpenseStatus, { label: string; variant: BadgeVariant }> = {
  recorded: { label: 'Recorded', variant: 'info' },
  approved: { label: 'Approved', variant: 'success' },
  paid: { label: 'Paid', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
};

/* ------------------------------ Payroll ----------------------------------- */

export const PAYROLL_RUN_STATUS_META: Record<PayrollRunStatus, { label: string; variant: BadgeVariant }> = {
  draft: { label: 'Draft', variant: 'warning' },
  finalized: { label: 'Approved', variant: 'info' },
  paid: { label: 'Paid', variant: 'success' },
};

/**
 * UI phase for a payroll run (ROLE_AUDIT §7c approval split). The stored status
 * union stays `draft|finalized|paid`; "awaiting approval" is a *draft that has
 * been submitted* (`submittedAt` set). `finalized` is shown as "Approved" — the
 * run has cleared Principal/VP-Admin sign-off and is ready for disbursement.
 */
export type PayrollRunPhase = 'draft' | 'awaiting' | 'approved' | 'paid';

export const PAYROLL_RUN_PHASE_META: Record<PayrollRunPhase, { label: string; variant: BadgeVariant; icon: IconName }> = {
  draft: { label: 'Draft', variant: 'warning', icon: 'edit' },
  awaiting: { label: 'Awaiting approval', variant: 'info', icon: 'clock' },
  approved: { label: 'Approved', variant: 'info', icon: 'shield-check' },
  paid: { label: 'Paid', variant: 'success', icon: 'wallet' },
};

/** Derive the UI phase from a run's status + submission stamp. */
export function payrollRunPhase(run: { status: PayrollRunStatus; submittedAt?: number }): PayrollRunPhase {
  if (run.status === 'paid') return 'paid';
  if (run.status === 'finalized') return 'approved';
  return run.submittedAt ? 'awaiting' : 'draft';
}

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const monthLabel = (m: number, y: number) => `${MONTHS[(m - 1 + 12) % 12]} ${y}`;

/**
 * India statutory defaults (FY 2024-25 norms). These are editable per payslip —
 * PT in particular varies by state, so it's a sensible default, not a mandate.
 */
export const STATUTORY = {
  pfRateEmployee: 0.12, // 12% of basic (employee share)
  pfWageCeiling: 15000, // EPF statutory wage ceiling
  esiRateEmployee: 0.0075, // 0.75% of gross (employee share)
  esiGrossCeiling: 21000, // ESI applies when gross ≤ ₹21,000
};

export function computePF(basic: number, applicable: boolean): number {
  if (!applicable) return 0;
  return Math.round(Math.min(basic, STATUTORY.pfWageCeiling) * STATUTORY.pfRateEmployee);
}
export function computeESI(gross: number, applicable: boolean): number {
  if (!applicable || gross > STATUTORY.esiGrossCeiling) return 0;
  // ESIC rule: the employee contribution is rounded UP to the next higher rupee
  // (Regulation 40), not nearest — `Math.round` would under-deduct on a .49 paisa.
  return Math.ceil(gross * STATUTORY.esiRateEmployee);
}
/** Generic monthly professional-tax slab (state-specific in practice). */
export function computePT(gross: number, applicable: boolean): number {
  if (!applicable) return 0;
  if (gross <= 7500) return 0;
  if (gross <= 10000) return 175;
  return 200;
}
