import type { CertificateType } from './data';

export const CERT_META: Record<CertificateType, { label: string; title: string }> = {
  bonafide: { label: 'Bonafide Certificate', title: 'BONAFIDE CERTIFICATE' },
  character: { label: 'Character Certificate', title: 'CHARACTER CERTIFICATE' },
  conduct: { label: 'Conduct Certificate', title: 'CONDUCT CERTIFICATE' },
  leaving: { label: 'School Leaving Certificate', title: 'SCHOOL LEAVING CERTIFICATE' },
  transfer: { label: 'Transfer Certificate', title: 'TRANSFER CERTIFICATE' },
  custom: { label: 'Certificate', title: 'CERTIFICATE' },
};

export type CertFontStyle = 'serif' | 'sans-serif' | 'monospace';

/** Default certificate accent (gold) used when no override (or an unsafe one). */
export const CERT_DEFAULT_ACCENT = '#C6A55C';

/**
 * SECURITY: the accent colour is interpolated raw into a <style> block and into
 * inline `style` attributes (in both the printed HTML and the React preview). An
 * unvalidated value (e.g. `red; } </style><script>…`) would be a CSS/HTML
 * injection vector. Accept ONLY a strict 6-digit hex colour; anything else falls
 * back to the safe gold default. Returned uppercased for stable output.
 */
export function safeAccent(raw: string | undefined): string {
  const v = (raw ?? '').trim();
  return /^#[0-9A-Fa-f]{6}$/.test(v) ? v.toUpperCase() : CERT_DEFAULT_ACCENT;
}

const FONT_STACKS: Record<CertFontStyle, string> = {
  serif: `Georgia, 'Times New Roman', serif`,
  'sans-serif': `'Segoe UI', Helvetica, Arial, sans-serif`,
  monospace: `'Courier New', Consolas, monospace`,
};

/**
 * Resolves the visual tokens shared by the print HTML and the in-app React
 * preview so they always render identically: accent colour, font stack, the
 * effective title, and the A4 page dimensions (swapped when landscape).
 */
export function certStyle(o: CertOpts) {
  // Validated (XSS-safe) accent — feeds BOTH the print HTML and the React preview.
  const accent = safeAccent(o.accentColor);
  const fontFamily = FONT_STACKS[o.fontStyle ?? 'serif'];
  const meta = CERT_META[o.type];
  const title = (o.certName?.trim() || meta.title).toUpperCase();
  // A4 in px at 96dpi; swap for landscape.
  const pageWidth = o.landscape ? 1123 : 794;
  return { accent, fontFamily, title, landscape: !!o.landscape, pageWidth };
}

export interface CertStudent {
  fullName: string;
  admissionNo?: string;
  className?: string;
  gender?: string;
  dobText?: string;
  guardianName?: string;
  academicYear?: string;
  admissionDateText?: string;
}

