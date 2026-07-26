import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { touchSchoolUsage, USAGE_HEARTBEAT_MS } from '@/lib/usage';
import { SUPPORTED_LANGUAGES, setLanguage, type LanguageCode } from '@/lib/i18n';
import { AppShell } from '@/app/shell';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/Avatar';
import { Sheet } from '@/components/Sheet';
import { Button } from '@/components/Button';
import { Toggle } from '@/components/form';
import { EmptyState } from '@/components/feedback';
import { useSession } from '@/app/providers/SessionProvider';
import { useTheme } from '@/app/theme';
import {
  audienceForRole,
  bottomNavForAudience,
  filterNav,
  navForAudience,
  type NavItem,
} from '@/app/nav';
import { moduleComponent } from '@/app/moduleRegistry';
import { ROLES } from '@/types/roles';
import { useDocument, tenantDoc } from '@/lib/db';

/** Student leadership positions (stored as tags on the student record by the seed/admin). */
const LEADERSHIP_TITLES = ['Head Boy', 'Head Girl', 'Sports Captain', 'House Captain', 'Vice House Captain', 'Prefect'];
function pickLeadershipTitle(tags?: string[]): string | undefined {
  return tags?.find((t) => LEADERSHIP_TITLES.includes(t));
}

/**
 * Session-driven application frame. Resolves the signed-in user's audience, filters
 * the nav manifest by their permissions + active feature flags, and feeds the
 * presentational AppShell the right navigation, school context, and account
 * controls. Replaces the static P0 ShellPreview.
 */
