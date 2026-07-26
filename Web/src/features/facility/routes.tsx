import { Navigate, Route, Routes } from 'react-router-dom';
import { FacilityHub } from './FacilityHub';
import { AssetFormPage } from './AssetFormPage';
import '@/features/ops/ops.css';
import './facility.css';

/** Asset & Facility: hub (assets / facilities / maintenance) + dedicated asset form pages. */
export default function FacilityRoutes() {
  return (
    <Routes>
      <Route index element={<FacilityHub />} />
      <Route path="assets/new" element={<AssetFormPage mode="new" />} />
      <Route path="assets/:id/edit" element={<AssetFormPage mode="edit" />} />
      <Route path="*" element={<Navigate to="/facility" replace />} />
    </Routes>
  );
}
