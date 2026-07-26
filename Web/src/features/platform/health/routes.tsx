import { Navigate, Route, Routes } from 'react-router-dom';
import { SystemHealthPage } from './SystemHealthPage';
import '@/features/platform/platform.css';
import './health.css';

/** System Health route subtree (mounted at /health/* for platform). */
export default function HealthRoutes() {
  return (
    <Routes>
      <Route index element={<SystemHealthPage />} />
      <Route path="*" element={<Navigate to="/health" replace />} />
    </Routes>
  );
}
