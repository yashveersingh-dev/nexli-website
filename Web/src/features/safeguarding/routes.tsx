import { Navigate, Route, Routes } from 'react-router-dom';
import { SafeguardingHub } from './SafeguardingHub';
import { PocsoFormPage } from './pages/PocsoFormPage';
import { PocsoDetailPage } from './pages/PocsoDetailPage';
import { GrievanceFormPage } from './pages/GrievanceFormPage';
import { GrievanceDetailPage } from './pages/GrievanceDetailPage';
import '@/features/compliance/compliance.css';
import './safeguarding.css';

/** Safeguarding (POCSO & Grievance) — confidential, CPO-facing. Base `/safeguarding`. */
export default function SafeguardingRoutes() {
  return (
    <Routes>
      <Route index element={<SafeguardingHub />} />
      <Route path="pocso/new" element={<PocsoFormPage />} />
      <Route path="pocso/:id" element={<PocsoDetailPage />} />
      <Route path="grievances/new" element={<GrievanceFormPage />} />
      <Route path="grievances/:id" element={<GrievanceDetailPage />} />
      <Route path="*" element={<Navigate to="/safeguarding" replace />} />
    </Routes>
  );
}
