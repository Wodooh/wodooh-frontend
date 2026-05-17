"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";
import API_ENDPOINTS from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/auth-provider";
import { useMyCourses } from "@/lib/hooks/use-my-courses";

interface LiveSession {
  _id: string;
  status: "live" | "ended";
  startedAt: string;
  courseId: { _id: string; name: string; code: string };
  sectionId?: { _id: string; sectionId: number };
  instructorId: { _id: string; name: string; email: string };
}

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const { courses, loading, error } = useMyCourses();
  const router = useRouter();
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  useEffect(() => {
    let cancelled = false;
    setSessionsLoading(true);
    setSessionsError(null);

    apiClient.get<LiveSession[]>(`${API_ENDPOINTS.SESSIONS}?status=live`)
      .then(res => {
        if (cancelled) return;
        if (res.status === "success" && res.data) {
          setLiveSessions(res.data);
        } else {
          throw new Error(res.message || "Failed to fetch live sessions");
        }
      })
      .catch(err => {
        if (cancelled) return;
        setSessionsError(err?.message || "Failed to fetch live sessions");
        setLiveSessions([]);
      })
      .finally(() => {
        if (!cancelled) setSessionsLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <div className="nx-page-head">
        <div>
          <h1 className="nx-page-title">Dashboard</h1>
          <p className="nx-page-sub">{today} · Welcome back, {user?.name?.split(" ")[0] ?? "Student"}</p>
        </div>
      </div>

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

      <div className="nx-card">
        <div className="nx-card-head">
          <div>
            <h3 className="nx-card-title">Active sessions</h3>
            <p className="nx-card-sub">Live lectures you can join right now</p>
          </div>
          {!sessionsLoading && !sessionsError && liveSessions.length > 0 && (
            <span className="nx-filter-bar-count">{liveSessions.length} live</span>
          )}
        </div>
        {sessionsLoading ? (
          <div className="nx-empty"><span className="nx-spin" /></div>
        ) : sessionsError ? (
          <div className="nx-empty">
            <div className="nx-empty-title">Couldn&apos;t load sessions</div>
            <div className="nx-empty-sub">{sessionsError}</div>
          </div>
        ) : liveSessions.length === 0 ? (
          <div className="nx-empty">
            <div className="nx-empty-title">No active sessions</div>
            <div className="nx-empty-sub">When an instructor starts a live session in one of your courses, it will appear here.</div>
          </div>
        ) : (
          <div className="nx-tbl-wrap">
            <table className="nx-tbl">
              <thead>
                <tr>
                  <th scope="col">Course</th>
                  <th scope="col">Section</th>
                  <th scope="col">Instructor</th>
                  <th scope="col" style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {liveSessions.map((s) => (
                  <tr key={s._id}>
                    <td>
                      <div className="nx-user-cell-name">
                        {s.courseId?.code ?? "—"} · {s.courseId?.name ?? "Unknown course"}
                      </div>
                    </td>
                    <td className="nx-tbl-mono">{s.sectionId?.sectionId ?? "—"}</td>
                    <td>{s.instructorId?.name ?? "TBA"}</td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="nx-btn nx-btn-ghost"
                        onClick={() => router.push(`/student/sessions/${s._id}/live`)}
                      >
                        Join
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="nx-card">
        <div className="nx-card-head">
          <div>
            <h3 className="nx-card-title">Recent announcements</h3>
            <p className="nx-card-sub">Updates from your instructors</p>
          </div>
        </div>
        <div className="nx-empty">
          <div className="nx-empty-title">No announcements yet</div>
          <div className="nx-empty-sub">You&apos;ll see new course announcements here as instructors post them.</div>
        </div>
      </div>
    </>
  );
}
