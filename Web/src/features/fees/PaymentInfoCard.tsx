import { Panel } from '@/components/Panel';
import { EmptyState } from '@/components/feedback';
import type { FinanceSettings } from '@/types/finance';

/** Payment instructions (UPI + bank + QR) shown to parents/students. */
export function PaymentInfoCard({ settings }: { settings?: FinanceSettings | null }) {
  const hasAny = settings && (settings.upiId || settings.accountNo || settings.qrImageUrl);
  return (
    <Panel title="How to pay" sub="Pay via UPI or bank transfer, then keep the reference for your records.">
      {!hasAny ? (
        <EmptyState icon="credit-card" title="Payment details not published" message="Your school has not added online payment details yet. Please pay at the school fee counter." />
      ) : (
        <div className="fin-payinfo">
          {settings?.qrImageUrl && (
            <img className="fin-payinfo__qr" src={settings.qrImageUrl} alt="Payment QR code" loading="lazy" />
          )}
          <div className="fin-kv-list">
            {settings?.upiId && (
              <div className="nx-kv"><span className="nx-kv__k">UPI ID</span><span className="nx-kv__v">{settings.upiId}</span></div>
            )}
            {settings?.payeeName && (
              <div className="nx-kv"><span className="nx-kv__k">Payee</span><span className="nx-kv__v">{settings.payeeName}</span></div>
            )}
            {settings?.bankName && (
              <div className="nx-kv"><span className="nx-kv__k">Bank</span><span className="nx-kv__v">{settings.bankName}</span></div>
            )}
            {settings?.accountNo && (
              <div className="nx-kv"><span className="nx-kv__k">Account no.</span><span className="nx-kv__v">{settings.accountNo}</span></div>
            )}
            {settings?.ifsc && (
              <div className="nx-kv"><span className="nx-kv__k">IFSC</span><span className="nx-kv__v">{settings.ifsc}</span></div>
            )}
            {settings?.branch && (
              <div className="nx-kv"><span className="nx-kv__k">Branch</span><span className="nx-kv__v">{settings.branch}</span></div>
            )}
            {settings?.notes && <p style={{ fontSize: 12.5, marginTop: 8, color: 'var(--text-muted)' }}>{settings.notes}</p>}
          </div>
        </div>
      )}
    </Panel>
  );
}
