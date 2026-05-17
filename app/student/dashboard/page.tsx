"use client";

import React from "react";
import { useAuth } from "@/lib/auth/auth-provider";
import { useMyCourses } from "@/lib/hooks/use-my-courses";

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const { courses, loading, error } = useMyCourses();
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

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
        </div>
        <div className="nx-empty">
          <div className="nx-empty-title">No active sessions</div>
          <div className="nx-empty-sub">When an instructor starts a live session in one of your courses, it will appear here.</div>
        </div>
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
