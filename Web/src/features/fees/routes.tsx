import { Navigate, Route, Routes } from 'react-router-dom';
import { FeesHub } from './FeesHub';
import { StudentLedgerPage } from './StudentLedgerPage';
import { CollectPaymentPage } from './CollectPaymentPage';
import { FeeStructureFormPage } from './FeeStructureFormPage';
import { ReceiptPage } from './ReceiptPage';
import { MyFeesPage } from './MyFeesPage';
import '@/features/finance/finance.css';

/** Staff fee management: hub (overview/ledger/structures/payments/settings) + dedicated pages. */
export default function FeesRoutes() {
  return (
    <Routes>
      <Route index element={<FeesHub />} />
      <Route path="structures/new" element={<FeeStructureFormPage mode="new" />} />
      <Route path="structures/:id/edit" element={<FeeStructureFormPage mode="edit" />} />
      <Route path="students/:studentId" element={<StudentLedgerPage />} />
      <Route path="students/:studentId/pay" element={<CollectPaymentPage />} />
      <Route path="receipt/:paymentId" element={<ReceiptPage />} />
      <Route path="*" element={<Navigate to="/fees" replace />} />
    </Routes>
  );
}

/** Parent/student fee view + receipts (rendered at /fees). */
export function MyFeesRoutes() {
  return (
    <Routes>
      <Route index element={<MyFeesPage />} />
      <Route path="receipt/:paymentId" element={<ReceiptPage />} />
      <Route path="*" element={<Navigate to="/fees" replace />} />
    </Routes>
  );
}
