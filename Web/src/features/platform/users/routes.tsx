import { Navigate, Route, Routes } from 'react-router-dom';
import { UsersPage } from './UsersPage';
import '@/features/platform/platform.css';

/** Platform users & admin directory route subtree (mounted at /users/*). */
export default function UsersRoutes() {
  return (
    <Routes>
      <Route index element={<UsersPage />} />
      <Route path="*" element={<Navigate to="/users" replace />} />
    </Routes>
  );
}
