import { Component, type ErrorInfo, type ReactNode } from 'react';
import { captureException } from '@/lib/monitoring';

interface ErrorBoundaryProps {
  children: ReactNode;
  /**
   * Optional label for the boundary location (e.g. 'app-root', 'route'), attached
   * to the captured exception so we can tell a whole-app crash from a contained
   * single-module one.
   */
  scope?: string;
  /**
   * Changing this value resets the boundary (clears the error and re-renders the
   * children). Route hosts pass the current pathname so navigating away from a
   * crashed screen recovers automatically without a full reload.
   */
  resetKey?: string | number;
  /** Optional custom fallback. Receives the error + a reset callback. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Local, dependency-free error boundary (no react-error-boundary / Sentry import).
 * Wrap the app root AND each routed area so a render crash in one module shows a
 * branded recovery panel instead of white-screening the entire app. `componentDidCatch`
 * forwards to `captureException` (a no-op unless a monitoring DSN is configured).
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    captureException(error, {
      scope: this.props.scope ?? 'unknown',
      componentStack: info.componentStack,
    });
  }

  componentDidUpdate(prev: ErrorBoundaryProps): void {
    // Auto-recover when the reset key changes (e.g. route navigation) so a crashed
    // screen doesn't trap the user — moving elsewhere clears the error.
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  reset = (): void => this.setState({ error: null });

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(error, this.reset);
    return <DefaultFallback onReload={() => window.location.reload()} onReset={this.reset} />;
  }
}

/**
 * Branded fallback. Uses inline styles keyed off the design tokens so it renders
 * correctly even if the failure was in (or co-located with) a stylesheet chunk.
 */
function DefaultFallback({ onReload, onReset }: { onReload: () => void; onReset: () => void }) {
  return (
    <div role="alert" style={WRAP}>
      <div style={CARD}>
        <div style={ICON} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" width={22} height={22}>
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h1 style={TITLE}>Something went wrong</h1>
        <p style={MSG}>
          This part of NEXLI hit an unexpected error. Your data is safe. Try again, or reload the page.
        </p>
        <div style={ACTIONS}>
          <button type="button" onClick={onReset} style={BTN_GHOST}>
            Try again
          </button>
          <button type="button" onClick={onReload} style={BTN_GOLD}>
            Reload
          </button>
        </div>
      </div>
    </div>
  );
}

const WRAP: React.CSSProperties = {
  minHeight: '60vh',
  display: 'grid',
  placeItems: 'center',
  padding: '32px 16px',
};
const CARD: React.CSSProperties = {
  maxWidth: 420,
  width: '100%',
  textAlign: 'center',
  background: 'var(--card, #181818)',
  border: '1px solid var(--border, rgba(255,255,255,0.06))',
  borderRadius: 'var(--r-md, 12px)',
  padding: '32px 28px',
};
const ICON: React.CSSProperties = {
  width: 48,
  height: 48,
  margin: '0 auto 16px',
  borderRadius: 12,
  display: 'grid',
  placeItems: 'center',
  color: 'var(--warning, #F59E0B)',
  background: 'rgba(245,158,11,0.12)',
  border: '1px solid rgba(245,158,11,0.22)',
};
const TITLE: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  color: 'var(--text, #F7F2E8)',
  margin: 0,
};
const MSG: React.CSSProperties = {
  fontSize: 13,
  lineHeight: 1.6,
  color: 'var(--text-muted, #A8A29E)',
  margin: '8px 0 0',
};
const ACTIONS: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  justifyContent: 'center',
  marginTop: 22,
};
const BTN_BASE: React.CSSProperties = {
  padding: '9px 18px',
  borderRadius: 'var(--r-sm, 8px)',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};
const BTN_GHOST: React.CSSProperties = {
  ...BTN_BASE,
  background: 'var(--card, #181818)',
  border: '1px solid var(--border-2, rgba(255,255,255,0.09))',
  color: 'var(--text, #F7F2E8)',
};
const BTN_GOLD: React.CSSProperties = {
  ...BTN_BASE,
  background: 'var(--gold, #C6A55C)',
  border: '1px solid var(--gold, #C6A55C)',
  color: '#1a1408',
};
