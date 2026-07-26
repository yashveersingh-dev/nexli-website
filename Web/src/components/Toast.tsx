import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from '@/components/Icon';
import { Portal } from '@/components/Portal';

export type ToastTone = 'default' | 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  title: ReactNode;
  description?: ReactNode;
  tone?: ToastTone;
  /** Auto-dismiss after ms. 0 = sticky. Default 4500 (6000 for errors). */
  duration?: number;
  /** Inline action (e.g. Undo). */
  action?: { label: string; onClick: () => void };
}

interface ToastItem extends ToastOptions {
  id: string;
}

interface ToastContextValue {
  toast: (opts: ToastOptions) => string;
  success: (title: ReactNode, description?: ReactNode) => string;
  error: (title: ReactNode, description?: ReactNode) => string;
  warning: (title: ReactNode, description?: ReactNode) => string;
  info: (title: ReactNode, description?: ReactNode) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toneIcon: Record<ToastTone, IconName> = {
  default: 'info',
  success: 'check-circle',
  error: 'alert-triangle',
  warning: 'alert-triangle',
  info: 'info',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (opts: ToastOptions) => {
      const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const tone = opts.tone ?? 'default';
      const duration = opts.duration ?? (tone === 'error' ? 6000 : 4500);
      setToasts((list) => [...list.slice(-3), { ...opts, tone, id }]);
      if (duration > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), duration),
        );
      }
      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((t) => clearTimeout(t));
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      dismiss,
      success: (title, description) => toast({ title, description, tone: 'success' }),
      error: (title, description) => toast({ title, description, tone: 'error' }),
      warning: (title, description) => toast({ title, description, tone: 'warning' }),
      info: (title, description) => toast({ title, description, tone: 'info' }),
    }),
    [toast, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Portal>
        <div className="nx-toast-stack" role="region" aria-label="Notifications">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={cn('nx-toast', `nx-toast--${t.tone}`)}
              role={t.tone === 'error' ? 'alert' : 'status'}
              aria-live={t.tone === 'error' ? 'assertive' : 'polite'}
            >
              <span className="nx-toast__icon" aria-hidden="true">
                <Icon name={toneIcon[t.tone ?? 'default']} size={18} />
              </span>
              <div className="nx-toast__text">
                <div className="nx-toast__title">{t.title}</div>
                {t.description != null && <div className="nx-toast__desc">{t.description}</div>}
              </div>
              {t.action && (
                <button
                  type="button"
                  className="nx-toast__action"
                  onClick={() => {
                    t.action!.onClick();
                    dismiss(t.id);
                  }}
                >
                  {t.action.label}
                </button>
              )}
              <button
                type="button"
                className="nx-toast__close"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
              >
                <Icon name="x" size={14} />
              </button>
            </div>
          ))}
        </div>
      </Portal>
    </ToastContext.Provider>
  );
}

/** Access the toast API. Must be inside <ToastProvider> (mounted in AppProviders). */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}
