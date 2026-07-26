import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { EmptyState, InfoCard, Skeleton } from '@/components/feedback';
import { useSession } from '@/app/providers/SessionProvider';
import { usePayment } from '@/features/finance/data';
import { formatINR } from '@/lib/format';
import { ReceiptDoc } from './ReceiptDoc';

/** Printable receipt for a single payment (staff + parent reachable). */
export function ReceiptPage({ basePath = '/fees' }: { basePath?: string }) {
  const { paymentId = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const justCreated = (location.state as { justCreated?: boolean } | null)?.justCreated === true;
  const { schoolId, school } = useSession();
  const { data: payment, loading } = usePayment(schoolId, paymentId);

  if (loading) return <div className="nx-page"><Skeleton height={64} /><Skeleton height={320} /></div>;
  if (!payment) {
    return <div className="nx-page"><Panel><EmptyState icon="wallet" title="Receipt not found" message="This payment may have been removed." action={<Button variant="subtle" onClick={() => navigate(basePath)}>Back</Button>} /></Panel></div>;
  }

  return (
    <div className="nx-page">
      <div className="nx-page__head fin-noprint">
        <Button variant="ghost" size="sm" leftIcon="chevron-left" onClick={() => navigate(-1)}>Back</Button>
        <Button variant="gold" leftIcon="download" onClick={() => window.print()}>Print receipt / save PDF</Button>
      </div>

      {justCreated && (
        <div className="fin-noprint">
          <InfoCard icon="check-circle" title={`Receipt ${payment.receiptNo} generated`}>
            {formatINR(payment.amount)} recorded for {payment.studentName}. The invoice's paid, due and status have been updated. Print it below or share the PDF.
          </InfoCard>
        </div>
      )}

      <ReceiptDoc payment={payment} school={school} className="fin-print" />
    </div>
  );
}
