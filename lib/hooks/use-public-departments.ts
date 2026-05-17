'use client';

import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import API_ENDPOINTS from '../api/endpoints';
import type { Department } from '../types/department.types';

export function usePublicDepartments(collegeId?: string) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!collegeId) {
      setDepartments([]);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    const url = `${API_ENDPOINTS.PUBLIC_DEPARTMENTS}?collegeId=${encodeURIComponent(collegeId)}`;
    apiClient.get<Department[]>(url)
      .then(res => {
        if (cancelled) return;
        if (res.status === 'success' && Array.isArray(res.data)) {
          setDepartments(res.data);
        } else {
          throw new Error(res.message || 'Failed to fetch departments');
        }
      })
      .catch(err => {
        if (cancelled) return;
        setError(err?.message || 'Failed to fetch departments');
        setDepartments([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [collegeId, tick]);

  const refetch = useCallback(() => setTick(t => t + 1), []);
  return { departments, loading, error, refetch };
}
