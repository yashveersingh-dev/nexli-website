/**
 * GST tax-invoice generation for Nexli's OWN subscription billing.
 *
 * Generates a printable, GST-compliant tax invoice for a school's subscription:
 *   seller  = Nexli (the SaaS provider — see NEXLI_SELLER placeholders below)
 *   buyer   = the school (tenant)
 *   line    = the subscription plan for one billing period
 *
 * The pure GST maths (`computeGst`) is split out and unit-tested (`gst.test.ts`):
 * intra-state → CGST + SGST split; inter-state → a single IGST line; both at the
 * same total rate (default 18%). The invoice HTML reuses the certificates print
 * pattern (`openPrintWindow` / `writePrintWindow`, re-exported here).
 *
 * Prices are NEVER hardcoded — `taxableValue` is passed in by the caller from the
 * plan/subscription record (`NEXLI_PRICING.md` is internal reference only).
 *
 * This module is GENERATION-ONLY: it does not persist anything. If invoices are
 * ever stored, use a platform-scoped `subscription_invoices` collection.
 */
import { openPrintWindow, writePrintWindow } from '@/features/certificates/print';

export { openPrintWindow, writePrintWindow };

/* ============================ NEEDS YASHVEER ==============================
 * Nexli's own legal-entity billing details. These are CONFIGURABLE PLACEHOLDERS
 * and MUST be replaced with the real registered values before any invoice is
 * issued to a customer. An invoice with a wrong/blank GSTIN is not valid.
 *
 * Ideally these move to platform settings (super-admin editable) rather than a
 * source constant — left here as a single clearly-marked block for now.
 * ========================================================================= */
export interface SellerDetails {
  legalName: string;
  tradeName?: string;
  gstin: string;
  /** Seller's state — determines intra- vs inter-state (CGST+SGST vs IGST). */
  stateName: string;
  /** 2-digit GST state code (matches the first two digits of the GSTIN). */
  stateCode: string;
  addressLines: string[];
  email?: string;
  phone?: string;
  /** SAC for SaaS / online information services. 998314 (IT services) — VERIFY. */
  sac: string;
  /** PAN (printed on the invoice; usually embedded in the GSTIN). */
  pan?: string;
  /** Bank details for payment (optional on a paid invoice). */
  bankName?: string;
  bankAccount?: string;
  bankIfsc?: string;
}

/** NEEDS YASHVEER: replace every placeholder below with Nexli's real registered details. */
export const NEXLI_SELLER: SellerDetails = {
  legalName: 'NEEDS YASHVEER — Nexli legal entity name (Pvt Ltd / LLP / Proprietor)',
  tradeName: 'Nexli',
  gstin: 'NEEDS YASHVEER — 15-char GSTIN', // e.g. 09ABCDE1234F1Z5
  stateName: 'NEEDS YASHVEER — state of registration',
  stateCode: '00', // NEEDS YASHVEER — 2-digit GST state code (first 2 digits of GSTIN)
  addressLines: ['NEEDS YASHVEER — registered address line 1', 'line 2', 'City, State, PIN'],
  email: 'NEEDS YASHVEER — billing email',
  phone: 'NEEDS YASHVEER — billing phone',
  // SAC 9983 = "Other professional, technical and business services";
  // 998314 = "Information technology (IT) design and development services".
  // VERIFY the correct SAC for the supply with a tax advisor.
  sac: '998314',
  pan: 'NEEDS YASHVEER — PAN',
};

/**
 * Editable subset of seller details (platform settings shape — every field
 * optional). Stored at `platform_settings/global → gstSeller` and overlaid on the
 * `NEXLI_SELLER` placeholder by `resolveSeller`. Kept structural (not importing the
 * models type) so this module stays Firebase-free and unit-testable.
 */
export interface SellerSettingsInput {
  legalName?: string;
  tradeName?: string;
  gstin?: string;
  stateName?: string;
  stateCode?: string;
  addressLines?: string[];
  email?: string;
  phone?: string;
  sac?: string;
  pan?: string;
  bankName?: string;
  bankAccount?: string;
  bankIfsc?: string;
}

