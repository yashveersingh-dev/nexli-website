import { describe, it, expect } from 'vitest';
import en from '@/locales/en/common.json';
import hi from '@/locales/hi/common.json';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, resolveLanguage } from './i18n';

/**
 * i18n infrastructure tests. These are pure assertions over the locale resources
 * and the small language-resolution helper — no DOM, no network. The key-parity
 * check is the important one: it FAILS the build if a translator (or a future
 * key addition) leaves the Hindi bundle missing a key the English bundle has, so
 * we never ship a key that silently falls back. It also catches the reverse
 * (a stray Hindi-only key from a copy-paste slip).
 */

type Json = Record<string, unknown>;

/** Flatten a nested string bundle to dotted leaf paths: { a:{b:'x'} } → ['a.b']. */
function leafKeys(obj: Json, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    return v && typeof v === 'object' && !Array.isArray(v)
      ? leafKeys(v as Json, path)
      : [path];
  });
}

describe('locale resources', () => {
  const enKeys = leafKeys(en as Json).sort();
  const hiKeys = leafKeys(hi as Json).sort();

  it('Hindi has every key English has (no missing translations)', () => {
    const missingInHi = enKeys.filter((k) => !hiKeys.includes(k));
    expect(missingInHi).toEqual([]);
  });

  it('Hindi has no extra keys English lacks (no orphan keys)', () => {
    const extraInHi = hiKeys.filter((k) => !enKeys.includes(k));
    expect(extraInHi).toEqual([]);
  });

  it('every leaf value is a non-empty string in both bundles', () => {
    const values = [...Object.values(flatten(en as Json)), ...Object.values(flatten(hi as Json))];
    for (const v of values) {
      expect(typeof v).toBe('string');
      expect((v as string).trim().length).toBeGreaterThan(0);
    }
  });

  it('interpolation placeholders match between locales', () => {
    // e.g. status.signedInAs uses {{email}} — Hindi must keep the same token,
    // otherwise the value won't render the substituted data.
    const enFlat = flatten(en as Json);
    const hiFlat = flatten(hi as Json);
    for (const key of Object.keys(enFlat)) {
      const enTokens = placeholders(enFlat[key] as string);
      const hiTokens = placeholders((hiFlat[key] as string) ?? '');
      expect(hiTokens.sort()).toEqual(enTokens.sort());
    }
  });
});

describe('language resolution', () => {
  it('exposes English as the default', () => {
    expect(DEFAULT_LANGUAGE).toBe('en');
    expect(SUPPORTED_LANGUAGES.map((l) => l.code)).toContain('en');
  });

  it('supports Hindi', () => {
    expect(SUPPORTED_LANGUAGES.map((l) => l.code)).toContain('hi');
  });

  it('falls back to the default when nothing is persisted', () => {
    // node test env has no localStorage; resolveLanguage swallows that and
    // returns the default.
    expect(resolveLanguage()).toBe('en');
  });
});

/** Flatten to dotted leaves keeping values (for value/placeholder assertions). */
function flatten(obj: Json, prefix = ''): Record<string, unknown> {
  return Object.entries(obj).reduce<Record<string, unknown>>((acc, [k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(acc, flatten(v as Json, path));
    else acc[path] = v;
    return acc;
  }, {});
}

/** Extract {{token}} names from a string. */
function placeholders(s: string): string[] {
  return [...s.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]);
}
