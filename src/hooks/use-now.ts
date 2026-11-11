import { useEffect, useState } from 'react';

// Re-renders the component every `intervalMs` so "waiting 12 min" keeps counting.
export function useNow(intervalMs = 15_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function minutesSince(iso: string | null, nowMs: number) {
  if (!iso) return 0;
  return Math.max(0, Math.floor((nowMs - new Date(iso).getTime()) / 60_000));
}
