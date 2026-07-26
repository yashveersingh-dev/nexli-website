import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Panel } from '@/components/Panel';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Tabs } from '@/components/Tabs';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { useSession } from '@/app/providers/SessionProvider';
import { PAPER_STATUS_META } from '@/types/qpaper';
import { usePaper } from './data';
import { PaperDoc } from './PaperDoc';
import { AnswerKeyDoc } from './AnswerKeyDoc';
import { buildPaperHtml, buildAnswerKeyHtml, openPrintWindow, type PaperPrintMeta } from './print';
import './qpaper.css';

export function PaperPreviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, school, can } = useSession();
  const canRead = can('exams.read');
  const canWrite = can('exams.write');

  const { data: paper, loading } = usePaper(canRead ? schoolId : undefined, id);
  const [view, setView] = useState<'paper' | 'key'>('paper');

  const meta: PaperPrintMeta = useMemo(
    () => ({
      schoolName: school?.name ?? 'School',
      schoolLocation: [school?.city, school?.state].filter(Boolean).join(', ') || undefined,
      schoolLogoUrl: school?.logoUrl,
    }),
    [school],
  );

  const printPaper = () => {
    if (!paper) return;
    const ok = openPrintWindow(buildPaperHtml(paper, meta));
    if (!ok) toast.error('Allow pop-ups to open the printable paper.');
  };
  const printKey = () => {
    if (!paper) return;
    const ok = openPrintWindow(buildAnswerKeyHtml(paper, meta));
    if (!ok) toast.error('Allow pop-ups to open the answer key.');
  };

  if (!canRead) {
    return <div className="nx-page"><Panel><EmptyState icon="lock" title="No access" message="You can't view this paper." /></Panel></div>;
  }
  if (loading) return <div className="nx-page"><Skeleton height={120} /><div style={{ height: 12 }} /><Skeleton height={460} /></div>;
  if (!paper) {
    return (
      <div className="nx-page">
        <EmptyState icon="file-text" title="Paper not found"
          action={<Button variant="subtle" onClick={() => navigate('/question-papers/papers')}>Back to papers</Button>} />
      </div>
    );
  }

  const statusMeta = PAPER_STATUS_META[paper.status] ?? PAPER_STATUS_META.draft;
  const qCount = paper.sections.reduce((n, s) => n + s.items.length, 0);

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">{paper.title}</h1>
          <p className="nx-page__sub">
            {[paper.subjectName, paper.gradeName, `${paper.totalMarks} marks`, `${qCount} questions`].filter(Boolean).join(' · ')}
            {'  '}<Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
          </p>
        </div>
      </div>

      <div className="qp-toolbar">
        <Button variant="ghost" leftIcon="chevron-left" onClick={() => navigate('/question-papers/papers')}>Papers</Button>
        {canWrite && <Button variant="ghost" leftIcon="edit" onClick={() => navigate(`/question-papers/papers/${paper.id}`)}>Edit</Button>}
        <div className="qp-grow" />
        <Button variant="subtle" leftIcon="download" onClick={printKey}>Print answer key</Button>
        <Button variant="gold" leftIcon="download" onClick={printPaper}>Print / Save PDF</Button>
      </div>

      <Tabs
        variant="line"
        aria-label="Preview"
        value={view}
        onChange={(v) => setView(v as 'paper' | 'key')}
        tabs={[
          { id: 'paper', label: 'Question paper', icon: 'file-text' },
          { id: 'key', label: 'Answer key', icon: 'check' },
        ]}
      >
        {(active) => (
          <div style={{ padding: '8px 0' }}>
            {active === 'paper' ? <PaperDoc paper={paper} meta={meta} /> : <AnswerKeyDoc paper={paper} meta={meta} />}
          </div>
        )}
      </Tabs>
    </div>
  );
}
