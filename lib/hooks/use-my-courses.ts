'use client';

import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import API_ENDPOINTS from '../api/endpoints';
import type { UserRole } from '../types/user.types';

export interface MyCourseEntry {
  sectionDbId: string;
  sectionId: number;
  instructor: { _id: string; name: string; email: string } | null;
  course: { _id: string; name: string; code: string; credits: number | null } | null;
}

interface MyCoursesResponse {
  role: UserRole;
  courses: MyCourseEntry[];
}

export function useMyCourses() {
  const [courses, setCourses] = useState<MyCourseEntry[]>([]);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiClient.get<MyCoursesResponse>(API_ENDPOINTS.MY_COURSES)
      .then(res => {
        if (cancelled) return;
        if (res.status === 'success' && res.data) {
          setCourses(res.data.courses ?? []);
          setRole(res.data.role ?? null);
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
  }, [tick]);

  const refetch = useCallback(() => setTick(t => t + 1), []);
  return { courses, role, loading, error, refetch };
}
