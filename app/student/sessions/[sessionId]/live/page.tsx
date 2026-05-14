"use client";

/**
 * Student live-session participation surface.
 *
 * Covers user stories:
 *   - US-D1 / FR-11 — join an active session (entry assumes session is active)
 *   - US-D2 / FR-12 — submit anonymous text questions
 *   - US-D3 / FR-13 — submit "Too fast / Too slow / Understood / Not clear" reactions
 *   - US-C4 / FR-09 — view available section material (lecture file co-viewer)
 *
 * Privacy invariant: this page shows the student their own `anonymousCourseId`
 * (course-stable pseudonym used for authored questions) and their ephemeral
 * `anonymousSessionId` (used by the instructor's mute action). Real student
 * identity (name / studentNumber) is intentionally absent from the surface.
 *
 * Data: V1 reads the same mock fixture the instructor page uses so the two
 * surfaces feel like the same session. V2 will replace this with
 * `useLiveSession(sessionId)` over the backend + Ably channels.
 */

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AnonChip } from "@/components/live-session/anon-chip";
import { FileGlyph } from "@/components/live-session/file-glyph";
import { NxToggle } from "@/components/live-session/nx-toggle";
import { SlideStage } from "@/components/live-session/slide-stage";
import {
  ChevronLeft,
  ChevronRight,
  Close,
  Fullscreen,
  SkipBack,
  SkipForward,
  ZoomIn,
  ZoomOut,
} from "@/components/live-session/icons";

import { LIVE_SESSION_MOCK } from "@/lib/mock/live-session-mock";
import type {
  LiveQuestion,
  LiveSessionSnapshot,
  ReactionKind,
} from "@/lib/types/live-session.types";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────── */
/* Constants tied to the per-student session pseudonyms. In V2 the     */
/* backend hands these IDs back from `POST /sessions/:id/join`.        */
/* ─────────────────────────────────────────────────────────────────── */
const MY_ANON_COURSE_ID = "anon-9a1f";
const MY_ANON_SESSION_ID = "sess-9a1f";
const QUESTION_MAX_LEN = 500;

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

interface LocalReactionState {
  /** When the student last submitted each kind — for cooldown UI. */
  lastSubmittedAt: Partial<Record<ReactionKind, number>>;
  /** Counts of the student's own submissions, this session. */
  mine: Record<ReactionKind, number>;
}

