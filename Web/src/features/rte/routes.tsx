import { Navigate, Route, Routes } from 'react-router-dom';
import { RteHub } from './RteHub';
import { RteApplicationFormPage } from './RteApplicationFormPage';
import { RteClaimFormPage } from './RteClaimFormPage';
import '@/features/compliance/compliance.css';
import './rte.css';

/** RTE quota & reimbursement — applications, lottery, and state claims. */
export default function RteRoutes() {
  return (
    <Routes>
      <Route index element={<RteHub />} />
      <Route path="new" element={<RteApplicationFormPage mode="new" />} />
      <Route path=":id/edit" element={<RteApplicationFormPage mode="edit" />} />
      <Route path="claims/new" element={<RteClaimFormPage mode="new" />} />
      <Route path="claims/:id/edit" element={<RteClaimFormPage mode="edit" />} />
      <Route path="*" element={<Navigate to="/rte" replace />} />
    </Routes>
  );
}
