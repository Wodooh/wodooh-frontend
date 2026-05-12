'use client';

import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import API_ENDPOINTS from '../api/endpoints';
import type { Section, CreateSectionRequest } from '../types/course.types';

export function useSections(courseId: string) {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiClient.get<Section[]>(API_ENDPOINTS.ADMIN_COURSE_SECTIONS(courseId))
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
        setError(err?.message || 'Failed to fetch sections');
        setSections([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [courseId, tick]);

  const refetch = useCallback(() => setTick(t => t + 1), []);

  const createSection = useCallback(async (data: CreateSectionRequest): Promise<Section> => {
    const res = await apiClient.post<Section>(API_ENDPOINTS.ADMIN_COURSE_SECTIONS(courseId), data);
    if (res.status !== 'success' || !res.data) throw new Error(res.message || 'Failed to create section');
    setTick(t => t + 1);
    return res.data;
  }, [courseId]);

  const deleteSection = useCallback(async (sectionDbId: string): Promise<void> => {
    const res = await apiClient.delete(API_ENDPOINTS.ADMIN_COURSE_SECTION(courseId, sectionDbId));
    if (res.status !== 'success') throw new Error(res.message || 'Failed to delete section');
    setTick(t => t + 1);
  }, [courseId]);

  return { sections, loading, error, refetch, createSection, deleteSection };
}
