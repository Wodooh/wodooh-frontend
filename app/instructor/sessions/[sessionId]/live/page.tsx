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

import { use, useEffect, useMemo, useRef, useState } from "react";
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
  SkipBack,
  SkipForward,
  StopSquare,
} from "@/components/live-session/icons";

import apiClient from "@/lib/api/client";
import API_ENDPOINTS from "@/lib/api/endpoints";
import { useLiveSession } from "@/lib/hooks/use-live-session";
import { useSessionMaterials } from "@/lib/hooks/use-session-materials";
import type {
  LiveQuestion,
  LiveSessionSnapshot,
  MutedParticipant,
  QuestionStatus,
  ReactionKind,
  SessionControls,
  SessionMaterial,
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
    setQuestionVisibility,
    studentCount,
  } = useLiveSession(sessionId);

  // Materials hook — fetches uploaded PDFs for this session
  const { materials: sessionMaterials, getSignedUrl, uploadMaterial } = useSessionMaterials(sessionId);
  const [activeMaterial, setActiveMaterial] = useState<SessionMaterial | null>(null);
  const [pdfSignedUrl, setPdfSignedUrl]     = useState<string | null>(null);
  const [pdfPageCount, setPdfPageCount]     = useState(0);
  const [uploading, setUploading]           = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-load first material when the list arrives
  useEffect(() => {
    if (sessionMaterials.length === 0 || activeMaterial) return;
    const first = sessionMaterials[0];
    setActiveMaterial(first);
    if (first._id) {
      getSignedUrl(first._id)
        .then(url => setPdfSignedUrl(url))
        .catch(() => { /* non-fatal — slide placeholder shown */ });
    }
  }, [sessionMaterials, activeMaterial, getSignedUrl]);

  useEffect(() => {
    if (!activeMaterial || !activeMaterial._id) return;
    // Refresh 10 minutes before the 1-hour signed URL expires
    const REFRESH_MS = 50 * 60 * 1000;
    const materialId = activeMaterial._id;
    const id = setInterval(() => {
      getSignedUrl(materialId).then(setPdfSignedUrl).catch(() => { /* non-fatal */ });
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [activeMaterial, getSignedUrl]);

  useEffect(() => {
    document.documentElement.setAttribute('data-nx-focus', 'live');
    return () => {
      document.documentElement.removeAttribute('data-nx-focus');
    };
  }, []);

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

  /* — Auto-close: 10 min with no students ──────────────────────────── */
  // autoCloseWarning: the warning banner is visible and the 60-s countdown is running.
  // autoCloseSuppressed: instructor clicked "Keep open" — don't show again until
  //   a student actually joins and then leaves again.
  const [autoCloseWarning, setAutoCloseWarning]         = useState(false);
  const [autoCloseSuppressed, setAutoCloseSuppressed]   = useState(false);
  const [autoCloseCountdown, setAutoCloseCountdown]     = useState(60);

  // Raise the warning once the session is 10 min old and no students are present.
  useEffect(() => {
    if (!connected) return;
    if (studentCount > 0) {
      // Students joined — hide warning and reset suppression so the timer can
      // fire again if they all leave later.
      setAutoCloseWarning(false);
      setAutoCloseSuppressed(false);
      setAutoCloseCountdown(60);
      return;
    }
    if (elapsedSec >= 600 && !autoCloseSuppressed) {
      setAutoCloseWarning(true);
    }
  }, [elapsedSec, studentCount, connected, autoCloseSuppressed]);

  // Countdown ticker while the warning is visible.
  useEffect(() => {
    if (!autoCloseWarning) return;
    const id = window.setInterval(() => {
      setAutoCloseCountdown(s => {
        if (s <= 1) { clearInterval(id); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [autoCloseWarning]);

  // End session automatically when the countdown hits zero.
  useEffect(() => {
    if (autoCloseWarning && autoCloseCountdown === 0) {
      void onEndSession();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCloseCountdown, autoCloseWarning]);

  /* — Derived helpers ─────────────────────────────────────────────── */

  const filteredQuestions = useMemo(() => {
    if (!snapshot) return [];
    return questionFilter === "all"
      ? snapshot.questions
      : questionFilter === "new"
      ? snapshot.questions.filter(q => q.status === "new")
      : snapshot.questions.filter(q => q.status === "opened");
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
    const maxPage = pdfPageCount || snapshot.material.totalPages || 1;
    const clamped = Math.max(1, Math.min(maxPage, p));
    setCurrentPage(clamped);
    void apiClient
      .patch(API_ENDPOINTS.SESSION_PAGE(sessionId), { page: clamped })
      .catch(() => { /* Non-fatal: student page sync fails silently */ });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      await uploadMaterial(file, setUploadProgress);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onOpen = (id: string) => {
    setQuestionVisibility(id, "visible", {
      status: "opened",
      openedAt: new Date().toISOString(),
    }).catch(err =>
      toast.error(err instanceof Error ? err.message : "Failed to open question"),
    );
  };
  // Resolve has no backend: there's no endpoint for `postSessionStatus`, and
  // per the design "opening" a question marks it resolved-by-default — the
  // final resolved/unresolved decision is made by each author in the
  // post-session survey (not yet built). This stays a local-only mutator so
  // the live UI still reflects the instructor's intent within the session.
  const onResolve = (id: string) =>
    updateQuestion(id, { status: "resolved", resolvedAt: new Date().toISOString() });
  const onReopen = (id: string) => {
    setQuestionVisibility(id, "hidden", {
      status: "new",
      resolvedAt: undefined,
    }).catch(err =>
      toast.error(err instanceof Error ? err.message : "Failed to reopen question"),
    );
  };
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

  const { meta, material: snapshotMaterial, reactions, muted, controls, questions } = snapshot;
  // Prefer real uploaded material; fall back to snapshot placeholder
  const material = activeMaterial ?? snapshotMaterial;
  const effectiveTotalPages = pdfPageCount || material.totalPages || 1;

  return (
    <div className="nx-portal-accent">
      {ended && (
        <div className="nx-student-banner is-warn" role="alert">
          <b>This session has ended.</b>
        </div>
      )}

      {/* Auto-close warning — no students after 10 min */}
      {autoCloseWarning && (
        <div
          role="alert"
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 18px',
            background: 'color-mix(in oklab, var(--nx-danger, #e5484d) 10%, var(--nx-surface))',
            borderBottom: '1px solid color-mix(in oklab, var(--nx-danger, #e5484d) 30%, var(--nx-border))',
            fontSize: 13.5,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--nx-danger, #e5484d)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span style={{ flex: 1, color: 'var(--nx-fg)' }}>
            <b style={{ color: 'var(--nx-danger, #e5484d)' }}>No students present.</b>
            {' '}Session will auto-close in <b>{autoCloseCountdown}s</b>.
          </span>
          <button
            className="nx-btn nx-btn-ghost"
            style={{ flexShrink: 0, fontSize: 12.5 }}
            onClick={() => {
              setAutoCloseWarning(false);
              setAutoCloseSuppressed(true);
              setAutoCloseCountdown(60);
            }}
          >
            Keep open
          </button>
        </div>
      )}

      {/* Page head */}
      <div className="nx-page-head">
        <div>
          <h1 className="nx-page-title">Live session</h1>
          <p className="nx-page-sub">
            {material.filename ? (
              <>
                Real-time dashboard · students join anonymously and react to{" "}
                <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {material.filename}
                </span>
              </>
            ) : (
              "Live session in progress"
            )}
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
                  {formatBytes(material.sizeBytes)} · {effectiveTotalPages > 0 ? `${effectiveTotalPages} slides` : 'Loading…'}
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
                <span style={{ color: "var(--nx-fg-muted)" }}>{effectiveTotalPages || '—'}</span>
              </span>
              <button
                className="nx-icon-btn"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= effectiveTotalPages}
                title="Next slide"
                aria-label="Next slide"
              >
                <ChevronRight size={13} />
              </button>
              <button
                className="nx-icon-btn"
                onClick={() => goToPage(effectiveTotalPages)}
                disabled={currentPage >= effectiveTotalPages}
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
                {controls.broadcasting ? "Broadcasting" : "Broadcast paused"}
              </button>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.pptx"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              {/* Material switcher: shows active material; lets instructor pick another when multiple exist */}
              <div className="nx-material-switcher">
                {sessionMaterials.length > 1 ? (
                  <select
                    className="nx-material-select"
                    value={activeMaterial?._id ?? ''}
                    onChange={(e) => {
                      const chosen = sessionMaterials.find(m => m._id === e.target.value);
                      if (!chosen || !chosen._id) return;
                      setActiveMaterial(chosen);
                      getSignedUrl(chosen._id)
                        .then(setPdfSignedUrl)
                        .catch(() => { /* non-fatal */ });
                    }}
                  >
                    {sessionMaterials.map(m => (
                      <option key={m._id} value={m._id ?? ''}>{m.filename}</option>
                    ))}
                  </select>
                ) : (
                  <span className="nx-material-name">
                    {activeMaterial ? activeMaterial.filename : 'No slides'}
                  </span>
                )}
                <button
                  className="nx-material-upload-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  title={sessionMaterials.length > 1 ? 'Upload new slides' : 'Upload slides'}
                >
                  {uploading ? (uploadProgress > 0 ? `${uploadProgress}%` : '…') : '↑'}
                </button>
              </div>
            </div>
          </div>

          {/* Slide stage */}
          <SlideStage
            material={material}
            page={currentPage}
            pdfUrl={pdfSignedUrl ?? undefined}
            onPrev={() => goToPage(currentPage - 1)}
            onNext={() => goToPage(currentPage + 1)}
            onPdfLoad={setPdfPageCount}
          />

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
              <div className="nx-tabs" role="tablist">
                <button
                  className="nx-tab"
                  data-active={questionFilter === "all"}
                  onClick={() => setQuestionFilter("all")}
                >
                  All ({counts.all})
                </button>
                <button
                  className="nx-tab"
                  data-active={questionFilter === "new"}
                  onClick={() => setQuestionFilter("new")}
                >
                  New ({counts.new})
                </button>
                <button
                  className="nx-tab"
                  data-active={questionFilter === "opened"}
                  onClick={() => setQuestionFilter("opened")}
                >
                  Opened ({counts.opened})
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
          joinedCount={0}
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

      <p
        className={cn("nx-qrow-text", q.status === "new" && "nx-qrow-text--hidden")}
        aria-hidden={q.status === "new"}
      >
        {q.text}
      </p>

      <div className="nx-qrow-actions">
        <StatusBadge status={q.status} openedAt={q.openedAt} resolvedByAuthor={q.resolvedByAuthor} />
        <span className="nx-qrow-actions-spacer" />

        {q.status === "new" && (
          <button className="nx-btn nx-btn-primary" onClick={onOpen}>
            <Eye size={11} /> Reveal
          </button>
        )}

        {q.status === "opened" && (
          <button className="nx-btn nx-btn-primary" onClick={onResolve}>Mark resolved</button>
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
              <div className="nx-report-stat-val">—</div>
            </div>
            <div className="nx-report-stat">
              <div className="nx-report-stat-lbl">Slides viewed</div>
              <div className="nx-report-stat-val">{slidesViewed} / {totalPages}</div>
            </div>
            <div className="nx-report-stat">
              <div className="nx-report-stat-lbl">Joined</div>
              <div className="nx-report-stat-val">{joinedCount}</div>
              <div className="nx-report-stat-delta">students</div>
            </div>
          </div>

          <h4 className="nx-report-section-title">Engagement timeline</h4>
          <p className="nx-card-sub" style={{ margin: "4px 0 0" }}>
            Engagement timeline coming soon.
          </p>
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
