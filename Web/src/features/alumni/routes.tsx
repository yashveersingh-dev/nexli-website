import { Navigate, Route, Routes } from 'react-router-dom';
import { AlumniHub } from './pages/AlumniHub';
import { AlumniFormPage } from './pages/AlumniFormPage';
import '@/features/analytics/analytics.css';
import './alumni.css';

/**
 * Alumni module — directory, mentorship board and career insights, plus the
 * dedicated add/edit form. Nav-gated by the `alumni` feature flag; permissions
 * (`alumni.read` / `alumni.write`) enforced inside the pages. Base path: /alumni.
 */
export default function AlumniRoutes() {
  return (
    <Routes>
      <Route index element={<AlumniHub />} />
      <Route path="new" element={<AlumniFormPage mode="new" />} />
      <Route path=":id/edit" element={<AlumniFormPage mode="edit" />} />
      <Route path="*" element={<Navigate to="/alumni" replace />} />
    </Routes>
  );
}
