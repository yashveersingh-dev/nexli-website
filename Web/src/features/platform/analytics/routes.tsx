import { Navigate, Route, Routes } from 'react-router-dom';
import { AnalyticsPage } from './AnalyticsPage';
import '@/features/platform/platform.css';
import './analytics.css';

/** Platform Analytics route subtree (mounted at /analytics/* for platform). */
export default function AnalyticsRoutes() {
  return (
    <Routes>
      <Route index element={<AnalyticsPage />} />
      <Route path="*" element={<Navigate to="/analytics" replace />} />
    </Routes>
  );
}
