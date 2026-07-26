import type { ReactNode } from 'react';
import { Badge } from '@/components/Badge';
import { Toggle } from '@/components/form';
import type { FeatureFlagMeta } from '@/lib/featureFlags';

export interface FlagRowProps {
  flag: FeatureFlagMeta;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  /** Optional effective-resolution hint shown under the description (per-school view). */
  hint?: ReactNode;
}

/** One feature-flag line: switch + label + description + premium/integration badges. */
export function FlagRow({ flag, checked, onChange, disabled, hint }: FlagRowProps) {
  return (
    <div className="nx-switchlist__row">
      <div className="nx-flagrow">
        <div className="nx-flagrow__main">
          <Toggle
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            aria-label={flag.label}
          />
          <div className="nx-flagrow__text">
            <span className="nx-flagrow__label">
              {flag.label}
              {flag.premium && <Badge variant="warning">Premium</Badge>}
              {flag.externalIntegration && <Badge variant="info">Integration</Badge>}
            </span>
            <span className="nx-flagrow__desc">{flag.description}</span>
            {hint && <span className="nx-flagrow__hint">{hint}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
