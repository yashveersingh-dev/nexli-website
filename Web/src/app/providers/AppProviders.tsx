import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';
import { SessionProvider } from '@/app/providers/SessionProvider';
import { ToastProvider } from '@/components/Toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';
// Side-effect import: applies the persisted/system theme to <html> before first paint.
import '@/app/theme';

/**
 * Single composition root for every app-wide context, in dependency order:
 *   ErrorBoundary (last-resort crash net) → i18n (strings) →
 *   Session (auth/tenant/flags/RBAC) → Toast (global feedback).
 * Mount once at the top of the tree (see `main.tsx`); add future providers here.
 *
 * The outermost ErrorBoundary catches any render crash that escapes the per-route
 * boundary (e.g. a failure in a provider or the shell itself) so the user always
 * sees a branded recovery panel instead of a blank white screen.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary scope="app-root">
      <I18nextProvider i18n={i18n}>
        <SessionProvider>
          <ToastProvider>{children}</ToastProvider>
        </SessionProvider>
      </I18nextProvider>
    </ErrorBoundary>
  );
}
