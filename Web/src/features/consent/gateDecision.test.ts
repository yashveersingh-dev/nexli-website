import { describe, it, expect } from 'vitest';
import { decideConsentGate, consentRecordHref } from './gateDecision';
import type { ConsentStatus } from './useConsentStatus';
import type { ConsentPurpose } from '@/types/compliance';

const purpose = (id: string, name: string): ConsentPurpose => ({
  id,
  schoolId: 's1',
  name,
  required: true,
  active: true,
});

/** Base status object; override per case. */
const status = (over: Partial<ConsentStatus>): ConsentStatus => ({
  loading: false,
  ok: false,
  missing: [],
  withdrawn: [],
  requiredPurposes: [],
  ...over,
});

describe('decideConsentGate', () => {
  it('holds (no decision) while loading', () => {
    const d = decideConsentGate(status({ loading: true }));
    expect(d.kind).toBe('loading');
    expect(d.ok).toBe(false);
    expect(d.hardBlock).toBe(false);
  });

  it('allows the action when required consent is granted', () => {
    const d = decideConsentGate(status({ ok: true }));
    expect(d.kind).toBe('ok');
    expect(d.ok).toBe(true);
    expect(d.hardBlock).toBe(false);
    expect(d.missingNames).toEqual([]);
  });

  it('HARD-BLOCKS when records are readable but a required purpose is missing', () => {
    const missing = [purpose('p1', 'Academic records'), purpose('p2', 'Health & emergency')];
    const d = decideConsentGate(status({ missing }));
    expect(d.kind).toBe('missing');
    expect(d.ok).toBe(false);
    expect(d.hardBlock).toBe(true);
    expect(d.missingNames).toEqual(['Academic records', 'Health & emergency']);
  });

  it('does NOT hard-block when consent could not be verified (fail-closed, no lockout)', () => {
    // e.g. actor lacks consent.read — useConsentStatus surfaces an error.
    const d = decideConsentGate(status({ error: new Error('permission-denied'), missing: [purpose('p1', 'X')] }));
    expect(d.kind).toBe('unverified');
    expect(d.ok).toBe(false);
    expect(d.hardBlock).toBe(false);
    // No purpose names leaked when we couldn't actually verify them.
    expect(d.missingNames).toEqual([]);
  });

  it('treats error as unverified even if missing is empty', () => {
    const d = decideConsentGate(status({ error: new Error('x') }));
    expect(d.kind).toBe('unverified');
    expect(d.hardBlock).toBe(false);
  });
});

describe('consentRecordHref', () => {
  it('deep-links to the records tab for a student', () => {
    expect(consentRecordHref('stu_123')).toBe('/consent?tab=records&student=stu_123');
  });

  it('url-encodes the student id', () => {
    expect(consentRecordHref('a/b id')).toBe('/consent?tab=records&student=a%2Fb%20id');
  });
});
