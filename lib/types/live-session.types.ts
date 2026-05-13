/**
 * Live-session domain types shared by the instructor and (future) student
 * portals. The shapes here mirror what the backend will eventually return —
 * UC-09 (View Real-Time Dashboard), UC-03/10 (Start/End Session), UC-04
 * (Join Live Session). See wodooh-docs/design.md §8 and backlog.md §Epic C–E.
 *
 * Privacy invariant (wodooh-docs/CLAUDE.md):
 *   - Students appear only as `authorAnonymousCourseID` (course-stable
 *     pseudonym, used for authored content) or `anonymousSessionId` (ephemeral
 *     per-session pseudonym, used for mute / presence).
 *   - These two IDs are unlinked on the client. Never co-render either with a
 *     real `studentNumber`.
 */

export type SessionStatus = "active" | "ended" | "scheduled";

export type ReactionKind = "too_fast" | "too_slow" | "understood" | "not_clear";

export type QuestionStatus = "new" | "opened" | "resolved";

export type MaterialFormat = "pptx" | "pdf" | "docx" | "xlsx";

/** Top-level metadata for a live session. */
export interface LiveSessionMeta {
  sessionId: string;
  courseCode: string;            // e.g. "CS-401"
  courseName: string;            // e.g. "Advanced Algorithms"
  sectionNumber: string;         // e.g. "02"
  scheduleLabel: string;         // e.g. "Mon · 13:00–14:30"
  joinCode: string;              // e.g. "K3-7F2A"
  startedAt: string;             // ISO
  status: SessionStatus;
  enrolledCount: number;
  joinedCount: number;
}

/** The instructor's lecture file backing the co-viewer. */
export interface SessionMaterial {
  fileId: string;
  filename: string;              // "lecture-09-master-theorem.pptx"
  format: MaterialFormat;
  sizeBytes: number;
  totalPages: number;
  uploadedAt: string;            // ISO
  /** Server-rendered page image URL, one per 1-based page. Optional in V1
   *  where the instructor page renders a placeholder slide locally. */
  pageImageUrls?: string[];
  /** Slim metadata per page so the thumbnail strip can mark hot pages. */
  pages?: SlideMeta[];
}

export interface SlideMeta {
  page: number;                  // 1-based
  hasQuestions?: boolean;        // any question with fromPage === page
}

/** Where the room is — relative to the instructor's current page. */
export interface FollowerDistribution {
  onCurrent: number;             // students viewing the instructor's page
  ahead: number;                 // students who navigated forward
  behind: number;                // students who navigated backward
  independent: number;           // students with "follow instructor" off
}

/** One anonymous question. Cluster heads carry `clusterSize > 1`. */
export interface LiveQuestion {
  questionId: string;
  /** Course-stable pseudonym. Never paired with a real student number. */
  authorAnonymousCourseID: string;
  text: string;
  postedAt: string;              // ISO
  fromPage: number;              // 1-based page the student was viewing
  status: QuestionStatus;
  clusterSize: number;           // 1 when not grouped; >1 for cluster heads
  openedAt?: string;
  resolvedAt?: string;
  resolvedByAuthor?: boolean;
}

/** Per-session ephemeral pseudonym muted by the instructor. */
export interface MutedParticipant {
  anonymousSessionId: string;    // e.g. "sess-x4f2"
  mutedAt: string;               // ISO
  reason?: string;
}

export interface ReactionTally {
  total: number;                 // cumulative since session start
  ratePerMin: number;            // rolling rate over `windowSeconds`
  trend: "up" | "down" | "flat";
}

export interface ReactionTallies {
  windowSeconds: number;         // typically 60
  too_fast: ReactionTally;
  too_slow: ReactionTally;
  understood: ReactionTally;
  not_clear: ReactionTally;
}

/** Server-side moderation knobs the instructor toggles during a session. */
export interface SessionControls {
  questionsPaused: boolean;      // pauses new student submissions
  profanityStrictness: "off" | "std" | "strict";
  sessionLocked: boolean;        // blocks new student joins
  broadcasting: boolean;         // page-change broadcast to followers
}

/** Snapshot the live page consumes — V1 ships this from a mock fixture. */
export interface LiveSessionSnapshot {
  meta: LiveSessionMeta;
  material: SessionMaterial;
  currentPage: number;           // instructor's current 1-based page
  followers: FollowerDistribution;
  reactions: ReactionTallies;
  questions: LiveQuestion[];
  muted: MutedParticipant[];
  controls: SessionControls;
}
