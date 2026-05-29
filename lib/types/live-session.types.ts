/**
 * Live-session domain types shared by the instructor and (future) student
 * portals. The shapes here mirror what the backend will eventually return —
 * UC-09 (View Real-Time Dashboard), UC-03/10 (Start/End Session), UC-04
 * (Join Live Session). See wodooh-docs/design.md §8 and backlog.md §Epic C–E.
 *
 * Privacy invariant (wodooh-docs/CLAUDE.md):
 *   - Students appear only as `authorAnonymousCourseID` (course-stable
 *     pseudonym, used for authored content), `anonymousSessionId` (ephemeral
 *     per-session pseudonym, used for presence), or `participantId` (the stable
 *     per-session participant-doc id used to mute/unmute — FR-10).
 *   - These ids are unlinked on the client. Never co-render any of them with a
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
  joinedCount: number;
}

/** The instructor's lecture file backing the co-viewer. */
export interface SessionMaterial {
  _id?: string;                  // MongoDB document ID (present when from API)
  fileId: string;
  filename: string;              // "lecture-09-master-theorem.pptx"
  originalName?: string;         // raw upload filename
  format: MaterialFormat;
  sizeBytes: number;
  totalPages: number;
  uploadedAt: string;            // ISO
  /** Signed URL fetched from the backend on demand (not stored in DB). */
  signedUrl?: string;
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
  /**
   * The author's per-session participant id (`participants._id`) — a stable,
   * anonymous, session-scoped handle the instructor uses to mute/unmute the
   * author (FR-10). Absent on questions posted before joining and on
   * pre-FR-10 rows. Never linkable to a real student on the client.
   */
  participantId?: string;
  text: string;
  postedAt: string;              // ISO
  fromPage: number;              // 1-based page the student was viewing
  status: QuestionStatus;
  clusterSize: number;           // 1 when not grouped; >1 for cluster heads
  /** The cluster this question belongs to. Always present after the backend
   *  assigns one in submitQuestion; optional only because pre-clustering
   *  question fixtures (mocks/tests) may lack it. */
  clusterId?: string;
  openedAt?: string;
  resolvedAt?: string;
  resolvedByAuthor?: boolean;
}

/**
 * A semantic grouping of questions in a session. The "comprehensive
 * question" (head text) is currently the longest member's content —
 * selection, not synthesis. Singletons are clusters of `size === 1`
 * and render without the pill or expand affordance.
 */
export interface LiveQuestionCluster {
  clusterId: string;
  /** The member question whose text is the head. */
  headQuestionId: string;
  /** Denormalized longest-member text. */
  headText: string;
  /** All member question ids; resolve text against snapshot.questions. */
  memberIds: string[];
  size: number;
  /** Mirrors "any member visible" — true once an instructor reveals the
   *  cluster via the bulk endpoint. Frozen against further joins thereafter. */
  visibilityStatus: "hidden" | "visible";
}

export interface ReactionTally {
  /** Cumulative since session start. */
  total: number;
  /** Count of distinct reactions of this type submitted in the rolling
   *  `windowSeconds` window. Replaces the previous `ratePerMin` (a derived
   *  value that was never actually computed — it shipped as 0.0 for the
   *  panel's entire lifetime). A raw 60s count is what a lecturer can
   *  glance at mid-class and act on. */
  recent60s: number;
}

export interface ReactionTallies {
  windowSeconds: number;         // typically 60
  too_fast: ReactionTally;
  too_slow: ReactionTally;
  understood: ReactionTally;
  not_clear: ReactionTally;
}

/** Snapshot the live page consumes — V1 ships this from a mock fixture. */
export interface LiveSessionSnapshot {
  meta: LiveSessionMeta;
  material: SessionMaterial;
  currentPage: number;           // instructor's current 1-based page
  followers: FollowerDistribution;
  reactions: ReactionTallies;
  /** Flat list of every question. Source of truth for individual text;
   *  the instructor dashboard reads clusters and resolves member text by
   *  questionId against this list. */
  questions: LiveQuestion[];
  /** Cluster index (instructor/admin view only — students get an empty array).
   *  Order is most-recently-modified first. */
  clusters: LiveQuestionCluster[];
  /** Participant ids (`participants._id`) currently muted by the instructor
   *  (FR-10). Populated for the instructor/admin view; students receive an
   *  empty list (they only learn their own mute state). Drives the per-question
   *  Mute/Unmute toggle. */
  mutedParticipantIds: string[];
}
