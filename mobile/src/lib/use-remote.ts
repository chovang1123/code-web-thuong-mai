import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { errorMessage } from './api';

// Ignore responses from a screen that has been left, or an older refresh request.
export function useRemote<T>(loader: () => Promise<T>) {
  const [result, setResult] = useState<{ loader: typeof loader; value: T } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const version = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++version.current;
    setLoading(true);
    setError('');
    try {
      const result = await loader();
      if (version.current === current) setResult({ loader, value: result });
    } catch (failure) {
      if (version.current === current) setError(errorMessage(failure));
    } finally {
      if (version.current === current) setLoading(false);
    }
  }, [loader]);
  useFocusEffect(useCallback(() => {
    void refresh();
    return () => { version.current++; };
  }, [refresh]));
  // Never show another account's cached orders (or a previous product's details).
  const data = result?.loader === loader ? result.value : null;
  return { data, loading, error, refresh };
}
