'use client';

import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import API_ENDPOINTS from '../api/endpoints';
import { ApiErrorHandler } from '../api/error-handler';
import type { Section } from '../types/course.types';

export function usePublicSections(courseId?: string) {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!courseId) {
      setSections([]);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiClient.get<Section[]>(API_ENDPOINTS.PUBLIC_COURSE_SECTIONS(courseId))
      .then(res => {
        if (cancelled) return;
        if (res.status === 'success' && Array.isArray(res.data)) {
          setSections(res.data);
        } else {
          throw new Error(res.message || 'Failed to fetch sections');
        }
      })
      .catch(err => {
        if (cancelled) return;
        if (err instanceof ApiErrorHandler && err.code === 'NOT_FOUND') {
          setSections([]);
          return;
        }
        setError(err?.message || 'Failed to fetch sections');
        setSections([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [courseId, tick]);

  const refetch = useCallback(() => setTick(t => t + 1), []);
  return { sections, loading, error, refetch };
}
