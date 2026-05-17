"use client";

/**
 * Instructor live-session command surface (UC-09 · View Real-Time Dashboard).
 *
 * Covers user stories:
 *   - US-C1 (start live session) — entry point assumes the session is active
 *   - US-C2 (end session + post-session summary)
 *   - US-C3 (upload materials) — the material here is the lecture file
 *   - US-C5 (mute student) — by ephemeral `anonymousSessionId`
 *   - US-D4 (open question), US-D6 (report abuse), US-D7 (real-time dashboard)
 *   - US-D8 (semantically grouped questions, cluster heads carry size)
 *   - US-E1 (post-session engagement report — rendered inside the End modal)
 *
 * The student live-session page will be a sibling under `/student/...` and
 * will reuse the shared atoms in `components/live-session/` (SlideStage,
 * ReactionsDisplay, AnonChip, FileGlyph, NxToggle, icons). Instructor-only
 * chrome (Broadcasting pill, Follower strip, moderation actions, End modal)
 * lives inline in this page and is NOT exported.
 *
 * Data: V1 reads a static fixture from `lib/mock/live-session-mock.ts`.
 * Realtime + REST will replace this with a `useLiveSession(sessionId)` hook
 * over Ably + the backend `/sessions/:id/...` endpoints in a follow-up.
 */

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AnonChip } from "@/components/live-session/anon-chip";
import { FileGlyph } from "@/components/live-session/file-glyph";
import { NxToggle } from "@/components/live-session/nx-toggle";
import { ReactionsDisplay } from "@/components/live-session/reactions-display";
import { SlideStage } from "@/components/live-session/slide-stage";
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Close,
  Cluster,
  Copy,
  Eye,
  Flag,
  Fullscreen,
  MuteIcon,
  PullUp,
  Search,
  SkipBack,
  SkipForward,
  StopSquare,
  Ungroup,
  ZoomIn,
  ZoomOut,
} from "@/components/live-session/icons";

