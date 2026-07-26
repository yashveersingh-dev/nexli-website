import { Navigate, Route, Routes } from 'react-router-dom';
import { StudentProfilePage } from './StudentProfilePage';
import { StudentTimetablePage } from './StudentTimetablePage';
import { StudentAcademicsPage } from './StudentAcademicsPage';
import { StudentCalendarPage } from './StudentCalendarPage';
import { StudentAchievementsPage } from './StudentAchievementsPage';
import { StudentWellnessPage } from './StudentWellnessPage';
import { StudentSupportPage } from './StudentSupportPage';
import './studentportal.css';

/**
 * Student Portal route wrappers — one per nav destination. Each renders a single
 * read-only screen and redirects unknown sub-paths back to its base. These are
 * lazy-registered against the STUDENT audience in `app/registerModules.ts`
 * (see the FLAG list in the build report).
 */

export function StudentProfileRoutes() {
  return (
    <Routes>
      <Route index element={<StudentProfilePage />} />
      <Route path="*" element={<Navigate to="/profile" replace />} />
    </Routes>
  );
}

export function StudentTimetableRoutes() {
  return (
    <Routes>
      <Route index element={<StudentTimetablePage />} />
      <Route path="*" element={<Navigate to="/timetable" replace />} />
    </Routes>
  );
}

export function StudentAcademicsRoutes() {
  return (
    <Routes>
      <Route index element={<StudentAcademicsPage />} />
      <Route path="*" element={<Navigate to="/academics" replace />} />
    </Routes>
  );
}

export function StudentCalendarRoutes() {
  return (
    <Routes>
      <Route index element={<StudentCalendarPage />} />
      <Route path="*" element={<Navigate to="/calendar" replace />} />
    </Routes>
  );
}

export function StudentAchievementsRoutes() {
  return (
    <Routes>
      <Route index element={<StudentAchievementsPage />} />
      <Route path="*" element={<Navigate to="/achievements" replace />} />
    </Routes>
  );
}

export function StudentWellnessRoutes() {
  return (
    <Routes>
      <Route index element={<StudentWellnessPage />} />
      <Route path="*" element={<Navigate to="/wellness" replace />} />
    </Routes>
  );
}

export function StudentSupportRoutes() {
  return (
    <Routes>
      <Route index element={<StudentSupportPage />} />
      <Route path="*" element={<Navigate to="/support" replace />} />
    </Routes>
  );
}

/** Default export kept for symmetry; the named *Routes are what get registered. */
export default StudentProfileRoutes;
