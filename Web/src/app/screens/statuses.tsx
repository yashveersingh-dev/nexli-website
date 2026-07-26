import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSession } from '@/app/providers/SessionProvider';
import { StatusScreen } from './StatusScreen';

/** Authenticated, but no NEXLI profile is linked to this account. */
export function NoAccessScreen() {
  const { t } = useTranslation();
  const { logout, firebaseUser } = useSession();
  return (
    <StatusScreen
      icon="lock"
      tone="warning"
      title={t('status.noAccessTitle')}
      message={t('status.noAccessBody')}
      primary={{ label: t('action.signOut'), onClick: () => void logout(), icon: 'log-out' }}
      footnote={firebaseUser?.email ? t('status.signedInAs', { email: firebaseUser.email }) : undefined}
    />
  );
}

/** Member exists but has been suspended. */
export function SuspendedScreen() {
  const { t } = useTranslation();
  const { logout, member } = useSession();
  return (
    <StatusScreen
      icon="shield"
      tone="danger"
      title={t('status.suspendedTitle')}
      message={t('status.suspendedBody')}
      primary={{ label: t('action.signOut'), onClick: () => void logout(), icon: 'log-out' }}
      footnote={member?.name ? <>{member.name}</> : undefined}
    />
  );
}

/** Signed in, but not permitted to view this route. */
export function ForbiddenScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <StatusScreen
      icon="shield"
      tone="warning"
      title={t('status.forbiddenTitle')}
      message={t('status.forbiddenBody')}
      primary={{ label: t('status.backToDashboard'), onClick: () => navigate('/'), icon: 'home' }}
    />
  );
}

/** Unknown route inside the authenticated app. */
export function NotFoundScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <StatusScreen
      icon="search"
      tone="info"
      title={t('status.notFoundTitle')}
      message={t('status.notFoundBody')}
      primary={{ label: t('status.backToDashboard'), onClick: () => navigate('/'), icon: 'home' }}
    />
  );
}