export interface CertOpts {
  schoolName: string;
  schoolLocation?: string;
  type: CertificateType;
  /** Free-text title for `custom` certificates; falls back to the type's title. */
  certName?: string;
  serialNo: string;
  issuedDateText: string;
  student: CertStudent;
  purpose?: string;
  /** Direct image URL for the school logo, shown in the header when set. */
  logoUrl?: string;
  /** Accent colour for borders/headings (defaults to gold). */
  accentColor?: string;
  /** Render in landscape (wide) orientation. */
  landscape?: boolean;
  /** Body/heading font family. */
  fontStyle?: CertFontStyle;
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The certificate body paragraph(s) per type, with student details interpolated. */
function body(o: CertOpts): string {
  const s = o.student;
  const isF = s.gender === 'female';
  const childOf = isF ? 'daughter' : 'son';
  const guardian = s.guardianName ? ` ${childOf} of ${esc(s.guardianName)},` : ',';
  const cls = s.className ? ` studying in Class ${esc(s.className)}` : '';
  const ay = s.academicYear ? ` during the academic year ${esc(s.academicYear)}` : '';
  const adm = s.admissionNo ? ` (Admission No. ${esc(s.admissionNo)})` : '';
  const name = `<strong>${esc(s.fullName)}</strong>`;
  const purposeLine = o.purpose ? `<p>This certificate is issued for the purpose of <strong>${esc(o.purpose)}</strong>.</p>` : '';

  switch (o.type) {
    case 'bonafide':
      return `<p>This is to certify that ${name}${guardian}${adm} is a bonafide student of this school${cls}${ay}.</p>${purposeLine}`;
    case 'character':
      return `<p>This is to certify that ${name}${guardian}${adm} has been a student of this school${cls}${ay}. ${isF ? 'She' : 'He'} bears a good moral character and has not been involved in any indiscipline to the best of our knowledge.</p>${purposeLine}`;
    case 'conduct':
      return `<p>This is to certify that ${name}${guardian}${adm} was a student of this school${cls}${ay}. ${isF ? 'Her' : 'His'} conduct and behaviour during ${isF ? 'her' : 'his'} time at the school have been satisfactory.</p>${purposeLine}`;
    case 'leaving':
      return `<p>This is to certify that ${name}${guardian}${adm} was a bonafide student of this school${cls}. ${isF ? 'She' : 'He'} has left the school and there are no dues pending against ${isF ? 'her' : 'him'}. We wish ${isF ? 'her' : 'him'} success in all future endeavours.</p>${purposeLine}`;
    case 'transfer':
      return `<p>This is to certify the following particulars of ${name}, a former student of this school:</p>
        <table class="cert-table">
          <tr><td>Admission No.</td><td>${esc(s.admissionNo ?? '—')}</td></tr>
          <tr><td>Date of Birth</td><td>${esc(s.dobText ?? '—')}</td></tr>
          <tr><td>Class last studied</td><td>${esc(s.className ?? '—')}</td></tr>
          <tr><td>Date of admission</td><td>${esc(s.admissionDateText ?? '—')}</td></tr>
        </table>
        <p>${isF ? 'She' : 'He'} is hereby relieved from this school. ${isF ? 'Her' : 'His'} conduct has been satisfactory and no dues are pending.</p>${purposeLine}`;
    case 'custom':
      return `<p>This is to certify that ${name}${guardian}${adm} is a bonafide student of this school${cls}${ay}.</p>${purposeLine || '<p>This certificate is issued on request for official use.</p>'}`;
  }
}

/**
 * The certificate's inner body prose as an HTML fragment (no document chrome).
 * Shared so the live React preview renders the exact same per-type paragraphs
 * as the printed document without duplicating the prose logic.
 */
export function certBodyHtml(o: CertOpts): string {
  return body(o);
}

/** Build a fully self-contained, print-ready HTML document for a certificate. */
export function buildCertificateHtml(o: CertOpts): string {
  const { accent, fontFamily, title, landscape } = certStyle(o);
  const docTitle = o.certName?.trim() || CERT_META[o.type].label;
  const maxW = landscape ? 1040 : 760;
  const logo = o.logoUrl?.trim()
    ? `<img class="cert__logo" src="${esc(o.logoUrl.trim())}" alt="" referrerpolicy="no-referrer" />`
    : '';
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(docTitle)} — ${esc(o.student.fullName)}</title>
<style>
  @page { size: A4 ${landscape ? 'landscape' : 'portrait'}; margin: 18mm; }
  * { box-sizing: border-box; }
  body { font-family: ${fontFamily}; color: #14110c; margin: 0; padding: 24px; background: #f4f1ea; }
  .cert { max-width: ${maxW}px; margin: 0 auto; background: #fff; border: 2px solid ${accent}; padding: 40px 48px; box-shadow: 0 2px 12px rgba(0,0,0,.08); }
  .cert__head { text-align: center; border-bottom: 1px solid #ddd; padding-bottom: 16px; margin-bottom: 24px; }
  .cert__logo { display: block; max-height: 72px; max-width: 220px; margin: 0 auto 12px; object-fit: contain; }
  .cert__school { font-size: 26px; font-weight: 700; letter-spacing: .5px; color: #1a1206; }
  .cert__loc { font-size: 13px; color: #6b6354; margin-top: 4px; }
  .cert__serial { font-size: 12px; color: #6b6354; margin-top: 10px; }
  .cert__title { text-align: center; font-size: 19px; font-weight: 700; letter-spacing: 3px; color: ${accent}; margin: 8px 0 26px; text-decoration: underline; }
  .cert__body { font-size: 15.5px; line-height: 2; text-align: justify; min-height: 220px; }
  .cert__body p { margin: 0 0 14px; }
  .cert-table { width: 100%; border-collapse: collapse; margin: 12px 0 18px; }
  .cert-table td { padding: 6px 10px; border: 1px solid #ddd; font-size: 14px; }
  .cert-table td:first-child { width: 42%; color: #6b6354; }
  .cert__foot { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 48px; font-size: 13.5px; }
  .cert__sign { text-align: center; }
  .cert__sign-line { border-top: 1px solid #333; padding-top: 6px; min-width: 180px; }
  .cert__print-btn { display: block; margin: 18px auto 0; padding: 10px 22px; font-size: 14px; background: ${accent}; color: #1a1206; border: 0; border-radius: 8px; cursor: pointer; }
  @media print { body { background: #fff; padding: 0; } .cert { border: 2px solid ${accent}; box-shadow: none; } .cert__print-btn { display: none; } }
</style></head>
<body>
  <div class="cert">
    <div class="cert__head">
      ${logo}
      <div class="cert__school">${esc(o.schoolName)}</div>
      ${o.schoolLocation ? `<div class="cert__loc">${esc(o.schoolLocation)}</div>` : ''}
      <div class="cert__serial">Serial No: ${esc(o.serialNo)} &nbsp;•&nbsp; Date: ${esc(o.issuedDateText)}</div>
    </div>
    <div class="cert__title">${esc(title)}</div>
    <div class="cert__body">${body(o)}</div>
    <div class="cert__foot">
      <div>Place: ${esc(o.schoolLocation ?? '____________')}</div>
      <div class="cert__sign"><div class="cert__sign-line">Principal / Authorised Signatory</div></div>
    </div>
  </div>
  <button class="cert__print-btn" onclick="window.print()">Print / Save as PDF</button>
</body></html>`;
}

/**
 * Open a blank print window. Returns null if a popup blocker stopped it.
 *
 * POPUP-BLOCKER NOTE: browsers only allow `window.open` during the synchronous
 * portion of a user-gesture handler. If the certificate is issued first
 * (`await issueCertificate(...)`) and the window is opened AFTER the await, the
 * popup is treated as non-user-initiated and blocked. Callers that issue before
 * printing should therefore call `openPrintWindow()` SYNCHRONOUSLY at the start of
 * the click handler (before any await), then `writePrintWindow(win, html)` once
 * the HTML is ready. See `printCertificate` for the combined (no-await) path.
 */
export function openPrintWindow(): Window | null {
  return window.open('', '_blank', 'width=900,height=1180');
}

/** Write certificate HTML into an already-opened print window and focus it. */
export function writePrintWindow(w: Window, html: string): void {
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
}

/**
 * Open + write in one step (safe ONLY when called synchronously from the click,
 * i.e. with no preceding await). Returns false if a popup blocker stopped it.
 * For the issue-then-print flow, prefer `openPrintWindow()` before the await +
 * `writePrintWindow()` after, OR pass the pre-opened window as `preOpened`.
 */
export function printCertificate(html: string, preOpened?: Window | null): boolean {
  const w = preOpened ?? openPrintWindow();
  if (!w) return false;
  writePrintWindow(w, html);
  return true;
}
