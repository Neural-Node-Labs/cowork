import { useCallback, useEffect, useRef, useState } from 'react';

interface PollState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refresh: () => void;
}

/**
 * Polls `fetcher` every `intervalMs` while `active` is true. Always fetches
 * once immediately on mount / when `active` flips to true. Exposes a manual
 * `refresh()` for on-demand re-fetches (e.g. a Refresh button).
 */
export function usePoll<T>(fetcher: () => Promise<T>, intervalMs: number, active = true): PollState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(() => {
    setLoading(true);
    fetcherRef
      .current()
      .then((result) => {
        setData(result);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!active) return;
    load();
    if (!intervalMs) return;
    const id = window.setInterval(load, intervalMs);
    return () => window.clearInterval(id);
  }, [active, intervalMs, load]);

  return { data, error, loading, refresh: load };
}
