import { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Tabs } from '@/components/Tabs';
import { ExamsListPage } from './ExamsListPage';
import { ExamFormPage } from './ExamFormPage';
import { ExamDetailPage } from './ExamDetailPage';
import { MyExaminationsPage } from './MyExaminationsPage';
import { BoardResultsTab } from './boardResults/BoardResultsTab';
import './examinations.css';

type HubTab = 'terms' | 'board';

/** Examinations hub: exam terms (datesheets/results/admit cards) + imported board results. */
function ExaminationsHub() {
  const [tab, setTab] = useState<HubTab>('terms');
  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Examinations</h1>
          <p className="nx-page__sub">Formal term &amp; board exams — datesheets, admit cards, results, and imported board (CBSE / ICSE / State) results.</p>
        </div>
      </div>
      <Tabs
        variant="line"
        aria-label="Examinations sections"
        value={tab}
        onChange={(id) => setTab(id as HubTab)}
        tabs={[
          { id: 'terms', label: 'Exam terms', icon: 'file-text' },
          { id: 'board', label: 'Board results', icon: 'award' },
        ]}
      >
        {(active) => (
          <>
            {active === 'terms' && <ExamsListPage embedded />}
            {active === 'board' && <BoardResultsTab />}
          </>
        )}
      </Tabs>
    </div>
  );
}

/** Staff examinations: hub (terms + board results), create/edit exam, datesheet + results + admit cards. */
export default function ExaminationsRoutes() {
  return (
    <Routes>
      <Route index element={<ExaminationsHub />} />
      <Route path="new" element={<ExamFormPage />} />
      <Route path=":id/edit" element={<ExamFormPage />} />
      <Route path=":id" element={<ExamDetailPage />} />
      <Route path="*" element={<Navigate to="/examinations" replace />} />
    </Routes>
  );
}

/** Parent/student read-only examinations: datesheet + published results / report card. */
export function MyExaminationsRoutes() {
  return (
    <Routes>
      <Route index element={<MyExaminationsPage />} />
      <Route path="*" element={<Navigate to="/examinations" replace />} />
    </Routes>
  );
}
