import { Navigate, Route, Routes } from 'react-router-dom';
import { EventsHub } from './EventsHub';
import { EventFormPage } from './EventFormPage';
import { EventRequestFormPage } from './EventRequestFormPage';
import { EventDetailPage } from './EventDetailPage';
import { StudentEventsPage } from './StudentEventsPage';
import { PtmStaffPage, PtmRosterPage } from './PtmStaffPage';
import '@/features/analytics/analytics.css';
import './events.css';

/** Events & Activities: calendar/list hub, dedicated event form, teacher request, and event detail with registrations. */
export default function EventsRoutes() {
  return (
    <Routes>
      <Route index element={<EventsHub />} />
      <Route path="new" element={<EventFormPage />} />
      <Route path="request" element={<EventRequestFormPage />} />
      <Route path="ptm" element={<PtmStaffPage />} />
      <Route path="ptm/:id" element={<PtmRosterPage />} />
      <Route path=":id" element={<EventDetailPage />} />
      <Route path=":id/edit" element={<EventFormPage />} />
      <Route path="*" element={<Navigate to="/events" replace />} />
    </Routes>
  );
}

/** Student-facing routes: browse published, registration-required events and self-register / cancel. */
export function MyEventsRoutes() {
  return (
    <Routes>
      <Route index element={<StudentEventsPage />} />
      <Route path="*" element={<Navigate to="/events" replace />} />
    </Routes>
  );
}
