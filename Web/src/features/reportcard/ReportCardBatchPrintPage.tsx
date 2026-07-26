import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useSession } from '@/app/providers/SessionProvider';
import { useReportCards, useSchemes } from './data';
import { findSeedScheme } from './schemes';
import { ReportCardDoc } from './ReportCardDoc';
import './reportcard.css';

/**
 * Bulk download/print: every approved (published) card for a grade/term, stacked
 * one-per-page. Reuses the printable `ReportCardDoc` + `window.print()` (the same
 * model as `HpcBatchPrintPage`). Reached from the hub's "Print approved" action.
 */
export function ReportCardBatchPrintPage({ basePath = '/report-cards' }: { basePath?: string }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { schoolId, school, can } = useSession();
  const { data: cards, loading } = useReportCards(schoolId);
  const { data: schemes } = useSchemes(schoolId);

  const grade = params.get('grade') ?? '';
  const term = params.get('term') ?? '';

  const matched = useMemo(
    () =>
      cards
        .filter((c) => c.published === true)
        .filter((c) => (grade ? c.gradeName === grade : true))
        .filter((c) => (term ? c.term === term : true))
        .sort((a, b) => a.studentName.localeCompare(b.studentName)),
    [cards, grade, term],
  );

  const bandsFor = (schemeId: string) =>
    schemes.find((s) => s.id === schemeId)?.gradeBands ?? findSeedScheme(schemeId)?.gradeBands;

  if (!can('gradebook.read')) {
    return <div className="nx-page"><Panel><EmptyState icon="lock" title="No access" /></Panel></div>;
  }
  if (loading) {
    return <div className="nx-page"><Skeleton height={48} /><Skeleton height={420} /></div>;
  }

  const scope = grade || 'All classes';
  const termLabel = term ? matched[0]?.termLabel ?? term : 'All terms';

  return (
    <div className="nx-page">
      <div className="nx-page__head rc-noprint rc-cardbar">
        <Button variant="ghost" size="sm" leftIcon="chevron-left" onClick={() => navigate(basePath)}>Back</Button>
        <div className="rc-cardbar__actions">
          <span className="rc-batch__count">{matched.length} approved card{matched.length === 1 ? '' : 's'} · {scope} · {termLabel}</span>
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
        <div className="rc-batch rc-print">
          {matched.map((c) => (
            <div className="rc-batch__page" key={c.id}>
              <ReportCardDoc card={c} school={school} gradeBands={bandsFor(c.schemeId)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
