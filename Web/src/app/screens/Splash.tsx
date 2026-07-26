import { useTranslation } from 'react-i18next';

/** Full-screen branded boot/loading state shown while the session resolves. */
export function Splash({ message }: { message?: string }) {
  const { t } = useTranslation();
  return (
    <div className="nx-splash" role="status" aria-live="polite">
      <div className="nx-splash__mark">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinejoin="round">
          <path d="M12 2 L21 7 L21 17 L12 22 L3 17 L3 7 Z" />
          <path d="M3 7 L12 12 L21 7" />
          <path d="M12 12 L12 22" />
        </svg>
      </div>
      <div className="nx-splash__name">NEXLI</div>
      <span className="nx-splash__spin" aria-hidden="true" />
      <div className="nx-splash__msg">{message ?? t('status.loadingWorkspace')}</div>
    </div>
  );
}
