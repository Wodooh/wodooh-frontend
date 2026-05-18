"use client";

import { useState, useEffect, useCallback } from "react";
import apiClient from "../api/client";
import API_ENDPOINTS from "../api/endpoints";
import type { SessionPopulated, SessionsQuery, StartSessionBody } from "../types/session.types";

function toQs(q: SessionsQuery): string {
  const p = new URLSearchParams();
  if (q.courseId) p.set("courseId", q.courseId);
  if (q.sectionId) p.set("sectionId", q.sectionId);
  if (q.status) p.set("status", q.status);
  if (q.instructorId) p.set("instructorId", q.instructorId);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function useSessions(query: SessionsQuery = {}) {
  const [sessions, setSessions] = useState<SessionPopulated[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const { courseId, sectionId, status, instructorId } = query;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiClient
      .get<SessionPopulated[]>(`${API_ENDPOINTS.SESSIONS}${toQs({ courseId, sectionId, status, instructorId })}`)
      .then((res) => {
        if (cancelled) return;
        if (res.status === "success" && res.data) {
          setSessions(res.data);
        } else {
          throw new Error(res.message || "Failed to fetch sessions");
        }
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err?.message || "Failed to fetch sessions");
        setSessions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [courseId, sectionId, status, instructorId, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  const startSession = useCallback(async (body: StartSessionBody): Promise<SessionPopulated> => {
    const res = await apiClient.post<SessionPopulated>(API_ENDPOINTS.SESSIONS, body);
    if (res.status !== "success" || !res.data) {
      throw new Error(res.message || "Failed to start session");
    }
    setTick((t) => t + 1);
    return res.data;
  }, []);

  const endSession = useCallback(async (id: string): Promise<SessionPopulated> => {
    const res = await apiClient.patch<SessionPopulated>(API_ENDPOINTS.SESSION_END(id), {});
    if (res.status !== "success" || !res.data) {
      throw new Error(res.message || "Failed to end session");
    }
    setTick((t) => t + 1);
    return res.data;
  }, []);

  return { sessions, loading, error, refetch, startSession, endSession };
}
