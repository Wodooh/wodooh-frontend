/**
 * Static fixture used by the instructor live-session page until the backend
 * (sessions + Ably realtime channel) is wired. Mirrors the shape in
 * `lib/types/live-session.types.ts` exactly so swapping to a real
 * `useLiveSession(sessionId)` hook later is a drop-in change.
 */

import type { LiveSessionSnapshot, SlideMeta } from "@/lib/types/live-session.types";

const TOTAL_PAGES = 47;
const CURRENT_PAGE = 12;

const pages: SlideMeta[] = Array.from({ length: TOTAL_PAGES }, (_, i) => ({
  page: i + 1,
  hasQuestions: [5, 7, 8, 9, 10, 11, 12].includes(i + 1),
}));

const startedAt = new Date(Date.now() - 42 * 60_000 - 18 * 1000).toISOString();

export const LIVE_SESSION_MOCK: LiveSessionSnapshot = {
  meta: {
    sessionId: "sess-k37f2a",
    courseCode: "CS-401",
    courseName: "Advanced Algorithms",
    sectionNumber: "02",
    scheduleLabel: "Mon · 13:00–14:30",
    joinCode: "K3-7F2A",
    startedAt,
    status: "active",
    joinedCount: 38,
  },
  material: {
    fileId: "file-lec09",
    filename: "lecture-09-master-theorem.pptx",
    format: "pptx",
    sizeBytes: 8_200_000,
    totalPages: TOTAL_PAGES,
    uploadedAt: new Date(Date.now() - 4 * 60 * 60_000).toISOString(),
    pages,
  },
  currentPage: CURRENT_PAGE,
  followers: {
    onCurrent: 34,
    ahead: 4,
    behind: 0,
    independent: 0,
  },
  reactions: {
    windowSeconds: 60,
    too_fast:   { total: 11,  recent60s: 0 },
    too_slow:   { total: 19,  recent60s: 1 },
    understood: { total: 142, recent60s: 4 },
    not_clear:  { total: 87,  recent60s: 7 },
  },
  questions: [
    {
      questionId: "q-7f3a",
      authorAnonymousCourseID: "anon-7f3a",
      text: "Can you walk through how the master theorem applies when f(n) sits exactly between the two cases? I keep getting different answers depending on how I split it.",
      postedAt: new Date(Date.now() - 22_000).toISOString(),
      fromPage: 12,
      status: "new",
      clusterSize: 12,
    },
    {
      questionId: "q-2c91",
      authorAnonymousCourseID: "anon-2c91",
      text: "Why does the partition step in randomized quickselect not need a separate base case for duplicate keys?",
      postedAt: new Date(Date.now() - 74_000).toISOString(),
      fromPage: 11,
      status: "opened",
      clusterSize: 1,
      openedAt: new Date(Date.now() - 38_000).toISOString(),
    },
    {
      questionId: "q-b033",
      authorAnonymousCourseID: "anon-b033",
      text: "I lost the connection between expected vs. amortized analysis — could you reframe that with a different example than the dynamic array?",
      postedAt: new Date(Date.now() - 167_000).toISOString(),
      fromPage: 9,
      status: "new",
      clusterSize: 4,
    },
    {
      questionId: "q-d8e2",
      authorAnonymousCourseID: "anon-d8e2",
      text: "Is the proof sketch for the median-of-medians selection going to be on the midterm?",
      postedAt: new Date(Date.now() - 242_000).toISOString(),
      fromPage: 7,
      status: "resolved",
      clusterSize: 1,
      resolvedAt: new Date(Date.now() - 60_000).toISOString(),
      resolvedByAuthor: true,
    },
    {
      questionId: "q-9a1f",
      authorAnonymousCourseID: "anon-9a1f",
      text: "What happens when k > n/2 in the deterministic selection algorithm — does the T(n) ≤ T(n/5) + T(7n/10) recurrence still hold?",
      postedAt: new Date(Date.now() - 372_000).toISOString(),
      fromPage: 10,
      status: "new",
      clusterSize: 1,
    },
    {
      questionId: "q-4e07",
      authorAnonymousCourseID: "anon-4e07",
      text: "Could you write the recurrence on the board again? I missed the constant in front of the n term.",
      postedAt: new Date(Date.now() - 518_000).toISOString(),
      fromPage: 8,
      status: "opened",
      clusterSize: 1,
      openedAt: new Date(Date.now() - 300_000).toISOString(),
    },
    {
      questionId: "q-5b71",
      authorAnonymousCourseID: "anon-5b71",
      text: "Sorry — is this the same algorithm as the one in §9.3 of the textbook?",
      postedAt: new Date(Date.now() - 662_000).toISOString(),
      fromPage: 5,
      status: "resolved",
      clusterSize: 1,
      resolvedAt: new Date(Date.now() - 120_000).toISOString(),
      resolvedByAuthor: true,
    },
  ],
  clusters: [],
  muted: [
    {
      anonymousSessionId: "sess-x4f2",
      mutedAt: new Date(Date.now() - 180_000).toISOString(),
      reason: "spamming reactions",
    },
    {
      anonymousSessionId: "sess-k8a9",
      mutedAt: new Date(Date.now() - 480_000).toISOString(),
      reason: "duplicate questions",
    },
  ],
  controls: {
    broadcasting: true,
  },
};
