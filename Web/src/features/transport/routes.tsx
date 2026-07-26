import { Navigate, Route, Routes } from 'react-router-dom';
import { TransportHub } from './TransportHub';
import { RouteFormPage } from './RouteFormPage';
import '@/features/ops/ops.css';
import './transport.css';

/** Transport & Fleet: live map / routes / vehicles / bus attendance / SOS hub + route form pages. */
export default function TransportRoutes() {
  return (
    <Routes>
      <Route index element={<TransportHub />} />
      <Route path="routes/new" element={<RouteFormPage mode="new" />} />
      <Route path="routes/:id/edit" element={<RouteFormPage mode="edit" />} />
      <Route path="*" element={<Navigate to="/transport" replace />} />
    </Routes>
  );
}
