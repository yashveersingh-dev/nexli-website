import { Navigate, Route, Routes } from 'react-router-dom';
import { ActivityFeedPage } from './ActivityFeedPage';
import '@/features/platform/platform.css';
import './activities.css';

/** Platform activity feed route subtree (mounted at /activities/* for the platform audience). */
export default function ActivitiesRoutes() {
  return (
    <Routes>
      <Route index element={<ActivityFeedPage />} />
      <Route path="*" element={<Navigate to="/activities" replace />} />
    </Routes>
  );
}
