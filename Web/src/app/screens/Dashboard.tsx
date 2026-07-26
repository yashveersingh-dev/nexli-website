import { lazy, Suspense } from 'react';
import { Spinner } from '@/components/feedback';
import { useSession } from '@/app/providers/SessionProvider';
import { audienceForRole } from '@/app/nav';

// Each audience gets a tailored command center (lazy — own chunks).
const PlatformDashboard = lazy(() =>
  import('@/features/platform/dashboard/PlatformDashboard').then((m) => ({ default: m.PlatformDashboard })),
);
const StaffDashboard = lazy(() => import('@/features/dashboards/StaffDashboard').then((m) => ({ default: m.StaffDashboard })));
const ParentDashboard = lazy(() => import('@/features/dashboards/ParentDashboard').then((m) => ({ default: m.ParentDashboard })));
const StudentDashboard = lazy(() => import('@/features/dashboards/StudentDashboard').then((m) => ({ default: m.StudentDashboard })));
const AlumniDashboard = lazy(() => import('@/features/dashboards/AlumniDashboard').then((m) => ({ default: m.AlumniDashboard })));

/**
 * Audience-aware command center. Each role family gets its own dashboard
 * (platform / staff / parent / student), lazy-loaded into its own chunk and
 * fed live by the tenant-scoped session. No fabricated metrics — each surface
 * reads real data and degrades to honest empty states.
 */
export function Dashboard() {
  const { isSuperAdmin, role } = useSession();
  const audience = audienceForRole(role, isSuperAdmin);

  const Active =
    audience === 'platform'
      ? PlatformDashboard
      : audience === 'parent'
        ? ParentDashboard
        : audience === 'student'
          ? StudentDashboard
          : audience === 'alumni'
            ? AlumniDashboard
            : StaffDashboard;

  return (
    <Suspense fallback={<div className="nx-route-loading"><Spinner size={22} /></div>}>
      <Active />
    </Suspense>
  );
}
