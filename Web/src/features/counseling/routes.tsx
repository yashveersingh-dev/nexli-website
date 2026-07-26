import { Navigate, Route, Routes } from 'react-router-dom';
import { CounselingHub } from './CounselingHub';
import '@/features/compliance/compliance.css';

/** Counselling (student welfare) — confidential session register for counsellors. */
export default function CounselingRoutes() {
  return (
    <Routes>
      <Route index element={<CounselingHub />} />
      <Route path="*" element={<Navigate to="/counselling" replace />} />
    </Routes>
  );
}
