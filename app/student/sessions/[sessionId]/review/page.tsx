"use client";

/**
 * Student post-session review surface.
 *
 * Covers user stories:
 *   - US-D5 / FR-15 — student marks each of their own questions as
 *     "resolved" or "unresolved" after the session ends, so the instructor
 *     sees which topics still need follow-up in the Engagement Report.
 *
 * Reached via auto-redirect from `/student/sessions/[id]/live` when the
 * session transitions to `status: "ended"`, or via the "Active Sessions"
 * list once it shows the session as finished.
 *
 * Privacy invariant: this page only ever shows the student their *own*
 * questions (filtered by `authorAnonymousCourseID === MY_ANON_COURSE_ID`).
 * The instructor never sees this page; they receive the resolution state
 * aggregated into the post-session report.
 */

import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AnonChip } from "@/components/live-session/anon-chip";
import { Check, Close } from "@/components/live-session/icons";

import { LIVE_SESSION_MOCK } from "@/lib/mock/live-session-mock";
import type { LiveQuestion } from "@/lib/types/live-session.types";

const MY_ANON_COURSE_ID = "anon-9a1f";

/** Local post-session annotation. In V2 this is persisted via
 *  PATCH /sessions/:id/questions/:qid/post-status. */
type PostStatus = "resolved" | "unresolved" | null;

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default function StudentSessionReviewPage({ params }: PageProps) {
  const { sessionId } = use(params);
  const router = useRouter();

  // V1: read the same mock fixture and treat the session as ended.
  const snapshot = LIVE_SESSION_MOCK;

  // For the review screen, surface this student's authored questions plus
  // any question they posted during the live session. The mock includes
  // `anon-9a1f` as one of the contributors; we also fold in a synthesized
  // entry so a fresh demo run still has something to mark.
  const [myQuestions] = useState<LiveQuestion[]>(() => {
    const mine = snapshot.questions.filter(q => q.authorAnonymousCourseID === MY_ANON_COURSE_ID);
    if (mine.length > 0) return mine;
    return [
      {
        questionId: "q-demo-1",
        authorAnonymousCourseID: MY_ANON_COURSE_ID,
        text: "What happens when k > n/2 in the deterministic selection algorithm — does the recurrence still hold?",
        postedAt: new Date(Date.now() - 372_000).toISOString(),
        fromPage: 10,
        status: "new",
        clusterSize: 1,
      },
    ];
  });

  // Local annotations keyed by question id; defaults to null = pending.
  const [annotations, setAnnotations] = useState<Record<string, PostStatus>>(() =>
    Object.fromEntries(myQuestions.map(q => [q.questionId, null]))
  );

  const setStatus = (questionId: string, next: PostStatus) => {
    setAnnotations(prev => ({ ...prev, [questionId]: next }));
    // V2: fire-and-forget PATCH to backend; failures retry once.
  };

  const counts = useMemo(() => {
    let resolved = 0, unresolved = 0, pending = 0;
    for (const q of myQuestions) {
      const s = annotations[q.questionId];
      if (s === "resolved")   resolved++;
      else if (s === "unresolved") unresolved++;
      else                    pending++;
    }
    return { resolved, unresolved, pending, total: myQuestions.length };
  }, [annotations, myQuestions]);

  const allMarked = counts.pending === 0 && counts.total > 0;

  const finishReview = () => {
    // V2: POST /sessions/:id/review/complete (so report regenerates with the
    // student's resolutions). For V1 we just navigate back.
    router.push("/student/sessions");
  };

  return (
    <div className="nx-portal-accent">
      <div className="nx-page-head">
        <div>
          <h1 className="nx-page-title">Review your questions</h1>
          <p className="nx-page-sub">
            Session{" "}
            <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{sessionId}</span>{" "}
            has ended. Mark each of your questions <b>resolved</b> or <b>unresolved</b> so
            your instructor knows where you still need help.
          </p>
        </div>
      </div>

      {/* Session crumb + summary banner */}
      <section className="nx-review-banner" aria-label="Session summary">
        <div>
          <h2 className="nx-review-banner-title">
            {snapshot.meta.courseCode} · Section {snapshot.meta.sectionNumber} · {snapshot.meta.scheduleLabel}
          </h2>
          <p className="nx-review-banner-sub">
            You sent {counts.total} question{counts.total === 1 ? "" : "s"} during this session.
          </p>
        </div>

        <div className="nx-review-summary">
          <div className="nx-review-summary-stat">
            <span className="nx-review-summary-num">{counts.resolved}</span>
            <span className="nx-review-summary-lbl">Resolved</span>
          </div>
          <div className="nx-review-summary-stat">
            <span className="nx-review-summary-num">{counts.unresolved}</span>
            <span className="nx-review-summary-lbl">Unresolved</span>
          </div>
          <div className="nx-review-summary-stat">
            <span className="nx-review-summary-num">{counts.pending}</span>
            <span className="nx-review-summary-lbl">Pending</span>
          </div>
        </div>
      </section>

      {/* Question list with resolve/unresolve controls */}
      <div className="nx-card" aria-label="Your questions">
        <div className="nx-card-head">
          <div>
            <h3 className="nx-card-title">Your questions</h3>
            <p className="nx-card-sub">
              Posted anonymously as{" "}
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{MY_ANON_COURSE_ID}</span>
            </p>
          </div>
          <AnonChip id={MY_ANON_COURSE_ID} />
        </div>

        {myQuestions.length === 0 ? (
          <div className="nx-empty">
            <div className="nx-empty-title">You didn&rsquo;t ask anything this session</div>
            <div className="nx-empty-sub">
              Nothing to review — you can head back to your sessions list.
            </div>
          </div>
        ) : (
          <div role="list">
            {myQuestions.map(q => {
              const annotation = annotations[q.questionId];
              return (
                <div key={q.questionId} className="nx-review-q" role="listitem">
                  <div className="nx-review-q-head">
                    <span className="nx-slide-tag" title={`Tagged from slide ${q.fromPage}`}>
                      ↳ slide {q.fromPage}
                    </span>
                    <ReviewBadge annotation={annotation} originalStatus={q.status} />
                    <span className="nx-qrow-meta" style={{ marginLeft: "auto" }}>
                      {relativeTime(q.postedAt)}
                    </span>
                  </div>

                  <p className="nx-review-q-text">{q.text}</p>

                  <div className="nx-review-q-actions">
                    <div
                      className="nx-review-resolve-group"
                      role="radiogroup"
                      aria-label={`Mark question ${q.questionId} resolved or unresolved`}
                    >
                      <button
                        type="button"
                        data-active={annotation === "resolved" ? "resolved" : undefined}
                        onClick={() => setStatus(q.questionId, annotation === "resolved" ? null : "resolved")}
                        aria-pressed={annotation === "resolved"}
                      >
                        <Check size={12} /> Resolved
                      </button>
                      <button
                        type="button"
                        data-active={annotation === "unresolved" ? "unresolved" : undefined}
                        onClick={() => setStatus(q.questionId, annotation === "unresolved" ? null : "unresolved")}
                        aria-pressed={annotation === "unresolved"}
                      >
                        <Close size={12} /> Still unclear
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Finish bar */}
      <div
        style={{
          marginTop: "var(--nx-stack)",
          display: "flex", gap: 10, justifyContent: "flex-end", alignItems: "center",
        }}
      >
        <span style={{ fontSize: 12, color: "var(--nx-fg-muted)" }}>
          {allMarked
            ? "All questions marked — you can submit your review."
            : counts.total === 0
            ? "Nothing to mark."
            : `${counts.pending} question${counts.pending === 1 ? "" : "s"} still pending.`}
        </span>
        <button className="nx-btn nx-btn-ghost" onClick={() => router.push("/student/sessions")}>
          Skip for now
        </button>
        <button
          className="nx-btn nx-btn-primary"
          onClick={finishReview}
          disabled={counts.total > 0 && !allMarked}
        >
          Finish review
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* Helpers                                                              */
/* ─────────────────────────────────────────────────────────────────── */

function ReviewBadge({
  annotation, originalStatus,
}: { annotation: PostStatus; originalStatus: LiveQuestion["status"] }) {
  if (annotation === "resolved") {
    return (
      <span className="nx-badge nx-role-instructor">
        <span className="nx-badge-dot" />
        Marked resolved
      </span>
    );
  }
  if (annotation === "unresolved") {
    return (
      <span className="nx-badge nx-role-chairman">
        <span className="nx-badge-dot" />
        Still unclear
      </span>
    );
  }
  // Pending: lean on the live-session status so the student remembers
  // whether the instructor at least opened it during the session.
  if (originalStatus === "opened") {
    return (
      <span className="nx-badge nx-role-admin">
        <span className="nx-badge-dot" />
        Opened during session · pending your mark
      </span>
    );
  }
  return (
    <span className="nx-badge nx-role-student">
      <span className="nx-badge-dot" />
      Pending your mark
    </span>
  );
}

function relativeTime(iso: string): string {
  const diff = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
