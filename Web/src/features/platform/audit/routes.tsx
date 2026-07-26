import { Navigate, Route, Routes } from 'react-router-dom';
import { AuditTrailPage } from './AuditTrailPage';
import '@/features/platform/platform.css';
import './audit.css';

/** Platform audit trail route subtree (mounted at /audit/* for the platform audience). */
export default function AuditRoutes() {
  return (
    <Routes>
      <Route index element={<AuditTrailPage />} />
      <Route path="*" element={<Navigate to="/audit" replace />} />
    </Routes>
  );
}
