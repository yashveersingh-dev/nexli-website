import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useSession } from '@/app/providers/SessionProvider';
import { usePayslips } from '@/features/finance/data';
import { PayslipDoc } from './PayslipDoc';

/** Printable salary slip for a single staff member in a run (mirrors ReceiptPage). */
export function PayslipPage() {
  const { runId = '', staffId = '' } = useParams();
  const navigate = useNavigate();
  const { schoolId, school } = useSession();
  const { data: payslips, loading } = usePayslips(schoolId, runId);

  const slip = payslips.find((p) => p.staffId === staffId);

  if (loading) return <div className="nx-page"><Skeleton height={64} /><Skeleton height={320} style={{ marginTop: 12 }} /></div>;
  if (!slip) {
    return (
      <div className="nx-page">
        <Panel>
          <EmptyState icon="file-text" title="Payslip not found" message="This payslip may not have been generated, or the run was removed."
            action={<Button variant="subtle" onClick={() => navigate(`/payroll/runs/${runId}`)}>Back to run</Button>} />
        </Panel>
      </div>
    );
  }

  return (
    <div className="nx-page">
      <div className="nx-page__head fin-noprint">
        <Button variant="ghost" size="sm" leftIcon="chevron-left" onClick={() => navigate(-1)}>Back</Button>
        <Button variant="gold" leftIcon="download" onClick={() => window.print()}>Print / save PDF</Button>
      </div>
      <PayslipDoc slip={slip} school={school} className="fin-print" />
    </div>
  );
}
