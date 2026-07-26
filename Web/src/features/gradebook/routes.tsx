import { Navigate, Route, Routes } from 'react-router-dom';
import { AssessmentsListPage } from './AssessmentsListPage';
import { AssessmentFormPage } from './AssessmentFormPage';
import { MarksEntryPage } from './MarksEntryPage';
import './gradebook.css';

/** Staff gradebook: assessments list, create assessment, marks entry. */
export default function GradebookRoutes() {
  return (
    <Routes>
      <Route index element={<AssessmentsListPage />} />
      <Route path="new" element={<AssessmentFormPage />} />
      <Route path=":id" element={<MarksEntryPage />} />
      <Route path="*" element={<Navigate to="/gradebook" replace />} />
    </Routes>
  );
}
