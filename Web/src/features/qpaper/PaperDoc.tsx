import type { QuestionPaper } from '@/types/qpaper';
import type { PaperPrintMeta } from './print';
import './qpaper.css';

function optionLetter(i: number): string {
  return '(' + String.fromCharCode(97 + i) + ')';
}

function formatDuration(mins: number): string {
  if (!mins) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h} hr ${m} min`;
  if (h) return `${h} hr${h > 1 ? 's' : ''}`;
  return `${m} min`;
}

/** In-app, on-screen approximation of the printed paper (the print window uses
 *  the self-contained HTML in print.ts). Read-only. */
export function PaperDoc({ paper, meta }: { paper: QuestionPaper; meta: PaperPrintMeta }) {
  let qNo = 0;
  const cls = [paper.gradeName, paper.sectionName].filter(Boolean).join('-') || '—';
  const gi = (paper.instructions ?? []).filter((s) => s.trim());
  return (
    <div className="qp-preview">
      <div className="qp-preview__head">
        <div className="qp-preview__school">{meta.schoolName}</div>
        {meta.schoolLocation && <div style={{ fontSize: 12, color: '#555' }}>{meta.schoolLocation}</div>}
        <div className="qp-preview__exam">{paper.examName || paper.title}</div>
        <div className="qp-preview__meta">
          <span><strong>Class:</strong> {cls}</span>
          <span><strong>Subject:</strong> {paper.subjectName || '—'}</span>
          {paper.academicYear && <span><strong>Session:</strong> {paper.academicYear}</span>}
        </div>
        <div className="qp-preview__meta">
          <span><strong>Time Allowed:</strong> {formatDuration(paper.durationMins)}</span>
          <span><strong>Maximum Marks:</strong> {paper.totalMarks}</span>
        </div>
      </div>

      {gi.length > 0 && (
        <div style={{ fontSize: 12.5, marginBottom: 8 }}>
          <strong>General Instructions:</strong>
          <ol style={{ margin: '4px 0 0', paddingLeft: 20 }}>
            {gi.map((g, i) => <li key={i}>{g}</li>)}
          </ol>
        </div>
      )}

      {paper.sections.filter((s) => s.items.length).length === 0 ? (
        <p style={{ textAlign: 'center', color: '#999' }}>No questions added yet.</p>
      ) : (
        paper.sections
          .filter((s) => s.items.length)
          .map((s, si) => (
            <div key={si}>
              <div className="qp-preview__section-title">{s.label}</div>
              {s.instruction && <div className="qp-preview__instr">{s.instruction}</div>}
              {s.items.map((it) => {
                qNo += 1;
                return (
                  <div key={`${it.questionId}-${qNo}`} className="qp-preview__q">
                    <span className="qp-preview__q-no">{qNo}.</span>
                    <div className="qp-preview__q-body">
                      {it.stem}
                      {it.options && it.options.length > 0 && (
                        <ul className="qp-preview__opts">
                          {it.options.map((o, i) => <li key={o.key}>{optionLetter(i)} {o.text}</li>)}
                        </ul>
                      )}
                      {it.type === 'true_false' && (
                        <ul className="qp-preview__opts"><li>(a) True</li><li>(b) False</li></ul>
                      )}
                    </div>
                    <span className="qp-preview__q-marks">[{it.marks}]</span>
                  </div>
                );
              })}
            </div>
          ))
      )}
      <div style={{ textAlign: 'center', fontSize: 11, color: '#777', marginTop: 18 }}>— End of Paper —</div>
    </div>
  );
}
