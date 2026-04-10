'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ApiResponse } from '../types/api.types';
import apiClient from '../api/client';

/**
 * Request configuration options
 */
export interface UseApiOptions {
  enabled?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

/**
 * Generic API request hook
 * Can be used for any API endpoint when a specific hook doesn't exist
 * Useful for planned backend features that aren't implemented yet
 */
export const useApi = <T = unknown>(options: UseApiOptions = {}) => {
  const { enabled = true, onSuccess, onError } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mountedRef = useRef(true);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /**
   * Execute API call
   */
  const execute = useCallback(async <D = T>(
    requestFn: () => Promise<ApiResponse<D>>
  ): Promise<D | null> => {
    if (!enabled) return null;

    setLoading(true);
    setError(null);

    try {
      const response = await requestFn();

      if (response.status === 'success') {
        const responseData = response.data as D;

        if (mountedRef.current) {
          setData(responseData as unknown as T);
          setLoading(false);
          setError(null);

          if (onSuccess) {
            onSuccess(responseData as unknown as T);
          }

          return responseData;
        }

        return null;
      } else {
        throw new Error(response.message || 'API request failed');
      }
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));

      if (mountedRef.current) {
        setError(errorObj);
        setLoading(false);
        setData(null);

        if (onError) {
          onError(errorObj);
        }
      }

      throw errorObj;
    }
  }, [enabled, onSuccess, onError]);

  /**
   * GET request helper
   */
  const get = useCallback(async <D = T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<D | null> => {
    return execute(() => apiClient.get<D>(endpoint, options)) as Promise<D | null>;
  }, [execute]);

  /**
   * POST request helper
   */
  const post = useCallback(async <D = T>(
    endpoint: string,
    data?: unknown,
    options?: RequestInit
  ): Promise<D | null> => {
    return execute(() => apiClient.post<D>(endpoint, data, options)) as Promise<D | null>;
  }, [execute]);

  /**
   * PUT request helper
   */
  const put = useCallback(async <D = T>(
    endpoint: string,
    data?: unknown,
    options?: RequestInit
  ): Promise<D | null> => {
    return execute(() => apiClient.put<D>(endpoint, data, options)) as Promise<D | null>;
  }, [execute]);

  /**
   * PATCH request helper
   */
  const patch = useCallback(async <D = T>(
    endpoint: string,
    data?: unknown,
    options?: RequestInit
  ): Promise<D | null> => {
    return execute(() => apiClient.patch<D>(endpoint, data, options)) as Promise<D | null>;
  }, [execute]);

  /**
   * DELETE request helper
   */
  const del = useCallback(async <D = T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<D | null> => {
    return execute(() => apiClient.delete<D>(endpoint, options)) as Promise<D | null>;
  }, [execute]);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    get,
    post,
    put,
    patch,
    delete: del,
    reset,
  };
};

/**
 * Hook for making API calls on mount
 */
export const useFetch = <T = unknown>(
  requestFn: () => Promise<ApiResponse<T>>,
  options: UseApiOptions = {}
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await requestFn();
      if (response.status === 'success') {
        setData(response.data as T);
        if (options.onSuccess) {
          options.onSuccess(response.data as T);
        }
      } else {
        throw new Error(response.message || 'API request failed');
      }
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      if (options.onError) {
        options.onError(errorObj);
      }
    } finally {
      setLoading(false);
    }
  }, [requestFn, options]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(true);
  }, []);

  return { data, loading, error, reset, refetch: fetchData };
};

export default useApi;
