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
 * Layout: this page (and the student counterpart) renders inside
 * `LiveSessionFrame` — a slide-first viewport-filling skeleton. The role
 * shell (sidebar + topbar) is short-circuited on /live routes; this page
 * owns the entire viewport.
 *
 * Data: V1 reads a static fixture from `lib/mock/live-session-mock.ts`.
 * Realtime + REST will replace this with a `useLiveSession(sessionId)` hook
 * over Ably + the backend `/sessions/:id/...` endpoints in a follow-up.
 */

import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from "react";
import { use, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { FileGlyph } from "@/components/live-session/file-glyph";
import { LiveSessionFrame } from "@/components/live-session/live-session-frame";
import { ReactionsDisplay } from "@/components/live-session/reactions-display";
import { SlideStage } from "@/components/live-session/slide-stage";
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Close,
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
  LiveQuestionCluster,
  LiveSessionSnapshot,
  QuestionStatus,
  ReactionKind,
  ReactionTallies,
  SessionMaterial,
} from "@/lib/types/live-session.types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type QuestionFilter = "needs-attention" | "done";

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
    setClusterVisibility,
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

  const [snapshot, setSnapshot] = useState<LiveSessionSnapshot | null>(null);
  useEffect(() => {
    setSnapshot(liveSnapshot);
  }, [liveSnapshot]);

  // Local UI state (would later flow through Ably to followers/server).
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [questionFilter, setQuestionFilter] = useState<QuestionFilter>("needs-attention");
  const [endModalOpen, setEndModalOpen] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [pulseKind] = useState<ReactionKind | null>(null);

  // Clusters that the instructor just opened on this tab. They remain visible
  // in "Needs attention" even after their visibilityStatus flips, so the
  // instructor has time to read and answer verbally before the row re-buckets
  // to "Done" on the next tab switch.
  const [pinnedOnNeedsAttention, setPinnedOnNeedsAttention] = useState<Set<string>>(new Set());

  const handleFilterChange = (next: QuestionFilter) => {
    if (next !== questionFilter) setPinnedOnNeedsAttention(new Set());
    setQuestionFilter(next);
  };

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
  const [autoCloseWarning, setAutoCloseWarning]         = useState(false);
  const [autoCloseSuppressed, setAutoCloseSuppressed]   = useState(false);
  const [autoCloseCountdown, setAutoCloseCountdown]     = useState(60);

  useEffect(() => {
    if (!connected) return;
    if (studentCount > 0) {
      setAutoCloseWarning(false);
      setAutoCloseSuppressed(false);
      setAutoCloseCountdown(60);
      return;
    }
    if (elapsedSec >= 600 && !autoCloseSuppressed) {
      setAutoCloseWarning(true);
    }
  }, [elapsedSec, studentCount, connected, autoCloseSuppressed]);

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

  useEffect(() => {
    if (autoCloseWarning && autoCloseCountdown === 0) {
      void onEndSession();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCloseCountdown, autoCloseWarning]);

  /* — Derived helpers ─────────────────────────────────────────────── */

  const questionsById = useMemo(() => {
    const map = new Map<string, LiveQuestion>();
    snapshot?.questions.forEach(q => map.set(q.questionId, q));
    return map;
  }, [snapshot?.questions]);

  const filteredClusters = useMemo(() => {
    if (!snapshot) return [];
    if (questionFilter === "needs-attention") {
      return snapshot.clusters.filter(
        c => c.visibilityStatus === "hidden" || pinnedOnNeedsAttention.has(c.clusterId),
      );
    }
    return snapshot.clusters.filter(c => c.visibilityStatus === "visible");
  }, [snapshot, questionFilter, pinnedOnNeedsAttention]);

  const counts = useMemo(() => {
    const clusters = snapshot?.clusters ?? [];
    return {
      needsAttention: clusters.filter(c => c.visibilityStatus === "hidden").length,
      done:           clusters.filter(c => c.visibilityStatus === "visible").length,
    };
  }, [snapshot]);

  const elapsedFmt = useMemo(() => {
    const h = String(Math.floor(elapsedSec / 3600)).padStart(2, "0");
    const m = String(Math.floor((elapsedSec % 3600) / 60)).padStart(2, "0");
    const s = String(elapsedSec % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }, [elapsedSec]);

  const goToPage = (p: number) => {
    if (!snapshot) return;
    const maxPage = pdfPageCount || snapshot.material.totalPages || 1;
    const clamped = Math.max(1, Math.min(maxPage, p));
    setCurrentPage(clamped);
    void apiClient
      .patch(API_ENDPOINTS.SESSION_PAGE(sessionId), { page: clamped })
      .catch(() => { /* Non-fatal: student page sync fails silently */ });
  };

  const promptJump = () => {
    if (!snapshot) return;
    const maxPage = pdfPageCount || snapshot.material.totalPages || 1;
    const raw = window.prompt(`Jump to slide (1–${maxPage})`, String(currentPage));
    if (!raw) return;
    const n = parseInt(raw, 10);
    if (Number.isFinite(n)) goToPage(n);
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

  const onOpenCluster = (clusterId: string) => {
    setPinnedOnNeedsAttention(prev => {
      if (prev.has(clusterId)) return prev;
      const next = new Set(prev);
      next.add(clusterId);
      return next;
    });
    setClusterVisibility(clusterId, "visible").catch(err =>
      toast.error(err instanceof Error ? err.message : "Failed to open cluster"),
    );
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

  const { meta, material: snapshotMaterial, reactions, questions } = snapshot;
  const material = activeMaterial ?? snapshotMaterial;
  const effectiveTotalPages = pdfPageCount || material.totalPages || 1;

  const banner = (ended || autoCloseWarning) ? (
    <>
      {ended && (
        <div className="nx-student-banner is-warn" role="alert">
          <b>This session has ended.</b>
        </div>
      )}
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
              <button
                className="nx-btn nx-btn-ghost nx-btn-danger"
                onClick={() => setEndModalOpen(true)}
              >
                <StopSquare size={13} />
                End session
              </button>
            </div>
          </>
        }
        slide={
          <SlideStage
            material={material}
            page={currentPage}
            pdfUrl={pdfSignedUrl ?? undefined}
            onPrev={() => goToPage(currentPage - 1)}
            onNext={() => goToPage(currentPage + 1)}
            onPdfLoad={setPdfPageCount}
          />
        }
        bottomStrip={
          <>
            <div className="nx-lsf-bottom-left">
              <span className="nx-lsf-bottom-filename" title={material.filename}>
                <FileGlyph format={material.format} />
                <span>{material.filename}</span>
                <span className="nx-lsf-bottom-filename-sub">
                  · {effectiveTotalPages > 0 ? `${effectiveTotalPages} slides` : 'Loading…'}
                </span>
              </span>
            </div>

            <div className="nx-lsf-bottom-center">
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
              <button
                type="button"
                className="nx-lsf-pageind"
                onClick={promptJump}
                title="Click to jump to a slide"
                aria-label={`Slide ${currentPage} of ${effectiveTotalPages || "—"} — click to jump`}
              >
                <b>{currentPage}</b>
                <span className="nx-lsf-pageind-sep">/</span>
                <span className="nx-lsf-pageind-total">{effectiveTotalPages || '—'}</span>
              </button>
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

            <div className="nx-lsf-bottom-right">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.pptx"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

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
                ) : null}
                <button
                  className="nx-material-upload-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  title={sessionMaterials.length > 1 ? 'Upload new slides' : 'Upload slides'}
                  aria-label="Upload slides"
                >
                  {uploading ? (uploadProgress > 0 ? `${uploadProgress}%` : '…') : '↑'}
                </button>
              </div>
            </div>
          </>
        }
        rail={
          <>
            <ReactionsDisplay
              tallies={reactions}
              contextLabel={`slide ${currentPage} · last ${reactions.windowSeconds}s`}
              incrementedKind={pulseKind}
            />

            <div className="nx-card" aria-label="Student questions">
              <div className="nx-card-head">
                <div>
                  <h3 className="nx-card-title">Student questions</h3>
                  <p className="nx-card-sub">Showing similar questions together.</p>
                </div>
              </div>

              <div className="nx-filter-bar">
                <div className="nx-tabs" role="tablist">
                  <button
                    className="nx-tab"
                    data-active={questionFilter === "needs-attention"}
                    onClick={() => handleFilterChange("needs-attention")}
                  >
                    Needs attention ({counts.needsAttention})
                  </button>
                  <button
                    className="nx-tab"
                    data-active={questionFilter === "done"}
                    onClick={() => handleFilterChange("done")}
                  >
                    Done ({counts.done})
                  </button>
                </div>
              </div>

              <div className="nx-stream-list" role="list">
                {filteredClusters.length === 0 ? (
                  <div className="nx-empty">
                    <div className="nx-empty-title">
                      {questionFilter === "needs-attention"
                        ? "Nothing waiting"
                        : "No questions yet"}
                    </div>
                    <div className="nx-empty-sub">
                      {questionFilter === "needs-attention"
                        ? "When students send questions, they'll appear here for you to review."
                        : "Questions you've opened will appear here."}
                    </div>
                  </div>
                ) : (
                  filteredClusters.map(c => (
                    <ClusterRow
                      key={c.clusterId}
                      cluster={c}
                      head={questionsById.get(c.headQuestionId)}
                      members={c.memberIds
                        .map(id => questionsById.get(id))
                        .filter((q): q is LiveQuestion => Boolean(q))}
                      onOpen={() => onOpenCluster(c.clusterId)}
                      onJumpToSlide={page => goToPage(page)}
                    />
                  ))
                )}
              </div>
            </div>
          </>
        }
      />

      {endModalOpen && (
        <EndSessionModal
          questions={questions}
          reactions={reactions}
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
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* Inline icons used in the top bar metas.                              */
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
/* Subcomponents — instructor-only, kept inline so the student page    */
/* doesn't accidentally pick them up.                                   */
/* ─────────────────────────────────────────────────────────────────── */

interface ClusterRowProps {
  cluster: LiveQuestionCluster;
  head: LiveQuestion | undefined;
  members: LiveQuestion[];
  onOpen: () => void;
  onJumpToSlide: (page: number) => void;
}

function ClusterRow({
  cluster, head, members, onOpen, onJumpToSlide,
}: ClusterRowProps) {
  const [isFresh, setIsFresh] = useState(true);
  useEffect(() => {
    const t = window.setTimeout(() => setIsFresh(false), 260);
    return () => window.clearTimeout(t);
  }, []);

  const [expanded, setExpanded] = useState(false);

  const isHidden = cluster.visibilityStatus === "hidden";
  const isCluster = cluster.size > 1;
  const status: QuestionStatus = isHidden ? "new" : "opened";

  const onRowKey = (e: ReactKeyboardEvent) => {
    if (!isHidden) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen();
    }
  };

  const stop = (handler: () => void) => (e: ReactMouseEvent) => {
    e.stopPropagation();
    handler();
  };

  const headText = cluster.headText || head?.text || "";
  const headPage = head?.fromPage ?? 1;
  const headPostedAt = head?.postedAt;

  return (
    <div
      className={cn("nx-qrow",
        !isHidden && "is-opened",
        isFresh   && "is-new",
        isHidden  && "is-revealable",
      )}
      role={isHidden ? "button" : "listitem"}
      tabIndex={isHidden ? 0 : undefined}
      aria-label={
        isHidden
          ? isCluster
            ? `${cluster.size} students asked this — open`
            : "Click to open this question"
          : undefined
      }
      onClick={isHidden ? onOpen : undefined}
      onKeyDown={isHidden ? onRowKey : undefined}
    >
      <div className="nx-qrow-head">
        {isCluster && (
          <span className="nx-cluster-pill">
            <span className="nx-cluster-pill-count">{cluster.size}</span> students asked this
          </span>
        )}
        {head && (
          <button
            className="nx-slide-tag"
            onClick={stop(() => onJumpToSlide(headPage))}
          >
            slide {headPage}
          </button>
        )}
        {headPostedAt && (
          <span className="nx-qrow-meta" style={{ marginLeft: "auto" }}>
            {relativeTime(headPostedAt)}
          </span>
        )}
      </div>

      <p className={cn("nx-qrow-text", isHidden && "nx-qrow-text--hidden")}>
        {headText}
      </p>

      <div className="nx-qrow-actions">
        <StatusBadge status={status} />
        <span className="nx-qrow-actions-spacer" />

        {isCluster && (
          <button
            className="nx-cluster-disclosure"
            onClick={stop(() => setExpanded(e => !e))}
            aria-expanded={expanded}
          >
            {expanded
              ? "Hide other questions"
              : `See all ${cluster.size} questions`}
          </button>
        )}

        {isHidden && (
          <button className="nx-btn nx-btn-primary" onClick={stop(onOpen)}>
            <Eye size={12} /> Open
          </button>
        )}
      </div>

      {isCluster && expanded && (
        <ul className="nx-cluster-members" role="list">
          {members.map(m => (
            <li key={m.questionId} className="nx-cluster-member">
              <p className={cn("nx-cluster-member-text", isHidden && "nx-qrow-text--hidden")}>
                {m.text}
              </p>
              <div className="nx-cluster-member-meta">
                <button
                  className="nx-slide-tag"
                  onClick={stop(() => onJumpToSlide(m.fromPage))}
                >
                  slide {m.fromPage}
                </button>
                <span>{relativeTime(m.postedAt)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: QuestionStatus }) {
  if (status === "new") {
    return (
      <span className="nx-badge nx-role-student">
        <span className="nx-badge-dot" />
        Unopened
      </span>
    );
  }
  if (status === "resolved") {
    return (
      <span className="nx-badge nx-role-admin">
        <span className="nx-badge-dot" />
        Resolved
      </span>
    );
  }
  return (
    <span className="nx-badge nx-role-admin">
      <span className="nx-badge-dot" />
      Opened
    </span>
  );
}

interface EndSessionModalProps {
  questions: LiveQuestion[];
  reactions: ReactionTallies;
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
  questions, reactions, joinedCount,
  totalPages, slidesViewed, elapsedFmt, courseCode, sectionNumber,
  onCancel, onConfirm,
}: EndSessionModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const openedCount = questions.filter(q => q.status === "opened").length;
  const totalReactions =
    reactions.too_fast.total +
    reactions.too_slow.total +
    reactions.understood.total +
    reactions.not_clear.total;

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
              <div className="nx-report-stat-delta">{openedCount} opened</div>
            </div>
            <div className="nx-report-stat">
              <div className="nx-report-stat-lbl">Reactions</div>
              <div className="nx-report-stat-val">{totalReactions}</div>
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

function relativeTime(iso: string): string {
  const diff = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ${diff % 60 === 0 ? "" : `${diff % 60}s `}ago`.trim();
  return `${Math.floor(diff / 3600)}h ago`;
}
