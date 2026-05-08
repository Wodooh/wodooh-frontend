'use client';

import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import API_ENDPOINTS from '../api/endpoints';

/**
 * Health check response type
 */
export interface HealthCheckResponse {
  dbConnected: boolean;
  timestamp: string;
  message: string;
}

/**
 * Hook for health check
 * Monitors backend API health and database connection status
 */
export const useHealth = (options: {
  enabled?: boolean;
  interval?: number;
  refreshInterval?: number;
} = {}) => {
  const { enabled = true, refreshInterval } = options;

  const [data, setData] = useState<HealthCheckResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isHealthy, setIsHealthy] = useState(false);

  /**
   * Check health status
   */
  const checkHealth = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<HealthCheckResponse>(API_ENDPOINTS.HEALTH);

      if (response.status === 'success' && response.data) {
        setData({ ...response.data, message: response.message ?? '' });
        setIsHealthy(response.data.dbConnected);
      } else {
        throw new Error(response.message || 'Health check failed');
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Health check failed';
      setError(errorMessage);
      setIsHealthy(false);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Check health on mount and optionally at intervals
   */
  useEffect(() => {
    if (!enabled) return;

    checkHealth();

    if (refreshInterval && refreshInterval > 0) {
      const intervalId = setInterval(checkHealth, refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, [enabled, refreshInterval, checkHealth]);

  return {
    data,
    loading,
    error,
    isHealthy,
    checkHealth,
  };
};

export default useHealth;
