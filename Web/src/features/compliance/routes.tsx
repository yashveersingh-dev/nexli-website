import { Navigate, Route, Routes } from 'react-router-dom';
import { ComplianceHub } from './ComplianceHub';
import { ComplianceItemFormPage } from './ComplianceItemFormPage';
import './compliance.css';

/** Compliance calendar + document vault. */
export default function ComplianceRoutes() {
  return (
    <Routes>
      <Route index element={<ComplianceHub />} />
      <Route path="new" element={<ComplianceItemFormPage mode="new" />} />
      <Route path=":id/edit" element={<ComplianceItemFormPage mode="edit" />} />
      <Route path="*" element={<Navigate to="/compliance" replace />} />
    </Routes>
  );
}
