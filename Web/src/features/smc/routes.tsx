import { Navigate, Route, Routes } from 'react-router-dom';
import { SmcHub } from './SmcHub';
import { SmcMeetingFormPage } from './SmcMeetingFormPage';
import { SmcMeetingDetailPage } from './SmcMeetingDetailPage';
import '@/features/compliance/compliance.css';
import './smc.css';

/**
 * School Management Committee portal — hub (members / meetings / budget tabs),
 * dedicated meeting form pages, and the meeting detail/record page.
 * Base path: /smc (integrator wires staff navId `smc` → `/smc`).
 */
export default function SmcRoutes() {
  return (
    <Routes>
      <Route index element={<SmcHub />} />
      <Route path="meetings/new" element={<SmcMeetingFormPage mode="new" />} />
      <Route path="meetings/:id/edit" element={<SmcMeetingFormPage mode="edit" />} />
      <Route path="meetings/:id" element={<SmcMeetingDetailPage />} />
      <Route path="*" element={<Navigate to="/smc" replace />} />
    </Routes>
  );
}
