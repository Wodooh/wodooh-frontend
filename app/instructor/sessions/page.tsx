"use client";

/**
 * Instructor → Sessions.
 *
 * Backlog: US-C1 / FR-06 (start a session), US-C2 / FR-07 (end a session +
 * post-session summary). The sessions table is scoped to the current
 * instructor; admins viewing this surface still see only their own.
 */

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-provider";
import { useSessions } from "@/lib/hooks/use-sessions";
import type { SessionPopulated } from "@/lib/types/session.types";

type Tab = "live" | "ended";

function instructorIdOf(s: SessionPopulated): string | null {
  if (!s.instructorId) return null;
  return typeof s.instructorId === "string" ? s.instructorId : s.instructorId._id;
}

function courseLabel(s: SessionPopulated): string {
  if (!s.courseId || typeof s.courseId === "string") return "Course";
  return `${s.courseId.code ?? ""} · ${s.courseId.name ?? ""}`.trim();
}

function sectionLabel(s: SessionPopulated): string {
  if (!s.sectionId || typeof s.sectionId === "string") return "—";
  return String(s.sectionId.sectionId);
}

function formatStarted(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function durationFmt(startIso: string, endIso?: string): string {
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  const mins = Math.max(0, Math.floor((end - new Date(startIso).getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function InstructorSessionsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("live");
  const [endingId, setEndingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { sessions, loading, error, endSession } = useSessions(
    user?._id ? { instructorId: user._id } : {},
  );

  const live = useMemo(() => sessions.filter((s) => s.status === "live"), [sessions]);
  const ended = useMemo(() => sessions.filter((s) => s.status === "ended"), [sessions]);
  const visible = tab === "live" ? live : ended;

  const onEnd = async (id: string) => {
    setActionError(null);
    setEndingId(id);
    try {
      await endSession(id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to end session");
    } finally {
      setEndingId(null);
    }
  };

  return (
    <>
      <div className="nx-page-head">
        <div>
          <h1 className="nx-page-title">Sessions</h1>
          <p className="nx-page-sub">Your live and past lecture sessions.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="nx-btn nx-btn-primary"
            onClick={() => router.push("/instructor/courses")}
          >
            Start a session
          </button>
        </div>
      </div>

      {actionError && (
        <div className="nx-card" style={{ borderColor: "var(--nx-danger)" }}>
          <div className="nx-card-head">
            <div>
              <h3 className="nx-card-title" style={{ color: "var(--nx-danger)" }}>Action failed</h3>
              <p className="nx-card-sub">{actionError}</p>
            </div>
          </div>
        </div>
      )}

      <div className="nx-filter-bar">
        <div className="nx-tabs" role="tablist">
          <button
            className="nx-tab"
            data-active={tab === "live"}
            onClick={() => setTab("live")}
          >
            Live <span className="nx-filter-bar-count">{live.length}</span>
          </button>
          <button
            className="nx-tab"
            data-active={tab === "ended"}
            onClick={() => setTab("ended")}
          >
            Ended <span className="nx-filter-bar-count">{ended.length}</span>
          </button>
        </div>
      </div>

      <div className="nx-card">
        <div className="nx-card-head">
          <div>
            <h3 className="nx-card-title">{tab === "live" ? "Live now" : "Past sessions"}</h3>
            <p className="nx-card-sub">
              {tab === "live"
                ? "Resume any live session to return to its real-time dashboard."
                : "Reports for ended sessions are linked below."}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="nx-empty"><span className="nx-spin" /></div>
        ) : error ? (
          <div className="nx-empty">
            <div className="nx-empty-title">Couldn&apos;t load sessions</div>
            <div className="nx-empty-sub">{error}</div>
          </div>
        ) : visible.length === 0 ? (
          <div className="nx-empty">
            <div className="nx-empty-title">
              {tab === "live" ? "No live sessions" : "No ended sessions"}
            </div>
            <div className="nx-empty-sub">
              {tab === "live"
                ? "Start one from My Courses."
                : "Sessions you end will show up here for reporting."}
            </div>
          </div>
        ) : (
          <div className="nx-tbl-wrap">
            <table className="nx-tbl">
              <thead>
                <tr>
                  <th scope="col">Course</th>
                  <th scope="col">Section</th>
                  <th scope="col">{tab === "live" ? "Started" : "Ended"}</th>
                  <th scope="col">Duration</th>
                  <th scope="col" style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((s) => {
                  const owned = instructorIdOf(s) === user?._id;
                  return (
                    <tr key={s._id}>
                      <td>
                        <div className="nx-user-cell-name">{courseLabel(s)}</div>
                      </td>
                      <td className="nx-tbl-mono">{sectionLabel(s)}</td>
                      <td className="nx-tbl-mono">
                        {tab === "live"
                          ? formatStarted(s.startedAt)
                          : s.endedAt ? formatStarted(s.endedAt) : "—"}
                      </td>
                      <td className="nx-tbl-mono">{durationFmt(s.startedAt, s.endedAt)}</td>
                      <td style={{ textAlign: "right", display: "flex", justifyContent: "flex-end", gap: 8 }}>
                        {tab === "live" ? (
                          <>
                            <Link
                              href={`/instructor/sessions/${s._id}/live`}
                              className="nx-btn nx-btn-primary"
                            >
                              Resume
                            </Link>
                            <button
                              className="nx-btn nx-btn-ghost"
                              onClick={() => onEnd(s._id)}
                              disabled={!owned || endingId === s._id}
                              title={owned ? "End session" : "Only the owning instructor can end"}
                            >
                              {endingId === s._id ? "Ending…" : "End"}
                            </button>
                          </>
                        ) : (
                          <Link
                            href={`/instructor/reports?sessionId=${s._id}`}
                            className="nx-btn nx-btn-ghost"
                          >
                            View report
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