/**
 * Resolve the effective seller for an invoice: overlay the (super-admin configured)
 * settings onto the `NEXLI_SELLER` placeholder, taking each provided non-blank
 * field from settings and otherwise falling back to the placeholder. Pure — so the
 * invoice builder is identical whether the config is read from Firestore or passed
 * in a test. A blank/whitespace string is treated as "unset" (keeps the placeholder).
 */
export function resolveSeller(settings?: SellerSettingsInput | null): SellerDetails {
  const s = settings ?? {};
  const str = (v: string | undefined, fallback: string): string => {
    const t = v?.trim();
    return t ? t : fallback;
  };
  const optStr = (v: string | undefined, fallback?: string): string | undefined => {
    const t = v?.trim();
    return t ? t : fallback;
  };
  const lines = (s.addressLines ?? []).map((l) => l?.trim()).filter((l): l is string => !!l);
  return {
    legalName: str(s.legalName, NEXLI_SELLER.legalName),
    tradeName: optStr(s.tradeName, NEXLI_SELLER.tradeName),
    gstin: str(s.gstin, NEXLI_SELLER.gstin),
    stateName: str(s.stateName, NEXLI_SELLER.stateName),
    stateCode: str(s.stateCode, NEXLI_SELLER.stateCode),
    addressLines: lines.length ? lines : NEXLI_SELLER.addressLines,
    email: optStr(s.email, NEXLI_SELLER.email),
    phone: optStr(s.phone, NEXLI_SELLER.phone),
    sac: str(s.sac, NEXLI_SELLER.sac),
    pan: optStr(s.pan, NEXLI_SELLER.pan),
    bankName: optStr(s.bankName, NEXLI_SELLER.bankName),
    bankAccount: optStr(s.bankAccount, NEXLI_SELLER.bankAccount),
    bankIfsc: optStr(s.bankIfsc, NEXLI_SELLER.bankIfsc),
  };
}

/* ============================== GST maths ================================ */

/** Round to 2 decimals (paise), avoiding binary-float drift (e.g. 1.005 → 1.01). */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export interface GstInput {
  /** Taxable value (pre-tax amount) in rupees — from the plan/subscription record. */
  taxableValue: number;
  /** Total GST rate as a percentage (e.g. 18 for 18%). */
  ratePct: number;
  /** True when seller & buyer are in the SAME state (CGST+SGST); false → IGST. */
  intraState: boolean;
}

export interface GstResult {
  taxableValue: number;
  ratePct: number;
  intraState: boolean;
  /** CGST amount (0 for inter-state). */
  cgst: number;
  cgstPct: number;
  /** SGST/UTGST amount (0 for inter-state). */
  sgst: number;
  sgstPct: number;
  /** IGST amount (0 for intra-state). */
  igst: number;
  igstPct: number;
  /** Total tax = cgst + sgst + igst. */
  totalTax: number;
  /** Grand total = taxableValue + totalTax (rounded). */
  total: number;
  /** Rounding adjustment applied so `total` is a whole rupee (signed). */
  roundOff: number;
}

/**
 * Pure GST computation for one invoice line/total.
 *
 * - Intra-state: tax is split equally into CGST and SGST, each at half the rate.
 * - Inter-state: a single IGST line at the full rate.
 * Each component is rounded to 2 dp independently (so cgst+sgst can differ from a
 * single igst by a paisa — matching how returns are filed). The grand total is then
 * rounded to the nearest whole rupee and the difference reported as `roundOff`.
 */
export function computeGst({ taxableValue, ratePct, intraState }: GstInput): GstResult {
  const base = round2(taxableValue);
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  let cgstPct = 0;
  let sgstPct = 0;
  let igstPct = 0;

  if (intraState) {
    cgstPct = ratePct / 2;
    sgstPct = ratePct / 2;
    cgst = round2((base * cgstPct) / 100);
    sgst = round2((base * sgstPct) / 100);
  } else {
    igstPct = ratePct;
    igst = round2((base * igstPct) / 100);
  }

  const totalTax = round2(cgst + sgst + igst);
  const rawTotal = round2(base + totalTax);
  // Round the payable grand total to the nearest whole rupee (standard on invoices).
  const total = Math.round(rawTotal);
  const roundOff = round2(total - rawTotal);

  return { taxableValue: base, ratePct, intraState, cgst, cgstPct, sgst, sgstPct, igst, igstPct, totalTax, total, roundOff };
}

