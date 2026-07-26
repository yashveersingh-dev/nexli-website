import { Navigate, Route, Routes } from 'react-router-dom';
import { QuestionBankPage } from './QuestionBankPage';
import { QuestionFormPage } from './QuestionFormPage';
import { PapersListPage } from './PapersListPage';
import { PaperBuilderPage } from './PaperBuilderPage';
import { PaperPreviewPage } from './PaperPreviewPage';
import { BlueprintsPage } from './BlueprintsPage';
import './qpaper.css';

/**
 * Question Paper Generator (staff). Index = question bank; build/preview papers;
 * manage blueprints. Everything is gated on `exams.read` / `exams.write` inside
 * the pages themselves.
 */
export default function QPaperRoutes() {
  return (
    <Routes>
      <Route index element={<QuestionBankPage />} />
      <Route path="questions/new" element={<QuestionFormPage />} />
      <Route path="questions/:id" element={<QuestionFormPage />} />
      <Route path="papers" element={<PapersListPage />} />
      <Route path="papers/new" element={<PaperBuilderPage />} />
      <Route path="papers/:id" element={<PaperBuilderPage />} />
      <Route path="papers/:id/preview" element={<PaperPreviewPage />} />
      <Route path="blueprints" element={<BlueprintsPage />} />
      <Route path="*" element={<Navigate to="/question-papers" replace />} />
    </Routes>
  );
}
