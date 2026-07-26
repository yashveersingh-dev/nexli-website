import { Navigate, Route, Routes } from 'react-router-dom';
import { CanteenHub } from './CanteenHub';
import { MenuFormPage } from './MenuFormPage';
import '@/features/ops/ops.css';
import './canteen.css';

/** Canteen & Nutrition: hub (menu / headcount / feedback / hygiene) + menu form. */
export default function CanteenRoutes() {
  return (
    <Routes>
      <Route index element={<CanteenHub />} />
      <Route path="menu/new" element={<MenuFormPage mode="new" />} />
      <Route path="menu/:id/edit" element={<MenuFormPage mode="edit" />} />
      <Route path="*" element={<Navigate to="/canteen" replace />} />
    </Routes>
  );
}
