"use client";

import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Check, Close } from "@/components/live-session/icons";

import {
  useReviewQuestions,
  type ReviewQuestion,
} from "@/lib/hooks/use-review-questions";

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

function formatDateTime(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function relativeTime(iso: string): string {
  const diff = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function StudentSessionReviewPage({ params }: PageProps) {
  const { sessionId } = use(params);
  const router = useRouter();

  const { questions, session, sessionLoading, isLoading, error, updateStatus } =
    useReviewQuestions(sessionId);

  const isLive = session?.status === "live";

  const counts = useMemo(() => {
    let resolved = 0;
    let open = 0;
    for (const q of questions) {
      if (q.postSessionStatus === "resolved") resolved++;
      else open++;
    }
    return { resolved, open, total: questions.length };
  }, [questions]);

  return (
    <div className="nx-portal-accent">
      <div className="nx-page-head">
        <div>
          <h1 className="nx-page-title">
            {session
              ? `${session.courseId.code} · ${session.courseId.name}`
              : "Session review"}
          </h1>
          <p className="nx-page-sub">
            {session ? (
              <>
                Section {session.sectionId?.sectionId ?? "—"}
                {" · "}
                {isLive
                  ? "Session is still live"
                  : `Session ended ${formatDateTime(session.endedAt)}`}
              </>
            ) : sessionLoading ? (
              "Loading…"
            ) : error ? (
              error
            ) : (
              "Session review"
            )}
          </p>
        </div>
      </div>

      {isLive && (
        <div className="nx-student-banner is-warn" role="alert">
          <b>This session is still live.</b> You can review your questions after it ends.
        </div>
      )}

      <section className="nx-review-banner" aria-label="Session summary">
        <div>
          <h2 className="nx-review-banner-title">
            {session
              ? `${session.courseId.code} · Section ${session.sectionId?.sectionId ?? "—"}`
              : "Your questions"}
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
            <span className="nx-review-summary-num">{counts.open}</span>
            <span className="nx-review-summary-lbl">Unresolved</span>
          </div>
        </div>
      </section>

      <div className="nx-card" aria-label="Your questions">
        <div className="nx-card-head">
          <div>
            <h3 className="nx-card-title">Your questions</h3>
            <p className="nx-card-sub">
              Mark each question resolved or unresolved based on whether your instructor&apos;s
              answer addressed it.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="nx-empty"><span className="nx-spin" /></div>
        ) : error ? (
          <div className="nx-empty">
            <div className="nx-empty-title">Couldn&apos;t load your questions</div>
            <div className="nx-empty-sub">{error}</div>
          </div>
        ) : questions.length === 0 ? (
          <div className="nx-empty">
            <div className="nx-empty-title">You didn&apos;t submit any questions in this session.</div>
          </div>
        ) : (
          <div role="list">
            {questions.map(q => (
              <ReviewQuestionRow
                key={q._id}
                question={q}
                disabled={sessionLoading || session == null || !!isLive}
                onChange={status => updateStatus(q._id, status)}
              />
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: "var(--nx-stack)",
          display: "flex", gap: 10, justifyContent: "flex-end", alignItems: "center",
        }}
      >
        <button className="nx-btn nx-btn-ghost" onClick={() => router.push("/student/sessions")}>
          Back to sessions
        </button>
      </div>
    </div>
  );
}

interface ReviewQuestionRowProps {
  question: ReviewQuestion;
  disabled: boolean;
  onChange: (status: "resolved" | "open") => Promise<void>;
}

function ReviewQuestionRow({ question, disabled, onChange }: ReviewQuestionRowProps) {
  const [pending, setPending] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  const apply = async (next: "resolved" | "open") => {
    if (disabled || pending || question.postSessionStatus === next) return;
    setPending(true);
    setRowError(null);
    try {
      await onChange(next);
    } catch (err) {
      setRowError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setPending(false);
    }
  };

  const instructorBadge =
    question.visibilityStatus === "hidden" ? (
      <span className="nx-badge nx-role-student">
        <span className="nx-badge-dot" />
        Hidden by instructor
      </span>
    ) : (
      <span className="nx-badge nx-role-admin">
        <span className="nx-badge-dot" />
        Opened during session
      </span>
    );

  const isResolved = question.postSessionStatus === "resolved";

  return (
    <div className="nx-review-q" role="listitem">
      <div className="nx-review-q-head">
        {instructorBadge}
        <span className="nx-qrow-meta" style={{ marginLeft: "auto" }}>
          {relativeTime(question.createdAt)}
        </span>
      </div>

      <p className="nx-review-q-text">{question.content}</p>

      <div className="nx-review-q-actions">
        <div
          className="nx-review-resolve-group"
          role="radiogroup"
          aria-label="Mark question resolved or unresolved"
        >
          <button
            type="button"
            data-active={isResolved ? "resolved" : undefined}
            aria-pressed={isResolved}
            disabled={disabled || pending}
            onClick={() => apply("resolved")}
          >
            <Check size={12} /> Resolved
          </button>
          <button
            type="button"
            data-active={!isResolved ? "unresolved" : undefined}
            aria-pressed={!isResolved}
            disabled={disabled || pending}
            onClick={() => apply("open")}
          >
            <Close size={12} /> Unresolved
          </button>
        </div>
        {rowError && (
          <span className="nx-qrow-meta" style={{ color: "var(--nx-danger)", marginLeft: 8 }}>
            {rowError}
          </span>
        )}
      </div>
    </div>
  );
}
