/**
 * Bridge between the platform subscription/plan records and the pure GST invoice
 * generator (`gst.ts`). Resolves the actual billed amount for a school's current
 * billing cycle (never hardcoded — read from the custom price or the assigned plan)
 * and assembles the `TaxInvoiceOpts` for `buildTaxInvoiceHtml`.
 *
 * GENERATION-ONLY: nothing is persisted. The invoice number here is derived
 * deterministically from the school + renewal date so re-printing is stable; if a
 * stored, gap-free sequence is ever required, persist to `subscription_invoices`.
 */
import { resolveSchoolPlan } from '@/features/platform/data';
import { formatDate } from '@/lib/format';
import type { Plan, School, GstSellerSettings } from '@/types/models';
import {
  resolveSeller,
  buildTaxInvoiceHtml,
  financialYearLabel,
  formatInvoiceNumber,
  type TaxInvoiceOpts,
} from './gst';

/**
 * Amount actually billed for one cycle (whole INR, pre-tax), from the school's
 * custom/founding price or the assigned plan. Monthly cycle → monthly figure;
 * annual cycle → annual figure (falling back to monthly × 12). Returns null when
 * no price is known (so the UI can refuse rather than invoice ₹0).
 */
export function subscriptionBilledAmount(school: School, plans: Plan[]): number | null {
  const annual = school.billingCycle === 'annual';
  if (annual) {
    if (school.customPriceAnnual != null && school.customPriceAnnual > 0) return school.customPriceAnnual;
    const plan = resolveSchoolPlan(school, plans);
    if (plan?.priceAnnual != null && plan.priceAnnual > 0) return plan.priceAnnual;
    // Fall back to 12× the monthly figure if no explicit annual price exists.
    const m = monthlyAmount(school, plans);
    return m != null ? m * 12 : null;
  }
  return monthlyAmount(school, plans);
}

/** Monthly billed figure (custom override → plan), whole INR. */
function monthlyAmount(school: School, plans: Plan[]): number | null {
  if (school.customPriceMonthly != null && school.customPriceMonthly > 0) return school.customPriceMonthly;
  if (school.customPriceAnnual != null && school.customPriceAnnual > 0) return Math.round(school.customPriceAnnual / 12);
  const plan = resolveSchoolPlan(school, plans);
  if (!plan) return null;
  if (plan.priceMonthly != null && plan.priceMonthly > 0) return plan.priceMonthly;
  if (plan.priceAnnual != null && plan.priceAnnual > 0) return Math.round(plan.priceAnnual / 12);
  return null;
}

/** Human-readable billing-period text ending at the renewal date, when known. */
function periodText(school: School): string | undefined {
  const end = school.renewalDate;
  if (end == null) return undefined;
  const start = new Date(end);
  if (school.billingCycle === 'annual') start.setFullYear(start.getFullYear() - 1);
  else start.setMonth(start.getMonth() - 1);
  return `${formatDate(start.getTime())} – ${formatDate(end)}`;
}

/**
 * Assemble the GST tax-invoice options for a school's current subscription.
 * Returns null when no billable amount is resolvable. The invoice date defaults to
 * now; the invoice number is `NEXLI/<FY>/<seq>` where the sequence is derived from
 * the renewal date (stable across reprints, gap-free not guaranteed).
 */
export function buildSubscriptionInvoiceOpts(
  school: School,
  plans: Plan[],
  now = Date.now(),
  seller?: GstSellerSettings | null,
): TaxInvoiceOpts | null {
  const taxableValue = subscriptionBilledAmount(school, plans);
  if (taxableValue == null) return null;

  const cycleLabel = school.billingCycle === 'annual' ? 'Annual' : 'Monthly';
  const planName = school.plan || resolveSchoolPlan(school, plans)?.name || 'Subscription';
  const fy = financialYearLabel(now);
  // Deterministic per-school sequence from the renewal date (YYMMDD); NOT a global
  // gap-free counter — see file note. Keeps reprints identical for the same period.
  const seqBase = school.renewalDate ?? now;
  const d = new Date(seqBase);
  const seq = Number(`${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`);

  return {
    seller: resolveSeller(seller),
    buyer: {
      name: school.name,
      stateName: school.state,
      addressLines: [school.city, school.state, school.pincode].filter(Boolean) as string[],
      email: school.email ?? school.adminEmail,
    },
    invoiceNumber: formatInvoiceNumber(seq, fy),
    invoiceDateText: formatDate(now),
    periodText: periodText(school),
    line: {
      description: `Nexli subscription — ${planName} plan (${cycleLabel})`,
      taxableValue,
    },
    ratePct: 18,
  };
}

/** Build the full printable invoice HTML for a school's subscription (or null). */
export function buildSubscriptionInvoiceHtml(school: School, plans: Plan[], now = Date.now(), seller?: GstSellerSettings | null): string | null {
  const opts = buildSubscriptionInvoiceOpts(school, plans, now, seller);
  return opts ? buildTaxInvoiceHtml(opts) : null;
}
