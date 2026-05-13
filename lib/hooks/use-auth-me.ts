'use client';

import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import API_ENDPOINTS from '../api/endpoints';
import type { UserRole } from '../types/user-doc.types';

export interface AuthMe {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthMeWire {
  user: AuthMe;
}

export function useAuthMe() {
  const [me, setMe] = useState<AuthMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiClient.get<AuthMeWire>(API_ENDPOINTS.AUTH_ME)
      .then(res => {
        if (cancelled) return;
        if (res.status === 'success' && res.data?.user) {
          setMe(res.data.user);
        } else {
          throw new Error(res.message || 'Failed to fetch current user');
        }
      })
      .catch(err => {
        if (cancelled) return;
        setError(err?.message || 'Failed to fetch current user');
        setMe(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [tick]);

  const refetch = useCallback(() => setTick(t => t + 1), []);

  return { me, loading, error, refetch };
}