import apiClient from "@/lib/api/client";
import API_ENDPOINTS from "@/lib/api/endpoints";
import { useLiveSession } from "@/lib/hooks/use-live-session";
import type {
  LiveQuestion,
  LiveSessionSnapshot,
  MutedParticipant,
  QuestionStatus,
  ReactionKind,
  SessionControls,
} from "@/lib/types/live-session.types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type QuestionFilter = "all" | "new" | "opened";
type ModerationTab = "muted" | "controls";

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default function InstructorLiveSessionPage({ params }: PageProps) {
  // Next.js 16 passes `params` as a Promise; `use()` unwraps it.
  const { sessionId } = use(params);
  const router = useRouter();

  // Hook owns the session, questions, and Ably realtime subscription.
  const {
    snapshot: liveSnapshot,
    connected,
    ended,
    loading,
    error,
    updateQuestion,
    prependQuestion,
  } = useLiveSession(sessionId);

  // Local mirror so the existing local-only mutators (setControls,
  // onMuteAuthor, onUnmute) can continue to operate on `controls` /
  // `muted` without backend wiring. Hook updates (initial fetch + Ably
  // events) flow into this mirror via the effect below. Local mutations
  // to `controls` / `muted` get overwritten on the next hook-driven sync
  // — those handlers need to be backend-wired in a follow-up.
  const [snapshot, setSnapshot] = useState<LiveSessionSnapshot | null>(null);
  useEffect(() => {
    setSnapshot(liveSnapshot);
  }, [liveSnapshot]);

  // Local UI state (would later flow through Ably to followers/server).
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [questionFilter, setQuestionFilter] = useState<QuestionFilter>("all");
  const [modTab, setModTab] = useState<ModerationTab>("muted");
  const [endModalOpen, setEndModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [zoomPct, setZoomPct] = useState(100);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [pulseKind, setPulseKind] = useState<ReactionKind | null>(null);

  /* — Elapsed timer ─────────────────────────────────────────────────── */
  useEffect(() => {
    const id = window.setInterval(() => setElapsedSec(s => s + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Hydrate elapsedSec from the real session start once the snapshot arrives.
  useEffect(() => {
    if (!liveSnapshot?.meta.startedAt) return;
    setElapsedSec(Math.floor((Date.now() - new Date(liveSnapshot.meta.startedAt).getTime()) / 1000));
  }, [liveSnapshot?.meta.startedAt]);

  /* — Derived helpers ─────────────────────────────────────────────── */

  const filteredQuestions = useMemo(() => {
    if (!snapshot) return [];
    if (questionFilter === "all") return snapshot.questions;
    if (questionFilter === "new") return snapshot.questions.filter(q => q.status === "new");
    return snapshot.questions.filter(q => q.status === "opened");
  }, [snapshot, questionFilter]);

  const counts = useMemo(() => ({
    all:      snapshot?.questions.length ?? 0,
    new:      snapshot?.questions.filter(q => q.status === "new").length ?? 0,
    opened:   snapshot?.questions.filter(q => q.status === "opened").length ?? 0,
    resolved: snapshot?.questions.filter(q => q.status === "resolved").length ?? 0,
  }), [snapshot]);

  const elapsedFmt = useMemo(() => {
    const h = String(Math.floor(elapsedSec / 3600)).padStart(2, "0");
    const m = String(Math.floor((elapsedSec % 3600) / 60)).padStart(2, "0");
    const s = String(elapsedSec % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }, [elapsedSec]);

  /* — Actions (local-only in V1; will dispatch to backend in V2) ───── */

  const setControls = (patch: Partial<SessionControls>) =>
    setSnapshot(prev => (prev ? { ...prev, controls: { ...prev.controls, ...patch } } : prev));

  const goToPage = (p: number) => {
    if (!snapshot) return;
    const clamped = Math.max(1, Math.min(snapshot.material.totalPages, p));
    setCurrentPage(clamped);
    // V2: if `controls.broadcasting`, publish to channel "sess.<id>.page".
  };

  const onOpen = (id: string) =>
    updateQuestion(id, { status: "opened", openedAt: new Date().toISOString() });
  const onResolve = (id: string) =>
    updateQuestion(id, { status: "resolved", resolvedAt: new Date().toISOString() });
  const onReopen = (id: string) =>
    updateQuestion(id, { status: "new", resolvedAt: undefined });
  const onUngroup = (id: string) => updateQuestion(id, { clusterSize: 1 });

  const onMuteAuthor = (q: LiveQuestion) => {
    // The mute uses the ephemeral `anonymousSessionId`, NOT the question's
    // `authorAnonymousCourseID` (privacy invariant). V2: server resolves
    // current session pseudonym from the question id. Here we synthesize
    // a believable `sess-` id from the question for the demo.
    if (!snapshot) return;
    const sessionPseudonym = `sess-${q.authorAnonymousCourseID.slice(-4)}`;
    if (snapshot.muted.some(m => m.anonymousSessionId === sessionPseudonym)) return;
    const next: MutedParticipant = {
      anonymousSessionId: sessionPseudonym,
      mutedAt: new Date().toISOString(),
      reason: "muted from question stream",
    };
    setSnapshot(prev => (prev ? { ...prev, muted: [next, ...prev.muted] } : prev));
  };

  const onUnmute = (id: string) =>
    setSnapshot(prev =>
      prev ? { ...prev, muted: prev.muted.filter(m => m.anonymousSessionId !== id) } : prev,
    );

  const onReport = (id: string) => {
    // V2: POST /sessions/:id/questions/:qid/report. For V1 just visually
    // mark the row by setting status to resolved (out-of-stream).
    updateQuestion(id, { status: "resolved", resolvedAt: new Date().toISOString() });
  };

  const onCopyJoinCode = async () => {
    if (!snapshot) return;
    try {
      await navigator.clipboard.writeText(snapshot.meta.joinCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard blocked — silent in V1 */ }
  };

  const onEndSession = async () => {
    setEndModalOpen(false);
    try {
      const res = await apiClient.patch(API_ENDPOINTS.SESSION_END(sessionId));
      if (res.status === "success") {
        router.push("/instructor/dashboard");
      } else {
        throw new Error(res.message || "Failed to end session");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to end session");
    }
  };

  /* ─────────────────────────────────────────────────────────────── */

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

  const { meta, material, reactions, muted, controls, questions } = snapshot;
  const followers = snapshot.followers;
  const followTotal = Math.max(1, followers.onCurrent + followers.ahead + followers.behind + followers.independent);
  const pct = (n: number) => `${(n / followTotal) * 100}%`;

  return (
    <div className="nx-portal-accent">
      {ended && (
        <div className="nx-student-banner is-warn" role="alert">
          <b>This session has ended.</b>
        </div>
      )}
      {/* Page head */}
      <div className="nx-page-head">
        <div>
          <h1 className="nx-page-title">Live session</h1>
          <p className="nx-page-sub">
            Real-time dashboard · students join anonymously and react to{" "}
            <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{material.filename}</span>
          </p>
        </div>
      </div>

      {/* Session header strip */}
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
            <span className="nx-meta-label">Joined</span>
            <span className="nx-meta-value">{meta.joinedCount}</span>
          </div>
          <div className="nx-meta-item">
            <span className="nx-meta-label">Join code</span>
            <span className="nx-join-code">
              <span>{meta.joinCode}</span>
              <button
                className="nx-join-code-copy"
                onClick={onCopyJoinCode}
                title={copied ? "Copied" : "Copy join code"}
                aria-label="Copy join code"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="nx-btn nx-btn-ghost nx-btn-danger"
            onClick={() => setEndModalOpen(true)}
          >
            <StopSquare size={13} />
            End session
          </button>
        </div>
      </section>

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
                disabled={currentPage <= 1}
                title="First slide"
                aria-label="First slide"
              >
                <SkipBack size={13} />
              </button>
              <button
                className="nx-icon-btn"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                title="Previous slide"
                aria-label="Previous slide"
              >
                <ChevronLeft size={13} />
              </button>
              <span className="nx-pg-input" aria-live="polite">
                <b>{currentPage}</b> <span className="nx-pg-input-sep">/</span>{" "}
                <span style={{ color: "var(--nx-fg-muted)" }}>{material.totalPages}</span>
              </span>
              <button
                className="nx-icon-btn"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= material.totalPages}
                title="Next slide"
                aria-label="Next slide"
              >
                <ChevronRight size={13} />
              </button>
              <button
                className="nx-icon-btn"
                onClick={() => goToPage(material.totalPages)}
                disabled={currentPage >= material.totalPages}
                title="Last slide"
                aria-label="Last slide"
              >
                <SkipForward size={13} />
              </button>
            </div>

            <div className="nx-doc-actions">
              <button
                className="nx-broadcast-pill"
                data-on={controls.broadcasting ? "true" : "false"}
                title={
                  controls.broadcasting
                    ? "Broadcasting page changes to followers — click to pause"
                    : "Broadcast paused — click to resume"
                }
                onClick={() => setControls({ broadcasting: !controls.broadcasting })}
              >
                {controls.broadcasting
                  ? `Broadcasting · ${followers.onCurrent} following`
                  : "Broadcast paused"}
              </button>
              <button
                className="nx-btn nx-btn-ghost"
                title="Force all students to your current slide (overrides follow=off)"
              >
                <PullUp size={12} />
                Pull all
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

          {/* Slide stage */}
          <SlideStage
            material={material}
            page={currentPage}
            onPrev={() => goToPage(currentPage - 1)}
            onNext={() => goToPage(currentPage + 1)}
          />

          {/* Follower distribution strip */}
          <div className="nx-follow-strip" aria-label="Follower distribution">
            <div className="nx-follow-stat" title="Students viewing this exact slide">
              <span className="nx-follow-stat-num">{followers.onCurrent}</span>
              <span className="nx-follow-stat-lbl">On your slide</span>
            </div>
            <div className="nx-follow-stat" title="Students who navigated ahead">
              <span className="nx-follow-stat-num">{followers.ahead}</span>
              <span className="nx-follow-stat-lbl">Ahead</span>
            </div>
            <div className="nx-follow-stat" title="Students who navigated back">
              <span className="nx-follow-stat-num">{followers.behind}</span>
              <span className="nx-follow-stat-lbl">Behind</span>
            </div>
            <div className="nx-follow-stat" title="Students with follow turned off">
              <span className="nx-follow-stat-num">{followers.independent}</span>
              <span className="nx-follow-stat-lbl">Independent</span>
            </div>

            <div className="nx-follow-bar" title={`Distribution of ${followTotal} joined students`}>
              <span className="nx-follow-bar-seg is-with"   style={{ width: pct(followers.onCurrent) }} />
              <span className="nx-follow-bar-seg is-ahead"  style={{ width: pct(followers.ahead) }} />
              <span className="nx-follow-bar-seg is-behind" style={{ width: pct(followers.behind) }} />
              <span className="nx-follow-bar-seg is-idle"   style={{ width: pct(followers.independent) }} />
            </div>

            <div className="nx-follow-legend">
              <span className="nx-follow-legend-item">
                <span className="nx-follow-legend-sw" style={{ background: "var(--accent)" }} /> With you
              </span>
              <span className="nx-follow-legend-item">
                <span className="nx-follow-legend-sw" style={{ background: "color-mix(in oklab, var(--nx-success) 80%, transparent)" }} /> Ahead
              </span>
              <span className="nx-follow-legend-item">
                <span className="nx-follow-legend-sw" style={{ background: "color-mix(in oklab, var(--nx-warning) 80%, transparent)" }} /> Behind
              </span>
            </div>
          </div>

          {/* Thumbnail strip */}
          <ThumbnailStrip
            totalPages={material.totalPages}
            currentPage={currentPage}
            hotPages={new Set((material.pages ?? []).filter(p => p.hasQuestions).map(p => p.page))}
            onPick={goToPage}
          />
        </div>

        {/* ── Right rail ── */}
        <aside style={{ display: "flex", flexDirection: "column", gap: "var(--nx-stack)" }} aria-label="Now panel">
          <ReactionsDisplay
            tallies={reactions}
            contextLabel={`slide ${currentPage} · last ${reactions.windowSeconds}s`}
            incrementedKind={pulseKind}
          />

          {/* Question stream */}
          <div className="nx-card" aria-label="Anonymous questions">
            <div className="nx-card-head">
              <div>
                <h3 className="nx-card-title">Anonymous questions</h3>
                <p className="nx-card-sub">Grouped by similarity · cosine ≥ 0.75</p>
              </div>
              <span className="nx-filter-bar-count">{counts.all} total · {counts.resolved} resolved</span>
            </div>

            <div className="nx-filter-bar">
              <div className="nx-input-wrap">
                <Search size={13} />
                <input className="nx-input" placeholder="Filter…" />
              </div>
              <div className="nx-tabs" role="tablist">
                <button
                  className="nx-tab"
                  data-active={questionFilter === "all"}
                  onClick={() => setQuestionFilter("all")}
                >
                  All <span className="nx-filter-bar-count">{counts.all}</span>
                </button>
                <button
                  className="nx-tab"
                  data-active={questionFilter === "new"}
                  onClick={() => setQuestionFilter("new")}
                >
                  New <span className="nx-filter-bar-count">{counts.new}</span>
                </button>
                <button
                  className="nx-tab"
                  data-active={questionFilter === "opened"}
                  onClick={() => setQuestionFilter("opened")}
                >
                  Opened <span className="nx-filter-bar-count">{counts.opened}</span>
                </button>
              </div>
            </div>

            <div className="nx-stream-list" role="list">
              {filteredQuestions.length === 0 ? (
                <div className="nx-empty">
                  <div className="nx-empty-title">No questions match</div>
                  <div className="nx-empty-sub">Adjust the filter to see other questions.</div>
                </div>
              ) : (
                filteredQuestions.map(q => (
                  <QuestionRow
                    key={q.questionId}
                    question={q}
                    onOpen={() => onOpen(q.questionId)}
                    onResolve={() => onResolve(q.questionId)}
                    onReopen={() => onReopen(q.questionId)}
                    onMute={() => onMuteAuthor(q)}
                    onReport={() => onReport(q.questionId)}
                    onUngroup={() => onUngroup(q.questionId)}
                    onJumpToSlide={() => goToPage(q.fromPage)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Moderation card */}
          <div className="nx-card" aria-label="Moderation">
            <div className="nx-mod-tabs" role="tablist">
              <button
                className="nx-mod-tab"
                data-active={modTab === "muted"}
                onClick={() => setModTab("muted")}
              >
                Muted <span className="nx-mod-tab-count">{muted.length}</span>
              </button>
              <button
                className="nx-mod-tab"
                data-active={modTab === "controls"}
                onClick={() => setModTab("controls")}
              >
                Controls
              </button>
            </div>

            {modTab === "muted" ? (
              muted.length === 0 ? (
                <div className="nx-empty">
                  <div className="nx-empty-title">No one is muted</div>
                  <div className="nx-empty-sub">Mute disruptive participants from the question stream.</div>
                </div>
              ) : (
                <div>
                  {muted.map(m => (
                    <div key={m.anonymousSessionId} className="nx-muted-row">
                      <AnonChip id={m.anonymousSessionId} />
                      <div className="nx-muted-row-meta">
                        <b>{m.reason ?? "muted"}</b>
                        <span>{relativeTime(m.mutedAt)}</span>
                      </div>
                      <button
                        className="nx-btn nx-btn-ghost"
                        onClick={() => onUnmute(m.anonymousSessionId)}
                      >
                        Unmute
                      </button>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div>
                <div className="nx-qc-row">
                  <div className="nx-qc-row-label">
                    <b>Pause new questions</b>
                    <span>Students see &ldquo;instructor catching up&rdquo;</span>
                  </div>
                  <NxToggle
                    on={controls.questionsPaused}
                    onChange={v => setControls({ questionsPaused: v })}
                    ariaLabel="Pause new questions"
                  />
                </div>
                <div className="nx-qc-row">
                  <div className="nx-qc-row-label">
                    <b>Profanity filter</b>
                    <span>EN + AR · server-side</span>
                  </div>
                  <div className="nx-segmented-inline" role="radiogroup" aria-label="Profanity strictness">
                    {(["off", "std", "strict"] as const).map(level => (
                      <button
                        key={level}
                        type="button"
                        data-active={controls.profanityStrictness === level}
                        onClick={() => setControls({ profanityStrictness: level })}
                      >
                        {level === "off" ? "Off" : level === "std" ? "Std" : "Strict"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="nx-qc-row">
                  <div className="nx-qc-row-label">
                    <b>Lock session</b>
                    <span>Blocks late joins</span>
                  </div>
                  <NxToggle
                    on={controls.sessionLocked}
                    onChange={v => setControls({ sessionLocked: v })}
                    ariaLabel="Lock session"
                  />
                </div>
              </div>
            )}
          </div>
        </aside>
      </section>

      {/* End-session modal */}
      {endModalOpen && (
        <EndSessionModal
          questions={questions}
          joinedCount={meta.joinedCount}
          totalPages={material.totalPages}
          slidesViewed={currentPage}
          elapsedFmt={elapsedFmt}
          courseCode={meta.courseCode}
          sectionNumber={meta.sectionNumber}
          onCancel={() => setEndModalOpen(false)}
          onConfirm={onEndSession}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* Subcomponents — instructor-only, kept inline so the student page    */
/* doesn't accidentally pick them up.                                   */
/* ─────────────────────────────────────────────────────────────────── */

interface QuestionRowProps {
  question: LiveQuestion;
  onOpen: () => void;
  onResolve: () => void;
  onReopen: () => void;
  onMute: () => void;
  onReport: () => void;
  onUngroup: () => void;
  onJumpToSlide: () => void;
}

function QuestionRow({
  question: q,
  onOpen, onResolve, onReopen, onMute, onReport, onUngroup, onJumpToSlide,
}: QuestionRowProps) {
  // Briefly add `is-new` on first mount so the row slide-in plays once.
  const [isFresh, setIsFresh] = useState(true);
  useEffect(() => {
    const t = window.setTimeout(() => setIsFresh(false), 260);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div
      className={cn("nx-qrow",
        q.status === "opened"   && "is-opened",
        q.status === "resolved" && "is-resolved",
        isFresh                 && "is-new",
      )}
      role="listitem"
    >
      <div className="nx-qrow-head">
        <AnonChip id={q.authorAnonymousCourseID} />
        {q.clusterSize > 1 && (
          <span className="nx-cluster-pill">
            <Cluster size={10} />
            <span className="nx-cluster-pill-count">{q.clusterSize}</span> similar
          </span>
        )}
        <button
          className="nx-slide-tag"
          onClick={onJumpToSlide}
          title={`Jump to slide ${q.fromPage}`}
        >
          ↳ slide {q.fromPage}
        </button>
        <span className="nx-qrow-meta" style={{ marginLeft: "auto" }}>
          {relativeTime(q.postedAt)}
        </span>
      </div>

      <p className="nx-qrow-text">{q.text}</p>

      <div className="nx-qrow-actions">
        <StatusBadge status={q.status} openedAt={q.openedAt} resolvedByAuthor={q.resolvedByAuthor} />
        <span className="nx-qrow-actions-spacer" />

        {q.status === "new" && (
          <>
            <button className="nx-btn nx-btn-primary" onClick={onOpen}>
              <Eye size={11} /> Open
            </button>
            {q.clusterSize > 1 && (
              <button className="nx-btn nx-btn-ghost" onClick={onUngroup} title="Ungroup cluster">
                <Ungroup size={11} />
              </button>
            )}
            <button className="nx-btn nx-btn-ghost" onClick={onMute} title="Mute anonymous author for this session">
              <MuteIcon size={11} />
            </button>
            <button className="nx-btn nx-btn-ghost" onClick={onReport} title="Report abusive content" style={{ color: "var(--nx-danger)" }}>
              <Flag size={11} />
            </button>
          </>
        )}

        {q.status === "opened" && (
          <>
            <button className="nx-btn nx-btn-primary" onClick={onResolve}>Mark resolved</button>
            <button className="nx-btn nx-btn-ghost" onClick={onMute} title="Mute author">
              <MuteIcon size={11} />
            </button>
          </>
        )}

        {q.status === "resolved" && (
          <button className="nx-btn nx-btn-ghost" onClick={onReopen}>Reopen</button>
        )}
      </div>
    </div>
  );
}

function StatusBadge({
  status, openedAt, resolvedByAuthor,
}: { status: QuestionStatus; openedAt?: string; resolvedByAuthor?: boolean }) {
  if (status === "new") {
    return <span className="nx-badge nx-role-student"><span className="nx-badge-dot" />New</span>;
  }
  if (status === "opened") {
    return (
      <span className="nx-badge nx-role-admin">
        <span className="nx-badge-dot" />
        {openedAt ? `Opened ${relativeTime(openedAt)}` : "Opened"}
      </span>
    );
  }
  return (
    <span className="nx-badge nx-role-instructor">
      <span className="nx-badge-dot" />
      Resolved{resolvedByAuthor ? " by author" : ""}
    </span>
  );
}

interface ThumbnailStripProps {
  totalPages: number;
  currentPage: number;
  hotPages: Set<number>;
  onPick: (page: number) => void;
}

function ThumbnailStrip({ totalPages, currentPage, hotPages, onPick }: ThumbnailStripProps) {
  return (
    <div className="nx-thumb-strip" aria-label="All slides">
      {Array.from({ length: totalPages }, (_, i) => {
        const page = i + 1;
        const isCurrent = page === currentPage;
        const hasQ = hotPages.has(page);
        return (
          <button
            key={page}
            type="button"
            className={cn("nx-thumb", isCurrent && "is-current", hasQ && "has-questions")}
            onClick={() => onPick(page)}
            title={`Slide ${page}${hasQ ? " · has questions" : ""}`}
            aria-label={`Go to slide ${page}`}
            aria-current={isCurrent ? "page" : undefined}
          >
            <div className="nx-thumb-bar" />
            <div className="nx-thumb-line" />
            <div className="nx-thumb-line is-short" />
            <span className="nx-thumb-num">{page}</span>
          </button>
        );
      })}
    </div>
  );
}

interface EndSessionModalProps {
  questions: LiveQuestion[];
  joinedCount: number;
  totalPages: number;
  slidesViewed: number;
  elapsedFmt: string;
  courseCode: string;
  sectionNumber: string;
  onCancel: () => void;
  onConfirm: () => void;
}

function EndSessionModal({
  questions, joinedCount,
  totalPages, slidesViewed, elapsedFmt, courseCode, sectionNumber,
  onCancel, onConfirm,
}: EndSessionModalProps) {
  // ESC closes the modal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const open     = questions.filter(q => q.status !== "resolved").length;
  const resolved = questions.filter(q => q.status === "resolved").length;

  return (
    <div className="nx-modal-backdrop" onClick={onCancel}>
      <div
        className="nx-modal"
        style={{ maxWidth: 640 }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="end-modal-title"
      >
        <div className="nx-modal-head">
          <div
            style={{
              fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em",
              color: "var(--nx-fg-subtle)", fontWeight: 600,
            }}
          >
            {courseCode} · Section {sectionNumber} · {elapsedFmt} elapsed
          </div>
          <h3 className="nx-modal-title" id="end-modal-title">
            End live session and generate report?
          </h3>
          <p className="nx-card-sub" style={{ margin: "4px 0 0" }}>
            Students will lose the feedback channel immediately. The post-session summary
            will be archived and available to you and the Department Chairman.
          </p>
        </div>

        <div className="nx-modal-body">
          <div className="nx-report-stats">
            <div className="nx-report-stat">
              <div className="nx-report-stat-lbl">Questions</div>
              <div className="nx-report-stat-val">{questions.length}</div>
              <div className="nx-report-stat-delta">{open} open · {resolved} resolved</div>
            </div>
            <div className="nx-report-stat">
              <div className="nx-report-stat-lbl">Reactions</div>
              <div className="nx-report-stat-val">259</div>
              <div className="nx-report-stat-delta">6.2 / min avg</div>
            </div>
            <div className="nx-report-stat">
              <div className="nx-report-stat-lbl">Slides viewed</div>
              <div className="nx-report-stat-val">{slidesViewed} / {totalPages}</div>
              <div className="nx-report-stat-delta">avg 3.5m / slide</div>
            </div>
            <div className="nx-report-stat">
              <div className="nx-report-stat-lbl">Joined</div>
              <div className="nx-report-stat-val">{joinedCount}</div>
              <div className="nx-report-stat-delta">students</div>
            </div>
          </div>

          <h4 className="nx-report-section-title">Engagement timeline · session-long</h4>
          <EngagementChart />

          <h4 className="nx-report-section-title" style={{ marginTop: 14 }}>
            Top 3 confusion peaks
          </h4>
          <Peak
            ts="34:00"
            title='Spike in "Not clear" · slide 11'
            note="20 students, ~110s — clustered with 12 questions on master theorem boundary cases"
            sparkColor="var(--nx-danger)"
            points="2,18 10,17 18,15 26,12 34,6 42,4 50,8 58,12"
          />
          <Peak
            ts="22:30"
            title='Spike in "Too slow" · slide 7'
            note="11 students, ~90s — corresponded to amortized analysis worked example"
            sparkColor="#C77B0F"
            points="2,18 10,14 18,8 26,4 34,8 42,12 50,15 58,18"
          />
          <Peak
            ts="40:30"
            title='Spike in "Not clear" · slide 12'
            note="14 students, ~80s — second wave of master theorem confusion"
            sparkColor="var(--nx-danger)"
            points="2,18 10,17 18,14 26,10 34,6 42,4 50,3 58,4"
          />
        </div>

        <div
          className="nx-modal-foot"
          style={{
            background: "var(--nx-bg-sub)",
            borderTop: "1px solid var(--nx-border)",
            padding: "12px 22px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span
            style={{
              fontSize: 11, color: "var(--nx-fg-muted)",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <AlertCircle size={11} /> This action cannot be undone.
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="nx-btn nx-btn-ghost" onClick={onCancel}>
              <Close size={12} /> Cancel
            </button>
            <button className="nx-btn nx-btn-primary nx-btn-lg" onClick={onConfirm}>
              <Check size={13} /> End &amp; generate report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Peak({
  ts, title, note, sparkColor, points,
}: { ts: string; title: string; note: string; sparkColor: string; points: string }) {
  return (
    <div className="nx-peak">
      <span className="nx-peak-ts">{ts}</span>
      <div className="nx-peak-text">
        {title}
        <small>{note}</small>
      </div>
      <svg className="nx-peak-spark" viewBox="0 0 64 22" preserveAspectRatio="none" aria-hidden>
        <polyline
          points={points}
          fill="none"
          stroke={sparkColor}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function EngagementChart() {
  // Hand-rolled stacked-area chart of the four reactions over the session.
  // Only rendered at session end (inside the End modal) — per the
  // "report appears only at end" design constraint.
  const X = [30, 56, 84, 110, 136, 162, 190, 216, 244, 270, 296, 322, 350, 376, 402, 428, 456, 482, 508, 536, 562, 590];
  const NC = [120, 99,  89,  83,  76,  70,  60,  47,  47,  47,  44,  37,  41,  34,  37,  34,  34,  31,  28,  37,  24,  21];
  const TF = [120, 99,  93,  87,  84,  76,  70,  60,  63,  66,  70,  73,  84,  80,  87,  90,  93,  96,  96,  99,  96,  99];
  const TS = [120, 102, 96,  93,  87,  76,  70,  63,  66,  70,  73,  80,  87,  84,  87,  90,  96,  99,  99, 102,  96, 102];
  const U  = [120, 108, 102, 96,  90,  84,  80,  76,  84,  90,  90,  93,  96,  93,  93,  96,  99, 102, 105, 105, 102, 105];

  const path = (ys: number[]) => {
    const parts = ys.map((y, i) => `${i === 0 ? "M" : "L"} ${X[i]} ${y}`);
    return `${parts.join(" ")} L ${X[X.length - 1]} 120 L ${X[0]} 120 Z`;
  };
  const line = (ys: number[]) => ys.map((y, i) => `${X[i]},${y}`).join(" ");

  return (
    <svg className="nx-report-chart" viewBox="0 0 600 140" preserveAspectRatio="none" aria-hidden>
      <line className="nx-report-chart-grid" x1="30" y1="100" x2="590" y2="100" />
      <line className="nx-report-chart-grid" x1="30" y1="60"  x2="590" y2="60" />
      <line className="nx-report-chart-grid" x1="30" y1="20"  x2="590" y2="20" />
      <line className="nx-report-chart-axis" x1="30" y1="120" x2="590" y2="120" />
      <line className="nx-report-chart-axis" x1="30" y1="10"  x2="30"  y2="120" />

      <text x="25" y="123" textAnchor="end">0</text>
      <text x="25" y="103" textAnchor="end">10</text>
      <text x="25" y="63"  textAnchor="end">20</text>
      <text x="25" y="23"  textAnchor="end">30</text>
      <text x="30"  y="135">0m</text>
      <text x="170" y="135">10m</text>
      <text x="310" y="135">20m</text>
      <text x="450" y="135">30m</text>
      <text x="585" y="135" textAnchor="end">42m</text>

      <path d={path(NC)} fill="var(--nx-danger-soft)" />
      <path d={path(TF)} fill="var(--nx-warning-soft)" opacity="0.85" />
      <path d={path(TS)} fill="var(--nx-warning-soft)" />
      <path d={path(U)}  fill="var(--nx-success-soft)" />

      <polyline points={line(NC)} fill="none" stroke="var(--nx-danger)"  strokeWidth="1.4" />
      <polyline points={line(U)}  fill="none" stroke="var(--nx-success)" strokeWidth="1.2" />
    </svg>
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
