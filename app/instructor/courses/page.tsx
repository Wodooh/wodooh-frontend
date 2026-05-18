"use client";

/**
 * Instructor → My Courses.
 *
 * Backlog: US-C1 / FR-06 (start a live session for one of my assigned
 * sections — only my sections are listed; conflict if one is already live)
 * and US-C3 / FR-08 (manage section materials). Section materials are
 * surfaced as a placeholder for the follow-up materials surface.
 */

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMyCourses } from "@/lib/hooks/use-my-courses";
import { useSessions } from "@/lib/hooks/use-sessions";
import type { SessionPopulated } from "@/lib/types/session.types";

function sectionIdFromSession(s: SessionPopulated): string | null {
  if (!s.sectionId) return null;
  return typeof s.sectionId === "string" ? s.sectionId : s.sectionId._id;
}

export default function InstructorCoursesPage() {
  const router = useRouter();
  const { courses, loading, error } = useMyCourses();
  const { sessions: liveSessions, loading: liveLoading, startSession } = useSessions({ status: "live" });
  const [startingId, setStartingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const liveBySection = useMemo(() => {
    const map = new Map<string, SessionPopulated>();
    for (const s of liveSessions) {
      const sid = sectionIdFromSession(s);
      if (sid) map.set(sid, s);
    }
    return map;
  }, [liveSessions]);

  const onStart = async (sectionDbId: string, courseId: string | undefined) => {
    if (!courseId) return;
    setActionError(null);
    setStartingId(sectionDbId);
    try {
      const created = await startSession({ courseId, sectionId: sectionDbId });
      router.push(`/instructor/sessions/${created._id}/live`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start session";
      setActionError(msg);
    } finally {
      setStartingId(null);
    }
  };

  return (
    <>
      <div className="nx-page-head">
        <div>
          <h1 className="nx-page-title">My Courses</h1>
          <p className="nx-page-sub">Sections you teach this semester. Start a live session in one click.</p>
        </div>
      </div>

      {actionError && (
        <div className="nx-card" style={{ borderColor: "var(--nx-danger)" }}>
          <div className="nx-card-head">
            <div>
              <h3 className="nx-card-title" style={{ color: "var(--nx-danger)" }}>Couldn&apos;t start session</h3>
              <p className="nx-card-sub">{actionError}</p>
            </div>
          </div>
        </div>
      )}

      <div className="nx-card">
        <div className="nx-card-head">
          <div>
            <h3 className="nx-card-title">Assigned sections</h3>
            <p className="nx-card-sub">Each section can have at most one live session at a time.</p>
          </div>
          {!loading && !error && courses.length > 0 && (
            <span className="nx-filter-bar-count">{courses.length} assigned</span>
          )}
        </div>

        {loading ? (
          <div className="nx-empty"><span className="nx-spin" /></div>
        ) : error ? (
          <div className="nx-empty">
            <div className="nx-empty-title">Couldn&apos;t load courses</div>
            <div className="nx-empty-sub">{error}</div>
          </div>
        ) : courses.length === 0 ? (
          <div className="nx-empty">
            <div className="nx-empty-title">No assigned sections</div>
            <div className="nx-empty-sub">You haven&apos;t been assigned any sections yet.</div>
          </div>
        ) : (
          <div className="nx-tbl-wrap">
            <table className="nx-tbl">
              <thead>
                <tr>
                  <th scope="col">Course</th>
                  <th scope="col">Section</th>
                  <th scope="col">Enrolled</th>
                  <th scope="col">Status</th>
                  <th scope="col" style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => {
                  const live = liveBySection.get(c.sectionDbId);
                  const isStarting = startingId === c.sectionDbId;
                  return (
                    <tr key={c.sectionDbId}>
                      <td>
                        <div className="nx-user-cell-name">
                          {c.course?.code ?? "—"} · {c.course?.name ?? "Unknown course"}
                        </div>
                      </td>
                      <td className="nx-tbl-mono">{c.sectionId}</td>
                      <td className="nx-tbl-mono">
                        {c.enrolledCount}{c.capacity != null ? ` / ${c.capacity}` : ""}
                      </td>
                      <td>
                        {liveLoading ? (
                          <span className="nx-badge"><span className="nx-badge-dot" />…</span>
                        ) : live ? (
                          <span className="nx-badge nx-role-student">
                            <span className="nx-badge-dot" />
                            Live now
                          </span>
                        ) : (
                          <span className="nx-badge">
                            <span className="nx-badge-dot" />
                            Idle
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: "right", display: "flex", justifyContent: "flex-end", gap: 8 }}>
                        <button className="nx-btn nx-btn-ghost" disabled title="Materials surface coming soon">
                          Materials
                        </button>
                        {live ? (
                          <Link href={`/instructor/sessions/${live._id}/live`} className="nx-btn nx-btn-primary">
                            Resume session
                          </Link>
                        ) : (
                          <button
                            className="nx-btn nx-btn-primary"
                            onClick={() => onStart(c.sectionDbId, c.course?._id)}
                            disabled={isStarting || !c.course?._id}
                          >
                            {isStarting ? "Starting…" : "Start session"}
                          </button>
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
