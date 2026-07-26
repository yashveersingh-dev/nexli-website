import { Navigate, Route, Routes } from 'react-router-dom';
import { ConsentHub } from './ConsentHub';
import '@/features/compliance/compliance.css';
import './consent.css';

/** Privacy & Consent (DPDP) — purpose catalogue + per-student consent records. */
export default function ConsentRoutes() {
  return (
    <Routes>
      <Route index element={<ConsentHub />} />
      <Route path="*" element={<Navigate to="/consent" replace />} />
    </Routes>
  );
}
