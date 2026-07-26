import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useSession } from '@/app/providers/SessionProvider';
import { useHpcCards } from '@/features/analytics/data';
import { TERM_LABEL } from './hpcSchema';
import { HpcCardDoc } from './HpcCardDoc';
import type { HpcTerm } from '@/types/special';

/**
 * Bulk download/print: every approved (published) card for a grade/section/term,
 * stacked one-per-page. Reuses the printable `HpcCardDoc` + `window.print()`
 * (the fees `fin-print` model). Reached from the hub's "Print approved" action.
 */
export function HpcBatchPrintPage({ basePath = '/hpc' }: { basePath?: string }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { schoolId, school, can } = useSession();
  const { data: cards, loading } = useHpcCards(schoolId);

  const grade = params.get('grade') ?? '';
  const section = params.get('section') ?? '';
  const term = (params.get('term') ?? '') as HpcTerm | '';

  const matched = useMemo(
    () =>
      cards
        .filter((c) => c.published === true)
        .filter((c) => (grade ? c.gradeName === grade : true))
        .filter((c) => (section ? c.sectionName === section : true))
        .filter((c) => (term ? c.term === term : true))
        .sort((a, b) => a.studentName.localeCompare(b.studentName)),
    [cards, grade, section, term],
  );

  if (!can('gradebook.read')) {
    return <div className="nx-page"><Panel><EmptyState icon="lock" title="No access" /></Panel></div>;
  }
  if (loading) {
    return <div className="nx-page"><Skeleton height={48} /><Skeleton height={420} /></div>;
  }

  const scope = [grade, section].filter(Boolean).join(' · ') || 'All classes';
  const termLabel = term ? TERM_LABEL[term] : 'All terms';

  return (
    <div className="nx-page">
      <div className="nx-page__head hpc-noprint hpc-cardbar">
        <Button variant="ghost" size="sm" leftIcon="chevron-left" onClick={() => navigate(basePath)}>Back</Button>
        <div className="hpc-cardbar__actions">
          <span className="hpc-batch__count">{matched.length} approved card{matched.length === 1 ? '' : 's'} · {scope} · {termLabel}</span>
          <Button variant="gold" size="sm" leftIcon="download" disabled={matched.length === 0} onClick={() => window.print()}>
            Print / save PDF
          </Button>
        </div>
      </div>

      {matched.length === 0 ? (
        <Panel>
          <EmptyState
            icon="file-text"
            title="No approved cards to print"
            message="There are no approved cards matching this class and term yet. Approve cards first, then print the batch."
            action={<Button variant="subtle" leftIcon="chevron-left" onClick={() => navigate(basePath)}>Back to hub</Button>}
          />
        </Panel>
      ) : (
        <div className="hpc-batch hpc-print">
          {matched.map((c) => (
            <div className="hpc-batch__page" key={c.id}>
              <HpcCardDoc card={c} school={school} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
