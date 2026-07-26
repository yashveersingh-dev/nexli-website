import { Navigate, Route, Routes } from 'react-router-dom';
import { DelegationPage } from './DelegationPage';
import './delegation.css';

/**
 * Operational Delegation — base `/delegation`. Leadership/admin grant temporary
 * operate access to substitutes (decision: cover staffing gaps without a
 * permanent role change). Reason + window + audit; reflected in `useOwnership`.
 */
export default function DelegationRoutes() {
  return (
    <Routes>
      <Route index element={<DelegationPage />} />
      <Route path="*" element={<Navigate to="/delegation" replace />} />
    </Routes>
  );
}
