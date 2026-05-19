'use client';

import { useState, useEffect, useCallback } from 'react';
import * as Ably from 'ably';
import apiClient from '../api/client';
import API_ENDPOINTS from '../api/endpoints';
import type {
  LiveSessionSnapshot,
  LiveQuestion,
  QuestionStatus,
  ReactionKind,
  ReactionTallies,
} from '../types/live-session.types';

type QuestionVisibility = 'visible' | 'hidden';

interface ApiSession {
  _id: string;
  status: 'live' | 'ended';
  startedAt: string;
  endedAt?: string;
  courseId: { _id: string; name: string; code: string };
  sectionId?: { _id: string; sectionId: number };
  instructorId: { _id: string; name: string; email: string };
}

interface ApiQuestion {
  _id: string;
  sessionId: string;
  content: string;
  authorAnonymousCourseId: string;
  visibilityStatus: 'visible' | 'hidden';
  postSessionStatus: 'open' | 'resolved' | 'archived';
  createdAt: string;
  updatedAt: string;
}

interface QuestionCreatedPayload {
  _id: string;
  sessionId: string;
  content: string;
  authorAnonymousCourseId: string;
  visibilityStatus: 'visible' | 'hidden';
  postSessionStatus: 'open' | 'resolved' | 'archived';
  createdAt: string;
}

interface QuestionVisibilityChangedPayload {
  _id: string;
  visibilityStatus: 'visible' | 'hidden';
}

function deriveQuestionStatus(
  visibilityStatus: 'visible' | 'hidden',
  postSessionStatus: 'open' | 'resolved' | 'archived',
): QuestionStatus {
  if (postSessionStatus === 'resolved') return 'resolved';
  if (visibilityStatus === 'visible') return 'opened';
  return 'new';
}

function mapQuestion(q: ApiQuestion | QuestionCreatedPayload): LiveQuestion {
  return {
    questionId: q._id.toString(),
    authorAnonymousCourseID: q.authorAnonymousCourseId,
    text: q.content,
    postedAt: q.createdAt,
    fromPage: 1,
    status: deriveQuestionStatus(q.visibilityStatus, q.postSessionStatus),
    clusterSize: 1,
    openedAt: undefined,
    resolvedAt: undefined,
    resolvedByAuthor: undefined,
  };
}

interface ReactionsSummaryResponse {
  sessionId: string;
  totals: Record<ReactionKind, number>;
}

interface ReactionCreatedPayload {
  sessionId: string;
  type: ReactionKind;
  createdAt: string;
}

const REACTION_KINDS = ['too_fast', 'too_slow', 'understood', 'not_clear'] as const;

function isReactionKind(value: unknown): value is ReactionKind {
  return typeof value === 'string' && REACTION_KINDS.includes(value as ReactionKind);
}

function buildReactions(totals: Partial<Record<ReactionKind, number>>): ReactionTallies {
  return {
    windowSeconds: 60,
    too_fast:   { total: totals.too_fast ?? 0,   ratePerMin: 0, trend: 'flat' },
    too_slow:   { total: totals.too_slow ?? 0,   ratePerMin: 0, trend: 'flat' },
    understood: { total: totals.understood ?? 0, ratePerMin: 0, trend: 'flat' },
    not_clear:  { total: totals.not_clear ?? 0,  ratePerMin: 0, trend: 'flat' },
  };
}

function buildSnapshot(
  session: ApiSession,
  questions: ApiQuestion[],
  reactionTotals: Record<ReactionKind, number>,
): LiveSessionSnapshot {
  return {
    meta: {
      sessionId: session._id,
      courseCode: session.courseId.code,
      courseName: session.courseId.name,
      sectionNumber: session.sectionId?.sectionId?.toString() ?? '',
      scheduleLabel: '',
      joinCode: '',
      startedAt: session.startedAt,
      status: session.status === 'live' ? 'active' : session.status,
      joinedCount: 0,
    },
    material: {
      fileId: '',
      filename: '',
      format: 'pptx',
      sizeBytes: 0,
      totalPages: 1,
      uploadedAt: new Date().toISOString(),
      pages: [],
    },
    currentPage: 1,
    followers: { onCurrent: 0, ahead: 0, behind: 0, independent: 0 },
    reactions: buildReactions(reactionTotals),
    questions: questions.map(mapQuestion),
    muted: [],
    controls: {
      questionsPaused: false,
      profanityStrictness: 'std',
      sessionLocked: false,
      broadcasting: true,
    },
  };
}

