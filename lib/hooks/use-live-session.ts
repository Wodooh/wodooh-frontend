'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import * as Ably from 'ably';
import apiClient from '../api/client';
import API_ENDPOINTS from '../api/endpoints';
import type {
  LiveSessionSnapshot,
  LiveQuestion,
  LiveQuestionCluster,
  QuestionStatus,
  ReactionKind,
  ReactionTallies,
} from '../types/live-session.types';

// Ably v2 + React Strict Mode (dev) emits an unhandled rejection that
// `.catch(swallowClosed)` on `presence.enter()` cannot reach: inside
// `_enterOrUpdateClient`, Ably retains a reference to the inner attach
// Promise that is NOT bound to the outer enter() promise. On strict-mode
// double-mount, cleanup's `client.close()` rejects that inner promise
// with ErrorInfo {code: 80017, message: "Connection closed"}.
//
// Defenses, registered once at module load (the rejection often arrives
// *after* a useEffect-scoped listener would have been torn down):
//   1. `unhandledrejection` in CAPTURE phase + `stopImmediatePropagation`
//      so this handler runs before Next.js's overlay listener can see it.
//   2. `console.error` shim — Next 16's dev overlay also surfaces errors
//      that flow through console.error, which Ably uses to log unhandled
//      attach failures. Filter only this exact shape.
// Production builds don't strict-double-mount and have no dev overlay, so
// this is purely dev noise; both filters match only the exact pattern.
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const isClosedConnection = (r: unknown): boolean => {
    const rr = r as { code?: number; message?: string } | undefined;
    return rr?.code === 80017 || /Connection closed/i.test(rr?.message ?? '');
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (!w.__wodoohAblyUnhandledRejectionShimInstalled) {
    w.__wodoohAblyUnhandledRejectionShimInstalled = true;
    window.addEventListener(
      'unhandledrejection',
      (e: PromiseRejectionEvent) => {
        if (isClosedConnection(e.reason)) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      },
      { capture: true },
    );
  }

  if (!w.__wodoohAblyConsoleShimInstalled) {
    w.__wodoohAblyConsoleShimInstalled = true;
    const origError = console.error.bind(console);
    console.error = (...args: unknown[]) => {
      for (const a of args) {
        if (typeof a === 'string' && /Connection closed/i.test(a)) return;
        if (a && typeof a === 'object' && isClosedConnection(a)) return;
      }
      origError(...args);
    };
  }
}

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
  postSessionStatus: 'open' | 'resolved' | 'archived' | 'auto-resolved';
  clusterId?: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiCluster {
  _id: string;
  sessionId: string;
  headQuestionId: string;
  headText: string;
  memberIds: string[];
  size: number;
  visibilityStatus: 'hidden' | 'visible';
  createdAt: string;
  updatedAt: string;
}

interface QuestionCreatedPayload {
  _id: string;
  sessionId: string;
  content: string;
  authorAnonymousCourseId: string;
  visibilityStatus: 'visible' | 'hidden';
  postSessionStatus: 'open' | 'resolved' | 'archived' | 'auto-resolved';
  clusterId?: string;
  createdAt: string;
}

interface ClusterCreatedPayload {
  clusterId: string;
  sessionId: string;
  headQuestionId: string;
  headText: string;
  memberIds: string[];
  size: number;
  visibilityStatus: 'hidden' | 'visible';
  createdAt: string;
}

interface ClusterMemberAddedPayload {
  clusterId: string;
  sessionId: string;
  addedQuestionId: string;
  memberIds: string[];
  size: number;
  headQuestionId: string;
  headText: string;
}

interface ClusterHeadChangedPayload {
  clusterId: string;
  sessionId: string;
  headQuestionId: string;
  headText: string;
}

interface ClusterVisibilityChangedPayload {
  clusterId: string;
  sessionId: string;
  memberIds: string[];
  visibilityStatus: 'visible' | 'hidden';
}

interface QuestionVisibilityChangedPayload {
  _id: string;
  visibilityStatus: 'visible' | 'hidden';
}