/**
 * Decide intra- vs inter-state from the seller and buyer state codes/names.
 * Prefers the 2-digit GST state code (authoritative); falls back to a normalised
 * state-name comparison when a code is missing. Defaults to inter-state (IGST) when
 * the buyer's state is unknown — the safer assumption for a single-tax line.
 */
export function isIntraState(
  seller: Pick<SellerDetails, 'stateCode' | 'stateName'>,
  buyer: { stateCode?: string; stateName?: string },
): boolean {
  const sCode = seller.stateCode?.trim();
  const bCode = buyer.stateCode?.trim();
  if (sCode && bCode && sCode !== '00') return sCode === bCode;
  const norm = (s?: string) => (s ?? '').trim().toLowerCase();
  if (norm(buyer.stateName)) return norm(seller.stateName) === norm(buyer.stateName);
  return false;
}

/* ========================== Amount in words ============================== */

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

/** A 0–99 number in words. */
function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  return `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ''}`;
}

/** A 0–999 number in words. */
function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return `${h ? `${ONES[h]} Hundred${rest ? ' ' : ''}` : ''}${rest ? twoDigits(rest) : ''}`;
}

/**
 * Indian-system amount-in-words for rupees + paise, e.g.
 * 1,23,456.50 → "Rupees One Lakh Twenty Three Thousand Four Hundred Fifty and Fifty Paise Only".
 * Groups: crore, lakh, thousand, hundred (Indian numbering).
 */
export function amountInWords(amount: number): string {
  const rounded = round2(Math.abs(amount));
  const rupees = Math.floor(rounded);
  const paise = Math.round((rounded - rupees) * 100);

  const words = (n: number): string => {
    if (n === 0) return 'Zero';
    const crore = Math.floor(n / 1_00_00_000);
    const lakh = Math.floor((n % 1_00_00_000) / 1_00_000);
    const thousand = Math.floor((n % 1_00_000) / 1000);
    const rest = n % 1000;
    const parts: string[] = [];
    if (crore) parts.push(`${words(crore)} Crore`);
    if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
    if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
    if (rest) parts.push(threeDigits(rest));
    return parts.join(' ');
  };

  const rupeeWords = `Rupees ${words(rupees)}`;
  const paiseWords = paise > 0 ? ` and ${twoDigits(paise)} Paise` : '';
  return `${rupeeWords}${paiseWords} Only`;
}

/* ============================ Invoice HTML ============================== */

export interface InvoiceBuyer {
  name: string;
  gstin?: string;
  stateName?: string;
  stateCode?: string;
  addressLines?: string[];
  email?: string;
}

export interface InvoiceLine {
  description: string;
  /** SAC; falls back to the seller SAC when omitted. */
  sac?: string;
  /** Pre-tax amount in rupees (from the plan/subscription record). */
  taxableValue: number;
}

