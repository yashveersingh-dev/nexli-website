import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders children into a dedicated overlay root appended to <body>, so modals,
 * sheets and toasts escape any transformed/overflow-clipped ancestor.
 */
export function Portal({ children }: { children: ReactNode }) {
  const [el] = useState(() => {
    if (typeof document === 'undefined') return null;
    const node = document.createElement('div');
    node.setAttribute('data-nx-portal', '');
    return node;
  });

  useEffect(() => {
    if (!el) return;
    document.body.appendChild(el);
    return () => {
      document.body.removeChild(el);
    };
  }, [el]);

  if (!el) return null;
  return createPortal(children, el);
}
