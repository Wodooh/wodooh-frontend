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
 * Privacy invariant: shows the student their own `anonymousCourseId` and the
 * ephemeral `anonymousSessionId`. Real student identity is never on-screen.
 *
 * Layout: renders inside `LiveSessionFrame` (shared with the instructor page).
 * The role shell is short-circuited on /live routes; this page owns the
 * entire viewport.
 */

import { use, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { AnonChip } from "@/components/live-session/anon-chip";
import { FileGlyph } from "@/components/live-session/file-glyph";
import { LiveSessionFrame } from "@/components/live-session/live-session-frame";
import { SlideStage } from "@/components/live-session/slide-stage";
import {
  ChevronLeft,
  ChevronRight,
  Close,
  FileX,
  SkipBack,
  SkipForward,
} from "@/components/live-session/icons";

import apiClient from "@/lib/api/client";
import API_ENDPOINTS from "@/lib/api/endpoints";
import { useLiveSession } from "@/lib/hooks/use-live-session";
import { useSessionMaterials } from "@/lib/hooks/use-session-materials";
import type {
  LiveQuestion,
  LiveSessionSnapshot,
  ReactionKind,
  SessionMaterial,
} from "@/lib/types/live-session.types";
import { cn } from "@/lib/utils";

const QUESTION_MAX_LEN = 500;

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

interface LocalReactionState {
  lastSubmittedAt: Partial<Record<ReactionKind, number>>;
}

export default function StudentLiveSessionPage({ params }: PageProps) {
  const { sessionId } = use(params);
  const router = useRouter();

  const {
    snapshot: liveSnapshot,
    ended,
    loading,
    error,
    prependQuestion,
    studentCount,
  } = useLiveSession(sessionId, true);

  const { materials: sessionMaterials, getSignedUrl } = useSessionMaterials(sessionId);
  const [activeMaterial, setActiveMaterial] = useState<SessionMaterial | null>(null);
  const [pdfSignedUrl, setPdfSignedUrl]     = useState<string | null>(null);
  const [pdfPageCount, setPdfPageCount]     = useState(0);

  useEffect(() => {
    if (sessionMaterials.length > 0 && !activeMaterial) {
      const first = sessionMaterials[0];
      setActiveMaterial(first);
      if (first._id) {
        getSignedUrl(first._id).then(setPdfSignedUrl).catch(() => { /* non-fatal */ });
      }
    }
  }, [sessionMaterials, activeMaterial, getSignedUrl]);

  useEffect(() => {
    if (!activeMaterial || !activeMaterial._id) return;
    const REFRESH_MS = 50 * 60 * 1000;
    const materialId = activeMaterial._id;
    const id = setInterval(() => {
      getSignedUrl(materialId).then(setPdfSignedUrl).catch(() => { /* non-fatal */ });
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [activeMaterial, getSignedUrl]);

  const [snapshot, setSnapshot] = useState<LiveSessionSnapshot | null>(null);
  useEffect(() => {
    setSnapshot(liveSnapshot);
  }, [liveSnapshot]);

  const [myAnonCourseId, setMyAnonCourseId] = useState<string | null>(null);
  const [myAnonSessionId, setMyAnonSessionId] = useState<string | null>(null);
  const joinAttemptedRef = useRef<string | null>(null);

  useEffect(() => {
    if (joinAttemptedRef.current === sessionId) return;
    joinAttemptedRef.current = sessionId;

    let cancelled = false;
    apiClient
      .post<{ participantId: string; anonymousSessionId: string; sessionId: string }>(
        API_ENDPOINTS.SESSION_JOIN(sessionId),
      )
      .then(res => {
        if (cancelled) return;
        if (res.status === "success" && res.data) {
          setMyAnonSessionId(res.data.anonymousSessionId);
        }
      })
      .catch(() => { /* non-fatal */ });
    return () => { cancelled = true; };
  }, [sessionId]);

  /* — Slide navigation: follow instructor or roam independently ── */
  const [followInstructor, setFollowInstructor] = useState(true);
  const [studentPage, setStudentPage] = useState<number>(1);

  const currentInstructorPage = snapshot?.currentPage ?? 1;
  const effectivePage = followInstructor ? currentInstructorPage : studentPage;
  const isBehindInstructor = !followInstructor && studentPage < currentInstructorPage;
  const isAheadOfInstructor = !followInstructor && studentPage > currentInstructorPage;

  const goToPage = (p: number) => {
    if (!snapshot) return;
    const mat = activeMaterial ?? snapshot.material;
    const maxPage = pdfPageCount || mat.totalPages || 1;
    const clamped = Math.max(1, Math.min(maxPage, p));
    setFollowInstructor(false);
    setStudentPage(clamped);
  };

  const catchUpToInstructor = () => {
    if (!snapshot) return;
    setStudentPage(snapshot.currentPage);
    setFollowInstructor(true);
  };

  /* — Elapsed timer (display only) ───────────────────────────────── */
  const [elapsedSec, setElapsedSec] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setElapsedSec(s => s + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    if (!liveSnapshot?.meta.startedAt) return;
    setElapsedSec(Math.floor((Date.now() - new Date(liveSnapshot.meta.startedAt).getTime()) / 1000));
  }, [liveSnapshot?.meta.startedAt]);
  const elapsedFmt = useMemo(() => {
    const h = String(Math.floor(elapsedSec / 3600)).padStart(2, "0");
    const m = String(Math.floor((elapsedSec % 3600) / 60)).padStart(2, "0");
    const s = String(elapsedSec % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }, [elapsedSec]);

  /* — Reactions: send + per-slide cooldown + "Sent ✓" confirmation ── */
  const REACTION_COOLDOWN_MS = 8000;
  const SENT_CONFIRM_MS = 1000;

  const [reactState, setReactState] = useState<LocalReactionState>({ lastSubmittedAt: {} });
  const [sentKinds, setSentKinds] = useState<Set<ReactionKind>>(new Set());

  useEffect(() => {
    setReactState({ lastSubmittedAt: {} });
    setSentKinds(new Set());
  }, [effectivePage]);

  const sendReaction = (kind: ReactionKind) => {
    if (reactState.lastSubmittedAt[kind]) return;

    const now = Date.now();
    setReactState(prev => ({
      lastSubmittedAt: { ...prev.lastSubmittedAt, [kind]: now },
    }));
    setSentKinds(prev => new Set(prev).add(kind));

    window.setTimeout(() => {
      setSentKinds(prev => {
        if (!prev.has(kind)) return prev;
        const next = new Set(prev);
        next.delete(kind);
        return next;
      });
    }, SENT_CONFIRM_MS);

    window.setTimeout(() => {
      setReactState(prev => {
        if (!prev.lastSubmittedAt[kind]) return prev;
        const nextLast = { ...prev.lastSubmittedAt };
        delete nextLast[kind];
        return { lastSubmittedAt: nextLast };
      });
    }, REACTION_COOLDOWN_MS);

    void apiClient
      .post(API_ENDPOINTS.SESSION_REACTIONS(sessionId), {
        type: kind,
        slidePage: effectivePage,
      })
      .catch(() => { /* non-fatal — backend dedup is the source of truth */ });
  };

  /* — Anonymous question composer + submission ────────────────────── */
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showRecentSubmit, setShowRecentSubmit] = useState(false);

  const trimmed = draft.trim();
  const charsLeft = QUESTION_MAX_LEN - draft.length;
  const isMuted = false;
  const canSubmit = trimmed.length > 0 && trimmed.length <= QUESTION_MAX_LEN && !isMuted && !submitting;

  const submitQuestion = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await apiClient.post<{
        _id: string;
        sessionId: string;
        content: string;
        authorAnonymousCourseId: string;
        visibilityStatus: "visible" | "hidden";
        postSessionStatus: "open" | "resolved" | "archived";
        createdAt: string;
      }>(API_ENDPOINTS.QUESTIONS, { sessionId, content: trimmed, fromPage: effectivePage });

      if (res.status !== "success" || !res.data) {
        throw new Error(res.message || "Failed to submit question");
      }

      const q = res.data;
      const mapped: LiveQuestion = {
        questionId: q._id,
        authorAnonymousCourseID: q.authorAnonymousCourseId,
        text: q.content,
        postedAt: q.createdAt,
        fromPage: 1,
        status:
          q.postSessionStatus === "resolved"
            ? "resolved"
            : q.visibilityStatus === "visible"
            ? "opened"
            : "new",
        clusterSize: 1,
      };
      prependQuestion(mapped);
      setMyAnonCourseId(q.authorAnonymousCourseId);
      setDraft("");
      setShowRecentSubmit(true);
      window.setTimeout(() => setShowRecentSubmit(false), 2400);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit question");
    } finally {
      setSubmitting(false);
    }
  };

  /* — Auto-bounce to review when the instructor ends the session ──── */
  useEffect(() => {
    if (!ended) return;
    router.replace(`/student/sessions/${sessionId}/review`);
  }, [ended, sessionId, router]);

  /* — Leave session ──────────────────────────────────────────────── */
  const [leaveOpen, setLeaveOpen] = useState(false);
  const confirmLeave = () => {
    setLeaveOpen(false);
    void apiClient
      .post(API_ENDPOINTS.SESSION_LEAVE(sessionId))
      .catch(() => { /* non-fatal */ });
    router.push("/student/sessions");
  };

  /* — Derived data ───────────────────────────────────────────────── */
  const myQuestions = useMemo(
    () =>
      myAnonCourseId
        ? (snapshot?.questions ?? []).filter(q => q.authorAnonymousCourseID === myAnonCourseId)
        : [],
    [snapshot?.questions, myAnonCourseId],
  );

  if (loading) {
    return (
      <div className="nx-loading">
        <span className="nx-spin" /> Loading session…
      </div>
    );
  }
  if (error) {
    return (
      <div className="nx-empty">
        <div className="nx-empty-title">Couldn&apos;t load session</div>
        <div className="nx-empty-sub">{error}</div>
      </div>
    );
  }
  if (!snapshot) return null;

  const { meta, controls } = snapshot;
  const material = activeMaterial ?? snapshot.material;
  const effectiveTotalPages = pdfPageCount || material.totalPages || 1;
  const followLabel = followInstructor
    ? `Following · slide ${snapshot.currentPage}`
    : isBehindInstructor
    ? `Behind by ${snapshot.currentPage - studentPage} · catch up`
    : isAheadOfInstructor
    ? `Ahead by ${studentPage - snapshot.currentPage} · jump back`
    : "Independent";

  const banner = (ended || isMuted) ? (
    <>
      {ended && (
        <div className="nx-student-banner is-warn" role="alert">
          <b>This session has ended.</b>
        </div>
      )}
      {isMuted && (
        <div className="nx-student-banner is-warn" role="alert">
          <b>You have been muted in this session.</b> You can still view the slides
          and send reactions, but new questions are blocked until your instructor unmutes you.
        </div>
      )}
    </>
  ) : undefined;

  return (
    <>
      <LiveSessionFrame
        banner={banner}
        topBar={
          <>
            <div className="nx-lsf-topbar-left">
              <span className="nx-lsf-live-pill">Live</span>
              <span className="nx-lsf-course">
                <span className="nx-mono">{meta.courseCode}</span>
                {" · Section "}{meta.sectionNumber}
                {" · "}{meta.courseName}
              </span>
            </div>
            <div className="nx-lsf-topbar-right">
              <span className="nx-lsf-meta" title="Elapsed">
                <ClockIcon /> {elapsedFmt}
              </span>
              <span className="nx-lsf-meta" title="Students joined">
                <PersonIcon /> {studentCount}
              </span>
              <span
                className="nx-lsf-meta"
                title="Your anonymous alias for this session"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {myAnonSessionId ?? myAnonCourseId ?? "—"}
              </span>
              <button
                className="nx-btn nx-btn-ghost nx-btn-danger"
                onClick={() => setLeaveOpen(true)}
              >
                <Close size={13} />
                Leave session
              </button>
            </div>
          </>
        }
        slide={
          !activeMaterial ? (
            <div className="nx-lsf-slide-empty">
              <FileX size={36} />
              <p className="nx-lsf-slide-empty-title">No slides yet</p>
              <p className="nx-lsf-slide-empty-sub">
                The instructor hasn&apos;t uploaded materials for this session.
              </p>
            </div>
          ) : (
            <>
              <DeckPositionHairline
                studentPage={effectivePage}
                instructorPage={currentInstructorPage}
                totalPages={effectiveTotalPages}
              />
              <SlideStage
                material={material}
                page={effectivePage}
                pdfUrl={pdfSignedUrl ?? undefined}
                onPrev={() => goToPage(effectivePage - 1)}
                onNext={() => goToPage(effectivePage + 1)}
                onPdfLoad={setPdfPageCount}
              />
            </>
          )
        }
        bottomStrip={
          <>
            <div className="nx-lsf-bottom-left">
              {activeMaterial && (
                <span className="nx-lsf-bottom-filename" title={material.filename}>
                  <FileGlyph format={material.format} />
                  <span>{material.filename}</span>
                  <span className="nx-lsf-bottom-filename-sub">
                    · {effectiveTotalPages} slides
                  </span>
                </span>
              )}
            </div>

            <div className="nx-lsf-bottom-center">
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
              <span
                className="nx-lsf-pageind"
                aria-live="polite"
                aria-label={`Slide ${effectivePage} of ${effectiveTotalPages}`}
                style={{ cursor: "default" }}
              >
                <b>{effectivePage}</b>
                <span className="nx-lsf-pageind-sep">/</span>
                <span className="nx-lsf-pageind-total">{effectiveTotalPages}</span>
              </span>
              <button
                className="nx-icon-btn"
                onClick={() => goToPage(effectivePage + 1)}
                disabled={effectivePage >= effectiveTotalPages}
                title="Next slide"
                aria-label="Next slide"
              >
                <ChevronRight size={13} />
              </button>
              <button
                className="nx-icon-btn"
                onClick={() => goToPage(effectiveTotalPages)}
                disabled={effectivePage >= effectiveTotalPages}
                title="Last slide"
                aria-label="Last slide"
              >
                <SkipForward size={13} />
              </button>
            </div>

            <div className="nx-lsf-bottom-right">
              <span
                className="nx-lsf-broadcast-state"
                data-on={controls.broadcasting ? "true" : "false"}
                title={
                  controls.broadcasting
                    ? "Instructor is broadcasting page changes"
                    : "Instructor has paused broadcasting"
                }
              >
                {controls.broadcasting ? "Broadcasting" : "Broadcast paused"}
              </span>
              <button
                type="button"
                className="nx-broadcast-pill"
                data-on={followInstructor ? "true" : "false"}
                onClick={() =>
                  followInstructor
                    ? setFollowInstructor(false)
                    : catchUpToInstructor()
                }
                title={
                  followInstructor
                    ? "You are following the instructor — click to roam independently"
                    : "Click to catch up to the instructor's slide"
                }
              >
                {followLabel}
              </button>
            </div>
          </>
        }
        rail={
          <>
            <div className="nx-card" aria-label="Ask an anonymous question">
              <div className="nx-card-head">
                <div>
                  <h3 className="nx-card-title">Ask anonymously</h3>
                  <p className="nx-card-sub">
                    Tagged from slide {effectivePage} · only your alias is attached
                  </p>
                </div>
                <AnonChip id={myAnonCourseId ?? "—"} />
              </div>

              <div className="nx-composer">
                <textarea
                  id="question-composer"
                  name="question"
                  className="nx-composer-textarea"
                  placeholder={
                    isMuted
                      ? "You are muted in this session."
                      : "Type your question… plain text, up to 500 chars."
                  }
                  value={draft}
                  onChange={e => setDraft(e.target.value.slice(0, QUESTION_MAX_LEN))}
                  disabled={isMuted || submitting}
                  rows={3}
                  maxLength={QUESTION_MAX_LEN}
                  onKeyDown={e => {
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

            <div className="nx-card" aria-label="React to the lecture">
              <div className="nx-reactions-row" style={{ borderTop: "none" }}>
                {REACTION_BUTTONS.map(({ kind, label, hint }) => {
                  const isCooling = !!reactState.lastSubmittedAt[kind];
                  const isSent = sentKinds.has(kind);
                  return (
                    <button
                      key={kind}
                      type="button"
                      className={cn(
                        "nx-react-btn",
                        `nx-react-btn--${kind.replace("_", "-")}`,
                        isCooling && "is-cooling",
                        isSent && "is-sent",
                      )}
                      disabled={isCooling && !isSent}
                      onClick={() => sendReaction(kind)}
                      aria-label={`${label} — ${hint.replace(/&rsquo;/g, "'")}`}
                      title={hint.replace(/&rsquo;/g, "'")}
                    >
                      <span className="nx-react-btn-label">{label}</span>
                      {isSent && (
                        <span className="nx-react-btn-sent" aria-live="polite">
                          Sent ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        }
      />

      {leaveOpen && (
        <LeaveSessionModal
          courseCode={meta.courseCode}
          onCancel={() => setLeaveOpen(false)}
          onConfirm={confirmLeave}
        />
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* Top-bar metas                                                        */
/* ─────────────────────────────────────────────────────────────────── */

function ClockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
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

/** Ambient overlay at the top of the slide area showing where the
 *  student is vs. where the instructor is across the whole deck. Replaces
 *  the old `.nx-student-pos-strip` bar — same signal, no carved-out row. */
function DeckPositionHairline({
  studentPage,
  instructorPage,
  totalPages,
}: {
  studentPage: number;
  instructorPage: number;
  totalPages: number;
}) {
  if (!totalPages || totalPages <= 1) return null;
  const pct = (p: number) =>
    Math.max(0, Math.min(100, ((p - 1) / (totalPages - 1)) * 100));
  const studentPct = pct(studentPage);
  const instructorPct = pct(instructorPage);
  const gapLeft = Math.min(studentPct, instructorPct);
  const gapRight = Math.max(studentPct, instructorPct);
  const gapWidth = gapRight - gapLeft;
  const aligned = Math.abs(studentPage - instructorPage) < 1;
  return (
    <div
      className="nx-lsf-deck-pos"
      aria-label={
        aligned
          ? `On the instructor's slide (${studentPage} of ${totalPages})`
          : `You are on slide ${studentPage}, instructor is on slide ${instructorPage}`
      }
    >
      {!aligned && (
        <span
          className="nx-lsf-deck-pos-gap"
          style={{ left: `${gapLeft}%`, width: `${gapWidth}%` }}
        />
      )}
      <span
        className="nx-lsf-deck-pos-mark"
        data-who="instructor"
        style={{ left: `${instructorPct}%` }}
        title={`Instructor: slide ${instructorPage} of ${totalPages}`}
      />
      <span
        className="nx-lsf-deck-pos-mark"
        data-who="student"
        style={{ left: `${studentPct}%` }}
        title={`You: slide ${studentPage} of ${totalPages}`}
      />
    </div>
  );
}

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

function relativeTime(iso: string): string {
  const diff = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ${diff % 60 === 0 ? "" : `${diff % 60}s `}ago`.trim();
  return `${Math.floor(diff / 3600)}h ago`;
}
