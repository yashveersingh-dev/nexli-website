/**
 * Printable CBSE "Appendix-V" Transfer Certificate layout.
 *
 * Builds a fully self-contained, print-ready HTML document for a TC, following the
 * shared certificates print pattern (`features/certificates/print.ts`): a pure
 * `buildAppendixVHtml()` that returns a string, opened via the synchronous
 * `openPrintWindow()` + `writePrintWindow()` helpers (re-exported here so callers
 * have one import surface and the popup-blocker-safe ordering is preserved).
 *
 * IMPORTANT (LEGAL REVIEW): the field labels, order and serial numbering below are
 * a WORKING DRAFT of CBSE Affiliation Bye-Laws Appendix-V. CBSE periodically
 * revises this format — the exact wording MUST be verified against the latest
 * bye-laws before this is used as an official certificate.
 */
import { openPrintWindow, writePrintWindow } from '@/features/certificates/print';
import type { TransferCertificate } from '@/types/sis';

export { openPrintWindow, writePrintWindow };

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const ONES = [
  'Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

/** Spell a 0–9999 integer in English words (enough for a day-of-month and a year). */
function intToWords(n: number): string {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? ` ${ONES[n % 10]}` : '');
  if (n < 1000) {
    const rest = n % 100;
    return `${ONES[Math.floor(n / 100)]} Hundred${rest ? ` ${intToWords(rest)}` : ''}`;
  }
  const rest = n % 1000;
  return `${intToWords(Math.floor(n / 1000))} Thousand${rest ? ` ${intToWords(rest)}` : ''}`;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Date in words, e.g. 5 Jan 2012 → "Fifth January Two Thousand Twelve". */
export function dateInWords(ts: number): string {
  const d = new Date(ts);
  const day = d.getDate();
  // Ordinal day in words (First … Thirty First).
  const ordinal = ordinalWords(day);
  return `${ordinal} ${MONTHS[d.getMonth()]} ${intToWords(d.getFullYear())}`;
}

const ORDINAL_ONES = [
  '', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth',
  'Eleventh', 'Twelfth', 'Thirteenth', 'Fourteenth', 'Fifteenth', 'Sixteenth', 'Seventeenth', 'Eighteenth', 'Nineteenth', 'Twentieth',
];
const ORDINAL_TENS: Record<number, string> = { 20: 'Twentieth', 30: 'Thirtieth' };

/** Ordinal day-of-month (1–31) in words. */
function ordinalWords(day: number): string {
  if (day <= 20) return ORDINAL_ONES[day];
  if (day % 10 === 0) return ORDINAL_TENS[day] ?? `${TENS[Math.floor(day / 10)]}`;
  return `${TENS[Math.floor(day / 10)]} ${ORDINAL_ONES[day % 10]}`;
}

const fmtDate = (ts?: number): string => (ts != null ? new Date(ts).toLocaleDateString('en-GB') : '');

export interface AppendixVOpts {
  schoolName: string;
  schoolLocation?: string;
  /** Direct image URL for the school logo, shown in the header when set. */
  logoUrl?: string;
  /** School affiliation / UDISE codes printed under the header, when known. */
  affiliationNo?: string;
  udiseCode?: string;
  tc: TransferCertificate;
  /** Date the certificate is printed/issued (epoch-ms). */
  issuedDateText: string;
}

/** One labelled row of the Appendix-V particulars table. */
function row(n: number, label: string, value: string): string {
  return `<tr><td class="apx__n">${n}.</td><td class="apx__l">${esc(label)}</td><td class="apx__v">${value ? esc(value) : '—'}</td></tr>`;
}

const yesNo = (v: boolean | undefined): string => (v === true ? 'Yes' : v === false ? 'No' : '—');

/**
 * Build the self-contained Appendix-V TC HTML document. Pure (string in/out); no
 * DOM side effects. Numbered particulars follow the bye-laws draft (see file note).
 */
export function buildAppendixVHtml(o: AppendixVOpts): string {
  const t = o.tc;
  const dobFigures = fmtDate(t.dob);
  const dobWords = t.dobInWords?.trim() || (t.dob != null ? dateInWords(t.dob) : '');
  const dobCombined = dobFigures ? `${dobFigures}${dobWords ? ` (${dobWords})` : ''}` : dobWords;
  const attendance =
    t.workingDaysPresent != null && t.workingDaysTotal != null
      ? `${t.workingDaysPresent} out of ${t.workingDaysTotal}`
      : t.workingDaysTotal != null
        ? `Total working days: ${t.workingDaysTotal}`
        : '';
  const feeConcession = t.feeConcession ? (t.feeConcessionDetail?.trim() ? `Yes — ${t.feeConcessionDetail.trim()}` : 'Yes') : t.feeConcession === false ? 'No' : '';
  const issueDate = t.certificateIssueDate ?? t.issuedDate;

  const logo = o.logoUrl?.trim()
    ? `<img class="apx__logo" src="${esc(o.logoUrl.trim())}" alt="" referrerpolicy="no-referrer" />`
    : '';
  const codes = [o.affiliationNo ? `Affiliation No: ${o.affiliationNo}` : '', o.udiseCode ? `UDISE: ${o.udiseCode}` : '']
    .filter(Boolean)
    .map(esc)
    .join(' &nbsp;•&nbsp; ');

  const rows = [
    row(1, 'Admission No.', t.admissionNo ?? ''),
    row(2, 'Name of the student', t.studentName ?? ''),
    row(3, "Father's / Guardian's name", t.fatherName ?? ''),
    row(4, "Mother's name", t.motherName ?? ''),
    row(5, 'Nationality', t.nationality ?? ''),
    row(6, 'Category (General / SC / ST / OBC)', t.category ?? ''),
    row(7, 'Whether the candidate belongs to SC / ST / OBC', yesNo(t.isScStObc)),
    row(8, 'Date of birth (in figures and words)', dobCombined),
    row(9, 'Class in which the student last studied', t.classLastStudied ?? t.gradeName ?? ''),
    row(10, 'Class to which the student was promoted / eligible', t.classPromotedTo ?? ''),
    row(11, 'Whether all school dues are paid', yesNo(t.duesPaid)),
    row(12, 'Whether any fee concession was availed', feeConcession),
    row(13, 'Total working days / days present', attendance),
    row(14, 'Whether NCC cadet / Boy Scout / Girl Guide', yesNo(t.nccScoutGuide)),
    row(15, 'Games played / extra-curricular activities', t.gamesActivities ?? ''),
    row(16, 'General conduct', t.generalConduct ?? ''),
    row(17, 'Date of application for certificate', fmtDate(t.applicationDate)),
    row(18, 'Date of issue of certificate', fmtDate(issueDate) || o.issuedDateText),
    row(19, 'Date on which the student left the school', fmtDate(t.dateOfLeaving)),
    row(20, 'Reason for leaving the school', t.reason ?? ''),
    row(21, 'Any other remarks', t.otherRemarks ?? t.remarks ?? ''),
  ].join('');

  return `<!doctype html><html><head><meta charset="utf-8"><title>Transfer Certificate — ${esc(t.studentName)}</title>
<style>
  @page { size: A4 portrait; margin: 16mm; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #14110c; margin: 0; padding: 24px; background: #f4f1ea; }
  .apx { max-width: 800px; margin: 0 auto; background: #fff; border: 2px solid #1a1206; padding: 32px 40px; box-shadow: 0 2px 12px rgba(0,0,0,.08); }
  .apx__head { text-align: center; border-bottom: 1px solid #999; padding-bottom: 14px; margin-bottom: 8px; }
  .apx__logo { display: block; max-height: 70px; max-width: 220px; margin: 0 auto 10px; object-fit: contain; }
  .apx__school { font-size: 24px; font-weight: 700; letter-spacing: .5px; }
  .apx__loc { font-size: 13px; color: #555; margin-top: 3px; }
  .apx__codes { font-size: 12px; color: #555; margin-top: 6px; }
  .apx__serial { display: flex; justify-content: space-between; font-size: 13px; color: #333; margin: 12px 2px; }
  .apx__title { text-align: center; font-size: 18px; font-weight: 700; letter-spacing: 2px; text-decoration: underline; margin: 6px 0 18px; }
  .apx__table { width: 100%; border-collapse: collapse; }
  .apx__table td { padding: 7px 8px; border: 1px solid #cfcabb; font-size: 13.5px; vertical-align: top; }
  .apx__n { width: 30px; color: #555; text-align: right; }
  .apx__l { width: 46%; color: #3a3428; }
  .apx__v { font-weight: 600; }
  .apx__note { font-size: 11.5px; color: #777; margin: 14px 2px 0; font-style: italic; }
  .apx__foot { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 44px; font-size: 13px; }
  .apx__sign { text-align: center; }
  .apx__sign-line { border-top: 1px solid #333; padding-top: 6px; min-width: 190px; }
  .apx__print-btn { display: block; margin: 18px auto 0; padding: 10px 22px; font-size: 14px; background: #1a1206; color: #fff; border: 0; border-radius: 8px; cursor: pointer; }
  @media print { body { background: #fff; padding: 0; } .apx { border: 2px solid #1a1206; box-shadow: none; } .apx__print-btn { display: none; } }
</style></head>
<body>
  <div class="apx">
    <div class="apx__head">
      ${logo}
      <div class="apx__school">${esc(o.schoolName)}</div>
      ${o.schoolLocation ? `<div class="apx__loc">${esc(o.schoolLocation)}</div>` : ''}
      ${codes ? `<div class="apx__codes">${codes}</div>` : ''}
    </div>
    <div class="apx__serial">
      <span>TC No: ${esc(t.tcNumber ?? '—')}</span>
      <span>Date: ${esc(o.issuedDateText)}</span>
    </div>
    <div class="apx__title">TRANSFER CERTIFICATE</div>
    <table class="apx__table">${rows}</table>
    <p class="apx__note">Certified that the above particulars have been checked and verified from the school records and are correct.</p>
    <div class="apx__foot">
      <div>
        <div>Prepared by: ____________</div>
        <div style="margin-top:10px">Checked by: ____________</div>
      </div>
      <div class="apx__sign"><div class="apx__sign-line">Principal / Authorised Signatory</div></div>
    </div>
  </div>
  <button class="apx__print-btn" onclick="window.print()">Print / Save as PDF</button>
</body></html>`;
}
