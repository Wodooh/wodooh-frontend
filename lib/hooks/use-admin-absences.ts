"use client";

import { useCallback, useEffect, useState } from "react";
import apiClient from "../api/client";
import API_ENDPOINTS from "../api/endpoints";
import type { AbsenceRecord, UpsertAbsenceRequest } from "../types/absence.types";

/**
 * Read a student's manual/synced absence records. Follows the project hook
 * pattern: useEffect + cancelled flag + tick counter for refetch.
 */
export function useAdminUserAbsences(userId: string | null) {
  const [data, setData] = useState<AbsenceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!userId) {
      return;
    }
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);
    });
    apiClient
      .get<AbsenceRecord[]>(API_ENDPOINTS.USER_ABSENCES(userId))
      .then((res) => {
        if (cancelled) return;
        if (res.status === "success" && Array.isArray(res.data)) {
          setData(res.data);
        } else {
          throw new Error(res.message || "Failed to load absences");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load absences");
        setData([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);
  return {
    data: userId ? data : [],
    loading: userId ? loading : false,
    error: userId ? error : null,
    refetch,
  };
}

/**
 * Upsert (create-or-replace) one absence record for a student+course. The
 * backend stamps source='manual', so a later SIS sync won't clobber it.
 * Returns the refreshed list of absence records.
 */
export function useUpsertAbsence() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const upsert = useCallback(
    async (userId: string, body: UpsertAbsenceRequest) => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.post<AbsenceRecord[]>(
          API_ENDPOINTS.USER_ABSENCES(userId),
          body
        );
        if (res.status !== "success" || !res.data) {
          throw new Error(res.message || "Failed to record absence");
        }
        return res.data;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to record absence";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );
  return { upsert, loading, error };
}

export function useDeleteAbsence() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const remove = useCallback(async (userId: string, courseId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.delete<AbsenceRecord[]>(
        API_ENDPOINTS.USER_ABSENCE(userId, courseId)
      );
      if (res.status !== "success" || !res.data) {
        throw new Error(res.message || "Failed to remove absence");
      }
      return res.data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to remove absence";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  return { remove, loading, error };
}
