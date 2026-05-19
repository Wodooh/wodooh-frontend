"use client";

/**
 * Student → Sessions.
 *
 * Backlog: US-D1 / FR-11 (join an active session for one of my courses) and
 * US-D5 / FR-15 (mark my submitted questions resolved/unresolved after the
 * session ends — reached via the per-session "review" page).
 *
 * Backed by `GET /me/sessions?status=...` which scopes by the student's
 * enrolled sections server-side.
 */

import React, { useState } from "react";
import Link from "next/link";
import { useMySessions, type MySession } from "@/lib/hooks/use-my-sessions";

type Tab = "live" | "ended";

function courseLabel(s: MySession): string {
  return `${s.courseId.code ?? ""} · ${s.courseId.name ?? ""}`.trim();
}

function sectionLabel(s: MySession): string {
  return String(s.sectionId.sectionId);
}

function instructorName(s: MySession): string {
  return s.instructorId.name;
}

function formatStarted(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function durationFmt(startIso: string, endIso?: string): string {
  if (!endIso) return "—";
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  const mins = Math.max(0, Math.floor(ms / 60000));
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function StudentSessionsPage() {
  const [tab, setTab] = useState<Tab>("live");
  const { sessions: liveSessions,  loading: liveLoading,  error: liveError  } = useMySessions("live");
  const { sessions: endedSessions, loading: endedLoading, error: endedError } = useMySessions("ended");

  const loading = tab === "live" ? liveLoading : endedLoading;
  const error = tab === "live" ? liveError : endedError;
  const visible = tab === "live" ? liveSessions : endedSessions;

  return (
    <>
      <div className="nx-page-head">
        <div>
          <h1 className="nx-page-title">Sessions</h1>
          <p className="nx-page-sub">Live lectures you can join and past sessions you can review.</p>
        </div>
      </div>

      <div className="nx-filter-bar">
        <div className="nx-tabs" role="tablist">
          <button
            className="nx-tab"
            data-active={tab === "live"}
            onClick={() => setTab("live")}
          >
            Live <span className="nx-filter-bar-count">{liveSessions.length}</span>
          </button>
          <button
            className="nx-tab"
            data-active={tab === "ended"}
            onClick={() => setTab("ended")}
          >
            Ended <span className="nx-filter-bar-count">{endedSessions.length}</span>
          </button>
        </div>
      </div>

      <div className="nx-card">
        <div className="nx-card-head">
          <div>
            <h3 className="nx-card-title">{tab === "live" ? "Live now" : "Past sessions"}</h3>
            <p className="nx-card-sub">
              {tab === "live"
                ? "Join anonymously — questions and reactions stay private."
                : "Review your questions and mark each resolved or unresolved."}
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
              {tab === "live" ? "No live sessions" : "No past sessions yet"}
            </div>
            <div className="nx-empty-sub">
              {tab === "live"
                ? "When one of your instructors starts a session, it will appear here."
                : "Ended sessions from your enrolled sections will appear here."}
            </div>
          </div>
        ) : (
          <div className="nx-tbl-wrap">
            <table className="nx-tbl">
              <thead>
                <tr>
                  <th scope="col">Course</th>
                  <th scope="col">Section</th>
                  <th scope="col">Instructor</th>
                  <th scope="col">{tab === "live" ? "Started" : "Ended"}</th>
                  {tab === "ended" && <th scope="col">Duration</th>}
                  <th scope="col" style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((s) => (
                  <tr key={s._id}>
                    <td>
                      <div className="nx-user-cell-name">{courseLabel(s)}</div>
                    </td>
                    <td className="nx-tbl-mono">{sectionLabel(s)}</td>
                    <td>{instructorName(s)}</td>
                    <td className="nx-tbl-mono">
                      {tab === "live"
                        ? formatStarted(s.startedAt)
                        : s.endedAt ? formatStarted(s.endedAt) : "—"}
                    </td>
                    {tab === "ended" && (
                      <td className="nx-tbl-mono">{durationFmt(s.startedAt, s.endedAt)}</td>
                    )}
                    <td style={{ textAlign: "right" }}>
                      {tab === "live" ? (
                        <Link href={`/student/sessions/${s._id}/live`} className="nx-btn nx-btn-primary">
                          Join
                        </Link>
                      ) : (
                        <Link href={`/student/sessions/${s._id}/review`} className="nx-btn nx-btn-ghost">
                          Review
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
