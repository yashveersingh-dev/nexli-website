import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Field, Input, Select } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useSession, useCan } from '@/app/providers/SessionProvider';
import { useCirculars } from '@/features/daily/data';
import { useGrades, useSections } from '@/features/school/data';
import { CIRCULAR_CATEGORY_META } from '@/features/daily/meta';
import type { CircularCategory } from '@/types/daily';
import { CircularCard } from './CircularCard';
import { audienceSummary, sortCirculars } from './util';

const CATEGORY_FILTER_OPTIONS = [
  { value: '', label: 'All categories' },
  ...(Object.keys(CIRCULAR_CATEGORY_META) as CircularCategory[]).map((c) => ({ value: c, label: CIRCULAR_CATEGORY_META[c].label })),
];

/** Staff circular list: search + category filter, pinned first. */
export function CircularListPage() {
  const navigate = useNavigate();
  const { schoolId } = useSession();
  const canSend = useCan('announcements.send');
  const { data: circulars, loading } = useCirculars(schoolId);
  const { data: grades } = useGrades(schoolId);
  const { data: sections } = useSections(schoolId);

  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = circulars.filter((c) => {
      if (cat && c.category !== cat) return false;
      if (needle && !`${c.title} ${c.body}`.toLowerCase().includes(needle)) return false;
      return true;
    });
    return sortCirculars(filtered);
  }, [circulars, q, cat]);

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Communication</h1>
          <p className="nx-page__sub">Circulars &amp; announcements for your school community.</p>
        </div>
        {canSend && (
          <Button variant="gold" leftIcon="plus" onClick={() => navigate('/communication/new')}>
            New circular
          </Button>
        )}
      </div>

      <div className="nx-toolbar">
        <div className="nx-toolbar__search">
          <Input leftIcon="search" placeholder="Search circulars…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search circulars" />
        </div>
        <Field className="nx-toolbar__filter">
          <Select value={cat} onChange={(e) => setCat(e.target.value)} options={CATEGORY_FILTER_OPTIONS} aria-label="Filter by category" />
        </Field>
      </div>

      {loading ? (
        <div className="grid g-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={132} />)}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon="megaphone"
          title={circulars.length === 0 ? 'No circulars yet' : 'No matches'}
          message={circulars.length === 0 ? 'Publish your first circular to reach parents, students and staff.' : 'Try a different search or category.'}
          action={canSend && circulars.length === 0 ? <Button variant="gold" leftIcon="plus" onClick={() => navigate('/communication/new')}>New circular</Button> : undefined}
        />
      ) : (
        <div className="nx-circ-list">
          {list.map((c) => (
            <CircularCard key={c.id} circular={c} audience={audienceSummary(c, grades, sections)} onClick={() => navigate(`/communication/${c.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}
