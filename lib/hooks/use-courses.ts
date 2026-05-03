'use client';

import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import API_ENDPOINTS from '../api/endpoints';
import type { Course, CreateCourseRequest, UpdateCourseRequest } from '../types/course.types';
import type { PaginationMeta } from '../types/api.types';

interface CoursesParams {
  page?: number;
  limit?: number;
  departmentId?: string;
}

export function useCourses(params: CoursesParams = {}) {
  const { page, limit, departmentId } = params;

  const [courses, setCourses] = useState<Course[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const qs = new URLSearchParams();
    if (page)         qs.set('page',  String(page));
    if (limit)        qs.set('limit', String(limit));
    if (departmentId) qs.set('departmentId', departmentId);
    const url = `${API_ENDPOINTS.ADMIN_COURSES}${qs.toString() ? `?${qs}` : ''}`;

    apiClient.get<Course[]>(url)
      .then(res => {
        if (cancelled) return;
        if (res.status === 'success' && Array.isArray(res.data)) {
          setCourses(res.data);
          setPagination(res.pagination ?? null);
        } else {
          throw new Error(res.message || 'Failed to fetch courses');
        }
      })
      .catch(err => {
        if (cancelled) return;
        setError(err?.message || 'Failed to fetch courses');
        setCourses([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [page, limit, departmentId, tick]);

  const refetch = useCallback(() => setTick(t => t + 1), []);

  const createCourse = useCallback(async (data: CreateCourseRequest): Promise<Course> => {
    const res = await apiClient.post<Course>(API_ENDPOINTS.ADMIN_COURSES, data);
    if (res.status !== 'success' || !res.data) throw new Error(res.message || 'Failed to create course');
    setTick(t => t + 1);
    return res.data;
  }, []);

  const updateCourse = useCallback(async (id: string, data: UpdateCourseRequest): Promise<Course> => {
    const res = await apiClient.patch<Course>(API_ENDPOINTS.ADMIN_COURSE(id), data);
    if (res.status !== 'success' || !res.data) throw new Error(res.message || 'Failed to update course');
    setTick(t => t + 1);
    return res.data;
  }, []);

  const deleteCourse = useCallback(async (id: string): Promise<void> => {
    const res = await apiClient.delete(API_ENDPOINTS.ADMIN_COURSE(id));
    if (res.status !== 'success') throw new Error(res.message || 'Failed to delete course');
    setTick(t => t + 1);
  }, []);

  return { courses, pagination, loading, error, refetch, createCourse, updateCourse, deleteCourse };
}
