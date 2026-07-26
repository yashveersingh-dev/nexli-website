import { useTranslation } from 'react-i18next';
import type { IconName } from '@/components/Icon';
import { Panel } from '@/components/Panel';
import { EmptyState } from '@/components/feedback';
import { Badge } from '@/components/Badge';

/**
 * Placeholder for a module whose full screens are scheduled later in the build
 * sequence. Intentionally polished (not a broken route) — replaced by the real
 * feature route tree when that phase lands. Every nav destination resolves here
 * until then, so navigation is never dead.
 */
export function ModuleStub({ title, icon = 'box', note }: { title: string; icon?: IconName; note?: string }) {
  const { t } = useTranslation();
  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">{title}</h1>
          <p className="nx-page__sub">{note ?? 'This module is part of NEXLI and is being built out.'}</p>
        </div>
        <Badge variant="warning">{t('shell.inBuild')}</Badge>
      </div>
      <Panel>
        <EmptyState
          icon={icon}
          title={`${title} is on the way`}
          message="The full experience for this area is being crafted to the NEXLI standard. Navigation, permissions and your data scope are already wired — the screens land next."
        />
      </Panel>
    </div>
  );
}
