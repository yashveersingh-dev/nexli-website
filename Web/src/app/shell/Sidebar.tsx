import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from '@/components/Icon';
import type { NavItem } from '@/app/nav';

export interface QuickAction {
  label: string;
  icon: IconName;
  onClick?: () => void;
}

export interface SidebarProps {
  nav: NavItem[];
  contextChip?: ReactNode;
  quickActions?: QuickAction[];
  footer?: ReactNode;
  onNavigate?: () => void;
}

/** Sidebar contents (used inside the desktop rail and the mobile drawer). */
export function Sidebar({ nav, contextChip, quickActions, footer, onNavigate }: SidebarProps) {
  const { t } = useTranslation();
  return (
    <>
      <div className="sb-logo">
        <div className="sb-logo__mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" aria-hidden="true" focusable="false">
            <path d="M12 2 L21 7 L21 17 L12 22 L3 17 L3 7 Z" />
            <path d="M3 7 L12 12 L21 7" />
            <path d="M12 12 L12 22" />
          </svg>
        </div>
        <div className="sb-logo__text">
          <div className="b">NEXLI</div>
          <div className="s">{t('shell.schoolErp')}</div>
        </div>
      </div>

      {contextChip}

      <nav className="sb-nav" aria-label={t('shell.mainNavigation')}>
        {nav.map((item) =>
          item.comingSoon ? (
            // Announced-but-unbuilt: a clearly-disabled item, never a dead link.
            <div
              key={item.id}
              className="sb-nav__item is-soon"
              aria-disabled="true"
              title={t('shell.comingSoon', { label: item.label })}
            >
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
              <span className="nx-navtag nx-navtag--soon">{t('shell.soon')}</span>
            </div>
          ) : (
            <NavLink
              key={item.id}
              to={item.path}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) => cn('sb-nav__item', isActive && 'active')}
            >
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
              {item.ai && <span className="nx-navtag">AI</span>}
            </NavLink>
          ),
        )}
      </nav>

      {quickActions && quickActions.length > 0 && (
        <div className="sb-quick">
          <div className="sb-quick__head">
            <span className="t">{t('shell.quickActions')}</span>
          </div>
          {quickActions.map((qa, i) => (
            <button key={i} type="button" className="sb-quick__btn" onClick={qa.onClick}>
              <Icon name={qa.icon} size={14} />
              {qa.label}
            </button>
          ))}
        </div>
      )}

      {footer ?? (
        <div className="sb-foot">
          {/* Pre-release version badge removed (was "NEXLI School ERP v0.1.0") —
              don't signal a beta build to end users. */}
          <div>{t('shell.copyright')}</div>
        </div>
      )}
    </>
  );
}
