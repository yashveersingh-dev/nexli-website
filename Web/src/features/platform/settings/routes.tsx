import { Navigate, Route, Routes } from 'react-router-dom';
import { SettingsPage } from './SettingsPage';
import '@/features/platform/platform.css';
import './settings.css';

/** Platform Settings route subtree (mounted at /settings/* for the platform audience). */
export default function SettingsRoutes() {
  return (
    <Routes>
      <Route index element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/settings" replace />} />
    </Routes>
  );
}
