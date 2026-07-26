import type { TenantRecord } from './models';

/* ============================================================================
 * Finance (P5) — fees, expense & procurement, payroll.
 * Free-tier / manual: no payment gateway. Money stored as whole INR rupees
 * (numbers); India statutory defaults computed in `features/finance/meta.ts`.
 * ==========================================================================*/

/* ------------------------------- Fees ------------------------------------- */

export type FeeCategory =
  | 'tuition' | 'admission' | 'exam' | 'transport' | 'hostel'
  | 'lab' | 'library' | 'sports' | 'activity' | 'development' | 'misc';

export type FeeFrequency = 'one_time' | 'annual' | 'term' | 'monthly';

/** Per-student fee category (drives concession defaults + reporting). */
export type StudentFeeCategory = 'general' | 'rte' | 'staff_ward' | 'sibling' | 'concession';

/** A configurable fee component (Tuition, Transport, Exam, …). */
export interface FeeHead extends TenantRecord {
  name: string;
  code?: string;
  category: FeeCategory;
  refundable?: boolean;
  active?: boolean;
}

export interface FeeStructureItem {
  headId: string;
  headName: string;
  category: FeeCategory;
  amount: number;
  frequency: FeeFrequency;
}

/** A named bundle of fee heads with amounts, for a grade / category / year. */
export interface FeeStructure extends TenantRecord {
  name: string;
  academicYear: string;
  gradeId?: string;
  gradeName?: string;
  studentCategory?: StudentFeeCategory;
  items: FeeStructureItem[];
  /** Annualised total of all items. */
  total: number;
  active?: boolean;
}

export type InvoiceStatus = 'unpaid' | 'partial' | 'paid' | 'overdue' | 'cancelled';

export interface InvoiceLine {
  headId: string;
  headName: string;
  category: FeeCategory;
  amount: number;
}

export type ConcessionType = 'rte' | 'staff_ward' | 'sibling' | 'need_based' | 'merit' | 'other';

export interface ConcessionLine {
  type: ConcessionType;
  reason: string;
  amount: number;
  approvedByUid?: string;
  approvedByName?: string;
  approvedAt?: number;
}

/** A demand raised on a student (term / installment) — the fee ledger row. */
export interface FeeInvoice extends TenantRecord {
  studentId: string;
  studentName: string;
  admissionNo?: string;
  gradeId?: string;
  gradeName?: string;
  sectionName?: string;
  academicYear: string;
  structureId?: string;
  title: string; // e.g. "Term 1 · 2025-26"
  lines: InvoiceLine[];
  concessions?: ConcessionLine[];
  grossAmount: number;
  concessionAmount: number;
  netAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: InvoiceStatus;
  issuedDate?: number;
  dueDate?: number;
  notes?: string;
}

export type PaymentMethod = 'cash' | 'cheque' | 'dd' | 'upi' | 'bank_transfer' | 'card' | 'online';
export type PaymentStatus = 'cleared' | 'pending' | 'bounced' | 'refunded';

/** A recorded (manual) payment, generating a unique receipt number. */
export interface FeePayment extends TenantRecord {
  receiptNo: string;
  studentId: string;
  studentName: string;
  admissionNo?: string;
  invoiceId?: string;
  invoiceTitle?: string;
  amount: number;
  method: PaymentMethod;
  reference?: string; // txn id / cheque no / UPI ref
  bankName?: string;
  paidAt: number;
  status: PaymentStatus;
  note?: string;
  recordedByUid?: string;
  recordedByName?: string;
}

export type RefundMethod = 'cash' | 'cheque' | 'bank_transfer' | 'upi' | 'adjustment';

/**
 * A recorded refund against a student's fee payment / invoice. Stored as its own
 * `fee_refunds` record (NOT a negative payment) so collection totals stay a clean
 * sum of positive receipts and refunds are auditable in isolation. Reduces the
 * linked invoice's `paidAmount` atomically; see `recordRefund`.
 */
export interface FeeRefund extends TenantRecord {
  refundNo: string;
  studentId: string;
  studentName: string;
  admissionNo?: string;
  /** Invoice the refund is booked against (optional for an unlinked refund). */
  invoiceId?: string;
  invoiceTitle?: string;
  /** Originating receipt, when the refund traces to one specific payment. */
  paymentId?: string;
  receiptNo?: string;
  amount: number;
  method: RefundMethod;
  reason: string;
  reference?: string;
  refundedAt: number;
  refundedByUid?: string;
  refundedByName?: string;
  note?: string;
}

/** School-level payment configuration (one doc: finance_settings/main). */
export interface FinanceSettings {
  receiptPrefix?: string;
  upiId?: string;
  payeeName?: string;
  bankName?: string;
  accountNo?: string;
  ifsc?: string;
  branch?: string;
  qrImageUrl?: string;
  bounceCharge?: number;
  notes?: string;
}

/* --------------------- Expense & procurement ------------------------------ */

export type RequisitionStatus =
  | 'draft' | 'submitted' | 'approved' | 'rejected'
  | 'clarification_requested' | 'returned'
  | 'ordered' | 'closed';

export interface RequisitionItem {
  name: string;
  qty: number;
  unit?: string;
  estCost?: number;
}

export interface Requisition extends TenantRecord {
  reqNo: string;
  title: string;
  department?: string;
  items: RequisitionItem[];
  estTotal: number;
  justification?: string;
  status: RequisitionStatus;
  requestedByUid?: string;
  requestedByName?: string;
  approverUid?: string;
  approverName?: string;
  decidedAt?: number;
  decisionNote?: string;
  /** Latest approver note (approve/reject/clarification/return) — surfaced on the detail page. */
  approvalNote?: string;
  /** Display name of whoever took the most recent approval action. */
  decidedByName?: string;
  /** Outstanding clarification question (set when status = clarification_requested). */
  clarificationNote?: string;
}

