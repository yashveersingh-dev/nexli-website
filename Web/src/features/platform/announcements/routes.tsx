import { Navigate, Route, Routes } from 'react-router-dom';
import { AnnouncementLogPage } from './AnnouncementLogPage';
import { AnnouncementComposePage } from './AnnouncementComposePage';
import '@/features/platform/platform.css';
import './announcements.css';

/** Platform Announcements route subtree (spec §12.6), mounted at /announcements/*. */
export default function AnnouncementsRoutes() {
  return (
    <Routes>
      <Route index element={<AnnouncementLogPage />} />
      <Route path="new" element={<AnnouncementComposePage />} />
      <Route path="*" element={<Navigate to="/announcements" replace />} />
    </Routes>
  );
}
