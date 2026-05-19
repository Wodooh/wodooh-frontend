'use client';

import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import API_ENDPOINTS from '../api/endpoints';
import type {
  ChairmanMe,
  ChairmanCourseRow,
  ChairmanCourseDetail,
  ChairmanInstructor,
  ChairmanStudentsByCourse,
  ChairmanSession,
  SessionReport,
  Alert,
  AuditLogEntry,
  DeanonymizeRequest,
  DeanonymizeResponse,
} from '../types/chairman.types';

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalUsers: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

function makeGetHook<T>(buildUrl: (deps: any) => string) {
  return function useFetch(deps: any = undefined): {
    data: T | null;
    loading: boolean;
    error: string | null;
    refetch: () => void;
  } {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tick, setTick] = useState(0);

    useEffect(() => {
      let cancelled = false;
      setLoading(true);
      setError(null);

      apiClient.get<T>(buildUrl(deps))
        .then(res => {
          if (cancelled) return;
          if (res.status === 'success') {
            setData((res.data ?? null) as T);
          } else {
            throw new Error(res.message || 'Failed to fetch');
          }
        })
        .catch(err => {
          if (cancelled) return;
          setError(err?.message || 'Failed to fetch');
          setData(null);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });

      return () => { cancelled = true; };
    }, [JSON.stringify(deps), tick]);

    const refetch = useCallback(() => setTick(t => t + 1), []);

    return { data, loading, error, refetch };
  };
}

export const useChairmanMe = makeGetHook<ChairmanMe>(() => API_ENDPOINTS.CHAIRMAN_ME);
export const useChairmanCourses = makeGetHook<ChairmanCourseRow[]>(() => API_ENDPOINTS.CHAIRMAN_COURSES);
export const useChairmanCourse = makeGetHook<ChairmanCourseDetail>(
  (id: string) => API_ENDPOINTS.CHAIRMAN_COURSE(id)
);
export const useChairmanInstructors = makeGetHook<ChairmanInstructor[]>(() => API_ENDPOINTS.CHAIRMAN_INSTRUCTORS);
export const useChairmanSessions = makeGetHook<ChairmanSession[]>(() => API_ENDPOINTS.CHAIRMAN_SESSIONS);
export const useChairmanAlerts = makeGetHook<Alert[]>(() => API_ENDPOINTS.CHAIRMAN_ALERTS);

export function useChairmanStudents() {
  const [data, setData] = useState<ChairmanStudentsByCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiClient.get<ChairmanStudentsByCourse[]>(API_ENDPOINTS.CHAIRMAN_STUDENTS)
      .then((res: any) => {
        if (cancelled) return;
        if (res.status === 'success') {
          setData(Array.isArray(res.data) ? res.data : []);
        } else {
          throw new Error(res.message || 'Failed to fetch students');
        }
      })
      .catch(err => {
        if (cancelled) return;
        setError(err?.message || 'Failed to fetch students');
        setData([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [tick]);

  const refetch = useCallback(() => setTick(t => t + 1), []);
  return { data, loading, error, refetch };
}

export function useChairmanSessionReport(sessionId: string | null) {
  const [data, setData] = useState<SessionReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!sessionId) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiClient.get<SessionReport>(API_ENDPOINTS.CHAIRMAN_SESSION_REPORT(sessionId))
      .then(res => {
        if (cancelled) return;
        if (res.status === 'success' && res.data) {
          setData(res.data);
        } else {
          throw new Error(res.message || 'Failed to fetch report');
        }
      })
      .catch(err => {
        if (cancelled) return;
        setError(err?.message || 'Failed to fetch report');
        setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [sessionId, tick]);

  const refetch = useCallback(() => setTick(t => t + 1), []);
  return { data, loading, error, refetch };
}

export function useChairmanAuditLog(params: { page?: number; limit?: number } = {}) {
  const { page = 1, limit = 20 } = params;
  const [data, setData] = useState<AuditLogEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    apiClient.get<AuditLogEntry[]>(`${API_ENDPOINTS.CHAIRMAN_AUDIT_LOG}?${qs}`)
      .then((res: any) => {
        if (cancelled) return;
        if (res.status === 'success') {
          setData(Array.isArray(res.data) ? res.data : []);
          setPagination(res.pagination ?? null);
        } else {
          throw new Error(res.message || 'Failed to fetch audit log');
        }
      })
      .catch(err => {
        if (cancelled) return;
        setError(err?.message || 'Failed to fetch audit log');
        setData([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [page, limit, tick]);

  const refetch = useCallback(() => setTick(t => t + 1), []);
  return { data, pagination, loading, error, refetch };
}

export function useDeanonymize() {
  const [data, setData] = useState<DeanonymizeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (body: DeanonymizeRequest): Promise<DeanonymizeResponse> => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await apiClient.post<DeanonymizeResponse>(API_ENDPOINTS.CHAIRMAN_DEANONYMIZE, body);
      if (res.status !== 'success' || !res.data) {
        throw new Error(res.message || 'Failed to de-anonymize');
      }
      setData(res.data);
      return res.data;
    } catch (err: any) {
      setError(err?.message || 'Failed to de-anonymize');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return { data, loading, error, run, reset };
}

export function useAssignChairman() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assign = useCallback(async (departmentId: string, chairmanUserId: string | null): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.patch(
        API_ENDPOINTS.ADMIN_DEPARTMENT_CHAIRMAN(departmentId),
        { chairmanUserId }
      );
      if (res.status !== 'success') throw new Error(res.message || 'Failed to assign chairman');
    } catch (err: any) {
      setError(err?.message || 'Failed to assign chairman');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { assign, loading, error };
}
