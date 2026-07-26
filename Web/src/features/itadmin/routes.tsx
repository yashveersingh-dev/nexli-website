import { Navigate, Route, Routes } from 'react-router-dom';
import { ItAdminHub } from './ItAdminHub';
import { DeviceFormPage } from './DeviceFormPage';
import './itadmin.css';

/** IT Administration: tabbed hub + dedicated device form pages. */
export default function ItAdminRoutes() {
  return (
    <Routes>
      <Route index element={<ItAdminHub />} />
      <Route path="devices/new" element={<DeviceFormPage mode="new" />} />
      <Route path="devices/:id/edit" element={<DeviceFormPage mode="edit" />} />
      <Route path="*" element={<Navigate to="/it-admin" replace />} />
    </Routes>
  );
}
