import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Panel } from '@/components/Panel';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { ConfirmModal } from '@/components/Modal';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { ReviewModeNote } from '@/components/ReviewModeNote';
import { formatDate } from '@/lib/format';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { PAPER_STATUS_META, type QuestionPaper } from '@/types/qpaper';
import { usePapers, deletePaper, clonePaper, type Actor } from './data';
import './qpaper.css';

export function PapersListPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member, can } = useSession();
  const canRead = can('exams.read');
  // Operate (build/clone/delete) is owned by teachers/exam-control; leadership reviews.
  const { canOperate: canWrite, isReviewer, ownerLabel } = useOwnership('qpaper');
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };

  const { data: papers, loading, error } = usePapers(canRead ? schoolId : undefined);
  const [deleting, setDeleting] = useState<QuestionPaper | null>(null);
  const [busy, setBusy] = useState(false);

  const clone = async (p: QuestionPaper) => {
    if (!schoolId) return;
    try {
      const newId = await clonePaper(schoolId, p, actor);
      toast.success('Paper cloned', `"${p.title} (copy)"`);
      navigate(`/question-papers/papers/${newId}`);
    } catch {
      toast.error('Could not clone the paper');
    }
  };

  const confirmDelete = async () => {
    if (!schoolId || !deleting) return;
    setBusy(true);
    try {
      await deletePaper(schoolId, deleting.id, actor);
      toast.success('Paper deleted');
      setDeleting(null);
    } catch {
      toast.error('Could not delete');
    } finally {
      setBusy(false);
    }
  };

  if (!canRead) {
    return (
      <div className="nx-page">
        <Panel><EmptyState icon="lock" title="No access" message="You don't have permission to view papers." /></Panel>
      </div>
    );
  }

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Question Papers</h1>
          <p className="nx-page__sub">Build, preview, print and clone board-style papers. Each carries its own snapshot of the questions used.</p>
        </div>
      </div>

      {isReviewer && !canWrite && <ReviewModeNote owner={ownerLabel} />}

      <div className="qp-toolbar">
        <Button variant="ghost" leftIcon="book" onClick={() => navigate('/question-papers')}>Question bank</Button>
        <div className="qp-grow" />
        {canWrite && (
          <Button variant="gold" leftIcon="plus" onClick={() => navigate('/question-papers/papers/new')}>New paper</Button>
        )}
      </div>

      {loading ? (
        <Skeleton height={240} />
      ) : error ? (
        <Panel><EmptyState icon="alert-triangle" title="Could not load papers" message="Please try again." /></Panel>
      ) : papers.length === 0 ? (
        <Panel>
          <EmptyState
            icon="file-text"
            title="No papers yet"
            message={canWrite ? 'Build your first paper manually or auto-fill it from a blueprint.' : 'Generated papers will appear here.'}
            action={canWrite ? <Button variant="gold" leftIcon="plus" onClick={() => navigate('/question-papers/papers/new')}>New paper</Button> : undefined}
          />
        </Panel>
      ) : (
        <Panel title={`${papers.length} paper${papers.length === 1 ? '' : 's'}`}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {papers.map((p) => {
              const meta = PAPER_STATUS_META[p.status] ?? PAPER_STATUS_META.draft;
              const qCount = p.sections.reduce((n, s) => n + s.items.length, 0);
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 4px', borderBottom: '1px solid var(--border, rgba(255,255,255,0.06))' }}>
                  <div style={{ minWidth: 0, flex: 1, cursor: 'pointer' }} onClick={() => navigate(`/question-papers/papers/${p.id}`)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: 14 }}>{p.title}</strong>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                      {[p.subjectName, p.gradeName, `${p.totalMarks} marks`, `${qCount} Qs`, p.createdAt ? formatDate(p.createdAt) : null].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" leftIcon="download" aria-label="Open / preview" onClick={() => navigate(`/question-papers/papers/${p.id}/preview`)} />
                  {canWrite && <Button variant="ghost" size="sm" leftIcon="copy" aria-label="Clone paper" onClick={() => clone(p)} />}
                  {canWrite && <Button variant="ghost" size="sm" leftIcon="x" aria-label="Delete paper" onClick={() => setDeleting(p)} />}
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      <ConfirmModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        tone="danger"
        icon="x"
        loading={busy}
        title="Delete this paper?"
        message={deleting ? `"${deleting.title}" will be permanently deleted.` : ''}
        confirmLabel="Delete"
      />
    </div>
  );
}
