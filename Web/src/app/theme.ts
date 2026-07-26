/* =============================================================
   NEXLI — theme (dark / light) controller
   -------------------------------------------------------------
   Dark is the product default and stays the source of truth for
   the design. Light ("outdoor") mode is opt-in: it only swaps the
   CSS custom-property values defined under :root[data-theme='light']
   in index.css. Persisted per-browser in localStorage; if the user
   has never chosen, we honour the OS `prefers-color-scheme`.
   ============================================================= */
import { useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'nexli:theme';

/** Read a previously-saved preference (if any). */
function storedTheme(): Theme | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

/** OS preference fallback for users who haven't chosen explicitly. */
function systemTheme(): Theme {
  try {
    return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

/** The effective theme: explicit choice ◀ system preference ◀ dark default. */
export function resolveTheme(): Theme {
  return storedTheme() ?? systemTheme();
}

/** Reflect a theme on <html> (dark = no attribute, keeping the default tokens). */
function reflect(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'light') root.setAttribute('data-theme', 'light');
  else root.removeAttribute('data-theme');
  // Helps native form controls / scrollbars match the surface.
  root.style.colorScheme = theme;
}

/** Apply the resolved theme to the document. Called once at startup. */
export function initTheme(): void {
  reflect(resolveTheme());
}

/** Persist + apply a theme, and notify listeners in this tab. */
export function setTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore (private mode / quota) */
  }
  reflect(theme);
  window.dispatchEvent(new CustomEvent<Theme>('nexli:themechange', { detail: theme }));
}

/** Toggle between dark and light. Returns the new theme. */
export function toggleTheme(): Theme {
  const next: Theme = resolveTheme() === 'light' ? 'dark' : 'light';
  setTheme(next);
  return next;
}

/**
 * React binding: current theme + a setter, kept in sync across tabs and with any
 * other in-app toggle (via the custom event + the storage event).
 */
export function useTheme(): { theme: Theme; setTheme: (t: Theme) => void; toggle: () => void } {
  const [theme, setThemeState] = useState<Theme>(() => resolveTheme());

  useEffect(() => {
    const onChange = () => setThemeState(resolveTheme());
    window.addEventListener('nexli:themechange', onChange as EventListener);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener('nexli:themechange', onChange as EventListener);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  return {
    theme,
    setTheme: (t: Theme) => setTheme(t),
    toggle: () => setThemeState(toggleTheme()),
  };
}

// Apply the persisted/system theme as early as this module is imported, so the
// first paint already matches (imported from AppProviders, which mounts at root).
initTheme();
