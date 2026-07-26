import { Navigate, Route, Routes } from 'react-router-dom';
import { RankingsHub } from './RankingsHub';

/** Student rankings — marks-based and attendance-based merit leaderboards. */
export default function RankingsRoutes() {
  return (
    <Routes>
      <Route index element={<RankingsHub />} />
      <Route path="*" element={<Navigate to="/rankings" replace />} />
    </Routes>
  );
}
