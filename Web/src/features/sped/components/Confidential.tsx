import { Icon } from '@/components/Icon';

/**
 * Persistent confidentiality note for the Special Education module. CWSN /
 * disability records are sensitive personal data — handle on a need-to-know
 * basis. Uses the module-local `.sped-confidential` style.
 */
export function ConfidentialNote() {
  return (
    <div className="sped-confidential" role="note">
      <Icon name="lock" size={15} aria-hidden="true" />
      <span>
        <strong>Confidential.</strong> CWSN &amp; disability records are sensitive. Share only with the
        student&apos;s support team on a strict need-to-know basis.
      </span>
    </div>
  );
}
