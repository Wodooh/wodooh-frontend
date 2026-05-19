'use client';

import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import API_ENDPOINTS from '../api/endpoints';
import { getUserFromToken } from '../auth/jwt-manager';

export type PostSessionStatus = 'open' | 'resolved' | 'archived';
export type VisibilityStatus = 'visible' | 'hidden';

export interface ReviewQuestion {
  _id: string;
  sessionId: string;
  content: string;
  authorAnonymousCourseId: string;
  visibilityStatus: VisibilityStatus;
  postSessionStatus: PostSessionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewSessionMeta {
  _id: string;
  status: 'live' | 'ended';
  startedAt: string;
  endedAt?: string;
  courseId: { _id: string; name: string; code: string };
  sectionId?: { _id: string; sectionId: number };
}

interface ApiSession {
  _id: string;
  status: 'live' | 'ended';
  startedAt: string;
  endedAt?: string;
  courseId: { _id: string; name?: string; code?: string } | string;
  sectionId?: { _id: string; sectionId: number };
}

async function deriveAuthorAnonymousCourseId(userId: string, courseId: string): Promise<string> {
  const data = new TextEncoder().encode(`${userId}:${courseId}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

export function useReviewQuestions(sessionId: string) {
  const [questions, setQuestions] = useState<ReviewQuestion[]>([]);
  const [session, setSession] = useState<ReviewSessionMeta | null>(null);
  const [authorAnonymousCourseId, setAuthorAnonymousCourseId] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setSessionLoading(true);
    setSessionError(null);
    setQuestionsError(null);
    setQuestionsLoading(true);
    setSession(null);
    setAuthorAnonymousCourseId(null);
    setQuestions([]);

    (async () => {
      try {
        const user = getUserFromToken();
        if (!user) throw new Error('Not authenticated');

        const sessionRes = await apiClient.get<ApiSession>(API_ENDPOINTS.SESSION(sessionId));
        if (cancelled) return;
        if (sessionRes.status !== 'success' || !sessionRes.data) {
          throw new Error(sessionRes.message || 'Failed to fetch session');
        }
        const courseId =
          typeof sessionRes.data.courseId === 'string'
            ? sessionRes.data.courseId
            : sessionRes.data.courseId._id;

        const pseudonym = await deriveAuthorAnonymousCourseId(user.userId, courseId);
        if (cancelled) return;

        setSession({
          ...sessionRes.data,
          courseId:
            typeof sessionRes.data.courseId === 'string'
              ? { _id: sessionRes.data.courseId, code: '', name: '' }
              : {
                  _id: sessionRes.data.courseId._id,
                  code: sessionRes.data.courseId.code ?? '',
                  name: sessionRes.data.courseId.name ?? '',
                },
        });
        setAuthorAnonymousCourseId(pseudonym);
      } catch (err) {
        if (cancelled) return;
        setSessionError(err instanceof Error ? err.message : 'Failed to load review questions');
        setQuestions([]);
      } finally {
        if (!cancelled) setSessionLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [sessionId]);

  useEffect(() => {
    let cancelled = false;

    if (!authorAnonymousCourseId || session?._id !== sessionId) {
      setQuestionsLoading(false);
      return () => { cancelled = true; };
    }

    setQuestionsLoading(true);
    setQuestionsError(null);

    (async () => {
      try {
        const qRes = await apiClient.get<ReviewQuestion[]>(
          `${API_ENDPOINTS.QUESTIONS}?sessionId=${encodeURIComponent(sessionId)}`,
        );
        if (cancelled) return;
        if (qRes.status !== 'success' || !qRes.data) {
          throw new Error(qRes.message || 'Failed to fetch questions');
        }

        setQuestions(qRes.data.filter(q => q.authorAnonymousCourseId === authorAnonymousCourseId));
      } catch (err) {
        if (cancelled) return;
        setQuestionsError(err instanceof Error ? err.message : 'Failed to load review questions');
        setQuestions([]);
      } finally {
        if (!cancelled) setQuestionsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [authorAnonymousCourseId, session, sessionId, tick]);

  const refetch = useCallback(() => setTick(t => t + 1), []);

  const updateStatus = useCallback(
    async (questionId: string, postSessionStatus: 'resolved' | 'open'): Promise<void> => {
      const res = await apiClient.patch(
        API_ENDPOINTS.QUESTION_POST_SESSION_STATUS(questionId),
        { postSessionStatus },
      );
      if (res.status !== 'success') {
        throw new Error(res.message || 'Failed to update status');
      }
      setTick(t => t + 1);
    },
    [],
  );

  return {
    questions,
    session,
    sessionLoading,
    loading: sessionLoading || questionsLoading,
    error: sessionError ?? questionsError,
    refetch,
    updateStatus,
  };
}
