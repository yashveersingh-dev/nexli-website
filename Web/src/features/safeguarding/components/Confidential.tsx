import { Icon } from '@/components/Icon';

/**
 * Persistent confidentiality banner for the safeguarding module. Uses the
 * shared `.cmp-confidential` style from `compliance.css`.
 */
export function ConfidentialBanner() {
  return (
    <div className="cmp-confidential" role="note">
      <Icon name="lock" size={15} aria-hidden="true" />
      <span>
        <strong>Confidential.</strong> Handle per the POCSO Act &amp; school policy. Share only on a strict
        need-to-know basis.
      </span>
    </div>
  );
}
