import { useMemo, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Panel } from '@/components/Panel';
import { Tabs } from '@/components/Tabs';
import { Skeleton } from '@/components/feedback';
import { useSession } from '@/app/providers/SessionProvider';
import { useStudentsByIds } from '@/features/school/data';
import { useAttendanceBySections } from '@/features/daily/data';
import { FamilyChildrenGrid } from './FamilyChildrenGrid';
import { ParentLeaveTab } from './ParentLeaveTab';
import { ParentPtmTab } from './ParentPtmTab';

type TabId = 'overview' | 'leave' | 'meetings';

/**
 * Parent "My Children" hub — family overview plus self-service tabs:
 *  - Overview: per-child attendance + quick links (existing grid).
 *  - Leave: submit + track student leave requests for their children.
 *  - Meetings: book parent-teacher meeting slots.
 *
 * All three live under the single `/children` parent module (no registry change).
 */
export function MyChildrenPage() {
  const { schoolId, member } = useSession();
  const childIds = useMemo(() => member?.childStudentIds ?? [], [member]);
  const { data: children, loading: sLoading } = useStudentsByIds(schoolId, childIds);
  // Scope attendance to the children's own sections — never the whole collection
  // (tightened rules deny non-staff a full attendance_days list).
  const childSectionIds = useMemo(
    () => [...new Set(children.map((c) => c.sectionId).filter((id): id is string => !!id))],
    [children],
  );
  const { data: attendance, loading: aLoading } = useAttendanceBySections(schoolId, childSectionIds);

  const [tab, setTab] = useState<TabId>('overview');
  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'users' as const },
    { id: 'leave', label: 'Leave requests', icon: 'calendar' as const },
    { id: 'meetings', label: 'Meetings', icon: 'message' as const },
  ];

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">My Children</h1>
          <p className="nx-page__sub">Your family overview, leave requests and parent-teacher meetings.</p>
        </div>
      </div>

      <Tabs variant="line" aria-label="Family" value={tab} onChange={(id) => setTab(id as TabId)} tabs={tabs}>
        {(active) => (
          <>
            {active === 'overview' && (
              sLoading || aLoading
                ? <Panel><Skeleton height={160} /></Panel>
                : <FamilyChildrenGrid students={children} days={attendance} />
            )}
            {active === 'leave' && <ParentLeaveTab />}
            {active === 'meetings' && <ParentPtmTab />}
          </>
        )}
      </Tabs>
    </div>
  );
}

/** Parent family module (mounted at /children/*). */
export default function FamilyRoutes() {
  return (
    <Routes>
      <Route index element={<MyChildrenPage />} />
      <Route path="*" element={<Navigate to="/children" replace />} />
    </Routes>
  );
}
