import { Navigate, Route, Routes } from 'react-router-dom';
import { Panel } from '@/components/Panel';
import { EmptyState } from '@/components/feedback';
import { useSession } from '@/app/providers/SessionProvider';
import { ReportCardHub } from './ReportCardHub';
import { SchemesPage } from './SchemesPage';
import { GenerateReportCardsPage } from './GenerateReportCardsPage';
import { ReportCardFormPage } from './ReportCardFormPage';
import { ReportCardView } from './ReportCardView';
import { ReportCardBatchPrintPage } from './ReportCardBatchPrintPage';
import { MyReportCardPage } from './MyReportCardPage';
import './reportcard.css';

/**
 * Staff traditional report-card routes.
 *  /report-cards            → hub (list + review queue + KPIs)
 *  /report-cards/schemes    → grading scheme manager
 *  /report-cards/generate   → batch auto-fill generate flow
 *  /report-cards/print      → batch print approved cards
 *  /report-cards/:id        → printable read-only card + approval bar
 *  /report-cards/:id/edit   → card editor (live recompute)
 * Reads gated by `gradebook.read`; writes by `gradebook.write` (enforced in pages).
 */
export default function ReportCardRoutes() {
  const { can } = useSession();
  if (!can('gradebook.read')) {
    return (
      <div className="nx-page">
        <Panel>
          <EmptyState icon="lock" title="No access" message="You don't have permission to view report cards." />
        </Panel>
      </div>
    );
  }

  return (
    <Routes>
      <Route index element={<ReportCardHub />} />
      <Route path="schemes" element={<SchemesPage />} />
      <Route path="generate" element={<GenerateReportCardsPage />} />
      <Route path="print" element={<ReportCardBatchPrintPage basePath="/report-cards" />} />
      <Route path=":id/edit" element={<ReportCardFormPage />} />
      <Route path=":id" element={<ReportCardView basePath="/report-cards" />} />
      <Route path="*" element={<Navigate to="/report-cards" replace />} />
    </Routes>
  );
}

/** Parent/student read-only routes: published cards for the child(ren)/self. */
export function MyReportCardRoutes() {
  return (
    <Routes>
      <Route index element={<MyReportCardPage />} />
      <Route path=":id" element={<ReportCardView basePath="/report-cards" requirePublished />} />
      <Route path="*" element={<Navigate to="/report-cards" replace />} />
    </Routes>
  );
}
