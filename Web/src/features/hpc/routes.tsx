import { Navigate, Route, Routes } from 'react-router-dom';
import { Panel } from '@/components/Panel';
import { EmptyState } from '@/components/feedback';
import { useSession } from '@/app/providers/SessionProvider';
import { HpcHub } from './HpcHub';
import { HpcFormPage } from './HpcFormPage';
import { HpcCardView } from './HpcCardView';
import { HpcBatchPrintPage } from './HpcBatchPrintPage';
import { MyHpcPage } from './MyHpcPage';
import '@/features/analytics/analytics.css';
import './hpc.css';

/**
 * Staff NEP Holistic Progress Card routes.
 *  /hpc            → hub (list + filters + KPIs)
 *  /hpc/new        → create card
 *  /hpc/:id/edit   → edit card
 *  /hpc/:id        → printable read-only card
 * Reads gated by `gradebook.read`; writes by `gradebook.write` (enforced in pages).
 */
export default function HpcRoutes() {
  const { can } = useSession();
  if (!can('gradebook.read')) {
    return (
      <div className="nx-page">
        <Panel>
          <EmptyState icon="lock" title="No access" message="You don't have permission to view holistic progress cards." />
        </Panel>
      </div>
    );
  }

  return (
    <Routes>
      <Route index element={<HpcHub />} />
      <Route path="new" element={<HpcFormPage mode="new" />} />
      <Route path="print" element={<HpcBatchPrintPage basePath="/hpc" />} />
      <Route path=":id/edit" element={<HpcFormPage mode="edit" />} />
      <Route path=":id" element={<HpcCardView basePath="/hpc" />} />
      <Route path="*" element={<Navigate to="/hpc" replace />} />
    </Routes>
  );
}

/** Parent/student read-only routes: published cards for the child(ren)/self. */
export function MyHpcRoutes() {
  return (
    <Routes>
      <Route index element={<MyHpcPage />} />
      <Route path=":id" element={<HpcCardView basePath="/hpc" requirePublished />} />
      <Route path="*" element={<Navigate to="/hpc" replace />} />
    </Routes>
  );
}
