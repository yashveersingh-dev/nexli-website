import { Navigate, Route, Routes } from 'react-router-dom';
import { StudentsListPage } from './StudentsListPage';
import { StudentProfilePage } from './StudentProfilePage';
import { StudentFormPage } from './StudentFormPage';
import { StudentImportPage } from './import/StudentImportPage';
import { TCListPage } from './tc/TCListPage';
import { TCRequestPage } from './tc/TCRequestPage';
import { TCDetailPage } from './tc/TCDetailPage';
import '@/features/school/school.css';

/** Student master route subtree (mounted at /students/* for the staff audience). */
export default function StudentsRoutes() {
  return (
    <Routes>
      <Route index element={<StudentsListPage />} />
      <Route path="new" element={<StudentFormPage mode="new" />} />
      <Route path="import" element={<StudentImportPage />} />
      <Route path="tc" element={<TCListPage />} />
      <Route path="tc/new" element={<TCRequestPage />} />
      <Route path="tc/:tcId" element={<TCDetailPage />} />
      <Route path=":id" element={<StudentProfilePage />} />
      <Route path=":id/edit" element={<StudentFormPage mode="edit" />} />
      <Route path="*" element={<Navigate to="/students" replace />} />
    </Routes>
  );
}