/**
 * A single configurable approval-routing rule (per school). An empty ruleset =
 * simple single-step approval. Amounts are whole INR rupees; `minAmount`/
 * `maxAmount` bound the band a requisition's `estTotal` must fall in to match.
 */
export interface ApprovalRule {
  id: string;
  label: string;
  minAmount?: number;
  maxAmount?: number;
  /** Role id expected to approve (advisory routing hint, e.g. 'principal'). */
  approverRole?: string;
  /** Human label for the approver (e.g. "VP Admin", "Principal", "Trustee"). */
  approverLabel?: string;
}

/** School-level expense & procurement configuration (one doc: expense_settings/main). */
export interface ExpenseSettings {
  /** Ordered approval-routing rules, matched by a requisition's estimated total. */
  approvalRules?: ApprovalRule[];
  /** When false, submitting a requisition approves it directly (no sign-off step). */
  requireApproval?: boolean;
}

export interface Vendor extends TenantRecord {
  name: string;
  category?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  address?: string;
  bankName?: string;
  accountNo?: string;
  ifsc?: string;
  rating?: number;
  active?: boolean;
}

export type POStatus = 'issued' | 'partial' | 'received' | 'closed' | 'cancelled';

export interface POItem {
  name: string;
  qty: number;
  unit?: string;
  rate: number;
  amount: number;
  receivedQty?: number;
}

export interface PurchaseOrder extends TenantRecord {
  poNo: string;
  requisitionId?: string;
  vendorId: string;
  vendorName?: string;
  items: POItem[];
  subtotal: number;
  taxPercent?: number;
  taxAmount?: number;
  total: number;
  status: POStatus;
  orderedDate?: number;
  expectedDate?: number;
  note?: string;
}

export type GRNStatus = 'partial' | 'complete';

export interface GRNItem {
  name: string;
  orderedQty: number;
  receivedQty: number;
}

export interface GoodsReceipt extends TenantRecord {
  grnNo: string;
  poId: string;
  poNo?: string;
  vendorName?: string;
  items: GRNItem[];
  receivedDate: number;
  status: GRNStatus;
  receivedByUid?: string;
  receivedByName?: string;
  note?: string;
}

export type ExpenseCategory =
  | 'utilities' | 'maintenance' | 'stationery' | 'lab' | 'sports'
  | 'transport' | 'events' | 'rent' | 'salary' | 'procurement' | 'misc';

export type ExpenseStatus = 'recorded' | 'approved' | 'paid' | 'rejected';

export interface Expense extends TenantRecord {
  expenseNo: string;
  category: ExpenseCategory;
  description: string;
  vendorId?: string;
  vendorName?: string;
  poId?: string;
  amount: number;
  date: number;
  method?: PaymentMethod;
  reference?: string;
  status: ExpenseStatus;
  pettyCash?: boolean;
  billUrl?: string;
  recordedByUid?: string;
  recordedByName?: string;
  approvedByUid?: string;
  approvedByName?: string;
}

/* ------------------------------ Payroll ----------------------------------- */

export interface SalaryComponentLine {
  name: string;
  amount: number;
}

/** A staff member's salary configuration (current effective). */
export interface SalaryStructure extends TenantRecord {
  staffId: string;
  staffName?: string;
  designation?: string;
  department?: string;
  effectiveFrom?: number;
  basic: number;
  hra: number;
  da: number;
  conveyance: number;
  specialAllowance: number;
  otherEarnings?: SalaryComponentLine[];
  /** Monthly gross (sum of earnings). */
  grossMonthly: number;
  ctcAnnual: number;
  pfApplicable: boolean;
  esiApplicable: boolean;
  ptApplicable: boolean;
  tdsMonthly?: number;
  active?: boolean;
}

export type PayrollRunStatus = 'draft' | 'finalized' | 'paid';

export interface PayrollRun extends TenantRecord {
  month: number; // 1–12
  year: number;
  label: string; // "June 2026"
  status: PayrollRunStatus;
  staffCount: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  finalizedAt?: number;
  paidAt?: number;
  /* --- Approval split (ROLE_AUDIT §7c) ---
   * A draft RUN is submitted for sign-off by HR/Accounts, then APPROVED by
   * Principal/VP-Admin (the ex-officio Drawing & Disbursing Officer) → finalized;
   * only then may Accounts disburse (mark paid). A draft is "awaiting approval"
   * when `submittedAt` is set while still `status: 'draft'`. */
  /** Set when HR/Accounts submit the draft for approval; cleared on Return. */
  submittedAt?: number;
  /** Who submitted the draft for approval. Separation of duties: the submitter
   *  may NOT also approve the same run (enforced in `approvePayrollRun` + UI). */
  submittedByUid?: string;
  submittedByName?: string;
  /** Display name of the Principal/VP-Admin who approved the run. */
  approvedByName?: string;
  /** When the run was approved (→ finalized). */
  approvedAt?: number;
  /** Latest approver note — set on Return (reason) and stamped on Approve. */
  approvalNote?: string;
}

export interface PayslipEarnings {
  basic: number;
  hra: number;
  da: number;
  conveyance: number;
  special: number;
  other: number;
}

export interface PayslipDeductions {
  pf: number;
  esi: number;
  pt: number;
  tds: number;
  lop: number;
  other: number;
}

export interface Payslip extends TenantRecord {
  runId: string;
  month: number;
  year: number;
  label: string;
  staffId: string;
  staffName: string;
  designation?: string;
  earnings: PayslipEarnings;
  deductions: PayslipDeductions;
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  paidDays?: number;
  lopDays?: number;
  status: 'generated' | 'paid';
}
