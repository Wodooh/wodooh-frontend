'use client';

import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import API_ENDPOINTS from '../api/endpoints';
import type { Department, CreateDepartmentRequest, UpdateDepartmentRequest } from '../types/department.types';

export function useDepartments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiClient.get<Department[]>(API_ENDPOINTS.DEPARTMENTS)
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
  }, [tick]);

  const refetch = useCallback(() => setTick(t => t + 1), []);

  const createDepartment = useCallback(async (data: CreateDepartmentRequest): Promise<Department> => {
    const res = await apiClient.post<Department>(API_ENDPOINTS.DEPARTMENTS, data);
    if (res.status !== 'success' || !res.data) throw new Error(res.message || 'Failed to create department');
    setTick(t => t + 1);
    return res.data;
  }, []);

  const updateDepartment = useCallback(async (id: string, data: UpdateDepartmentRequest): Promise<Department> => {
    const res = await apiClient.patch<Department>(API_ENDPOINTS.DEPARTMENT(id), data);
    if (res.status !== 'success' || !res.data) throw new Error(res.message || 'Failed to update department');
    setTick(t => t + 1);
    return res.data;
  }, []);

  const deleteDepartment = useCallback(async (id: string): Promise<void> => {
    const res = await apiClient.delete(API_ENDPOINTS.DEPARTMENT(id));
    if (res.status !== 'success') throw new Error(res.message || 'Failed to delete department');
    setTick(t => t + 1);
  }, []);

  return { departments, loading, error, refetch, createDepartment, updateDepartment, deleteDepartment };
}
