import { useEffect, useState } from 'react';

/**
 * Re-renders on an interval so live countdowns (e.g. the POCSO s.19 reporting
 * deadline) stay current without a manual refresh. Default tick: 30s — fine for
 * an hour/minute countdown and cheap. Returns the current epoch ms.
 */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
