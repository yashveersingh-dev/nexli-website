import { Navigate, Route, Routes } from 'react-router-dom';
import { SpedHub } from './SpedHub';
import { IepFormPage } from './pages/IepFormPage';
import { IepDetailPage } from './pages/IepDetailPage';
import '@/features/analytics/analytics.css';
import './sped.css';

/** Special Education / IEP — confidential, special-educator-facing. Base `/sped`. */
export default function SpedRoutes() {
  return (
    <Routes>
      <Route index element={<SpedHub />} />
      <Route path="new" element={<IepFormPage mode="new" />} />
      <Route path=":id" element={<IepDetailPage />} />
      <Route path=":id/edit" element={<IepFormPage mode="edit" />} />
      <Route path="*" element={<Navigate to="/sped" replace />} />
    </Routes>
  );
}
