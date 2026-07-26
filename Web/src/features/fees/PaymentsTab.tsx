import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { DataTable, type Column } from '@/components/DataTable';
import { Input, Select } from '@/components/form';
import { InfoCard } from '@/components/feedback';
import { Icon } from '@/components/Icon';
import { formatINR, formatDate } from '@/lib/format';
import { useSession } from '@/app/providers/SessionProvider';
import { usePayments } from '@/features/finance/data';
import { PAYMENT_METHOD_META, PAYMENT_METHOD_OPTIONS, PAYMENT_STATUS_META } from '@/features/finance/meta';
import { buildFeePaymentsTallyXml, downloadXml } from '@/features/finance/tallyExport';
import type { FeePayment } from '@/types/finance';

export function PaymentsTab() {
  const navigate = useNavigate();
  const { schoolId } = useSession();
  const { data: payments, loading, error } = usePayments(schoolId);
  const [q, setQ] = useState('');
  const [method, setMethod] = useState('');

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return payments
      .filter((p) => (method ? p.method === method : true))
      .filter((p) => (needle ? [p.studentName, p.receiptNo, p.reference, p.admissionNo].some((v) => v?.toLowerCase().includes(needle)) : true))
      .sort((a, b) => b.paidAt - a.paidAt);
  }, [payments, q, method]);

  const columns: Column<FeePayment>[] = [
    {
      key: 'receiptNo', header: 'Receipt', primary: true,
      render: (p) => (
        <span className="lib-book">
          <span className="nx-noticerow__icon is-normal" style={{ flexShrink: 0 }}><Icon name={PAYMENT_METHOD_META[p.method]?.icon ?? 'wallet'} size={15} /></span>
          <span className="lib-book__text">
            <span className="lib-book__title">{p.studentName}</span>
            <span className="lib-book__author">{p.receiptNo} · {formatDate(p.paidAt)}</span>
          </span>
        </span>
      ),
    },
    { key: 'method', header: 'Mode', hideOnMobile: true, render: (p) => PAYMENT_METHOD_META[p.method]?.label ?? p.method },
    { key: 'status', header: 'Status', hideOnMobile: true, render: (p) => <Badge variant={PAYMENT_STATUS_META[p.status].variant}>{PAYMENT_STATUS_META[p.status].label}</Badge> },
    { key: 'amount', header: 'Amount', align: 'right', render: (p) => <span className="fin-amount fin-amount--paid">{formatINR(p.amount)}</span> },
  ];

  const exportTally = () => {
    if (rows.length === 0) return;
    downloadXml('fee-receipts-tally', buildFeePaymentsTallyXml(rows));
  };

  const toolbar = (
    <div className="nx-toolbar">
      <div className="nx-toolbar__search">
        <Input leftIcon="search" placeholder="Search student, receipt, ref…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search payments" />
      </div>
      <Select value={method} onChange={(e) => setMethod(e.target.value)} aria-label="Filter by method"
        options={[{ value: '', label: 'All methods' }, ...PAYMENT_METHOD_OPTIONS]} />
      <Button variant="subtle" leftIcon="download" onClick={exportTally} disabled={rows.length === 0} title="Export the listed receipts as a Tally-importable XML">Tally XML</Button>
    </div>
  );

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <InfoCard icon="file-text" title="Every payment has a numbered receipt">
          Recording a payment auto-generates a numbered receipt. Open any row to view, print or save its receipt as a PDF. To take a new payment, go to a student's ledger and choose Collect payment.
        </InfoCard>
      </div>
      <DataTable
        columns={columns} rows={rows} rowKey={(p) => p.id} loading={loading} error={error ? 'Could not load payments.' : null}
        toolbar={toolbar} onRowClick={(p) => navigate(`/fees/receipt/${p.id}`)}
        emptyIcon="wallet"
        emptyTitle={q || method ? 'No matching payments' : 'No payments recorded'}
        emptyMessage={q || method ? 'Try a different search or filter.' : 'Recorded fee payments will appear here with their receipts.'}
      />
    </>
  );
}
