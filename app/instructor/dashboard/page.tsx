"use client";

import React from "react";
import { useAuth } from "@/lib/auth/auth-provider";
import { useMyCourses } from "@/lib/hooks/use-my-courses";

export default function InstructorDashboardPage() {
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
          <p className="nx-page-sub">
            {today} · Welcome back, {user?.name?.split(" ")[0] ?? "Instructor"}
          </p>
        </div>
      </div>

      <div className="nx-kpi-strip">
        <KPI label="Assigned sections" value={loading ? "…" : String(courses.length)} />
      </div>

      <div className="nx-card">
        <div className="nx-card-head">
          <div>
            <h3 className="nx-card-title">My courses</h3>
            <p className="nx-card-sub">Sections you&apos;re teaching</p>
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
                  <th scope="col" style={{ textAlign: "right" }}>Actions</th>
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
                    <td className="nx-tbl-mono">
                      {c.enrolledCount}{c.capacity != null ? ` / ${c.capacity}` : ""}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button className="nx-btn nx-btn-ghost">Start session</button>
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

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="nx-kpi">
      <p className="nx-kpi-label">{label}</p>
      <div className="nx-kpi-value">{value}</div>
    </div>
  );
}
