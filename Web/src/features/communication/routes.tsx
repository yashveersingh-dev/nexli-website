import { Navigate, Route, Routes } from 'react-router-dom';
import { CircularListPage } from './CircularListPage';
import { ComposeCircularPage } from './ComposeCircularPage';
import { CircularDetailPage } from './CircularDetailPage';
import { InboxPage } from './InboxPage';
import './communication.css';

/** Staff communication: circular list, compose, detail. */
export default function CommunicationRoutes() {
  return (
    <Routes>
      <Route index element={<CircularListPage />} />
      <Route path="new" element={<ComposeCircularPage />} />
      <Route path=":id" element={<CircularDetailPage />} />
      <Route path="*" element={<Navigate to="/communication" replace />} />
    </Routes>
  );
}

/** Parent/student read-only announcements inbox. */
export function InboxRoutes() {
  return (
    <Routes>
      <Route index element={<InboxPage />} />
      <Route path="*" element={<Navigate to="/communication" replace />} />
    </Routes>
  );
}