function deriveQuestionStatus(
  visibilityStatus: 'visible' | 'hidden',
  postSessionStatus: 'open' | 'resolved' | 'archived' | 'auto-resolved',
): QuestionStatus {
  if (postSessionStatus === 'resolved' || postSessionStatus === 'auto-resolved') return 'resolved';
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
    clusterId: q.clusterId,
    openedAt: undefined,
    resolvedAt: undefined,
    resolvedByAuthor: undefined,
  };
}

function mapCluster(c: ClusterCreatedPayload): LiveQuestionCluster {
  return {
    clusterId: c.clusterId,
    headQuestionId: c.headQuestionId,
    headText: c.headText,
    memberIds: c.memberIds.slice(),
    size: c.size,
    visibilityStatus: c.visibilityStatus,
  };
}

interface ReactionsSummaryResponse {
  sessionId: string;
  totals: Record<ReactionKind, number>;
  /** Timestamps of reactions in the last 60 seconds, per type. Seeds the
   *  client's rolling-window buffer so the "N in last 60s" badge is
   *  accurate immediately on load. */
  recent: { type: ReactionKind; at: string }[];
}

interface ReactionCreatedPayload {
  sessionId: string;
  type: ReactionKind;
  createdAt: string;
}

const REACTION_KINDS = ['too_fast', 'too_slow', 'understood', 'not_clear'] as const;
const REACTION_WINDOW_MS = 60_000;

function isReactionKind(value: unknown): value is ReactionKind {
  return typeof value === 'string' && REACTION_KINDS.includes(value as ReactionKind);
}

function countWithinWindow(times: number[], now: number): number {
  let count = 0;
  for (const t of times) if (now - t < REACTION_WINDOW_MS) count++;
  return count;
}

function buildReactions(
  totals: Partial<Record<ReactionKind, number>>,
  recentTimestamps: Record<ReactionKind, number[]>,
): ReactionTallies {
  const now = Date.now();
  return {
    windowSeconds: 60,
    too_fast:   { total: totals.too_fast ?? 0,   recent60s: countWithinWindow(recentTimestamps.too_fast, now) },
    too_slow:   { total: totals.too_slow ?? 0,   recent60s: countWithinWindow(recentTimestamps.too_slow, now) },
    understood: { total: totals.understood ?? 0, recent60s: countWithinWindow(recentTimestamps.understood, now) },
    not_clear:  { total: totals.not_clear ?? 0,  recent60s: countWithinWindow(recentTimestamps.not_clear, now) },
  };
}

function buildSnapshot(
  session: ApiSession,
  questions: ApiQuestion[],
  clusters: ApiCluster[],
  reactionTotals: Record<ReactionKind, number>,
  reactionRecentTimestamps: Record<ReactionKind, number[]>,
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
    reactions: buildReactions(reactionTotals, reactionRecentTimestamps),
    questions: questions.map(mapQuestion),
    clusters: clusters.map(c => ({
      clusterId: c._id,
      headQuestionId: c.headQuestionId,
      headText: c.headText,
      memberIds: c.memberIds.slice(),
      size: c.size,
      visibilityStatus: c.visibilityStatus,
    })),
    muted: [],
    controls: {
      broadcasting: true,
    },
  };
}

