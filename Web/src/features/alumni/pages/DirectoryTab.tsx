import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { KPICard } from '@/components/KPICard';
import { Input, Select } from '@/components/form';
import { ConfirmModal } from '@/components/Modal';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { useSession } from '@/app/providers/SessionProvider';
import { useAlumni, deleteAlumnus } from '@/features/analytics/data';
import type { Alumnus } from '@/types/community';
import { AlumnusCard } from '../components/AlumnusCard';
import { AlumnusDetailModal } from '../components/AlumnusDetailModal';
import { INDUSTRY_OPTIONS, batchYears, matchesQuery } from '../meta';

export function DirectoryTab({ canWrite }: { canWrite: boolean }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const { data: alumni, loading, error } = useAlumni(schoolId);

  const [search, setSearch] = useState('');
  const [batch, setBatch] = useState('');
  const [industry, setIndustry] = useState('');
  const [selected, setSelected] = useState<Alumnus | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Alumnus | null>(null);
  const [deleting, setDeleting] = useState(false);

  const years = useMemo(() => batchYears(alumni), [alumni]);

  const stats = useMemo(() => {
    const mentors = alumni.filter((a) => a.willingToMentor).length;
    const batches = new Set(alumni.map((a) => a.batchYear).filter(Boolean)).size;
    return { total: alumni.length, mentors, batches };
  }, [alumni]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return alumni
      .filter((a) => !batch || a.batchYear === batch)
      .filter((a) => !industry || a.industry === industry)
      .filter((a) => matchesQuery(a, q))
      .sort((a, b) => {
        const byYear = (b.batchYear ?? '').localeCompare(a.batchYear ?? '');
        return byYear !== 0 ? byYear : (a.name ?? '').localeCompare(b.name ?? '');
      });
  }, [alumni, search, batch, industry]);

  const hasFilters = !!(search || batch || industry);

  const confirmDelete = async () => {
    if (!schoolId || !pendingDelete) return;
    setDeleting(true);
    try {
      await deleteAlumnus(schoolId, pendingDelete.id, { uid: uid ?? 'unknown', name: member?.name });
      toast.success('Alumnus removed', pendingDelete.name);
      setPendingDelete(null);
      setSelected(null);
    } catch {
      toast.error('Could not remove', 'Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="kpi-grid">
        <KPICard icon="users" label="Total alumni" count={stats.total} format="us" />
        <KPICard icon="sparkles" label="Willing mentors" count={stats.mentors} format="us" subColor="var(--gold)" />
        <KPICard icon="calendar" label="Batches" count={stats.batches} format="us" />
      </div>

      <div className="nx-toolbar" style={{ marginTop: 16 }}>
        <div className="nx-toolbar__search">
          <Input
            leftIcon="search"
            placeholder="Search by name, company or industry…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search alumni"
          />
        </div>
        <div className="nx-toolbar__filter">
          <Select
            value={batch}
            onChange={(e) => setBatch(e.target.value)}
            aria-label="Filter by batch year"
            options={[{ value: '', label: 'All batches' }, ...years.map((y) => ({ value: y, label: y }))]}
          />
        </div>
        <div className="nx-toolbar__filter">
          <Select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            aria-label="Filter by industry"
            options={[{ value: '', label: 'All industries' }, ...INDUSTRY_OPTIONS]}
          />
        </div>
        {canWrite && (
          <Button variant="gold" leftIcon="plus" onClick={() => navigate('/alumni/new')}>
            Add alumnus
          </Button>
        )}
      </div>

      {loading ? (
        <div className="an-alumni" aria-busy="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} height={196} radius={12} />
          ))}
        </div>
      ) : error ? (
        <EmptyState icon="alert-triangle" title="Could not load alumni" message="Check your connection and try again." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="users"
          title={hasFilters ? 'No alumni match your filters' : 'No alumni yet'}
          message={hasFilters ? 'Try clearing the search or filters.' : 'Build your alumni network by adding the first profile.'}
          action={
            hasFilters ? (
              <Button variant="subtle" onClick={() => { setSearch(''); setBatch(''); setIndustry(''); }}>Clear filters</Button>
            ) : canWrite ? (
              <Button variant="gold" leftIcon="plus" onClick={() => navigate('/alumni/new')}>Add alumnus</Button>
            ) : undefined
          }
        />
      ) : (
        <div className="an-alumni">
          {filtered.map((a) => (
            <AlumnusCard key={a.id} alumnus={a} onOpen={() => setSelected(a)} />
          ))}
        </div>
      )}

      <AlumnusDetailModal
        alumnus={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        canWrite={canWrite}
        onEdit={(id) => navigate(`/alumni/${id}/edit`)}
        onDelete={(a) => setPendingDelete(a)}
      />

      <ConfirmModal
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        tone="danger"
        title="Remove alumnus?"
        message={pendingDelete ? `“${pendingDelete.name}” will be removed from the alumni directory. This cannot be undone.` : undefined}
        confirmLabel="Remove"
        loading={deleting}
      />
    </div>
  );
}
