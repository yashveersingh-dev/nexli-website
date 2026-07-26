import { useMemo, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { Tabs } from '@/components/Tabs';
import { ReviewModeNote } from '@/components/ReviewModeNote';
import { useCirculation } from '@/features/daily/data';
import { CatalogTab } from './CatalogTab';
import { CirculationTab } from './CirculationTab';
import { OverdueTab } from './OverdueTab';
import { SettingsTab } from './SettingsTab';
import { MyLibraryPage } from './MyLibraryPage';
import { isOverdue } from './shared';
import './library.css';

type TabId = 'catalog' | 'circulation' | 'overdue' | 'settings';

function LibraryHub() {
  const { schoolId } = useSession();
  const { canOperate, isReviewer, ownerLabel } = useOwnership('library');
  const [tab, setTab] = useState<TabId>('catalog');
  const { data: records } = useCirculation(schoolId);

  const overdueCount = useMemo(() => records.filter((c) => isOverdue(c)).length, [records]);

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Library</h1>
          <p className="nx-page__sub">{canOperate ? 'Catalog, book issue & return, and overdue tracking.' : 'Catalog, circulation and overdue — oversight view.'}</p>
        </div>
      </div>

      {isReviewer && !canOperate && <ReviewModeNote owner={ownerLabel} />}

      <Tabs
        variant="line"
        aria-label="Library sections"
        value={tab}
        onChange={(id) => setTab(id as TabId)}
        tabs={[
          { id: 'catalog', label: 'Catalog', icon: 'book' },
          { id: 'circulation', label: 'Circulation', icon: 'download' },
          { id: 'overdue', label: 'Overdue', icon: 'alert-triangle', badge: overdueCount || undefined },
          ...(canOperate ? [{ id: 'settings', label: 'Settings', icon: 'settings' as const }] : []),
        ]}
      >
        {(active) => (
          <>
            {active === 'catalog' && <CatalogTab />}
            {active === 'circulation' && <CirculationTab />}
            {active === 'overdue' && <OverdueTab />}
            {active === 'settings' && <SettingsTab />}
          </>
        )}
      </Tabs>
    </div>
  );
}

/** Staff library module: catalog management, circulation, overdue. */
export default function LibraryRoutes() {
  return (
    <Routes>
      <Route index element={<LibraryHub />} />
      <Route path="*" element={<Navigate to="/library" replace />} />
    </Routes>
  );
}

/** Student library: read-only browse + my borrowed books. */
export function MyLibraryRoutes() {
  return (
    <Routes>
      <Route index element={<MyLibraryPage />} />
      <Route path="*" element={<Navigate to="/library" replace />} />
    </Routes>
  );
}
