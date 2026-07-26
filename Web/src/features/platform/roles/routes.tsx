import { Routes, Route, Navigate } from 'react-router-dom';
import { RolesPage } from './RolesPage';
import { RoleDetailPage } from './RoleDetailPage';

/** Super Admin "Roles & Permissions" module (mounted at /roles/*). */
export default function RolesRoutes() {
  return (
    <Routes>
      <Route index element={<RolesPage />} />
      <Route path=":roleId" element={<RoleDetailPage />} />
      <Route path="*" element={<Navigate to="/roles" replace />} />
    </Routes>
  );
}