export function useLiveSession(
  sessionId: string,
  /**
   * Pass `true` for any user who is **attending** the session (student, guest,
   * any role). They will enter Ably presence so the instructor's attendance
   * count is accurate. Pass `false` (default) for the instructor running the
   * session — they watch the count instead of contributing to it.
   */
  enterPresence = false,
) {
  const [snapshot, setSnapshot] = useState<LiveSessionSnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const [ended, setEnded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  /** Live count of students currently in the session (instructor role only). */
  const [studentCount, setStudentCount] = useState(0);

  // Rolling per-type timestamp buffer that powers the "N in last 60s" badge.
  // Seeded from the summary endpoint's `recent[]` on initial fetch, appended
  // on each Ably `reaction.created` event, and pruned/published into the
  // snapshot once a second by the ticker effect further down. Lives in a
  // ref so async writers (Ably) and the ticker both see the same buffer
  // without churning state.
  const reactionTimestampsRef = useRef<Record<ReactionKind, number[]>>({
    too_fast: [], too_slow: [], understood: [], not_clear: [],
  });

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

        // Clusters are instructor/admin-only on the backend. The instructor
        // dashboard (enterPresence === false) consumes them; attendees
        // (students) never read `snapshot.clusters`, so we skip the fetch
        // entirely for them — avoiding the otherwise-guaranteed 403 that
        // the browser would auto-log to the console.
        let clusters: ApiCluster[] = [];
        if (!enterPresence) {
          const clustersRes = await apiClient.get<ApiCluster[]>(
            `${API_ENDPOINTS.CLUSTERS}?sessionId=${encodeURIComponent(sessionId)}`,
          );
          if (cancelled) return;
          if (clustersRes.status === 'success' && clustersRes.data) {
            clusters = clustersRes.data;
          }
        }

        // Reactions are a private student signal: aggregate counts are
        // instructor/admin-only on the backend (403 for students). Skip the
        // fetch entirely for attendees so the browser doesn't auto-log a
        // 403 and we don't pull data students aren't supposed to see.
        let reactionTotals: Record<ReactionKind, number> = {
          too_fast: 0, too_slow: 0, understood: 0, not_clear: 0,
        };
        if (!enterPresence) {
          const reactionsRes = await apiClient.get<ReactionsSummaryResponse>(
            API_ENDPOINTS.SESSION_REACTIONS_SUMMARY(sessionId),
          );
          if (cancelled) return;
          if (reactionsRes.status === 'success' && reactionsRes.data) {
            reactionTotals = reactionsRes.data.totals;
            // Seed the rolling-window buffer with the timestamps the backend
            // captured in the last 60s — so the panel shows accurate counts
            // immediately rather than warming up from 0 over a minute.
            const seeded: Record<ReactionKind, number[]> = {
              too_fast: [], too_slow: [], understood: [], not_clear: [],
            };
            for (const r of reactionsRes.data.recent ?? []) {
              if (isReactionKind(r.type)) seeded[r.type].push(Date.parse(r.at));
            }
            reactionTimestampsRef.current = seeded;
          }
        }

        if (!cancelled) {
          setSnapshot(buildSnapshot(
            sessionRes.data, questionsRes.data, clusters, reactionTotals,
            reactionTimestampsRef.current,
          ));
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
  }, [sessionId, tick, enterPresence]);

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

    // Reactions are an instructor-side signal (private student input → aggregate
    // view for the lecturer). Attendees never render counts, so they shouldn't
    // even receive them over the wire — gate the realtime subscription on
    // !enterPresence. (Backend access control already gates the aggregate
    // summary REST endpoint; this closes the parallel Ably leak.)
    if (!enterPresence) {
      const reactionsChannel = client.channels.get(`session:${sessionId}:reactions`);
      reactionsChannel
        .subscribe('reaction.created', (msg: Ably.Message) => {
          if (closed) return;
          const payload = msg.data as ReactionCreatedPayload;
          if (!isReactionKind(payload.type)) return;
          // Append to the rolling buffer so the ticker effect picks it up on
          // the next tick; also bump `total` immediately so the cumulative
          // tile updates without waiting for the ticker.
          reactionTimestampsRef.current[payload.type].push(Date.parse(payload.createdAt));
          setSnapshot(prev => {
            if (!prev) return prev;
            const existing = prev.reactions[payload.type];
            return {
              ...prev,
              reactions: {
                ...prev.reactions,
                [payload.type]: {
                  ...existing,
                  total: existing.total + 1,
                  recent60s: existing.recent60s + 1,
                },
              },
            };
          });
        })
        .catch(swallowClosed);
    }

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

    // ── Cluster events ────────────────────────────────────────────────────────
    // Every cluster mutation is broadcast on the same questions channel so the
    // capability fix from earlier (`session:*:questions`) already covers it.
    // Each handler dedups by clusterId so a redelivered event during reconnect
    // doesn't double-apply.

    questionsChannel
      .subscribe('cluster.created', (msg: Ably.Message) => {
        if (closed) return;
        const payload = msg.data as ClusterCreatedPayload;
        const mapped = mapCluster(payload);
        setSnapshot(prev => {
          if (!prev) return prev;
          if (prev.clusters.some(c => c.clusterId === mapped.clusterId)) return prev;
          return { ...prev, clusters: [mapped, ...prev.clusters] };
        });
      })
      .catch(swallowClosed);

    questionsChannel
      .subscribe('cluster.member_added', (msg: Ably.Message) => {
        if (closed) return;
        const payload = msg.data as ClusterMemberAddedPayload;
        setSnapshot(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            clusters: prev.clusters.map(c =>
              c.clusterId === payload.clusterId
                ? {
                    ...c,
                    memberIds: payload.memberIds.slice(),
                    size: payload.size,
                    headQuestionId: payload.headQuestionId,
                    headText: payload.headText,
                  }
                : c,
            ),
          };
        });
      })
      .catch(swallowClosed);

    questionsChannel
      .subscribe('cluster.head_changed', (msg: Ably.Message) => {
        if (closed) return;
        const payload = msg.data as ClusterHeadChangedPayload;
        setSnapshot(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            clusters: prev.clusters.map(c =>
              c.clusterId === payload.clusterId
                ? { ...c, headQuestionId: payload.headQuestionId, headText: payload.headText }
                : c,
            ),
          };
        });
      })
      .catch(swallowClosed);

    questionsChannel
      .subscribe('cluster.visibility_changed', (msg: Ably.Message) => {
        if (closed) return;
        const payload = msg.data as ClusterVisibilityChangedPayload;
        const nextStatus: QuestionStatus =
          payload.visibilityStatus === 'visible' ? 'opened' : 'new';
        const memberSet = new Set(payload.memberIds);
        setSnapshot(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            clusters: prev.clusters.map(c =>
              c.clusterId === payload.clusterId
                ? { ...c, visibilityStatus: payload.visibilityStatus }
                : c,
            ),
            questions: prev.questions.map(q =>
              memberSet.has(q.questionId) ? { ...q, status: nextStatus } : q,
            ),
          };
        });
      })
      .catch(swallowClosed);

    // ── Presence ──────────────────────────────────────────────────────────────
    const presenceChannel = client.channels.get(`session:${sessionId}:presence`);

    // Maintain a live count of present students for BOTH flows — the
    // instructor needs it to gauge engagement, and the student wants to see
    // how many peers are watching. Presence members are everyone who has
    // entered presence on this channel (i.e., students with
    // `enterPresence === true`).
    const refreshCount = () => {
      presenceChannel.presence.get()
        .then(members => { if (!closed) setStudentCount(members.length); })
        .catch(() => { /* non-fatal */ });
    };
    presenceChannel.presence.subscribe(() => refreshCount())
      .catch(swallowClosed);
    refreshCount(); // seed the count before the first event fires

    if (enterPresence) {
      // This user is attending the session — announce their presence so the
      // count above is accurate.
      //
      // Cancellation guard: defer the implicit attach inside presence.enter()
      // until the connection reaches 'connected', AND re-check the `closed`
      // flag between the await and the call. In React Strict Mode (dev), the
      // doomed first mount's cleanup sets `closed = true` and calls
      // `client.close()` before the connection finishes establishing — gating
      // on connected + closed means the doomed mount never kicks off the
      // attach, so there's no in-flight Promise for closeImpl() to reject.
      //
      // Race `connected` (success) against the terminal states `closed`,
      // `failed`, `suspended` (bail). `disconnected` is transient — Ably
      // auto-reconnects from it — so we let it through and keep waiting.
      // Listeners mutually unsubscribe on first event to avoid a dev-only
      // leak when the doomed mount never reaches connected.
      (async () => {
        try {
          if (client.connection.state !== 'connected') {
            const state = await new Promise<Ably.ConnectionEvent>((resolve) => {
              const events: Ably.ConnectionEvent[] = ['connected', 'closed', 'failed', 'suspended'];
              const listener = (stateChange: Ably.ConnectionStateChange) => {
                events.forEach(e => client.connection.off(e, listener));
                resolve(stateChange.current);
              };
              events.forEach(e => client.connection.on(e, listener));
            });
            if (state !== 'connected') return;
          }
          if (closed) return;
          await presenceChannel.presence.enter({});
        } catch (err) {
          swallowClosed(err);
        }
      })();
    }

    return () => {
      closed = true;
      client.close();
    };
  }, [sessionId, enterPresence]);

  // 1s ticker that ages out timestamps older than the rolling 60s window
  // and writes the up-to-date recent60s counts back into the snapshot. Only
  // mounts when the panel is visible (instructor-side); attendees skip the
  // realtime subscribe above, so there's nothing to age out for them.
  useEffect(() => {
    if (enterPresence) return;
    const id = window.setInterval(() => {
      const now = Date.now();
      const cutoff = now - REACTION_WINDOW_MS;
      const buf = reactionTimestampsRef.current;
      let anyChanged = false;
      for (const k of REACTION_KINDS) {
        const arr = buf[k];
        let drop = 0;
        while (drop < arr.length && arr[drop] < cutoff) drop++;
        if (drop > 0) {
          arr.splice(0, drop);
          anyChanged = true;
        }
      }
      if (!anyChanged) return;
      setSnapshot(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          reactions: {
            ...prev.reactions,
            too_fast:   { ...prev.reactions.too_fast,   recent60s: countWithinWindow(buf.too_fast,   now) },
            too_slow:   { ...prev.reactions.too_slow,   recent60s: countWithinWindow(buf.too_slow,   now) },
            understood: { ...prev.reactions.understood, recent60s: countWithinWindow(buf.understood, now) },
            not_clear:  { ...prev.reactions.not_clear,  recent60s: countWithinWindow(buf.not_clear,  now) },
          },
        };
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [enterPresence]);

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

  /**
   * Bulk visibility flip for every member question of a cluster. Wraps
   * `PATCH /clusters/:id/visibility`, optimistically marks the cluster and
   * all of its members in the local snapshot, reverts on failure. The Ably
   * `cluster.visibility_changed` echo will reconcile afterwards.
   */
  const setClusterVisibility = useCallback(
    async (
      clusterId: string,
      visibilityStatus: 'visible' | 'hidden',
    ): Promise<void> => {
      let previous: { cluster: LiveQuestionCluster; questions: LiveQuestion[] } | undefined;
      const nextStatus: QuestionStatus = visibilityStatus === 'visible' ? 'opened' : 'new';

      setSnapshot(prev => {
        if (!prev) return prev;
        const cluster = prev.clusters.find(c => c.clusterId === clusterId);
        if (!cluster) return prev;
        const memberSet = new Set(cluster.memberIds);
        previous = {
          cluster,
          questions: prev.questions.filter(q => memberSet.has(q.questionId)),
        };
        return {
          ...prev,
          clusters: prev.clusters.map(c =>
            c.clusterId === clusterId ? { ...c, visibilityStatus } : c,
          ),
          questions: prev.questions.map(q =>
            memberSet.has(q.questionId) ? { ...q, status: nextStatus } : q,
          ),
        };
      });

      try {
        const res = await apiClient.patch(
          API_ENDPOINTS.CLUSTER_VISIBILITY(clusterId),
          { visibilityStatus },
        );
        if (res.status !== 'success') {
          throw new Error(res.message || 'Failed to update cluster visibility');
        }
      } catch (err) {
        if (previous) {
          const restore = previous;
          const memberSet = new Set(restore.cluster.memberIds);
          const restoreById = new Map(restore.questions.map(q => [q.questionId, q]));
          setSnapshot(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              clusters: prev.clusters.map(c =>
                c.clusterId === clusterId ? restore.cluster : c,
              ),
              questions: prev.questions.map(q =>
                memberSet.has(q.questionId) ? (restoreById.get(q.questionId) ?? q) : q,
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
    setClusterVisibility,
    studentCount,
  };
}
