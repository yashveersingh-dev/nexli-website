import { describe, it, expect } from 'vitest';
import { isCounselingOversight } from './data';

/**
 * Confidentiality scoping: only leadership/principal-equivalents are counselling
 * "oversight" (see every counsellor's sessions). A line counsellor is NOT, so the
 * Hub scopes their query to `counselorUid === uid`. Mirrors LEADERSHIP_ROLES in
 * @/lib/ownership; the Firestore rules pass enforces the same server-side.
 */
describe('isCounselingOversight', () => {
  it('treats leadership roles as oversight', () => {
    expect(isCounselingOversight('principal')).toBe(true);
    expect(isCounselingOversight('vp_admin')).toBe(true);
    expect(isCounselingOversight('head_of_school')).toBe(true);
    expect(isCounselingOversight('director')).toBe(true);
  });

  it('does NOT treat line counsellors as oversight', () => {
    expect(isCounselingOversight('counselor')).toBe(false);
    expect(isCounselingOversight('guidance_counselor')).toBe(false);
  });

  it('is oversight when EITHER the primary or secondary role qualifies', () => {
    expect(isCounselingOversight('counselor', 'principal')).toBe(true);
    expect(isCounselingOversight('principal', 'counselor')).toBe(true);
    expect(isCounselingOversight('counselor', 'guidance_counselor')).toBe(false);
  });

  it('is not oversight for an undefined role', () => {
    expect(isCounselingOversight(undefined)).toBe(false);
  });
});
