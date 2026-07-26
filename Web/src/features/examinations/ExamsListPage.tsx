import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Input } from '@/components/form';
import { Icon } from '@/components/Icon';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useSession } from '@/app/providers/SessionProvider';
import { useGrades } from '@/features/school/data';
import { useExams } from '@/features/daily/data';
import { formatDate } from '@/lib/format';
import type { Exam } from '@/types/daily';
import { dateRangeLabel } from './shared';
import './examinations.css';

/**
 * Exam-terms list. Rendered standalone at `/examinations` OR embedded as the first
 * tab of the Examinations hub. When `embedded`, the outer page wrapper + heading
 * are omitted (the hub supplies a single shared head) and the "New exam" action
 * moves into the toolbar so the tab body stays self-contained.
 */
export function ExamsListPage({ embedded = false }: { embedded?: boolean } = {}) {
  const navigate = useNavigate();
  const { schoolId, can } = useSession();
  const canWrite = can('exams.write');
  const { data: exams, loading, error } = useExams(schoolId);
  const { data: grades } = useGrades(schoolId);
  const [search, setSearch] = useState('');

  const gradeName = (gid: string) => grades.find((g) => g.id === gid)?.name ?? gid;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return exams
      .filter((e) => !q || e.name?.toLowerCase().includes(q) || e.academicYear?.toLowerCase().includes(q))
      .sort((a, b) => (b.startDate ?? b.createdAt ?? 0) - (a.startDate ?? a.createdAt ?? 0));
  }, [exams, search]);

  const stats = useMemo(() => {
    const published = exams.filter((e) => e.published).length;
    return { total: exams.length, published, drafts: exams.length - published };
  }, [exams]);

  const body = (
    <>
      {embedded ? (
        canWrite && (
          <div className="nx-page__head" style={{ marginBottom: 12 }}>
            <p className="nx-page__sub" style={{ margin: 0 }}>Create exam terms, build datesheets, enter results &amp; issue admit cards.</p>
            <Button variant="gold" leftIcon="plus" onClick={() => navigate('/examinations/new')}>New exam</Button>
          </div>
        )
      ) : (
        <div className="nx-page__head">
          <div>
            <h1 className="nx-page__title">Examinations</h1>
            <p className="nx-page__sub">Formal term/board exams — datesheets, admit cards &amp; results. For routine class tests &amp; assignments, use Class Assessments.</p>
          </div>
          {canWrite && (
            <Button variant="gold" leftIcon="plus" onClick={() => navigate('/examinations/new')}>New exam</Button>
          )}
        </div>
      )}

      {!loading && !error && exams.length > 0 && (
        <div className="nx-statstrip" style={{ marginBottom: 16 }}>
          <div className="nx-statstrip__item">
            <div className="nx-statstrip__val">{stats.total}</div>
            <div className="nx-statstrip__lbl">Exam terms</div>
          </div>
          <div className="nx-statstrip__item">
            <div className="nx-statstrip__val" style={{ color: 'var(--success)' }}>{stats.published}</div>
            <div className="nx-statstrip__lbl">Published</div>
          </div>
          <div className="nx-statstrip__item">
            <div className="nx-statstrip__val" style={{ color: 'var(--text-muted)' }}>{stats.drafts}</div>
            <div className="nx-statstrip__lbl">Drafts</div>
          </div>
        </div>
      )}

      {exams.length > 0 && (
        <div className="nx-toolbar">
          <div className="nx-toolbar__search">
            <Input
              leftIcon="search"
              placeholder="Search exams…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search exam terms"
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="nx-exam-cards">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={150} radius={14} />)}
        </div>
      ) : error ? (
        <EmptyState icon="alert-triangle" title="Could not load exams" message="Check your connection and try again." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="file-text"
          title={search ? 'No exams match' : 'No exam terms yet'}
          message={search ? 'Try a different search.' : 'Create your first exam term (e.g. Term 1, Half Yearly) to build a datesheet and enter results.'}
          action={canWrite && !search ? <Button variant="gold" leftIcon="plus" onClick={() => navigate('/examinations/new')}>New exam</Button> : undefined}
        />
      ) : (
        <div className="nx-exam-cards">
          {filtered.map((exam) => (
            <ExamCard key={exam.id} exam={exam} gradeName={gradeName} onOpen={() => navigate(`/examinations/${exam.id}`)} />
          ))}
        </div>
      )}
    </>
  );

  return embedded ? body : <div className="nx-page">{body}</div>;
}

function ExamCard({ exam, gradeName, onOpen }: { exam: Exam; gradeName: (id: string) => string; onOpen: () => void }) {
  const gradeIds = exam.gradeIds ?? [];
  const shown = gradeIds.slice(0, 4);
  const extra = gradeIds.length - shown.length;
  return (
    <div
      className="nx-exam-card"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      aria-label={`Open ${exam.name}`}
    >
      <div className="nx-exam-card__top">
        <div style={{ minWidth: 0 }}>
          <div className="nx-exam-card__name">{exam.name}</div>
          {exam.academicYear && <div className="nx-exam-card__year">{exam.academicYear}</div>}
        </div>
        <Badge variant={exam.published ? 'success' : 'muted'}>{exam.published ? 'Published' : 'Draft'}</Badge>
      </div>
      <div className="nx-exam-card__meta">
        <div className="nx-exam-card__row">
          <Icon name="calendar" size={14} />
          <span>{dateRangeLabel(exam.startDate, exam.endDate, (ts) => formatDate(ts))}</span>
        </div>
        {gradeIds.length > 0 && (
          <div className="nx-exam-card__grades">
            {shown.map((gid) => <Badge key={gid} variant="info">{gradeName(gid)}</Badge>)}
            {extra > 0 && <Badge variant="muted">+{extra}</Badge>}
          </div>
        )}
      </div>
    </div>
  );
}
