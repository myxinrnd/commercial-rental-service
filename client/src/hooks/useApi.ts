import { useState, useCallback } from 'react';
import { apiCache } from '../utils/helpers';

interface UseApiOptions {
  cache?: boolean;
  cacheKey?: string;
}

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T>() {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null
  });

  const execute = useCallback(async (
    apiCall: () => Promise<T>,
    options: UseApiOptions = {}
  ) => {
    const { cache = false, cacheKey } = options;

    // Проверяем кэш если включен
    if (cache && cacheKey) {
      const cachedData = apiCache.get(cacheKey);
      if (cachedData) {
        setState({
          data: cachedData,
          loading: false,
          error: null
        });
        return cachedData;
      }
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await apiCall();
      
      // Сохраняем в кэш если включен
      if (cache && cacheKey) {
        apiCache.set(cacheKey, result);
      }

      setState({
        data: result,
        loading: false,
        error: null
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Произошла ошибка';
      setState({
        data: null,
        loading: false,
        error: errorMessage
      });
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null
    });
  }, []);

  return {
    ...state,
    execute,
    reset
  };
}
