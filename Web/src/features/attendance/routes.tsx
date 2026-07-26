import { Navigate, Route, Routes } from 'react-router-dom';
import { MarkAttendancePage } from './MarkAttendancePage';
import { AttendanceOverviewPage } from './AttendanceOverviewPage';
import { MyAttendancePage } from './MyAttendancePage';
import './attendance.css';

/** Staff attendance: mark roster + per-student overview/alerts. */
export default function AttendanceRoutes() {
  return (
    <Routes>
      <Route index element={<MarkAttendancePage />} />
      <Route path="overview" element={<AttendanceOverviewPage />} />
      <Route path="*" element={<Navigate to="/attendance" replace />} />
    </Routes>
  );
}

/** Parent/student read-only attendance view. */
export function MyAttendanceRoutes() {
  return (
    <Routes>
      <Route index element={<MyAttendancePage />} />
      <Route path="*" element={<Navigate to="/attendance" replace />} />
    </Routes>
  );
}
