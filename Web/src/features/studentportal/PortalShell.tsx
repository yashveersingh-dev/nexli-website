import type { ReactNode } from 'react';
import type { IconName } from '@/components/Icon';
import { Panel } from '@/components/Panel';
import { EmptyState, Skeleton } from '@/components/feedback';
import type { StudentContext } from './useStudentContext';
import './studentportal.css';

/** Standard page header used across every Student Portal screen. */
export function PortalHead({ title, sub, right }: { title: string; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="nx-page__head">
      <div>
        <h1 className="nx-page__title">{title}</h1>
        {sub != null && <p className="nx-page__sub">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/**
 * Wraps a Student Portal screen with the shared header + the four common states
 * derived from `useStudentContext` (not linked / loading / missing / ready). The
 * page body is only rendered once a student record is resolved, so each screen can
 * assume `ctx.student` is present in its `children` render path.
 */
export function PortalPage({
  ctx,
  title,
  sub,
  icon = 'user',
  headerRight,
  children,
}: {
  ctx: StudentContext;
  title: string;
  sub?: ReactNode;
  icon?: IconName;
  headerRight?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="nx-page">
      <PortalHead title={title} sub={sub} right={ctx.status === 'ready' ? headerRight : undefined} />
      {ctx.status === 'not_linked' ? (
        <Panel>
          <EmptyState
            icon="user"
            title="Account not linked"
            message="This will appear here once your school links your account to your student record. Please contact the school office if this looks wrong."
          />
        </Panel>
      ) : ctx.status === 'loading' ? (
        <div className="sp-stack">
          <Skeleton height={120} radius={14} />
          <Panel>
            <Skeleton height={220} />
          </Panel>
        </div>
      ) : ctx.status === 'missing' ? (
        <Panel>
          <EmptyState
            icon={icon}
            title="We couldn't find your record"
            message="Your account is linked, but we couldn't load your student record yet. Please try again shortly or contact your school office."
          />
        </Panel>
      ) : (
        children
      )}
    </div>
  );
}
