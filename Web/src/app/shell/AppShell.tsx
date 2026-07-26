import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { useLockBodyScroll } from '@/lib/hooks';
import type { NavItem } from '@/app/nav';
import { Sidebar, type QuickAction } from './Sidebar';
import { BottomNav } from './BottomNav';
import { MobileAppBar } from './MobileAppBar';

export interface AppShellProps {
  nav: NavItem[];
  bottomNav?: NavItem[];
  contextChip?: ReactNode;
  quickActions?: QuickAction[];
  sidebarFooter?: ReactNode;
  appbarTitle?: ReactNode;
  appbarActions?: ReactNode;
  children: ReactNode;
}

/**
 * Presentational app shell. Desktop = fixed sidebar rail. Mobile = sticky app bar
 * + off-canvas drawer + bottom tab bar. Decoupled from session so it's previewable
 * and testable; a container feeds it the right nav/context per role.
 */
export function AppShell({
  nav,
  bottomNav,
  contextChip,
  quickActions,
  sidebarFooter,
  appbarTitle,
  appbarActions,
  children,
}: AppShellProps) {
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const close = useCallback(() => setDrawerOpen(false), []);
  const open = useCallback(() => setDrawerOpen(true), []);

  // Use the SAME ref-counted body-scroll lock as Modals/Sheets so they never
  // fight over `body { overflow }` (which previously could leave the page
  // unscrollable until a refresh).
  useLockBodyScroll(drawerOpen);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen, close]);

  return (
    <div className="nx-shell">
      {/* WCAG 2.4.1: first focusable element — lets keyboard/SR users jump past the
          nav straight to the page content. Visually hidden until focused. */}
      <a href="#main" className="nx-skip-link">{t('shell.skipToContent')}</a>

      <aside className={cn('nx-aside', drawerOpen && 'open')} aria-label={t('shell.sidebar')}>
        <Sidebar
          nav={nav}
          contextChip={contextChip}
          quickActions={quickActions}
          footer={sidebarFooter}
          onNavigate={close}
        />
      </aside>

      <div className={cn('nx-overlay', drawerOpen && 'open')} onClick={close} aria-hidden="true" />

      <MobileAppBar title={appbarTitle} onMenu={open} actions={appbarActions} />

      <main id="main" className="nx-main" tabIndex={-1}>
        <div className="nx-content">{children}</div>
      </main>

      {bottomNav && bottomNav.length > 0 && <BottomNav items={bottomNav} onMore={open} />}
    </div>
  );
}
