"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";
import API_ENDPOINTS from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/auth-provider";
import { useMyCourses } from "@/lib/hooks/use-my-courses";
import { displayFirstName, timeGreeting } from "@/lib/utils";
import type { SessionPopulated } from "@/lib/types/session.types";

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const { courses, loading, error } = useMyCourses();
  const router = useRouter();
  const [liveSessions, setLiveSessions] = useState<SessionPopulated[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  const now = new Date();
  const today = now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const greeting = timeGreeting(now.getHours());
  const firstName = displayFirstName(user);

  useEffect(() => {
    let cancelled = false;
    setSessionsLoading(true);

    // Note: a transient error here makes the strip stay hidden (which is the
    // empty-state behavior anyway). No retry / no error card — absence is
    // silent. A persistent failure surfaces when the student opens the
    // sessions page.
    apiClient.get<SessionPopulated[]>(`${API_ENDPOINTS.SESSIONS}?status=live`)
      .then(res => {
        if (cancelled) return;
        if (res.status === "success" && res.data) {
          setLiveSessions(res.data);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setLiveSessions([]);
      })
      .finally(() => {
        if (!cancelled) setSessionsLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  const hasLive = !sessionsLoading && liveSessions.length > 0;

  return (
    <>
      <div className="nx-page-head">
        <div>
          <h1 className="nx-page-title">{greeting}, {firstName}</h1>
          <p className="nx-page-sub">{today}</p>
        </div>
      </div>

      {/* Live strip — only renders when there's at least one live session.
          No empty card; absence is silent. */}
      {hasLive && (
        <section className="nx-live-strip" aria-label="Live sessions">
          <div className="nx-live-strip-head">
            <div className="nx-live-strip-title">
              <span className="nx-live-dot" aria-hidden="true" />
              <span>Live now</span>
            </div>
            <span className="nx-filter-bar-count">
              {liveSessions.length} {liveSessions.length === 1 ? "session" : "sessions"}
            </span>
          </div>
          <ul className="nx-live-strip-list">
            {liveSessions.map(s => {
              const course = s.courseId && typeof s.courseId === "object" ? s.courseId : null;
              const section = s.sectionId && typeof s.sectionId === "object" ? s.sectionId : null;
              const instr = s.instructorId && typeof s.instructorId === "object" ? s.instructorId : null;
              return (
                <li key={s._id} className="nx-live-strip-item">
                  <div className="nx-live-strip-item-meta">
                    <div className="nx-live-strip-item-course">
                      {course?.code ?? "—"} · {course?.name ?? "Unknown course"}
                    </div>
                    <div className="nx-live-strip-item-sub">
                      Section {section?.sectionId ?? "—"} · {instr?.name ?? "TBA"}
                    </div>
                  </div>
                  <button
                    className="nx-btn nx-btn-primary"
                    onClick={() => router.push(`/student/sessions/${s._id}/live`)}
                  >
                    Join
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="nx-card">
        <div className="nx-card-head">
          <div>
            <h3 className="nx-card-title">My courses</h3>
            <p className="nx-card-sub">Sections you&apos;re enrolled in</p>
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
            <div className="nx-empty-sub">You haven&apos;t enrolled in any sections. Contact your administrator if this is unexpected.</div>
          </div>
        ) : (
          <div className="nx-tbl-wrap">
            <table className="nx-tbl">
              <thead>
                <tr>
                  <th scope="col">Course</th>
                  <th scope="col">Section</th>
                  <th scope="col">Instructor</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => (
                  <tr key={c.sectionDbId}>
                    <td>
                      <div className="nx-user-cell-name">
                        {c.course?.code ?? "—"} · {c.course?.name ?? "Unknown course"}
                      </div>
                    </td>
                    <td className="nx-tbl-mono">{c.sectionId}</td>
                    <td>{c.instructor?.name ?? "TBA"}</td>
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
