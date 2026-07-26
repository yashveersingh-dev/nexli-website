import { useEffect, useState } from 'react';

/**
 * Re-renders on an interval so live countdowns (e.g. the 72h DPDP breach-
 * notification deadline) stay current. Default tick: 60s. Returns epoch ms.
 */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
