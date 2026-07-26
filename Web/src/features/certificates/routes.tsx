import { Navigate, Route, Routes } from 'react-router-dom';
import { CertificatesHub } from './CertificatesHub';

/** Certificate generator — issue, log, and re-print student certificates. */
export default function CertificatesRoutes() {
  return (
    <Routes>
      <Route index element={<CertificatesHub />} />
      <Route path="*" element={<Navigate to="/certificates" replace />} />
    </Routes>
  );
}
