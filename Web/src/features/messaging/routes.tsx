import { Navigate, Route, Routes } from 'react-router-dom';
import { MessagesPage } from './pages/MessagesPage';
import './messaging.css';

/**
 * Direct Messaging (1:1) routes, mounted at `/messages`.
 *  - index            → two-pane hub (list + thread on ≥768px; list on phones).
 *  - :conversationId  → same hub with that thread selected (full-screen on phones).
 *  - *                → redirect home to the hub.
 */
export default function MessagingRoutes() {
  return (
    <Routes>
      <Route index element={<MessagesPage />} />
      <Route path=":conversationId" element={<MessagesPage />} />
      <Route path="*" element={<Navigate to="/messages" replace />} />
    </Routes>
  );
}
