import { Navigate, Route, Routes } from 'react-router-dom';
import { MyCareerPage } from './MyCareerPage';
import { CareerHub } from './CareerHub';

/**
 * Career Counselling & Aptitude routes (Phase 1 — offline assessment + scoring).
 *
 * Two audience-specific entry points, registered separately in registerModules:
 *   • CareerStudentRoutes — a student takes the assessment + views their own result.
 *   • CareerStaffRoutes   — counsellor/staff review the cohort + add guidance notes.
 *
 * Module key `career`, base path `/career`.
 */

/** STUDENT audience: take the assessment + view own result. */
export function CareerStudentRoutes() {
  return (
    <Routes>
      <Route index element={<MyCareerPage />} />
      <Route path="*" element={<Navigate to="/career" replace />} />
    </Routes>
  );
}

/** STAFF / counsellor audience: cohort review + guidance notes. */
export function CareerStaffRoutes() {
  return (
    <Routes>
      <Route index element={<CareerHub />} />
      <Route path="*" element={<Navigate to="/career" replace />} />
    </Routes>
  );
}

/** Default export (staff hub) so the module can be registered with a single import. */
export default CareerStaffRoutes;
