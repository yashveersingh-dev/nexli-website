import { Navigate, Route, Routes } from 'react-router-dom';
import '@/features/school/school.css';
import { AdmissionsPipelinePage } from './AdmissionsPipelinePage';
import { AdmissionFormPage } from './AdmissionFormPage';
import { AdmissionDetailPage } from './AdmissionDetailPage';

/** Admissions & enrollment route subtree (mounted at /admissions/* for staff). */
export default function AdmissionsRoutes() {
  return (
    <Routes>
      <Route index element={<AdmissionsPipelinePage />} />
      <Route path="new" element={<AdmissionFormPage />} />
      <Route path=":id" element={<AdmissionDetailPage />} />
      <Route path="*" element={<Navigate to="/admissions" replace />} />
    </Routes>
  );
}
