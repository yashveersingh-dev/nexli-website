import { Navigate, Route, Routes } from 'react-router-dom';
import { SchoolsListPage } from './SchoolsListPage';
import { SchoolDetailPage } from './SchoolDetailPage';
import { SchoolEditPage } from './SchoolEditPage';
import { SchoolWizard } from './SchoolWizard';
import '@/features/platform/platform.css';

/** School registry route subtree (mounted at /schools/* for the platform audience). */
export default function SchoolsRoutes() {
  return (
    <Routes>
      <Route index element={<SchoolsListPage />} />
      <Route path="new" element={<SchoolWizard />} />
      <Route path=":id" element={<SchoolDetailPage />} />
      <Route path=":id/edit" element={<SchoolEditPage />} />
      <Route path="*" element={<Navigate to="/schools" replace />} />
    </Routes>
  );
}

/** Onboarding nav entry → jumps straight into the add-school wizard. */
export function OnboardingRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="/schools/new" replace />} />
      <Route path="*" element={<Navigate to="/schools/new" replace />} />
    </Routes>
  );
}
