"use client";

import React, { useState } from "react";
import { useSections } from "@/lib/hooks/use-sections";
import { useCourses } from "@/lib/hooks/use-courses";

export default function AdminSectionsPage() {
  const [page, setPage] = useState(1);
  const [courseId, setCourseId] = useState<string>("");
  const { sections, pagination, loading, error, refetch } = useSections({ page, limit: 20, courseId: courseId || undefined });
  const { courses } = useCourses({ limit: 100 });

  const courseLabel = (id?: string) => {
    if (!id) return "—";
    const c = courses.find(c => c._id === id);
    return c ? `${c.code} · ${c.name}` : id;
  };

  const total = pagination?.totalUsers ?? sections.length;

  return (
    <>
      <div className="nx-page-head">
        <div>
          <h1 className="nx-page-title">Sections</h1>
          <p className="nx-page-sub">
            {total} section{total !== 1 ? "s" : ""}
            <span className="nx-version-pill" style={{ marginLeft: 10 }}>Read-only</span>
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select
            className="nx-select"
            value={courseId}
            onChange={e => { setPage(1); setCourseId(e.target.value); }}
          >
            <option value="">All courses</option>
            {courses.map(c => <option key={c._id} value={c._id}>{c.code} · {c.name}</option>)}
          </select>
          <button className="nx-btn nx-btn-ghost" disabled={loading} onClick={refetch}>
            {loading ? <><span className="nx-spin" /> Checking…</> : "↻ Refresh"}
          </button>
        </div>
      </div>

      <div className="nx-card">
        {loading ? (
          <div className="nx-loading"><span className="nx-spin" /> Loading sections…</div>
        ) : error ? (
          <div className="nx-empty">
            <div className="nx-empty-title" style={{ color: "var(--nx-danger)" }}>Failed to load</div>
            <div className="nx-empty-sub">{error}</div>
          </div>
        ) : sections.length === 0 ? (
          <div className="nx-empty">
            <div className="nx-empty-title">No sections yet</div>
            <div className="nx-empty-sub">Sections are seeded on backend boot and synced from the SIS import.</div>
          </div>
        ) : (
          <div className="nx-tbl-wrap">
            <table className="nx-tbl">
              <thead>
                <tr>
                  <th style={{ width: "14%" }}>Code</th>
                  <th style={{ width: "32%" }}>Course</th>
                  <th style={{ width: "24%" }}>Schedule</th>
                  <th style={{ width: "16%" }}>Room</th>
                  <th style={{ width: "14%", textAlign: "right" }}>Capacity</th>
                </tr>
              </thead>
              <tbody>
                {sections.map(s => (
                  <tr key={s._id}>
                    <td><span className="nx-tbl-mono">{s.code}</span></td>
                    <td style={{ color: "var(--nx-fg-muted)" }}>{courseLabel(s.courseId)}</td>
                    <td>{s.schedule ?? "—"}</td>
                    <td className="nx-tbl-mono">{s.room ?? "—"}</td>
                    <td className="nx-tbl-mono" style={{ textAlign: "right" }}>{s.capacity ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="nx-pagination">
            <span className="nx-pagination-info">Page {pagination.currentPage} of {pagination.totalPages}</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="nx-btn nx-btn-ghost" disabled={!pagination.hasPrevPage} onClick={() => setPage(p => p - 1)}>Prev</button>
              <button className="nx-btn nx-btn-ghost" disabled={!pagination.hasNextPage}  onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
