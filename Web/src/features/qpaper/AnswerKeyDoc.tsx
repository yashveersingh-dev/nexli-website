import type { PaperItem, QuestionPaper } from '@/types/qpaper';
import type { PaperPrintMeta } from './print';
import './qpaper.css';

function optionLetter(i: number): string {
  return String.fromCharCode(65 + i); // A, B, C…
}

/** Display the correct answer for one item (keys mapped to letters where possible). */
function answerText(it: PaperItem): string {
  if (it.correct && it.correct.length) {
    if (it.options && it.options.length) {
      return it.correct
        .map((key) => {
          const idx = it.options!.findIndex((o) => o.key === key);
          return idx >= 0 ? optionLetter(idx) : key;
        })
        .join(', ');
    }
    return it.correct.join(', ');
  }
  if (it.answer) return it.answer;
  return '—';
}

/** In-app, on-screen answer key (the print window uses the HTML in print.ts). */
export function AnswerKeyDoc({ paper, meta }: { paper: QuestionPaper; meta: PaperPrintMeta }) {
  let qNo = 0;
  const cls = [paper.gradeName, paper.sectionName].filter(Boolean).join('-') || '—';
  return (
    <div className="qp-preview">
      <div className="qp-preview__head">
        <div className="qp-preview__school">{meta.schoolName}</div>
        <div className="qp-preview__exam">Answer Key — {paper.examName || paper.title}</div>
        <div className="qp-preview__meta">
          <span><strong>Class:</strong> {cls}</span>
          <span><strong>Subject:</strong> {paper.subjectName || '—'}</span>
          <span><strong>Max Marks:</strong> {paper.totalMarks}</span>
        </div>
      </div>

      {paper.sections.filter((s) => s.items.length).length === 0 ? (
        <p style={{ textAlign: 'center', color: '#999' }}>No questions.</p>
      ) : (
        paper.sections
          .filter((s) => s.items.length)
          .map((s, si) => (
            <div key={si}>
              <div className="qp-preview__section-title">{s.label}</div>
              {s.items.map((it) => {
                qNo += 1;
                return (
                  <div key={`${it.questionId}-${qNo}`} style={{ display: 'flex', gap: 10, fontSize: 13, padding: '5px 0', borderBottom: '1px solid #eee' }}>
                    <span style={{ fontWeight: 700, minWidth: 24 }}>{qNo}.</span>
                    <div style={{ flex: 1 }}>
                      <strong style={{ color: '#1a5d1a' }}>{answerText(it)}</strong>
                      {it.solution && <div style={{ color: '#444', fontSize: 12, marginTop: 2, whiteSpace: 'pre-wrap' }}>{it.solution}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
      )}
      <div style={{ textAlign: 'center', fontSize: 11, color: '#777', marginTop: 18 }}>Confidential — staff use only</div>
    </div>
  );
}
