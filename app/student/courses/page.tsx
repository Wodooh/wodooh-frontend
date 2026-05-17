"use client";

/**
 * Student → My Courses.
 *
 * Backlog: US-C4 / FR-09 (view section materials), US-D1 / FR-11 (join the
 * active session of an enrolled section). Materials upload (US-C3) is owned
 * by the instructor; here we only surface what materials would be available.
 */

import React, { useMemo } from "react";
import Link from "next/link";
import { useMyCourses } from "@/lib/hooks/use-my-courses";
import { useSessions } from "@/lib/hooks/use-sessions";
import type { SessionPopulated } from "@/lib/types/session.types";

function sectionIdFromSession(s: SessionPopulated): string | null {
  if (!s.sectionId) return null;
  return typeof s.sectionId === "string" ? s.sectionId : s.sectionId._id;
}

export default function StudentCoursesPage() {
  const { courses, loading, error } = useMyCourses();
  const { sessions: liveSessions, loading: liveLoading } = useSessions({ status: "live" });

  const liveBySection = useMemo(() => {
    const map = new Map<string, SessionPopulated>();
    for (const s of liveSessions) {
      const sid = sectionIdFromSession(s);
      if (sid) map.set(sid, s);
    }
    return map;
  }, [liveSessions]);

  return (
    <>
      <div className="nx-page-head">
        <div>
          <h1 className="nx-page-title">My Courses</h1>
          <p className="nx-page-sub">Sections you&apos;re enrolled in this semester.</p>
        </div>
      </div>

      <div className="nx-card">
        <div className="nx-card-head">
          <div>
            <h3 className="nx-card-title">Enrolled sections</h3>
            <p className="nx-card-sub">Join a live session or review section materials.</p>
          </div>
          {!loading && !error && courses.length > 0 && (
            <span className="nx-filter-bar-count">{courses.length} enrolled</span>
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
            <div className="nx-empty-title">No courses yet</div>
            <div className="nx-empty-sub">
              You haven&apos;t enrolled in any sections. Contact your administrator if this is unexpected.
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
                  <th scope="col">Status</th>
                  <th scope="col" style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => {
                  const live = liveBySection.get(c.sectionDbId);
                  return (
                    <tr key={c.sectionDbId}>
                      <td>
                        <div className="nx-user-cell-name">
                          {c.course?.code ?? "—"} · {c.course?.name ?? "Unknown course"}
                        </div>
                      </td>
                      <td className="nx-tbl-mono">{c.sectionId}</td>
                      <td>{c.instructor?.name ?? "TBA"}</td>
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
                      <td style={{ textAlign: "right" }}>
                        {live ? (
                          <Link
                            href={`/student/sessions/${live._id}/live`}
                            className="nx-btn nx-btn-primary"
                          >
                            Join session
                          </Link>
                        ) : (
                          <button className="nx-btn nx-btn-ghost" disabled title="Materials surface coming soon">
                            View materials
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
