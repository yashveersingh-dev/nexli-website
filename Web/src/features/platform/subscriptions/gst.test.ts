import { describe, it, expect } from 'vitest';
import {
  computeGst,
  isIntraState,
  amountInWords,
  round2,
  formatInvoiceNumber,
  financialYearLabel,
  resolveSeller,
  NEXLI_SELLER,
} from './gst';

/**
 * GST tax-invoice maths tests (Nexli subscription billing). Covers:
 *  - intra-state CGST+SGST split vs inter-state single IGST (same total tax)
 *  - 2-dp component rounding + whole-rupee grand-total round-off
 *  - intra/inter-state detection by state code and name
 *  - Indian-system amount-in-words
 *  - invoice-number formatting + financial-year label
 */

describe('computeGst — intra vs inter-state split', () => {
  it('intra-state splits 18% into 9% CGST + 9% SGST', () => {
    const r = computeGst({ taxableValue: 10_000, ratePct: 18, intraState: true });
    expect(r.cgstPct).toBe(9);
    expect(r.sgstPct).toBe(9);
    expect(r.cgst).toBe(900);
    expect(r.sgst).toBe(900);
    expect(r.igst).toBe(0);
    expect(r.totalTax).toBe(1800);
    expect(r.total).toBe(11_800);
  });

  it('inter-state charges a single 18% IGST', () => {
    const r = computeGst({ taxableValue: 10_000, ratePct: 18, intraState: false });
    expect(r.igstPct).toBe(18);
    expect(r.igst).toBe(1800);
    expect(r.cgst).toBe(0);
    expect(r.sgst).toBe(0);
    expect(r.totalTax).toBe(1800);
    expect(r.total).toBe(11_800);
  });

  it('intra and inter-state yield the same total tax for the same base/rate', () => {
    const intra = computeGst({ taxableValue: 54_000, ratePct: 18, intraState: true });
    const inter = computeGst({ taxableValue: 54_000, ratePct: 18, intraState: false });
    expect(intra.totalTax).toBe(inter.totalTax);
    expect(intra.total).toBe(inter.total);
    expect(intra.cgst + intra.sgst).toBe(inter.igst);
  });
});

describe('computeGst — rounding', () => {
  it('rounds each tax component to 2 dp', () => {
    // 999 × 9% = 89.91 each → 179.82 total tax.
    const r = computeGst({ taxableValue: 999, ratePct: 18, intraState: true });
    expect(r.cgst).toBe(89.91);
    expect(r.sgst).toBe(89.91);
    expect(r.totalTax).toBe(179.82);
  });

  it('rounds the grand total to a whole rupee and reports the round-off', () => {
    // 1000 + 179.82-style fraction → grand total rounded to nearest rupee.
    const r = computeGst({ taxableValue: 999, ratePct: 18, intraState: true });
    // raw total = 999 + 179.82 = 1178.82 → 1179, round off = +0.18
    expect(r.total).toBe(1179);
    expect(r.roundOff).toBe(0.18);
  });

  it('round2 avoids binary-float drift', () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(2.675)).toBe(2.68);
  });
});

describe('isIntraState', () => {
  const seller = { stateCode: '09', stateName: 'Uttar Pradesh' };

  it('is intra-state when state codes match', () => {
    expect(isIntraState(seller, { stateCode: '09', stateName: 'Uttar Pradesh' })).toBe(true);
  });
  it('is inter-state when state codes differ', () => {
    expect(isIntraState(seller, { stateCode: '27', stateName: 'Maharashtra' })).toBe(false);
  });
  it('falls back to state-name comparison when a code is missing', () => {
    expect(isIntraState(seller, { stateName: 'uttar pradesh' })).toBe(true);
    expect(isIntraState(seller, { stateName: 'Karnataka' })).toBe(false);
  });
  it('defaults to inter-state when the buyer state is unknown', () => {
    expect(isIntraState(seller, {})).toBe(false);
  });
  it('ignores a placeholder seller code (00) and uses names', () => {
    expect(isIntraState({ stateCode: '00', stateName: 'Delhi' }, { stateCode: '07', stateName: 'Delhi' })).toBe(true);
  });
});