export function AppLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const session = useSession();
  const { t, i18n } = useTranslation();
  const { isSuperAdmin, role, member, school, schoolId, can, hasFlag, logout, delegatedModules } = session;
  const [accountOpen, setAccountOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();
  // Base language code (strip any region suffix, e.g. 'en-IN' → 'en').
  const currentLang = (i18n.resolvedLanguage ?? i18n.language ?? 'en').split('-')[0];

  // Usage telemetry: refresh the tenant's last-active stamp (throttled) so the
  // Super Admin console reflects real activity. Best-effort; never blocks UX.
  useEffect(() => {
    if (!schoolId || isSuperAdmin) return;
    if (Date.now() - (school?.lastActiveAt ?? 0) > USAGE_HEARTBEAT_MS) {
      void touchSchoolUsage(schoolId, { lastActiveAt: Date.now() });
    }
  }, [schoolId, isSuperAdmin, school?.lastActiveAt]);

  const audience = audienceForRole(role, isSuperAdmin);

  // Only show a nav item that has a real screen behind it: the dashboard, a module
  // registered for this audience, or one surfaced via a live delegation. This hides
  // not-yet-built "In build" placeholders (e.g. staff Settings/Security, parent
  // Academics/Calendar/Notices) so a user never opens an empty page from the menu.
  // `comingSoon` items are the exception: they're shown deliberately, but rendered
  // disabled (no link) by the sidebar so the destination is acknowledged, not broken.
  const isReachable = useCallback(
    (it: NavItem) =>
      it.path === '/' ||
      it.comingSoon ||
      !!moduleComponent(audience, it.id) ||
      !!delegatedModules?.includes(it.id),
    [audience, delegatedModules],
  );

  const nav = useMemo(
    () => filterNav(navForAudience(audience), { isSuperAdmin, can, hasFlag, delegatedModules }).filter(isReachable),
    [audience, isSuperAdmin, can, hasFlag, delegatedModules, isReachable],
  );
  const bottomNav = useMemo(
    () => filterNav(bottomNavForAudience(audience), { isSuperAdmin, can, hasFlag, delegatedModules }).filter(isReachable),
    [audience, isSuperAdmin, can, hasFlag, delegatedModules, isReachable],
  );

  const name = member?.name ?? (isSuperAdmin ? 'Super Admin' : 'Account');

  // For student accounts, surface a leadership position (Head Boy, Prefect, House
  // Captain…) from their linked student record so the title shows instead of a
  // bare "Student". One cached doc read, only for the student audience.
  const { data: linkedStudent } = useDocument<{ tags?: string[] }>(
    audience === 'student' && schoolId && member?.studentId
      ? tenantDoc(schoolId, 'students', member.studentId)
      : null,
  );
  const leadershipTitle = pickLeadershipTitle(linkedStudent?.tags);

  // Role label: fold the graded LEVEL (Senior/Junior/Associate, warden/nurse tiers)
  // into the label so distinct tiers aren't all shown as the same generic role.
  const roleMeta = role ? ROLES[role] : undefined;
  let roleLabel = roleMeta?.label ?? (isSuperAdmin ? 'Platform' : '');
  if (roleMeta?.level && !roleLabel.includes(roleMeta.level)) roleLabel = `${roleLabel} · ${roleMeta.level}`;
  if (leadershipTitle) roleLabel = leadershipTitle; // a captain/prefect is shown by their position

  const activeTitle = useMemo(() => currentTitle(nav, location.pathname), [nav, location.pathname]);

  const contextChip = isSuperAdmin ? (
    <div className="sb-school">
      <div className="sb-school__wrap">
        <div className="sb-school__name">{t('shell.nexliPlatform')}</div>
        <div className="sb-school__meta">{t('shell.superAdminConsole')}</div>
      </div>
    </div>
  ) : school ? (
    <div className="sb-school">
      <div className="sb-school__wrap">
        <div className="sb-school__name">{school.name}</div>
        <div className="sb-school__meta">
          {school.currentAcademicYear ?? t('shell.academicYear')}
          {school.city ? <><span className="dot" /> {school.city}</> : null}
        </div>
      </div>
    </div>
  ) : null;

  const appbarActions = (
    <>
      <button type="button" className="nx-appbar__btn" aria-label={t('shell.notifications')} onClick={() => setNotifOpen(true)}>
        <Icon name="bell" size={19} />
      </button>
      <button
        type="button"
        className="nx-appbar__btn"
        aria-label={t('shell.account')}
        onClick={() => setAccountOpen(true)}
        style={{ padding: 0 }}
      >
        <Avatar name={name} src={member?.photoUrl} size={30} />
      </button>
    </>
  );

  const sidebarFooter = (
    <button type="button" className="sb-account" onClick={() => setAccountOpen(true)}>
      <Avatar name={name} src={member?.photoUrl} size={34} />
      <div className="sb-account__meta">
        <div className="n">{name}</div>
        <div className="r">{roleLabel}</div>
      </div>
      <Icon name="chevron-right" size={15} className="sb-account__chev" />
    </button>
  );

  return (
    <>
      <AppShell
        nav={nav}
        bottomNav={bottomNav}
        contextChip={contextChip}
        appbarTitle={activeTitle}
        appbarActions={appbarActions}
        sidebarFooter={sidebarFooter}
      >
        {children}
      </AppShell>

      {/* Account sheet */}
      <Sheet open={accountOpen} onClose={() => setAccountOpen(false)} side="right" size="sm" title={t('account.title')}>
        <div className="nx-account">
          <div className="nx-account__head">
            <Avatar name={name} src={member?.photoUrl} size={52} />
            <div>
              <div className="nx-account__name">{name}</div>
              <div className="nx-account__role">{roleLabel}</div>
            </div>
          </div>
          {member?.email && <AccountRow icon="mail" label={member.email} />}
          {member?.phone && <AccountRow icon="phone" label={member.phone} />}
          {school?.name && <AccountRow icon="school" label={school.name} />}

          {/* Language: persisted UI language (English / हिंदी). Sits beside the theme
              toggle as the two app-wide presentation preferences. */}
          <div className="nx-account__row" style={{ justifyContent: 'space-between', gap: 12 }}>
            <span>{t('account.language')}</span>
            <div className="nx-langseg" role="group" aria-label={t('account.language')}>
              {SUPPORTED_LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  className={`nx-langseg__btn${currentLang === l.code ? ' is-active' : ''}`}
                  aria-pressed={currentLang === l.code}
                  onClick={() => setLanguage(l.code as LanguageCode)}
                >
                  {l.native}
                </button>
              ))}
            </div>
          </div>

          {/* Appearance: dark is default; light ("outdoor") mode aids sunlight readability. */}
          <div className="nx-account__row" style={{ justifyContent: 'space-between', gap: 12 }}>
            <span>{t('account.outdoorMode')}</span>
            <Toggle
              checked={theme === 'light'}
              onChange={toggleTheme}
              size="sm"
              aria-label={t('account.toggleLightMode')}
            />
          </div>

          <div className="nx-account__actions">
            {moduleComponent(audience, 'settings') && (
              <Button
                variant="ghost"
                block
                leftIcon="settings"
                onClick={() => {
                  setAccountOpen(false);
                  navigate('/settings');
                }}
              >
                {t('account.settings')}
              </Button>
            )}
            <Button variant="danger" block leftIcon="log-out" onClick={() => void logout()}>
              {t('action.signOut')}
            </Button>
          </div>
        </div>
      </Sheet>

      {/* Notifications sheet (in-app only until push/WhatsApp/SMS provisioned) */}
      <Sheet open={notifOpen} onClose={() => setNotifOpen(false)} side="right" size="sm" title={t('shell.notifications')}>
        <EmptyState
          icon="bell"
          title={t('account.notificationsEmptyTitle')}
          message={t('account.notificationsEmptyBody')}
        />
      </Sheet>
    </>
  );
}

function AccountRow({ icon, label }: { icon: 'mail' | 'phone' | 'school'; label: string }) {
  return (
    <div className="nx-account__row">
      <Icon name={icon} size={15} />
      <span>{label}</span>
    </div>
  );
}

/** Best-match nav label for the current path (for the mobile app-bar title). */
function currentTitle(nav: NavItem[], pathname: string): string {
  if (pathname === '/' || pathname === '') return nav.find((n) => n.path === '/')?.label ?? 'Dashboard';
  const match = nav
    .filter((n) => n.path !== '/')
    .sort((a, b) => b.path.length - a.path.length)
    .find((n) => pathname === n.path || pathname.startsWith(n.path + '/'));
  return match?.label ?? 'NEXLI';
}
