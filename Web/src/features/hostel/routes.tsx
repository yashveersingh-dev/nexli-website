import { Navigate, Route, Routes } from 'react-router-dom';
import { HostelHub } from './HostelHub';
import { ExeatRequestPage } from './ExeatRequestPage';
import { GatePassRequestPage } from './GatePassRequestPage';
import '@/features/ops/ops.css';
import './hostel.css';

/**
 * Hostel & residential: blocks/rooms, allocations, roll-call, gate-pass/leave,
 * exeat, mess & dietary, incidents/care hub + the routed request pages.
 */
export default function HostelRoutes() {
  return (
    <Routes>
      <Route index element={<HostelHub />} />
      <Route path="gatepass/new" element={<GatePassRequestPage />} />
      <Route path="exeat/new" element={<ExeatRequestPage />} />
      <Route path="*" element={<Navigate to="/hostel" replace />} />
    </Routes>
  );
}
