import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/Icon';
import type { NavItem } from '@/app/nav';

/** Short labels for the cramped mobile bottom bar. The domain shortenings
 *  (Chat/Exams/…) are part of the per-module string-extraction follow-up;
 *  only "Home" is shell chrome and is translated below. */
const SHORT: Record<string, string> = {
  communication: 'Chat',
  examinations: 'Exams',
  subscriptions: 'Subs',
  assignments: 'Tasks',
};

export interface BottomNavProps {
  items: NavItem[];
  onMore: () => void;
}

/** Mobile-only bottom tab bar (≤4 primary items + More → drawer). */
export function BottomNav({ items, onMore }: BottomNavProps) {
  const { t } = useTranslation();
  return (
    <nav className="nx-bottomnav" aria-label="Primary">
      {items.map((it) => (
        <NavLink
          key={it.id}
          to={it.path}
          end={it.end}
          className={({ isActive }) => cn('nx-bottomnav__item', isActive && 'active')}
        >
          <Icon name={it.icon} size={21} />
          <span>{it.id === 'dashboard' ? t('shell.home') : (SHORT[it.id] ?? it.label)}</span>
        </NavLink>
      ))}
      <button type="button" className="nx-bottomnav__item" onClick={onMore} aria-label={t('shell.more')}>
        <Icon name="menu" size={21} />
        <span>{t('shell.more')}</span>
      </button>
    </nav>
  );
}
