'use client';

import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import API_ENDPOINTS from '../api/endpoints';

export interface MySession {
  _id: string;
  status: 'live' | 'ended';
  startedAt: string;
  endedAt?: string;
  courseId: { _id: string; code: string; name: string };
  sectionId: { _id: string; sectionId: number };
  instructorId: { _id: string; name: string; email: string };
}

export function useMySessions(status?: 'live' | 'ended') {
  const [sessions, setSessions] = useState<MySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiClient.get<MySession[]>(API_ENDPOINTS.MY_SESSIONS(status))
      .then(res => {
        if (cancelled) return;
        if (res.status === 'success' && res.data) {
          setSessions(res.data);
        } else {
          throw new Error(res.message || 'Failed to fetch sessions');
        }
      })
      .catch(err => {
        if (cancelled) return;
        setError(err?.message || 'Failed to fetch sessions');
        setSessions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [tick, status]);

  const refetch = useCallback(() => setTick(t => t + 1), []);
  return { sessions, loading, error, refetch };
}
