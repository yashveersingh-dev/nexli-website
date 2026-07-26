import { Navigate, Route, Routes } from 'react-router-dom';
import { HomeworkListPage } from './HomeworkListPage';
import { HomeworkFormPage } from './HomeworkFormPage';
import { HomeworkDetailPage } from './HomeworkDetailPage';
import { MyHomeworkPage } from './MyHomeworkPage';
import './homework.css';

/** Staff homework: list, create/edit, detail + submission tracker. */
export default function HomeworkRoutes() {
  return (
    <Routes>
      <Route index element={<HomeworkListPage />} />
      <Route path="new" element={<HomeworkFormPage />} />
      <Route path=":id" element={<HomeworkDetailPage />} />
      <Route path=":id/edit" element={<HomeworkFormPage />} />
      <Route path="*" element={<Navigate to="/homework" replace />} />
    </Routes>
  );
}

/** Parent/student read-only homework view (rendered at /assignments). */
export function MyHomeworkRoutes() {
  return (
    <Routes>
      <Route index element={<MyHomeworkPage />} />
      <Route path="*" element={<Navigate to="/assignments" replace />} />
    </Routes>
  );
}
