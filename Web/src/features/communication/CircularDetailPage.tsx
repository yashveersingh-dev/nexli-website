import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { ConfirmModal } from '@/components/Modal';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { useSession, useCan } from '@/app/providers/SessionProvider';
import { useCircular, updateCircular, deleteCircular } from '@/features/daily/data';
import { useGrades, useSections } from '@/features/school/data';
import { CIRCULAR_CATEGORY_META } from '@/features/daily/meta';
import { formatDate, formatRelative } from '@/lib/format';
import { audienceSummary } from './util';

/** Full circular view with staff pin/delete controls. */
export function CircularDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const canManage = useCan('announcements.send');
  const { data: circular, loading } = useCircular(schoolId, id);
  const { data: grades } = useGrades(schoolId);
  const { data: sections } = useSections(schoolId);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const actor = { uid: uid ?? 'unknown', name: member?.name };

  if (loading) return <div className="nx-page"><Skeleton height={48} /><Panel><Skeleton height={240} /></Panel></div>;
  if (!circular || !id || !schoolId) {
    return (
      <div className="nx-page">
        <EmptyState icon="megaphone" title="Circular not found" message="This circular may have been removed." action={<Button variant="subtle" leftIcon="chevron-left" onClick={() => navigate('/communication')}>Back to circulars</Button>} />
      </div>
    );
  }

  const meta = CIRCULAR_CATEGORY_META[circular.category];
  const emergency = !!circular.emergency || circular.category === 'emergency';

  const togglePin = async () => {
    setBusy(true);
    try {
      await updateCircular(schoolId, id, { pinned: !circular.pinned }, actor);
      toast.success(circular.pinned ? 'Unpinned' : 'Pinned to top');
    } catch {
      toast.error('Could not update');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await deleteCircular(schoolId, id, actor);
      toast.success('Circular deleted');
      navigate('/communication');
    } catch {
      toast.error('Could not delete');
      setBusy(false);
    }
  };

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <button type="button" className="nx-circ-back" onClick={() => navigate('/communication')} aria-label="Back to circulars">
          <Icon name="chevron-left" size={18} aria-hidden="true" />
        </button>
        {canManage && (
          <div className="nx-detail__actions">
            <Button variant="subtle" size="sm" leftIcon="bell" onClick={togglePin} disabled={busy}>
              <span>{circular.pinned ? 'Unpin' : 'Pin'}</span>
            </Button>
            <Button variant="danger" size="sm" leftIcon="x" onClick={() => setConfirmDelete(true)} disabled={busy}>
              <span>Delete</span>
            </Button>
          </div>
        )}
      </div>

      <Panel className={emergency ? 'nx-circ-detail is-emergency' : 'nx-circ-detail'}>
        <div className="nx-circ-detail__head">
          <Badge variant={meta.variant}>
            <Icon name={meta.icon} size={12} aria-hidden="true" />
            <span>{meta.label}</span>
          </Badge>
          {circular.pinned && <Badge variant="info">Pinned</Badge>}
          {emergency && <Badge variant="danger">Emergency</Badge>}
        </div>

        <h1 className="nx-circ-detail__title">{circular.title}</h1>

        <div className="nx-detail__meta">
          <span>{audienceSummary(circular, grades, sections)}</span>
          {circular.publishedAt && (
            <>
              <span className="dot" aria-hidden="true" />
              <span title={formatDate(circular.publishedAt)}>{formatRelative(circular.publishedAt)}</span>
            </>
          )}
          {circular.publishedByName && (
            <>
              <span className="dot" aria-hidden="true" />
              <span>by {circular.publishedByName}</span>
            </>
          )}
        </div>

        <div className="nx-circ-detail__body">{circular.body}</div>

        {circular.attachmentUrl && (
          <a className="nx-circ-detail__attach" href={circular.attachmentUrl} target="_blank" rel="noreferrer">
            <Icon name="file-text" size={15} aria-hidden="true" />
            <span>View attachment</span>
          </a>
        )}
      </Panel>

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        tone="danger"
        title="Delete this circular?"
        message="It will be removed from every recipient's inbox. This cannot be undone."
        confirmLabel="Delete"
        loading={busy}
      />
    </div>
  );
}
