'use client';

import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import API_ENDPOINTS from '../api/endpoints';
import type { Course } from '../types/course.types';

export interface PublicCoursesOptions {
  // Pick exactly one of these (or neither for "all courses"):
  //   { departmentId } → only that department's courses
  //   { collegeId }    → all courses across that college's departments
  //   {}               → every course in the system
  departmentId?: string;
  collegeId?: string;
  // When true, the backend hides courses with no sections left for a new
  // instructor to claim (i.e. every section already has an instructor).
  forInstructor?: boolean;
  // Set to false to skip fetching (e.g. wait until the user picks something).
  enabled?: boolean;
}

export function usePublicCourses(opts: PublicCoursesOptions = {}) {
  const { departmentId, collegeId, forInstructor = false, enabled = true } = opts;

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setCourses([]);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    const qs = new URLSearchParams();
    if (departmentId) qs.set('departmentId', departmentId);
    else if (collegeId) qs.set('collegeId', collegeId);
    if (forInstructor) qs.set('forInstructor', 'true');
    const url = qs.toString()
      ? `${API_ENDPOINTS.PUBLIC_COURSES}?${qs}`
      : API_ENDPOINTS.PUBLIC_COURSES;

    apiClient.get<Course[]>(url)
      .then(res => {
        if (cancelled) return;
        if (res.status === 'success' && Array.isArray(res.data)) {
          setCourses(res.data);
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
  }, [enabled, departmentId, collegeId, forInstructor, tick]);

  const refetch = useCallback(() => setTick(t => t + 1), []);
  return { courses, loading, error, refetch };
}
