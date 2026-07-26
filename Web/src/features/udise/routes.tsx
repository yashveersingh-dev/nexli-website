import { Navigate, Route, Routes } from 'react-router-dom';
import { UdiseHub } from './UdiseHub';
import '@/features/compliance/compliance.css';
import './udise.css';

/** UDISE+ reporting — enrolment report + school UDISE profile. Base: /udise. */
export default function UdiseRoutes() {
  return (
    <Routes>
      <Route index element={<UdiseHub />} />
      <Route path="*" element={<Navigate to="/udise" replace />} />
    </Routes>
  );
}