export function useLiveSession(sessionId: string) {
  const [snapshot, setSnapshot] = useState<LiveSessionSnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const [ended, setEnded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const sessionRes = await apiClient.get<ApiSession>(API_ENDPOINTS.SESSION(sessionId));
        if (cancelled) return;
        if (sessionRes.status !== 'success' || !sessionRes.data) {
          throw new Error(sessionRes.message || 'Failed to fetch session');
        }

        const questionsRes = await apiClient.get<ApiQuestion[]>(
          `${API_ENDPOINTS.QUESTIONS}?sessionId=${encodeURIComponent(sessionId)}`,
        );
        if (cancelled) return;
        if (questionsRes.status !== 'success' || !questionsRes.data) {
          throw new Error(questionsRes.message || 'Failed to fetch questions');
        }

        const reactionsRes = await apiClient.get<ReactionsSummaryResponse>(
          API_ENDPOINTS.SESSION_REACTIONS_SUMMARY(sessionId),
        );
        if (cancelled) return;
        const reactionTotals: Record<ReactionKind, number> =
          reactionsRes.status === 'success' && reactionsRes.data
            ? reactionsRes.data.totals
            : { too_fast: 0, too_slow: 0, understood: 0, not_clear: 0 };

        if (!cancelled) {
          setSnapshot(buildSnapshot(sessionRes.data, questionsRes.data, reactionTotals));
        }
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Failed to load live session';
        setError(message);
        setSnapshot(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [sessionId, tick]);

  useEffect(() => {
    let closed = false;

    const client = new Ably.Realtime({
      authCallback: async (_tokenParams, callback) => {
        try {
          const res = await apiClient.get<unknown>(API_ENDPOINTS.ABLY_TOKEN);
          callback(null, res.data as Ably.TokenRequest);
        } catch (err) {
          callback(err as Ably.ErrorInfo, null);
        }
      },
    });

    const onConnected = () => { if (!closed) setConnected(true); };
    const onLost = () => { if (!closed) setConnected(false); };

    client.connection.on('connected', onConnected);
    client.connection.on('failed', onLost);
    client.connection.on('suspended', onLost);

    // Ably v2 makes channel.subscribe() async (it implicitly attaches the
    // channel). Strict-mode dev double-mount triggers cleanup → client.close()
    // while these subscribe promises are still in flight, so they reject with
    // "Connection closed". Swallow that specific case; rethrow real errors.
    const swallowClosed = (err: unknown) => {
      const code = (err as { code?: number; message?: string } | null)?.code;
      const msg = (err as { message?: string } | null)?.message ?? '';
      if (closed || code === 80017 || /Connection closed/i.test(msg)) return;
      throw err;
    };

    const stateChannel = client.channels.get(`session:${sessionId}:state`);
    stateChannel
      .subscribe('session.ended', () => {
        if (!closed) setEnded(true);
      })
      .catch(swallowClosed);

    stateChannel
      .subscribe('session.page_changed', (msg: Ably.Message) => {
        if (closed) return;
        const data = msg.data as { page: number };
        setSnapshot(prev => {
          if (!prev) return prev;
          return { ...prev, currentPage: data.page };
        });
      })
      .catch(swallowClosed);

    const questionsChannel = client.channels.get(`session:${sessionId}:questions`);

    questionsChannel
      .subscribe('question.created', (msg: Ably.Message) => {
        if (closed) return;
        const payload = msg.data as QuestionCreatedPayload;
        const mapped = mapQuestion(payload);
        // Dedup-and-prepend in one atomic setSnapshot so a redelivered event
        // (or rejoin replay) doesn't double-insert.
        setSnapshot(prev => {
          if (!prev) return prev;
          if (prev.questions.some(q => q.questionId === mapped.questionId)) return prev;
          return { ...prev, questions: [mapped, ...prev.questions] };
        });
      })
      .catch(swallowClosed);

    const reactionsChannel = client.channels.get(`session:${sessionId}:reactions`);
    reactionsChannel
      .subscribe('reaction.created', (msg: Ably.Message) => {
        if (closed) return;
        const payload = msg.data as ReactionCreatedPayload;
        setSnapshot(prev => {
          if (!prev) return prev;
          if (!isReactionKind(payload.type)) {
            return prev;
          }
          const existing = prev.reactions[payload.type];
          return {
            ...prev,
            reactions: {
              ...prev.reactions,
              [payload.type]: { ...existing, total: existing.total + 1 },
            },
          };
        });
      })
      .catch(swallowClosed);

    questionsChannel
      .subscribe('question.visibility_changed', (msg: Ably.Message) => {
        if (closed) return;
        const payload = msg.data as QuestionVisibilityChangedPayload;
        const nextStatus: QuestionStatus =
          payload.visibilityStatus === 'visible' ? 'opened' : 'new';
        setSnapshot(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            questions: prev.questions.map(q =>
              q.questionId === payload._id ? { ...q, status: nextStatus } : q,
            ),
          };
        });
      })
      .catch(swallowClosed);

    return () => {
      closed = true;
      client.close();
    };
  }, [sessionId]);

  const refetch = useCallback(() => setTick(t => t + 1), []);

  const updateQuestion = useCallback(
    (questionId: string, patch: Partial<LiveQuestion>) => {
      setSnapshot(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          questions: prev.questions.map(q =>
            q.questionId === questionId ? { ...q, ...patch } : q,
          ),
        };
      });
    },
    [],
  );

  const prependQuestion = useCallback((q: LiveQuestion) => {
    setSnapshot(prev => {
      if (!prev) return prev;
      return { ...prev, questions: [q, ...prev.questions] };
    });
  }, []);

  // Server-backed visibility flip. Optimistically applies `optimistic` to the
  // matching question, calls PATCH /questions/:id/visibility, and reverts the
  // optimistic patch if the request fails. The Ably `question.visibility_changed`
  // echo will reconcile the status field afterwards, so the optimistic patch
  // can safely set page-only fields (`openedAt`, `resolvedAt`) too.
  const setQuestionVisibility = useCallback(
    async (
      questionId: string,
      visibilityStatus: QuestionVisibility,
      optimistic?: Partial<LiveQuestion>,
    ): Promise<void> => {
      let previous: LiveQuestion | undefined;
      if (optimistic) {
        setSnapshot(prev => {
          if (!prev) return prev;
          previous = prev.questions.find(q => q.questionId === questionId);
          if (!previous) return prev;
          return {
            ...prev,
            questions: prev.questions.map(q =>
              q.questionId === questionId ? { ...q, ...optimistic } : q,
            ),
          };
        });
      }

      try {
        const res = await apiClient.patch(
          API_ENDPOINTS.QUESTION_VISIBILITY(questionId),
          { visibilityStatus },
        );
        if (res.status !== 'success') {
          throw new Error(res.message || 'Failed to update question visibility');
        }
      } catch (err) {
        if (previous) {
          const restore = previous;
          setSnapshot(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              questions: prev.questions.map(q =>
                q.questionId === questionId ? restore : q,
              ),
            };
          });
        }
        throw err;
      }
    },
    [],
  );

  return {
    snapshot,
    connected,
    ended,
    loading,
    error,
    refetch,
    updateQuestion,
    prependQuestion,
    setQuestionVisibility,
  };
}
