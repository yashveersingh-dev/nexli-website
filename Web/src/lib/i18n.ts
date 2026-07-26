import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enCommon from '@/locales/en/common.json';
import hiCommon from '@/locales/hi/common.json';

/**
 * NEXLI i18n. English is the base locale, bundled inline so the app boots without
 * a network round-trip or Suspense fallback. Hindi (hi) ships alongside it; further
 * Indian regional languages are added as additional `locales/<lng>/common.json`
 * resources later. Number/date/currency formatting is handled by `@/lib/format`
 * (Indian grouping, ₹, dayjs), so i18next here is purely for UI strings.
 *
 * Only the SHELL + common strings are translated for now. Per-feature strings across
 * the ~50 feature modules are a documented follow-up (needs a professional
 * translator); untranslated Hindi keys intentionally fall back to English via
 * `fallbackLng`, so nothing renders blank in the meantime.
 */
export const DEFAULT_LANGUAGE = 'en';
export const NAMESPACES = ['common'] as const;

/** Languages the UI can switch between, in display order. */
export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिंदी' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

const STORAGE_KEY = 'nexli:lang';

/** A previously-saved language choice, if it's still one we support. */
function storedLanguage(): LanguageCode | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return SUPPORTED_LANGUAGES.some((l) => l.code === v) ? (v as LanguageCode) : null;
  } catch {
    return null;
  }
}

/** Effective startup language: explicit choice ◀ default (English). */
export function resolveLanguage(): LanguageCode {
  return storedLanguage() ?? DEFAULT_LANGUAGE;
}

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    lng: resolveLanguage(),
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    defaultNS: 'common',
    ns: NAMESPACES,
    resources: {
      en: { common: enCommon },
      hi: { common: hiCommon },
    },
    interpolation: { escapeValue: false },
    returnNull: false,
  });
}

/**
 * Persist + apply a language. Safe to call from anywhere; `react-i18next` notifies
 * every `useTranslation()` consumer to re-render. Also stamps <html lang> for a11y
 * + SEO. Persistence failures (private mode / quota) are non-fatal.
 */
export function setLanguage(code: LanguageCode): void {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    /* ignore */
  }
  void i18n.changeLanguage(code);
  try {
    document.documentElement.setAttribute('lang', code);
  } catch {
    /* ignore (SSR / no document) */
  }
}

// Reflect the resolved language on <html lang> at module load (mirrors how the
// theme controller reflects the theme), so the very first paint is labelled.
try {
  document.documentElement.setAttribute('lang', resolveLanguage());
} catch {
  /* ignore */
}

export default i18n;
