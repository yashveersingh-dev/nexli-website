import { Navigate, Route, Routes } from 'react-router-dom';
import { PlansListPage } from './PlansListPage';
import { PlanEditPage } from './PlanEditPage';
import '@/features/platform/platform.css';
import './plans.css';

/** Plans & Pricing route subtree (mounted at /plans/* for the platform audience). */
export default function PlansRoutes() {
  return (
    <Routes>
      <Route index element={<PlansListPage />} />
      <Route path="new" element={<PlanEditPage mode="create" />} />
      <Route path=":id/edit" element={<PlanEditPage mode="edit" />} />
      <Route path="*" element={<Navigate to="/plans" replace />} />
    </Routes>
  );
}
