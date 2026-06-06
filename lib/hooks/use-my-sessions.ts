'use client';

import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import API_ENDPOINTS from '../api/endpoints';
import type { SessionStatus } from '../types/session.types';

export interface MySession {
  _id: string;
  status: SessionStatus;
  startedAt: string;
  endedAt?: string;
  courseId: { _id: string; code: string; name: string };
  sectionId: { _id: string; sectionId: number };
  instructorId: { _id: string; name: string; email: string };
}

export interface MySessionsResponse {
  role: string;
  sessions: MySession[];
}

export function useMySessions(status?: SessionStatus) {
  const [sessions, setSessions] = useState<MySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiClient.get<{ role: string; sessions: MySession[] }>(API_ENDPOINTS.MY_SESSIONS(status))
      .then(res => {
        if (cancelled) return;
        if (res.status === 'success' && res.data) {
          setSessions(res.data.sessions ?? []);
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
