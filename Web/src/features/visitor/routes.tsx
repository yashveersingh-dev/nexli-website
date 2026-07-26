import { Navigate, Route, Routes } from 'react-router-dom';
import { VisitorHub } from './VisitorHub';
import { VisitorCheckInPage } from './VisitorCheckInPage';
import { VisitorPassPage } from './VisitorPassPage';
import '@/features/ops/ops.css';

/** Visitor & gate: register/log/blacklist hub + check-in + gate pass. */
export default function VisitorRoutes() {
  return (
    <Routes>
      <Route index element={<VisitorHub />} />
      <Route path="new" element={<VisitorCheckInPage />} />
      <Route path=":id" element={<VisitorPassPage />} />
      <Route path="*" element={<Navigate to="/visitor" replace />} />
    </Routes>
  );
}
