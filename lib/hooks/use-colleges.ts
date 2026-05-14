'use client';

import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import API_ENDPOINTS from '../api/endpoints';
import type { College, CreateCollegeRequest, UpdateCollegeRequest } from '../types/college.types';

export function useColleges() {
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiClient.get<College[]>(API_ENDPOINTS.COLLEGES)
      .then(res => {
        if (cancelled) return;
        if (res.status === 'success' && Array.isArray(res.data)) {
          setColleges(res.data);
        } else {
          throw new Error(res.message || 'Failed to fetch colleges');
        }
      })
      .catch(err => {
        if (cancelled) return;
        setError(err?.message || 'Failed to fetch colleges');
        setColleges([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [tick]);

  const refetch = useCallback(() => setTick(t => t + 1), []);

  const createCollege = useCallback(async (data: CreateCollegeRequest): Promise<College> => {
    const res = await apiClient.post<College>(API_ENDPOINTS.COLLEGES, data);
    if (res.status !== 'success' || !res.data) throw new Error(res.message || 'Failed to create college');
    setTick(t => t + 1);
    return res.data;
  }, []);

  const updateCollege = useCallback(async (id: string, data: UpdateCollegeRequest): Promise<College> => {
    const res = await apiClient.patch<College>(API_ENDPOINTS.COLLEGE(id), data);
    if (res.status !== 'success' || !res.data) throw new Error(res.message || 'Failed to update college');
    setTick(t => t + 1);
    return res.data;
  }, []);

  const deleteCollege = useCallback(async (id: string): Promise<void> => {
    const res = await apiClient.delete(API_ENDPOINTS.COLLEGE(id));
    if (res.status !== 'success') throw new Error(res.message || 'Failed to delete college');
    setTick(t => t + 1);
  }, []);

  return { colleges, loading, error, refetch, createCollege, updateCollege, deleteCollege };
}
