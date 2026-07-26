import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/Icon';

export interface MobileAppBarProps {
  title?: ReactNode;
  onMenu: () => void;
  actions?: ReactNode;
}

/** Mobile-only sticky top bar with the drawer trigger. Hidden on desktop. */
export function MobileAppBar({ title, onMenu, actions }: MobileAppBarProps) {
  const { t } = useTranslation();
  return (
    <header className="nx-appbar">
      <button type="button" className="nx-appbar__btn" onClick={onMenu} aria-label={t('shell.openMenu')}>
        <Icon name="menu" size={20} />
      </button>
      <div className="nx-appbar__brand">
        <div className="sb-logo__mark" style={{ width: 30, height: 30 }} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" style={{ width: 17, height: 17 }}>
            <path d="M12 2 L21 7 L21 17 L12 22 L3 17 L3 7 Z" />
            <path d="M3 7 L12 12 L21 7" />
            <path d="M12 12 L12 22" />
          </svg>
        </div>
        <div className="nx-appbar__title">{title ?? 'NEXLI'}</div>
      </div>
      {actions}
    </header>
  );
}
