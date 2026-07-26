import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { Tabs } from '@/components/Tabs';
import { Toggle } from '@/components/form';
import { ConfirmModal } from '@/components/Modal';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { useSession } from '@/app/providers/SessionProvider';
import { useGrades } from '@/features/school/data';
import { useExams, updateExam, deleteExam } from '@/features/daily/data';
import { formatDate } from '@/lib/format';
import { dateRangeLabel } from './shared';
import { DatesheetTab } from './DatesheetTab';
import { ResultsTab } from './ResultsTab';
import { AdmitCardsTab } from './AdmitCardsTab';
import { PlanningTab } from './PlanningTab';
import { AnalyticsTab } from './AnalyticsTab';
import './examinations.css';

type TabId = 'planning' | 'datesheet' | 'results' | 'admit' | 'analytics';

export function ExamDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member, can } = useSession();
  const canWrite = can('exams.write');

  const { data: exams, loading, error } = useExams(schoolId);
  const { data: grades } = useGrades(schoolId);
  const exam = exams.find((e) => e.id === id);

  const [tab, setTab] = useState<TabId>('planning');
  const [publishing, setPublishing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const actor = { uid: uid ?? 'unknown', name: member?.name };
  const gradeName = (gid: string) => grades.find((g) => g.id === gid)?.name ?? gid;

  if (loading) {
    return <div className="nx-page"><Button variant="ghost" size="sm" leftIcon="chevron-left" onClick={() => navigate('/examinations')}>Back</Button><Panel><Skeleton height={80} /></Panel><Skeleton height={320} /></div>;
  }
  if (error || !exam) {
    return (
      <div className="nx-page">
        <EmptyState icon="file-text" title={error ? 'Could not load exam' : 'Exam not found'} action={<Button variant="subtle" onClick={() => navigate('/examinations')}>Back to exams</Button>} />
      </div>
    );
  }

  const togglePublish = async () => {
    if (!schoolId) return;
    setPublishing(true);
    try {
      await updateExam(schoolId, exam.id, { published: !exam.published }, actor);
      toast.success(exam.published ? 'Unpublished' : 'Results published', exam.name);
    } catch {
      toast.error('Could not update', 'Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  const confirmDelete = async () => {
    if (!schoolId) return;
    setDeleting(true);
    try {
      await deleteExam(schoolId, exam.id, actor);
      toast.success('Exam deleted', exam.name);
      navigate('/examinations');
    } catch {
      toast.error('Could not delete', 'Please try again.');
      setDeleting(false);
      setRemoving(false);
    }
  };

  const examGrades = (exam.gradeIds ?? []).map(gradeName);

  return (
    <div className="nx-page">
      <div className="nx-page__head" style={{ marginBottom: 12 }}>
        <Button variant="ghost" size="sm" leftIcon="chevron-left" onClick={() => navigate('/examinations')}>Back to exams</Button>
      </div>

      <Panel>
        <div className="nx-exam-head">
          <div style={{ minWidth: 0 }}>
            <h1 className="nx-page__title" style={{ marginBottom: 0 }}>{exam.name}</h1>
            <div className="nx-exam-head__meta">
              <Badge variant={exam.published ? 'success' : 'muted'}>{exam.published ? 'Published' : 'Draft'}</Badge>
              {exam.academicYear && <span className="nx-exam-head__item">{exam.academicYear}</span>}
              <span className="nx-exam-head__item">{dateRangeLabel(exam.startDate, exam.endDate, (ts) => formatDate(ts))}</span>
              {examGrades.length > 0 && <span className="nx-exam-head__item">{examGrades.join(', ')}</span>}
            </div>
          </div>
          {canWrite && (
            <div className="nx-exam-head__actions">
              <Toggle
                checked={!!exam.published}
                onChange={togglePublish}
                disabled={publishing}
                label="Publish results"
                aria-label="Publish exam results"
              />
              <Button variant="subtle" size="sm" leftIcon="edit" onClick={() => navigate(`/examinations/${exam.id}/edit`)}>Edit</Button>
              <Button variant="ghost" size="sm" leftIcon="x" onClick={() => setRemoving(true)} aria-label="Delete exam" />
            </div>
          )}
        </div>
      </Panel>

      <Tabs
        variant="line"
        aria-label="Exam sections"
        value={tab}
        onChange={(t) => setTab(t as TabId)}
        tabs={[
          { id: 'planning', label: 'Planning', icon: 'clipboard' },
          { id: 'datesheet', label: 'Datesheet', icon: 'calendar' },
          { id: 'results', label: 'Results', icon: 'award' },
          { id: 'admit', label: 'Admit cards', icon: 'file-text' },
          { id: 'analytics', label: 'Analytics', icon: 'bar-chart' },
        ]}
      >
        {(active) => (
          <>
            {active === 'planning' && <PlanningTab exam={exam} />}
            {active === 'datesheet' && <DatesheetTab exam={exam} />}
            {active === 'results' && <ResultsTab exam={exam} />}
            {active === 'admit' && <AdmitCardsTab exam={exam} />}
            {active === 'analytics' && <AnalyticsTab exam={exam} />}
          </>
        )}
      </Tabs>

      <ConfirmModal
        open={removing}
        onClose={() => setRemoving(false)}
        onConfirm={confirmDelete}
        tone="danger"
        loading={deleting}
        title="Delete exam?"
        message={`"${exam.name}", its datesheet and saved results will be removed. This cannot be undone.`}
        confirmLabel="Delete exam"
      />
    </div>
  );
}
