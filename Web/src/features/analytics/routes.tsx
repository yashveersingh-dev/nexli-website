import { Navigate, Route, Routes } from 'react-router-dom';
import { ReportsHub } from './ReportsHub';
import './analytics.css';

/** Reports & Analytics: academic + financial analytics + custom report builder. */
export default function ReportsRoutes() {
  return (
    <Routes>
      <Route index element={<ReportsHub />} />
      <Route path="*" element={<Navigate to="/reports" replace />} />
    </Routes>
  );
}
