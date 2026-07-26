import { Navigate, Route, Routes } from 'react-router-dom';
import { MedicalHub } from './MedicalHub';
import { ClinicVisitFormPage } from './ClinicVisitFormPage';
import { HealthRecordFormPage } from './HealthRecordFormPage';
import '@/features/ops/ops.css';
import './medical.css';

/** Medical & clinic: hub (visits / records / immunizations) + dedicated forms. */
export default function MedicalRoutes() {
  return (
    <Routes>
      <Route index element={<MedicalHub />} />
      <Route path="visits/new" element={<ClinicVisitFormPage />} />
      <Route path="records/new" element={<HealthRecordFormPage mode="new" />} />
      <Route path="records/:id/edit" element={<HealthRecordFormPage mode="edit" />} />
      <Route path="*" element={<Navigate to="/medical" replace />} />
    </Routes>
  );
}