export default function StudentLiveSessionPage({ params }: PageProps) {
  // Next.js 16: params is a Promise; `use()` unwraps it.
  const { sessionId } = use(params);
  const router = useRouter();

  // V1: hydrate from the same mock the instructor uses. V2: useLiveSession.
  const [snapshot, setSnapshot] = useState<LiveSessionSnapshot>(() => LIVE_SESSION_MOCK);

  // Mock guard: in real impl, snapshot would be loaded by sessionId and
  // return 404 / "session ended" if not active. Sanity-check the URL param.
  useEffect(() => {
    if (sessionId !== snapshot.meta.sessionId) {
      // No-op — useful seam for V2.
    }
  }, [sessionId, snapshot.meta.sessionId]);

  /* — Slide navigation: student can follow the instructor or roam ── */
  const [followInstructor, setFollowInstructor] = useState(true);
  const [studentPage, setStudentPage] = useState<number>(snapshot.currentPage);
  const [zoomPct, setZoomPct] = useState(100);

  // While "follow instructor" is on, keep the student page locked to the
  // instructor's `currentPage`. As soon as the student navigates manually,
  // we flip the toggle off so they don't get yanked back on the next tick.
  const effectivePage = followInstructor ? snapshot.currentPage : studentPage;
  const isBehindInstructor = !followInstructor && studentPage < snapshot.currentPage;
  const isAheadOfInstructor = !followInstructor && studentPage > snapshot.currentPage;

  const goToPage = (p: number) => {
    const clamped = Math.max(1, Math.min(snapshot.material.totalPages, p));
    setFollowInstructor(false);
    setStudentPage(clamped);
  };

  const catchUpToInstructor = () => {
    setStudentPage(snapshot.currentPage);
    setFollowInstructor(true);
  };

  /* — Elapsed timer (display only) ───────────────────────────────── */
  const [elapsedSec, setElapsedSec] = useState(() =>
    Math.floor((Date.now() - new Date(snapshot.meta.startedAt).getTime()) / 1000)
  );
  useEffect(() => {
    const id = window.setInterval(() => setElapsedSec(s => s + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  const elapsedFmt = useMemo(() => {
    const h = String(Math.floor(elapsedSec / 3600)).padStart(2, "0");
    const m = String(Math.floor((elapsedSec % 3600) / 60)).padStart(2, "0");
    const s = String(elapsedSec % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }, [elapsedSec]);

  /* — Simulated instructor advancement (every ~18s, while following) ─
   * V2: snapshot.currentPage is driven by Ably "sess.<id>.page". For the
   * mock we just nudge it forward periodically so the "follow" toggle has
   * visible effect. We stop at the last page.                            */
  useEffect(() => {
    const id = window.setInterval(() => {
      setSnapshot(prev => {
        if (prev.currentPage >= prev.material.totalPages) return prev;
        return { ...prev, currentPage: prev.currentPage + 1 };
      });
    }, 18_000);
    return () => window.clearInterval(id);
  }, []);

  /* — Reactions: send + local tally ───────────────────────────────── */
  const [reactState, setReactState] = useState<LocalReactionState>({
    lastSubmittedAt: {},
    mine: { too_fast: 0, too_slow: 0, understood: 0, not_clear: 0 },
  });
  const [pulseKind, setPulseKind] = useState<ReactionKind | null>(null);

  const REACTION_COOLDOWN_MS = 1500;

  const sendReaction = (kind: ReactionKind) => {
    const now = Date.now();
    const last = reactState.lastSubmittedAt[kind] ?? 0;
    if (now - last < REACTION_COOLDOWN_MS) return;

    // V2: POST /sessions/:id/reactions { kind }. Server publishes to
    // Ably channel "session:<id>:reactions", instructor sees aggregate.
    setReactState(prev => ({
      lastSubmittedAt: { ...prev.lastSubmittedAt, [kind]: now },
      mine: { ...prev.mine, [kind]: prev.mine[kind] + 1 },
    }));
    setSnapshot(prev => ({
      ...prev,
      reactions: {
        ...prev.reactions,
        [kind]: { ...prev.reactions[kind], total: prev.reactions[kind].total + 1 },
      },
    }));
    setPulseKind(kind);
    window.setTimeout(() => setPulseKind(null), 280);
  };

  /* — Anonymous question composer + submission ────────────────────── */
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showRecentSubmit, setShowRecentSubmit] = useState(false);

  const trimmed = draft.trim();
  const charsLeft = QUESTION_MAX_LEN - draft.length;
  const isMuted = snapshot.muted.some(m => m.anonymousSessionId === MY_ANON_SESSION_ID);
  const isPaused = snapshot.controls.questionsPaused;
  const canSubmit = trimmed.length > 0 && trimmed.length <= QUESTION_MAX_LEN && !isMuted && !isPaused && !submitting;

  const submitQuestion = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);

    // V2: POST /sessions/:id/questions { text } — server runs profanity
    // filter and mute check, persists, then publishes to Ably channel
    // "session:<id>:questions" so the instructor's stream lights up.
    try {
      // Optimistic insert into the local snapshot so the student sees
      // their question land in "My questions" immediately.
      const newQ: LiveQuestion = {
        questionId: `q-local-${Date.now()}`,
        authorAnonymousCourseID: MY_ANON_COURSE_ID,
        text: trimmed,
        postedAt: new Date().toISOString(),
        fromPage: effectivePage,
        status: "new",
        clusterSize: 1,
      };
      setSnapshot(prev => ({ ...prev, questions: [newQ, ...prev.questions] }));
      setDraft("");
      setShowRecentSubmit(true);
      window.setTimeout(() => setShowRecentSubmit(false), 2400);
    } catch {
      setSubmitError("Could not send your question. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  /* — Leave session ──────────────────────────────────────────────── */
  const [leaveOpen, setLeaveOpen] = useState(false);
  const confirmLeave = () => {
    setLeaveOpen(false);
    router.push("/student/sessions");
  };

  /* — Derived data ───────────────────────────────────────────────── */
  const myQuestions = useMemo(
    () => snapshot.questions.filter(q => q.authorAnonymousCourseID === MY_ANON_COURSE_ID),
    [snapshot.questions]
  );

  const { meta, material, reactions } = snapshot;

  return (
    <div className="nx-portal-accent">
      {/* Page head */}
      <div className="nx-page-head">
        <div>
          <h1 className="nx-page-title">Live session</h1>
          <p className="nx-page-sub">
            You are participating anonymously as{" "}
            <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{MY_ANON_COURSE_ID}</span>
            {" · "}your real name is never sent with your questions or reactions.
          </p>
        </div>
      </div>

      {/* Session header strip — student variant (no join code, leave button) */}
      <section className="nx-session-strip" aria-label="Session header">
        <div className="nx-session-id">
          <div className="nx-session-id-crumb">
            <span className="nx-live-dot">Live</span>
            <span>·</span>
            <span>Section {meta.sectionNumber}</span>
            <span>·</span>
            <span>{meta.scheduleLabel}</span>
          </div>
          <h2 className="nx-session-id-title">
            <span className="nx-mono">{meta.courseCode}</span> · {meta.courseName}
          </h2>
        </div>

        <div className="nx-session-meta">
          <div className="nx-meta-item">
            <span className="nx-meta-label">Elapsed</span>
            <span className="nx-meta-value">{elapsedFmt}</span>
          </div>
          <div className="nx-meta-item">
            <span className="nx-meta-label">In room</span>
            <span className="nx-meta-value">{meta.joinedCount}</span>
          </div>
          <div className="nx-meta-item">
            <span className="nx-meta-label">Your alias</span>
            <span className="nx-meta-value">{MY_ANON_COURSE_ID}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="nx-btn nx-btn-ghost nx-btn-danger"
            onClick={() => setLeaveOpen(true)}
          >
            <Close size={13} />
            Leave session
          </button>
        </div>
      </section>

      {/* Mute / pause banners — surface server-side moderation state */}
      {isMuted && (
        <div className="nx-student-banner is-warn" role="alert">
          <b>You have been muted in this session.</b> You can still view the slides
          and send reactions, but new questions are blocked until your instructor unmutes you.
        </div>
      )}
      {!isMuted && isPaused && (
        <div className="nx-student-banner" role="status">
          <b>Questions are paused.</b> Your instructor will reopen the question
          channel shortly — reactions still work.
        </div>
      )}

      {/* Main grid: viewer + right rail */}
      <section className="nx-live-grid">
        {/* ── Document viewer card ── */}
        <div className="nx-card nx-viewer-card" aria-label="Lecture document viewer">
          {/* Toolbar */}
          <div className="nx-doc-toolbar">
            <div className="nx-doc-file">
              <FileGlyph format={material.format} />
              <div className="nx-file-meta">
                <div className="nx-file-name">{material.filename}</div>
                <div className="nx-file-sub">
                  {formatBytes(material.sizeBytes)} · {material.totalPages} slides
                </div>
              </div>
            </div>

            <div className="nx-doc-pagenav">
              <button
                className="nx-icon-btn"
                onClick={() => goToPage(1)}
                disabled={effectivePage <= 1}
                title="First slide"
                aria-label="First slide"
              >
                <SkipBack size={13} />
              </button>
              <button
                className="nx-icon-btn"
                onClick={() => goToPage(effectivePage - 1)}
                disabled={effectivePage <= 1}
                title="Previous slide"
                aria-label="Previous slide"
              >
                <ChevronLeft size={13} />
              </button>
              <span className="nx-pg-input" aria-live="polite">
                <b>{effectivePage}</b> <span className="nx-pg-input-sep">/</span>{" "}
                <span style={{ color: "var(--nx-fg-muted)" }}>{material.totalPages}</span>
              </span>
              <button
                className="nx-icon-btn"
                onClick={() => goToPage(effectivePage + 1)}
                disabled={effectivePage >= material.totalPages}
                title="Next slide"
                aria-label="Next slide"
              >
                <ChevronRight size={13} />
              </button>
              <button
                className="nx-icon-btn"
                onClick={() => goToPage(material.totalPages)}
                disabled={effectivePage >= material.totalPages}
                title="Last slide"
                aria-label="Last slide"
              >
                <SkipForward size={13} />
              </button>
            </div>

            <div className="nx-doc-actions">
              <button
                className="nx-broadcast-pill"
                data-on={followInstructor ? "true" : "false"}
                title={
                  followInstructor
                    ? "You are following the instructor — click to roam independently"
                    : "Click to snap back to the instructor's slide"
                }
                onClick={() =>
                  followInstructor
                    ? setFollowInstructor(false)
                    : catchUpToInstructor()
                }
              >
                {followInstructor
                  ? `Following · slide ${snapshot.currentPage}`
                  : `Independent · catch up to ${snapshot.currentPage}`}
              </button>
              <div className="nx-zoom-cluster">
                <button
                  onClick={() => setZoomPct(z => Math.max(50, z - 10))}
                  title="Zoom out"
                  aria-label="Zoom out"
                >
                  <ZoomOut size={11} />
                </button>
                <span className="nx-zoom-val">{zoomPct}%</span>
                <button
                  onClick={() => setZoomPct(z => Math.min(200, z + 10))}
                  title="Zoom in"
                  aria-label="Zoom in"
                >
                  <ZoomIn size={11} />
                </button>
              </div>
              <button className="nx-icon-btn" title="Fullscreen" aria-label="Fullscreen">
                <Fullscreen size={13} />
              </button>
            </div>
          </div>

          {/* Slide stage — read-only view of the instructor's material */}
          <SlideStage
            material={material}
            page={effectivePage}
            onPrev={() => goToPage(effectivePage - 1)}
            onNext={() => goToPage(effectivePage + 1)}
          />

          {/* Where-am-I strip: position relative to the instructor */}
          <div className="nx-student-pos-strip" aria-label="Your position relative to the instructor">
            <div className="nx-student-pos-stat">
              <span className="nx-student-pos-num">{effectivePage}</span>
              <span className="nx-student-pos-lbl">Your slide</span>
            </div>
            <div className="nx-student-pos-stat">
              <span className="nx-student-pos-num">{snapshot.currentPage}</span>
              <span className="nx-student-pos-lbl">Instructor</span>
            </div>
            <div className="nx-student-pos-msg">
              {followInstructor && <span className="nx-pos-msg is-with">You are following the instructor.</span>}
              {isBehindInstructor && (
                <span className="nx-pos-msg is-behind">
                  You&rsquo;re {snapshot.currentPage - studentPage} slide(s) behind ·{" "}
                  <button className="nx-link-btn" onClick={catchUpToInstructor}>catch up</button>
                </span>
              )}
              {isAheadOfInstructor && (
                <span className="nx-pos-msg is-ahead">
                  You&rsquo;re {studentPage - snapshot.currentPage} slide(s) ahead ·{" "}
                  <button className="nx-link-btn" onClick={catchUpToInstructor}>jump back</button>
                </span>
              )}
            </div>
            <NxToggle
              on={followInstructor}
              onChange={v => (v ? catchUpToInstructor() : setFollowInstructor(false))}
              ariaLabel="Follow instructor"
            />
            <span className="nx-student-pos-toggle-lbl">Follow</span>
          </div>
        </div>

        {/* ── Right rail ── */}
        <aside style={{ display: "flex", flexDirection: "column", gap: "var(--nx-stack)" }} aria-label="Participation panel">
          {/* Reaction submitter */}
          <div className="nx-card nx-reactions-card" aria-label="Send reaction">
            <div className="nx-reactions-head">
              <span className="nx-reactions-eyebrow">
                <span className="nx-live-mini" aria-hidden /> Send a reaction
              </span>
              <span className="nx-reactions-meta">slide {effectivePage}</span>
            </div>
            <div className="nx-reactions-grid">
              {REACTION_BUTTONS.map(({ kind, label, hint }) => {
                const tally = reactions[kind];
                const mineCount = reactState.mine[kind];
                const last = reactState.lastSubmittedAt[kind] ?? 0;
                const onCooldown = Date.now() - last < REACTION_COOLDOWN_MS;
                const isPulse = pulseKind === kind;
                return (
                  <button
                    key={kind}
                    type="button"
                    className={cn(
                      "nx-react-tile nx-react-tile-btn",
                      isPulse && "is-incr",
                      onCooldown && "is-cooldown",
                    )}
                    data-kind={kind}
                    onClick={() => sendReaction(kind)}
                    disabled={onCooldown}
                    title={hint}
                    aria-label={`Send ${label} reaction`}
                  >
                    <div className="nx-react-tile-lbl-row">
                      <span className="nx-react-tile-dot" aria-hidden />
                      <span className="nx-react-tile-lbl">{label}</span>
                    </div>
                    <span className="nx-react-tile-val">{tally.total}</span>
                    <span className="nx-react-tile-delta">
                      {mineCount > 0 ? `You · ${mineCount}` : "Tap to send"}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="nx-react-foot">
              Reactions are aggregated anonymously. Your instructor sees totals, not who sent them.
            </div>
          </div>

          {/* Question composer */}
          <div className="nx-card" aria-label="Ask an anonymous question">
            <div className="nx-card-head">
              <div>
                <h3 className="nx-card-title">Ask anonymously</h3>
                <p className="nx-card-sub">
                  Tagged from slide {effectivePage} · only your alias is attached
                </p>
              </div>
              <AnonChip id={MY_ANON_COURSE_ID} />
            </div>

            <div className="nx-composer">
              <textarea
                className="nx-composer-textarea"
                placeholder={
                  isMuted
                    ? "You are muted in this session."
                    : isPaused
                    ? "Questions are paused — try a reaction instead."
                    : "Type your question… plain text, up to 500 chars."
                }
                value={draft}
                onChange={e => setDraft(e.target.value.slice(0, QUESTION_MAX_LEN))}
                disabled={isMuted || isPaused || submitting}
                rows={3}
                maxLength={QUESTION_MAX_LEN}
                onKeyDown={e => {
                  // ⌘/Ctrl + Enter submits.
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    submitQuestion();
                  }
                }}
              />
              <div className="nx-composer-foot">
                <span
                  className={cn(
                    "nx-composer-counter",
                    charsLeft < 50 && "is-warn",
                    charsLeft <= 0 && "is-err",
                  )}
                >
                  {charsLeft} characters left
                </span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {showRecentSubmit && (
                    <span className="nx-composer-status">
                      Sent — your instructor will see it in their stream.
                    </span>
                  )}
                  {submitError && (
                    <span className="nx-composer-status is-err">{submitError}</span>
                  )}
                  <button
                    className="nx-btn nx-btn-primary"
                    onClick={submitQuestion}
                    disabled={!canSubmit}
                    title="Send (⌘/Ctrl + Enter)"
                  >
                    {submitting ? "Sending…" : "Send anonymously"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* My questions list */}
          <div className="nx-card" aria-label="Your questions this session">
            <div className="nx-card-head">
              <div>
                <h3 className="nx-card-title">Your questions</h3>
                <p className="nx-card-sub">
                  Visible only to you here · the instructor sees them with your
                  alias only
                </p>
              </div>
              <span className="nx-filter-bar-count">{myQuestions.length} sent</span>
            </div>

            <div className="nx-stream-list" role="list">
              {myQuestions.length === 0 ? (
                <div className="nx-empty">
                  <div className="nx-empty-title">You haven&rsquo;t asked anything yet</div>
                  <div className="nx-empty-sub">
                    Send a question or use a reaction — the instructor sees the
                    room&rsquo;s pulse in real time.
                  </div>
                </div>
              ) : (
                myQuestions.map(q => <MyQuestionRow key={q.questionId} question={q} />)
              )}
            </div>
            <div className="nx-mine-foot">
              After the session ends you can mark each question{" "}
              <b>resolved</b> or <b>unresolved</b> on the review page.
            </div>
          </div>
        </aside>
      </section>

      {/* Leave-session confirmation */}
      {leaveOpen && (
        <LeaveSessionModal
          courseCode={meta.courseCode}
          onCancel={() => setLeaveOpen(false)}
          onConfirm={confirmLeave}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* Subcomponents                                                        */
/* ─────────────────────────────────────────────────────────────────── */

const REACTION_BUTTONS: { kind: ReactionKind; label: string; hint: string }[] = [
  { kind: "too_fast",   label: "Too fast",   hint: "Instructor is going faster than you can follow" },
  { kind: "too_slow",   label: "Too slow",   hint: "Pace feels slow — you&rsquo;re ready to move on" },
  { kind: "understood", label: "Understood", hint: "You&rsquo;re tracking the current point" },
  { kind: "not_clear",  label: "Not clear",  hint: "Something just lost you — instructor sees a spike" },
];

function MyQuestionRow({ question: q }: { question: LiveQuestion }) {
  return (
    <div
      className={cn(
        "nx-qrow",
        q.status === "opened" && "is-opened",
        q.status === "resolved" && "is-resolved",
      )}
      role="listitem"
    >
      <div className="nx-qrow-head">
        <span className="nx-slide-tag" title={`Tagged from slide ${q.fromPage}`}>
          ↳ slide {q.fromPage}
        </span>
        <MyStatusBadge status={q.status === "new" ? "new" : q.status === "opened" ? "opened" : "resolved"} />
        <span className="nx-qrow-meta" style={{ marginLeft: "auto" }}>
          {relativeTime(q.postedAt)}
        </span>
      </div>
      <p className="nx-qrow-text">{q.text}</p>
    </div>
  );
}

function MyStatusBadge({ status }: { status: "new" | "opened" | "resolved" }) {
  if (status === "new") {
    return (
      <span className="nx-badge nx-role-student">
        <span className="nx-badge-dot" />
        Sent · waiting
      </span>
    );
  }
  if (status === "opened") {
    return (
      <span className="nx-badge nx-role-admin">
        <span className="nx-badge-dot" />
        Opened by instructor
      </span>
    );
  }
  return (
    <span className="nx-badge nx-role-instructor">
      <span className="nx-badge-dot" />
      Resolved
    </span>
  );
}

interface LeaveSessionModalProps {
  courseCode: string;
  onCancel: () => void;
  onConfirm: () => void;
}

function LeaveSessionModal({ courseCode, onCancel, onConfirm }: LeaveSessionModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="nx-modal-backdrop" onClick={onCancel}>
      <div
        className="nx-modal"
        style={{ maxWidth: 460 }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="leave-modal-title"
      >
        <div className="nx-modal-head">
          <div
            style={{
              fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em",
              color: "var(--nx-fg-subtle)", fontWeight: 600,
            }}
          >
            {courseCode}
          </div>
          <h3 className="nx-modal-title" id="leave-modal-title">
            Leave this session?
          </h3>
          <p className="nx-card-sub" style={{ margin: "4px 0 0" }}>
            Your reactions and questions remain anonymously attached to the
            session. You can rejoin while it&rsquo;s still live.
          </p>
        </div>
        <div
          className="nx-modal-foot"
          style={{
            background: "var(--nx-bg-sub)",
            borderTop: "1px solid var(--nx-border)",
            padding: "12px 22px",
            display: "flex", justifyContent: "flex-end", gap: 8,
          }}
        >
          <button className="nx-btn nx-btn-ghost" onClick={onCancel}>
            Stay in session
          </button>
          <button className="nx-btn nx-btn-primary" onClick={onConfirm}>
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* Helpers                                                              */
/* ─────────────────────────────────────────────────────────────────── */

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let v = bytes / 1024, i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 10 ? 0 : 1)} ${units[i]}`;
}

function relativeTime(iso: string): string {
  const diff = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ${diff % 60 === 0 ? "" : `${diff % 60}s `}ago`.trim();
  return `${Math.floor(diff / 3600)}h ago`;
}
