import { formatDate } from '@/lib/format';
import { CATEGORY_META } from './data';
import type { PortfolioEntry, SkillsSummary } from '@/types/portfolio';

export interface PassportOpts {
  schoolName: string;
  schoolLocation?: string;
  studentName: string;
  studentClass?: string;
  generatedDateText: string;
  entries: PortfolioEntry[];
  summary: SkillsSummary;
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function entryRow(e: PortfolioEntry): string {
  const meta = CATEGORY_META[e.category];
  const verified = e.status === 'verified' && e.verification;
  const badge = verified
    ? `<span class="pp-verif">✓ Verified by ${esc(e.verification!.verifierName)} · ${esc(formatDate(e.verification!.verifiedAt))}</span>`
    : e.status === 'rejected'
      ? `<span class="pp-rej">Not verified</span>`
      : `<span class="pp-self">Self-reported</span>`;
  const org = e.organisation ? ` · ${esc(e.organisation)}` : '';
  const skills = (e.skills ?? []).length
    ? `<div class="pp-skills">${e.skills!.map((s) => `<span class="pp-skill">${esc(s)}</span>`).join('')}</div>`
    : '';
  const desc = e.description ? `<div class="pp-desc">${esc(e.description)}</div>` : '';
  const link = e.evidenceUrl ? `<div class="pp-link">Evidence: ${esc(e.evidenceUrl)}</div>` : '';
  return `<div class="pp-entry">
    <div class="pp-entry__head">
      <span class="pp-cat">${esc(meta.label)}</span>
      <strong class="pp-title">${esc(e.title)}</strong>
      ${badge}
    </div>
    <div class="pp-entry__meta">${esc(formatDate(e.date))}${org}</div>
    ${desc}${skills}${link}
  </div>`;
}

/** Build a self-contained, print-ready HTML passport for one student. */
export function buildPassportHtml(o: PassportOpts): string {
  const catChips = (Object.keys(o.summary.byCategory) as Array<keyof SkillsSummary['byCategory']>)
    .filter((k) => o.summary.byCategory[k] > 0)
    .map((k) => `<span class="pp-stat">${esc(CATEGORY_META[k].label)}: <strong>${o.summary.byCategory[k]}</strong></span>`)
    .join('');
  const topSkills = o.summary.skillTags
    .slice(0, 24)
    .map((t) => `<span class="pp-skill pp-skill--lg">${esc(t.skill)}${t.count > 1 ? ` ×${t.count}` : ''}</span>`)
    .join('');
  const entriesHtml = o.entries.length
    ? o.entries.map(entryRow).join('')
    : '<div class="pp-empty">No achievements recorded yet.</div>';

  return `<!doctype html><html><head><meta charset="utf-8"><title>Skills Passport — ${esc(o.studentName)}</title>
<style>
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #14110c; margin: 0; padding: 24px; background: #f4f1ea; }
  .pp { max-width: 820px; margin: 0 auto; background: #fff; border: 2px solid #c6a55c; padding: 36px 44px; box-shadow: 0 2px 12px rgba(0,0,0,.08); }
  .pp__head { text-align: center; border-bottom: 1px solid #ddd; padding-bottom: 16px; margin-bottom: 18px; }
  .pp__school { font-size: 22px; font-weight: 700; letter-spacing: .5px; color: #1a1206; }
  .pp__loc { font-size: 12.5px; color: #6b6354; margin-top: 3px; }
  .pp__title { text-align: center; font-size: 17px; font-weight: 700; letter-spacing: 2.5px; color: #8a6d2f; margin: 10px 0 4px; text-transform: uppercase; }
  .pp__student { text-align: center; font-size: 15px; margin-bottom: 6px; }
  .pp__student strong { font-size: 17px; }
  .pp__gen { text-align: center; font-size: 11.5px; color: #6b6354; margin-bottom: 18px; }
  .pp-section { font-size: 13px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #8a6d2f; margin: 22px 0 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
  .pp-stats { display: flex; flex-wrap: wrap; gap: 8px 16px; font-size: 13px; }
  .pp-stat { color: #4a4537; }
  .pp-skills, .pp-skills--top { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .pp-skill { display: inline-block; font-family: Arial, sans-serif; font-size: 11px; padding: 2px 8px; border: 1px solid #d8cba0; border-radius: 999px; color: #6b5a2a; background: #fbf7ec; }
  .pp-skill--lg { font-size: 12px; padding: 3px 10px; }
  .pp-entry { padding: 12px 0; border-bottom: 1px solid #eee; }
  .pp-entry__head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px; }
  .pp-cat { font-family: Arial, sans-serif; font-size: 10.5px; text-transform: uppercase; letter-spacing: .6px; color: #8a6d2f; }
  .pp-title { font-size: 15px; }
  .pp-verif { font-family: Arial, sans-serif; font-size: 11px; color: #1b7a3d; font-weight: 700; }
  .pp-self { font-family: Arial, sans-serif; font-size: 11px; color: #9a7320; }
  .pp-rej { font-family: Arial, sans-serif; font-size: 11px; color: #8a8a8a; }
  .pp-entry__meta { font-size: 12px; color: #6b6354; margin-top: 3px; }
  .pp-desc { font-size: 13.5px; line-height: 1.6; margin-top: 6px; text-align: justify; }
  .pp-link { font-family: Arial, sans-serif; font-size: 11px; color: #4a6fa5; margin-top: 6px; word-break: break-all; }
  .pp-empty { font-size: 13px; color: #6b6354; padding: 12px 0; }
  .pp__foot { margin-top: 26px; padding-top: 12px; border-top: 1px solid #ddd; font-size: 11px; color: #6b6354; text-align: center; }
  .pp-print-btn { display: block; margin: 18px auto 0; padding: 10px 22px; font-size: 14px; background: #c6a55c; color: #1a1206; border: 0; border-radius: 8px; cursor: pointer; }
  @media print { body { background: #fff; padding: 0; } .pp { border: 2px solid #c6a55c; box-shadow: none; } .pp-print-btn { display: none; } }
</style></head>
<body>
  <div class="pp">
    <div class="pp__head">
      <div class="pp__school">${esc(o.schoolName)}</div>
      ${o.schoolLocation ? `<div class="pp__loc">${esc(o.schoolLocation)}</div>` : ''}
    </div>
    <div class="pp__title">Digital Skills Passport</div>
    <div class="pp__student"><strong>${esc(o.studentName)}</strong>${o.studentClass ? ` · ${esc(o.studentClass)}` : ''}</div>
    <div class="pp__gen">Generated ${esc(o.generatedDateText)} · ${o.summary.total} achievement${o.summary.total === 1 ? '' : 's'} · ${o.summary.verified} verified</div>

    <div class="pp-section">Summary</div>
    <div class="pp-stats">${catChips || '<span class="pp-stat">No achievements yet</span>'}</div>
    ${topSkills ? `<div class="pp-section">Skills</div><div class="pp-skills--top">${topSkills}</div>` : ''}

    <div class="pp-section">Achievements</div>
    ${entriesHtml}

    <div class="pp__foot">Verified achievements are endorsed by school staff. Self-reported entries await verification.</div>
  </div>
  <button class="pp-print-btn" onclick="window.print()">Print / Save as PDF</button>
</body></html>`;
}

/**
 * Open a blank print window. Returns null if a popup blocker stopped it.
 *
 * POPUP-BLOCKER NOTE: browsers only allow `window.open` during the synchronous
 * portion of a user-gesture handler. If a caller ever builds/persists data with an
 * `await` BEFORE printing, the window must be opened synchronously at the very start
 * of the click (via `openPrintWindow()`), then filled with `writePrintWindow(win, html)`
 * once the HTML is ready — otherwise the popup is treated as non-user-initiated and
 * blocked. (Mirrors `features/certificates/print.ts`.)
 */
export function openPrintWindow(): Window | null {
  return window.open('', '_blank', 'width=960,height=1200');
}

/** Write passport HTML into an already-opened print window and focus it. */
export function writePrintWindow(w: Window, html: string): void {
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
}

/**
 * Open the passport in a clean window for printing / Save-as-PDF. Safe when called
 * synchronously from the click (no preceding await), which is how `PortfolioHub`
 * invokes it. For an issue/persist-then-print flow, pass a window opened earlier in
 * the same gesture as `preOpened`. Returns false if a popup blocker stopped it.
 */
export function printPassport(html: string, preOpened?: Window | null): boolean {
  const w = preOpened ?? openPrintWindow();
  if (!w) return false;
  writePrintWindow(w, html);
  return true;
}
