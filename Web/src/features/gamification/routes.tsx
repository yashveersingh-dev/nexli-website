import { Navigate, Route, Routes } from 'react-router-dom';
import { RewardsPage } from './RewardsPage';

/**
 * Student rewards / gamification module (Phase 1). Mounted by the module
 * registry at `/rewards` for the student audience. Points, badges and streaks
 * are computed live from the student's real activity — nothing is persisted.
 */
export default function RewardsRoutes() {
  return (
    <Routes>
      <Route index element={<RewardsPage />} />
      <Route path="*" element={<Navigate to="/rewards" replace />} />
    </Routes>
  );
}
