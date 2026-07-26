import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/Icon';
import { Button } from '@/components/Button';

export interface StatusScreenProps {
  icon: IconName;
  tone?: 'gold' | 'danger' | 'warning' | 'info';
  title: string;
  message: ReactNode;
  primary?: { label: string; onClick: () => void; icon?: IconName };
  secondary?: { label: string; onClick: () => void };
  /** Small print under the actions (e.g. signed-in identity). */
  footnote?: ReactNode;
}

/** Centered full-page status (no-access / suspended / forbidden / 404 / error). */
export function StatusScreen({ icon, tone = 'gold', title, message, primary, secondary, footnote }: StatusScreenProps) {
  return (
    <div className="nx-status">
      <div className={`nx-status__icon nx-status__icon--${tone}`}>
        <Icon name={icon} size={26} />
      </div>
      <h1 className="nx-status__title">{title}</h1>
      <p className="nx-status__msg">{message}</p>
      {(primary || secondary) && (
        <div className="nx-status__actions">
          {primary && (
            <Button variant="gold" leftIcon={primary.icon} onClick={primary.onClick}>
              {primary.label}
            </Button>
          )}
          {secondary && (
            <Button variant="ghost" onClick={secondary.onClick}>
              {secondary.label}
            </Button>
          )}
        </div>
      )}
      {footnote && <div className="nx-status__foot">{footnote}</div>}
    </div>
  );
}
