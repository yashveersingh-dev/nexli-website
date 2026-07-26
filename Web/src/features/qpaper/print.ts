import type { PaperItem, PaperSection, QuestionPaper } from '@/types/qpaper';

/**
 * Self-contained, print-ready HTML for a question paper and its answer key.
 * Reuses the exact Nexli print pattern (build an HTML string → `window.open` →
 * `window.print()`), so NO PDF library is needed: "Save as PDF" is the browser's
 * print-to-PDF. Maths is plain text / Unicode (Phase 1).
 */

export interface PaperPrintMeta {
  schoolName: string;
  schoolLocation?: string;
  schoolLogoUrl?: string;
}

const esc = (s: string) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Preserve author line breaks in a stem/answer block. */
const escMultiline = (s: string) => esc(s).replace(/\n/g, '<br>');

function optionLetter(i: number): string {
  return '(' + String.fromCharCode(97 + i) + ')';
}

const SHARED_STYLE = `
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Times New Roman', Georgia, serif; color: #111; margin: 0; padding: 22px; background: #f3f3f0; }
  .qp { max-width: 820px; margin: 0 auto 24px; background: #fff; padding: 30px 38px; box-shadow: 0 2px 12px rgba(0,0,0,.08); }
  .qp__head { text-align: center; border-bottom: 2px solid #222; padding-bottom: 12px; margin-bottom: 14px; }
  .qp__logo { max-height: 60px; margin-bottom: 6px; }
  .qp__school { font-size: 22px; font-weight: 700; letter-spacing: .3px; }
  .qp__loc { font-size: 12px; color: #555; margin-top: 2px; }
  .qp__exam { font-size: 15px; font-weight: 700; margin-top: 8px; text-transform: uppercase; letter-spacing: .5px; }
  .qp__metarow { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 6px; font-size: 13px; margin-top: 8px; }
  .qp__metarow strong { font-weight: 700; }
  .qp__namerow { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 14px; font-size: 13px; margin: 10px 0 4px; }
  .qp__namerow span { flex: 1; border-bottom: 1px dotted #888; padding-bottom: 2px; }
  .qp__gi { font-size: 12.5px; margin: 12px 0 4px; }
  .qp__gi b { display: block; margin-bottom: 3px; }
  .qp__gi ol { margin: 0; padding-left: 20px; }
  .qp__gi li { margin: 1px 0; }
  .qp__section { margin-top: 18px; }
  .qp__section-title { font-size: 14px; font-weight: 700; text-align: center; border-top: 1px solid #999; border-bottom: 1px solid #999; padding: 4px 0; margin-bottom: 4px; }
  .qp__section-instr { font-size: 12px; font-style: italic; color: #444; margin: 4px 0 10px; }
  .qp__q { display: flex; gap: 8px; font-size: 13.5px; line-height: 1.55; margin: 0 0 12px; page-break-inside: avoid; }
  .qp__q-no { font-weight: 700; min-width: 24px; }
  .qp__q-body { flex: 1; }
  .qp__q-marks { font-weight: 700; white-space: nowrap; padding-left: 8px; }
  .qp__opts { list-style: none; margin: 5px 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 4px 28px; }
  .qp__opts li { width: 45%; }
  .qp__ans-space { border-bottom: 1px dotted #bbb; margin-top: 6px; height: 0; }
  .qp__foot { text-align: center; font-size: 11px; color: #777; margin-top: 22px; border-top: 1px solid #ddd; padding-top: 8px; }
  .qp__print-btn { display: block; margin: 4px auto 22px; padding: 10px 22px; font-size: 14px; background: #c6a55c; color: #1a1206; border: 0; border-radius: 8px; cursor: pointer; }
  .ak__row { display: flex; gap: 10px; font-size: 13px; padding: 5px 0; border-bottom: 1px solid #eee; page-break-inside: avoid; }
  .ak__no { font-weight: 700; min-width: 26px; }
  .ak__ans { flex: 1; }
  .ak__ans b { color: #1a5d1a; }
  .ak__sol { color: #444; font-size: 12px; margin-top: 2px; }
  @media print { body { background: #fff; padding: 0; } .qp { box-shadow: none; margin: 0; padding: 0; max-width: none; } .qp__print-btn { display: none; } }
`;

function paperHeadHtml(paper: QuestionPaper, meta: PaperPrintMeta): string {
  const examLine = paper.examName || paper.title;
  const giItems = (paper.instructions ?? []).filter((s) => s.trim());
  return `
    <div class="qp__head">
      ${meta.schoolLogoUrl ? `<img class="qp__logo" src="${esc(meta.schoolLogoUrl)}" alt="">` : ''}
      <div class="qp__school">${esc(meta.schoolName)}</div>
      ${meta.schoolLocation ? `<div class="qp__loc">${esc(meta.schoolLocation)}</div>` : ''}
      <div class="qp__exam">${esc(examLine)}</div>
      <div class="qp__metarow">
        <span><strong>Class:</strong> ${esc([paper.gradeName, paper.sectionName].filter(Boolean).join('-') || '____')}</span>
        <span><strong>Subject:</strong> ${esc(paper.subjectName || '____')}</span>
        ${paper.academicYear ? `<span><strong>Session:</strong> ${esc(paper.academicYear)}</span>` : ''}
      </div>
      <div class="qp__metarow">
        <span><strong>Time Allowed:</strong> ${esc(formatDuration(paper.durationMins))}</span>
        <span><strong>Maximum Marks:</strong> ${paper.totalMarks}</span>
      </div>
    </div>
    <div class="qp__namerow">
      <span>Name: </span>
      <span>Roll No.: </span>
      <span>Date: </span>
    </div>
    ${giItems.length ? `<div class="qp__gi"><b>General Instructions:</b><ol>${giItems.map((g) => `<li>${esc(g)}</li>`).join('')}</ol></div>` : ''}
  `;
}

