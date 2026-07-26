import { Navigate, Route, Routes } from 'react-router-dom';
import { SupportPage } from './SupportPage';
import '@/features/platform/platform.css';

/** Platform support tickets route subtree (mounted at /support/*). */
export default function SupportRoutes() {
  return (
    <Routes>
      <Route index element={<SupportPage />} />
      <Route path="*" element={<Navigate to="/support" replace />} />
    </Routes>
  );
}