export interface TaxInvoiceOpts {
  seller: SellerDetails;
  buyer: InvoiceBuyer;
  /** Sequential, human-readable invoice number (see `formatInvoiceNumber`). */
  invoiceNumber: string;
  /** Invoice date as display text (e.g. "19 Jun 2026"). */
  invoiceDateText: string;
  /** Billing-period text, e.g. "01 Jul 2026 – 30 Jun 2027". */
  periodText?: string;
  line: InvoiceLine;
  /** Total GST rate (default 18). */
  ratePct?: number;
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const inr = (n: number): string =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Build a sequential invoice number like `NEXLI/2026-27/000123`.
 * The caller supplies the running sequence (e.g. from a counter); this only formats.
 * `fyLabel` should be the Indian financial year the invoice date falls in.
 */
export function formatInvoiceNumber(seq: number, fyLabel: string, prefix = 'NEXLI'): string {
  return `${prefix}/${fyLabel}/${String(seq).padStart(6, '0')}`;
}

/** Indian financial year label (Apr–Mar) for a date, e.g. 2026-27. */
export function financialYearLabel(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  // FY starts in April; before April the FY started the previous calendar year.
  const startYear = d.getMonth() >= 3 ? y : y - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}

/**
 * Build a fully self-contained, print-ready GST tax invoice HTML document. Pure
 * (string in / string out). Computes the CGST/SGST or IGST split via `computeGst`.
 */
export function buildTaxInvoiceHtml(o: TaxInvoiceOpts): string {
  const ratePct = o.ratePct ?? 18;
  const intra = isIntraState(o.seller, o.buyer);
  const gst = computeGst({ taxableValue: o.line.taxableValue, ratePct, intraState: intra });
  const sac = o.line.sac || o.seller.sac;

  // Tax rows for the detailed (3-column: tax / rate / amount) breakdown table.
  const taxRows = intra
    ? `<tr><td>CGST</td><td class="num">${gst.cgstPct}%</td><td class="num">${inr(gst.cgst)}</td></tr>
       <tr><td>SGST / UTGST</td><td class="num">${gst.sgstPct}%</td><td class="num">${inr(gst.sgst)}</td></tr>`
    : `<tr><td>IGST</td><td class="num">${gst.igstPct}%</td><td class="num">${inr(gst.igst)}</td></tr>`;

  // Tax rows for the 2-column totals block (label / amount only).
  const totalsTaxRows = intra
    ? `<tr><td>CGST @ ${gst.cgstPct}%</td><td class="num">${inr(gst.cgst)}</td></tr>
       <tr><td>SGST / UTGST @ ${gst.sgstPct}%</td><td class="num">${inr(gst.sgst)}</td></tr>`
    : `<tr><td>IGST @ ${gst.igstPct}%</td><td class="num">${inr(gst.igst)}</td></tr>`;

  const supplyType = intra ? 'Intra-State' : 'Inter-State';
  const sellerAddr = o.seller.addressLines.map(esc).join('<br>');
  const buyerAddr = (o.buyer.addressLines ?? []).map(esc).join('<br>');
  const buyerState = [o.buyer.stateName, o.buyer.stateCode ? `(code ${o.buyer.stateCode})` : '']
    .filter((s): s is string => !!s)
    .map(esc)
    .join(' ');
  const sellerState = [o.seller.stateName, `(code ${o.seller.stateCode})`].map(esc).join(' ');

  return `<!doctype html><html><head><meta charset="utf-8"><title>Tax Invoice ${esc(o.invoiceNumber)} — ${esc(o.buyer.name)}</title>
<style>
  @page { size: A4 portrait; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Helvetica, Arial, sans-serif; color: #14110c; margin: 0; padding: 22px; background: #f4f1ea; font-size: 13px; }
  .inv { max-width: 800px; margin: 0 auto; background: #fff; border: 1px solid #c9c2b3; padding: 28px 32px; box-shadow: 0 2px 12px rgba(0,0,0,.08); }
  .inv__title { text-align: center; font-size: 18px; font-weight: 700; letter-spacing: 2px; margin: 0 0 4px; }
  .inv__sub { text-align: center; font-size: 11.5px; color: #777; margin: 0 0 18px; }
  .inv__grid { display: flex; gap: 20px; flex-wrap: wrap; }
  .inv__party { flex: 1 1 0; min-width: 240px; border: 1px solid #e2ddcf; border-radius: 8px; padding: 12px 14px; }
  .inv__party h3 { font-size: 11px; text-transform: uppercase; letter-spacing: .8px; color: #8a826f; margin: 0 0 6px; }
  .inv__party .nm { font-weight: 700; font-size: 14px; }
  .inv__meta { margin: 16px 0; width: 100%; border-collapse: collapse; }
  .inv__meta td { padding: 5px 8px; border: 1px solid #e2ddcf; font-size: 12.5px; }
  .inv__meta td:nth-child(odd) { color: #8a826f; width: 18%; }
  table.lines { width: 100%; border-collapse: collapse; margin-top: 8px; }
  table.lines th, table.lines td { border: 1px solid #cfcabb; padding: 8px 10px; font-size: 12.5px; }
  table.lines th { background: #f6f3ec; text-align: left; }
  .num { text-align: right; }
  .totals { width: 320px; margin-left: auto; margin-top: 10px; border-collapse: collapse; }
  .totals td { padding: 6px 10px; font-size: 12.5px; }
  .totals tr.grand td { border-top: 2px solid #1a1206; font-weight: 700; font-size: 14px; }
  .words { margin: 14px 0 0; font-size: 12.5px; }
  .words b { font-weight: 700; }
  .note { font-size: 11px; color: #888; margin-top: 16px; line-height: 1.6; }
  .inv__foot { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 36px; font-size: 12.5px; }
  .sign-line { border-top: 1px solid #333; padding-top: 6px; min-width: 200px; text-align: center; }
  .inv__print-btn { display: block; margin: 18px auto 0; padding: 10px 22px; font-size: 14px; background: #1a1206; color: #fff; border: 0; border-radius: 8px; cursor: pointer; }
  @media print { body { background: #fff; padding: 0; } .inv { border: none; box-shadow: none; } .inv__print-btn { display: none; } }
</style></head>
<body>
  <div class="inv">
    <div class="inv__title">TAX INVOICE</div>
    <div class="inv__sub">${esc(o.seller.tradeName ?? o.seller.legalName)} · ${supplyType} supply</div>

    <div class="inv__grid">
      <div class="inv__party">
        <h3>Seller</h3>
        <div class="nm">${esc(o.seller.legalName)}</div>
        ${sellerAddr ? `<div>${sellerAddr}</div>` : ''}
        <div>GSTIN: <b>${esc(o.seller.gstin)}</b></div>
        ${o.seller.pan ? `<div>PAN: ${esc(o.seller.pan)}</div>` : ''}
        <div>State: ${sellerState}</div>
        ${o.seller.email ? `<div>${esc(o.seller.email)}</div>` : ''}
      </div>
      <div class="inv__party">
        <h3>Bill to</h3>
        <div class="nm">${esc(o.buyer.name)}</div>
        ${buyerAddr ? `<div>${buyerAddr}</div>` : ''}
        <div>GSTIN: ${o.buyer.gstin ? `<b>${esc(o.buyer.gstin)}</b>` : 'Unregistered'}</div>
        ${buyerState ? `<div>State: ${buyerState}</div>` : ''}
        ${o.buyer.email ? `<div>${esc(o.buyer.email)}</div>` : ''}
      </div>
    </div>

    <table class="inv__meta">
      <tr><td>Invoice No.</td><td><b>${esc(o.invoiceNumber)}</b></td><td>Invoice Date</td><td>${esc(o.invoiceDateText)}</td></tr>
      <tr><td>Place of Supply</td><td>${esc(o.buyer.stateName ?? o.seller.stateName)}</td><td>Period</td><td>${esc(o.periodText ?? '—')}</td></tr>
    </table>

    <table class="lines">
      <thead>
        <tr><th>#</th><th>Description</th><th>SAC</th><th class="num">Taxable Value</th></tr>
      </thead>
      <tbody>
        <tr><td>1</td><td>${esc(o.line.description)}</td><td>${esc(sac)}</td><td class="num">${inr(gst.taxableValue)}</td></tr>
      </tbody>
    </table>

    <table class="totals">
      <tr><td>Taxable Value</td><td class="num">${inr(gst.taxableValue)}</td></tr>
      ${totalsTaxRows}
      <tr><td>Total Tax</td><td class="num">${inr(gst.totalTax)}</td></tr>
      ${gst.roundOff !== 0 ? `<tr><td>Round Off</td><td class="num">${inr(gst.roundOff)}</td></tr>` : ''}
      <tr class="grand"><td>Total</td><td class="num">${inr(gst.total)}</td></tr>
    </table>

    <p class="words"><b>Amount in words:</b> ${esc(amountInWords(gst.total))}</p>

    <table class="lines" style="margin-top:14px">
      <thead><tr><th>Tax</th><th class="num">Rate</th><th class="num">Amount</th></tr></thead>
      <tbody>${taxRows}</tbody>
    </table>

    <div class="inv__foot">
      <div class="note">
        This is a computer-generated tax invoice.<br>
        ${o.seller.bankName ? `Bank: ${esc(o.seller.bankName)} · A/c ${esc(o.seller.bankAccount ?? '—')} · IFSC ${esc(o.seller.bankIfsc ?? '—')}<br>` : ''}
        Subject to jurisdiction as per the seller's registered state.
      </div>
      <div class="sign">
        <div style="height:42px"></div>
        <div class="sign-line">For ${esc(o.seller.tradeName ?? o.seller.legalName)}<br>Authorised Signatory</div>
      </div>
    </div>
  </div>
  <button class="inv__print-btn" onclick="window.print()">Print / Save as PDF</button>
</body></html>`;
}
