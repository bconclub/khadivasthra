"use client";

import { useState, useEffect, useCallback } from 'react';

interface UseSupabaseResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useSupabaseQuery<T>(
  queryFn: () => Promise<T>,
  deps: unknown[] = []
): UseSupabaseResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await queryFn();
      setData(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(message);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
