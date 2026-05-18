"use client";

import { useState, useEffect } from "react";
import apiClient from "../api/client";
import API_ENDPOINTS from "../api/endpoints";

export interface SessionQuestion {
  _id: string;
  sessionId: string;
  content: string;
  authorAnonymousCourseId: string;
  visibilityStatus: "visible" | "hidden";
  postSessionStatus: "open" | "resolved" | "archived";
  createdAt: string;
  updatedAt: string;
}

export function useSessionQuestions(sessionId: string | null) {
  const [questions, setQuestions] = useState<SessionQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setQuestions([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    apiClient
      .get<SessionQuestion[]>(`${API_ENDPOINTS.QUESTIONS}?sessionId=${encodeURIComponent(sessionId)}`)
      .then((res) => {
        if (cancelled) return;
        if (res.status === "success" && res.data) {
          setQuestions(res.data);
        } else {
          throw new Error(res.message || "Failed to fetch questions");
        }
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err?.message || "Failed to fetch questions");
        setQuestions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return { questions, loading, error };
}
