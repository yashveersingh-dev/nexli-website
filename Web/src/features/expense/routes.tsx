import { Navigate, Route, Routes } from 'react-router-dom';
import { ExpenseHub } from './ExpenseHub';
import { ExpenseFormPage } from './ExpenseFormPage';
import { RequisitionFormPage } from './RequisitionFormPage';
import { RequisitionDetailPage } from './RequisitionDetailPage';
import { PurchaseOrderFormPage } from './PurchaseOrderFormPage';
import { PurchaseOrderDetailPage } from './PurchaseOrderDetailPage';
import '@/features/finance/finance.css';
import './expense.css';

/**
 * Staff expense & procurement: hub (expenses / requisitions / purchase orders /
 * vendors) + dedicated routed form & detail pages. Base path: /expense.
 */
export default function ExpenseRoutes() {
  return (
    <Routes>
      <Route index element={<ExpenseHub />} />
      <Route path="new" element={<ExpenseFormPage mode="new" />} />
      <Route path=":id/edit" element={<ExpenseFormPage mode="edit" />} />
      <Route path="requisitions/new" element={<RequisitionFormPage mode="new" />} />
      <Route path="requisitions/:id/edit" element={<RequisitionFormPage mode="edit" />} />
      <Route path="requisitions/:id" element={<RequisitionDetailPage />} />
      <Route path="po/new" element={<PurchaseOrderFormPage />} />
      <Route path="po/:id" element={<PurchaseOrderDetailPage />} />
      <Route path="*" element={<Navigate to="/expense" replace />} />
    </Routes>
  );
}