function formatDuration(mins: number): string {
  if (!mins) return '____';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h} hr ${m} min`;
  if (h) return `${h} hr${h > 1 ? 's' : ''}`;
  return `${m} min`;
}

function questionHtml(item: PaperItem, qNo: number): string {
  let body = `<div class="qp__q-body">${escMultiline(item.stem)}`;
  if (item.options && item.options.length) {
    body += `<ul class="qp__opts">${item.options
      .map((o, i) => `<li>${optionLetter(i)} ${escMultiline(o.text)}</li>`)
      .join('')}</ul>`;
  } else if (item.type === 'true_false') {
    body += `<ul class="qp__opts"><li>(a) True</li><li>(b) False</li></ul>`;
  } else if (item.type === 'sa' || item.type === 'la' || item.type === 'vsa' || item.type === 'case') {
    body += `<div class="qp__ans-space"></div>`;
  }
  body += `</div>`;
  return `<div class="qp__q"><span class="qp__q-no">${qNo}.</span>${body}<span class="qp__q-marks">[${item.marks}]</span></div>`;
}

function sectionsHtml(sections: PaperSection[]): { html: string } {
  let qNo = 0;
  const html = sections
    .filter((s) => s.items.length)
    .map((s) => {
      const qs = s.items
        .map((it) => {
          qNo += 1;
          return questionHtml(it, qNo);
        })
        .join('');
      return `<div class="qp__section">
        <div class="qp__section-title">${esc(s.label)}</div>
        ${s.instruction ? `<div class="qp__section-instr">${esc(s.instruction)}</div>` : ''}
        ${qs}
      </div>`;
    })
    .join('');
  return { html };
}

/** Build the printable question-paper HTML document. */
export function buildPaperHtml(paper: QuestionPaper, meta: PaperPrintMeta): string {
  const { html } = sectionsHtml(paper.sections);
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(paper.title)}</title>
<style>${SHARED_STYLE}</style></head>
<body>
  <div class="qp">
    ${paperHeadHtml(paper, meta)}
    ${html || '<p style="text-align:center;color:#999;">No questions added yet.</p>'}
    <div class="qp__foot">— End of Paper — &nbsp;•&nbsp; Generated by NEXLI</div>
  </div>
  <button class="qp__print-btn" onclick="window.print()">Print / Save as PDF</button>
</body></html>`;
}

function answerHtml(item: PaperItem, qNo: number): string {
  let ans = '';
  if (item.correct && item.correct.length) {
    // Map option keys back to their displayed letters when options exist.
    if (item.options && item.options.length) {
      const labels = item.correct
        .map((key) => {
          const idx = item.options!.findIndex((o) => o.key === key);
          return idx >= 0 ? optionLetter(idx).replace(/[()]/g, '').toUpperCase() : key;
        })
        .join(', ');
      ans = `<b>${esc(labels)}</b>`;
    } else {
      ans = `<b>${esc(item.correct.join(', '))}</b>`;
    }
  } else if (item.answer) {
    ans = `<b>${escMultiline(item.answer)}</b>`;
  } else {
    ans = '<span style="color:#999;">—</span>';
  }
  const sol = item.solution ? `<div class="ak__sol">${escMultiline(item.solution)}</div>` : '';
  return `<div class="ak__row"><span class="ak__no">${qNo}.</span><div class="ak__ans">${ans}${sol}</div></div>`;
}

/** Build the printable answer-key HTML document (auto-built from item snapshots). */
export function buildAnswerKeyHtml(paper: QuestionPaper, meta: PaperPrintMeta): string {
  let qNo = 0;
  const sections = paper.sections
    .filter((s) => s.items.length)
    .map((s) => {
      const rows = s.items
        .map((it) => {
          qNo += 1;
          return answerHtml(it, qNo);
        })
        .join('');
      return `<div class="qp__section">
        <div class="qp__section-title">${esc(s.label)}</div>
        ${rows}
      </div>`;
    })
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>Answer Key — ${esc(paper.title)}</title>
<style>${SHARED_STYLE}</style></head>
<body>
  <div class="qp">
    <div class="qp__head">
      <div class="qp__school">${esc(meta.schoolName)}</div>
      <div class="qp__exam">Answer Key — ${esc(paper.examName || paper.title)}</div>
      <div class="qp__metarow">
        <span><strong>Class:</strong> ${esc([paper.gradeName, paper.sectionName].filter(Boolean).join('-') || '____')}</span>
        <span><strong>Subject:</strong> ${esc(paper.subjectName || '____')}</span>
        <span><strong>Max Marks:</strong> ${paper.totalMarks}</span>
      </div>
    </div>
    ${sections || '<p style="text-align:center;color:#999;">No questions.</p>'}
    <div class="qp__foot">Confidential — staff use only &nbsp;•&nbsp; Generated by NEXLI</div>
  </div>
  <button class="qp__print-btn" onclick="window.print()">Print / Save as PDF</button>
</body></html>`;
}

/** Open the built HTML in a clean window for printing / Save-as-PDF. Returns false if blocked. */
export function openPrintWindow(html: string): boolean {
  const w = window.open('', '_blank', 'width=920,height=1200');
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  return true;
}