describe('amountInWords (Indian system)', () => {
  it('spells whole rupees', () => {
    expect(amountInWords(11_800)).toBe('Rupees Eleven Thousand Eight Hundred Only');
  });
  it('uses lakh and crore groupings', () => {
    expect(amountInWords(1_23_456)).toBe('Rupees One Lakh Twenty Three Thousand Four Hundred Fifty Six Only');
    expect(amountInWords(2_43_000)).toBe('Rupees Two Lakh Forty Three Thousand Only');
  });
  it('includes paise when present', () => {
    expect(amountInWords(1178.82)).toBe('Rupees One Thousand One Hundred Seventy Eight and Eighty Two Paise Only');
  });
  it('handles zero', () => {
    expect(amountInWords(0)).toBe('Rupees Zero Only');
  });
});

describe('invoice number + financial year', () => {
  it('zero-pads the sequence to 6 digits', () => {
    expect(formatInvoiceNumber(123, '2026-27')).toBe('NEXLI/2026-27/000123');
  });
  it('derives the Indian FY (Apr–Mar) from a date', () => {
    // June 2026 → FY 2026-27; Feb 2026 → FY 2025-26.
    expect(financialYearLabel(new Date(2026, 5, 19).getTime())).toBe('2026-27');
    expect(financialYearLabel(new Date(2026, 1, 10).getTime())).toBe('2025-26');
  });
});

describe('resolveSeller — config overlay over the placeholder', () => {
  it('returns the placeholder unchanged when no settings are given', () => {
    expect(resolveSeller()).toEqual(NEXLI_SELLER);
    expect(resolveSeller(null)).toEqual(NEXLI_SELLER);
    expect(resolveSeller({})).toEqual(NEXLI_SELLER);
  });

  it('overlays provided (non-blank) fields and keeps the placeholder for the rest', () => {
    const s = resolveSeller({
      legalName: 'Nexli Technologies Pvt Ltd',
      gstin: '09ABCDE1234F1Z5',
      stateName: 'Uttar Pradesh',
      stateCode: '09',
      addressLines: ['12 MG Road', 'Lucknow, UP, 226001'],
    });
    expect(s.legalName).toBe('Nexli Technologies Pvt Ltd');
    expect(s.gstin).toBe('09ABCDE1234F1Z5');
    expect(s.stateCode).toBe('09');
    expect(s.addressLines).toEqual(['12 MG Road', 'Lucknow, UP, 226001']);
    // SAC was not provided → still the placeholder default.
    expect(s.sac).toBe(NEXLI_SELLER.sac);
  });

  it('treats blank/whitespace fields as unset (keeps the placeholder)', () => {
    const s = resolveSeller({ legalName: '   ', gstin: '', stateCode: '  ' });
    expect(s.legalName).toBe(NEXLI_SELLER.legalName);
    expect(s.gstin).toBe(NEXLI_SELLER.gstin);
    expect(s.stateCode).toBe(NEXLI_SELLER.stateCode);
  });

  it('drops blank address lines and falls back when none remain', () => {
    expect(resolveSeller({ addressLines: ['', '   '] }).addressLines).toEqual(NEXLI_SELLER.addressLines);
    expect(resolveSeller({ addressLines: ['Only line', ''] }).addressLines).toEqual(['Only line']);
  });

  it('a configured seller makes the GST split intra-state against a same-state buyer', () => {
    // Placeholder stateCode is '00' (ignored); once configured to 09, a 09 buyer is intra-state.
    const seller = resolveSeller({ stateCode: '09', stateName: 'Uttar Pradesh' });
    expect(isIntraState(seller, { stateCode: '09' })).toBe(true);
    expect(isIntraState(seller, { stateCode: '27' })).toBe(false);
  });
});
