import { Navigate, Route, Routes } from 'react-router-dom';
import { StaffListPage } from './StaffListPage';
import { StaffProfilePage } from './StaffProfilePage';
import { StaffFormPage } from './StaffFormPage';
import { LeaveRequestsPage } from './LeaveRequestsPage';
import { StudentLeavePage } from './StudentLeavePage';
import { StaffImportPage } from './import/StaffImportPage';
import '@/features/school/school.css';

/** HR / Staff records route subtree (mounted at /hr/* for the staff audience). */
export default function HrRoutes() {
  return (
    <Routes>
      <Route index element={<StaffListPage />} />
      <Route path="new" element={<StaffFormPage mode="new" />} />
      <Route path="import" element={<StaffImportPage />} />
      <Route path="leave" element={<LeaveRequestsPage />} />
      <Route path="student-leave" element={<StudentLeavePage />} />
      <Route path=":id" element={<StaffProfilePage />} />
      <Route path=":id/edit" element={<StaffFormPage mode="edit" />} />
      <Route path="*" element={<Navigate to="/hr" replace />} />
    </Routes>
  );
}
