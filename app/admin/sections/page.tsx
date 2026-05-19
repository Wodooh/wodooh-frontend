"use client";

import React, { useState } from "react";
import { useSections } from "@/lib/hooks/use-sections";
import { useCourses } from "@/lib/hooks/use-courses";

export default function AdminSectionsPage() {
  const [courseId, setCourseId] = useState<string>("");
  const { courses, loading: coursesLoading } = useCourses({ limit: 100 });
  const selectedCourseId = courseId;
  const { sections, loading, error, refetch } = useSections(selectedCourseId);

  const courseLabel = (id?: string) => {
    if (!id) return "—";
    const c = courses.find(c => c._id === id);
    return c ? `${c.code} · ${c.name}` : id;
  };

  const total = sections.length;

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
            value={selectedCourseId}
            onChange={e => { setCourseId(e.target.value); }}
          >
            <option value="">Select a course</option>
            {courses.map(c => <option key={c._id} value={c._id}>{c.code} · {c.name}</option>)}
          </select>
          <button className="nx-btn nx-btn-ghost" disabled={loading} onClick={refetch}>
            {loading ? <><span className="nx-spin" /> Checking…</> : "↻ Refresh"}
          </button>
        </div>
      </div>

      <div className="nx-card">
        {!selectedCourseId ? (
          <div className="nx-empty">
            <div className="nx-empty-title">{coursesLoading ? "Loading courses…" : "Select a course"}</div>
            <div className="nx-empty-sub">Choose a course to view its sections.</div>
          </div>
        ) : loading ? (
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
                  <th style={{ width: "18%" }}>Section ID</th>
                  <th style={{ width: "44%" }}>Course</th>
                  <th style={{ width: "20%" }}>Instructor</th>
                  <th style={{ width: "18%" }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {sections.map(s => (
                  <tr key={s._id}>
                    <td><span className="nx-tbl-mono">{s.sectionId}</span></td>
                    <td style={{ color: "var(--nx-fg-muted)" }}>{courseLabel(s.courseId)}</td>
                    <td>
                      {s.instructorId && typeof s.instructorId === "object" && "name" in s.instructorId
                        ? s.instructorId.name
                        : "—"}
                    </td>
                    <td className="nx-tbl-mono">{new Date(s.createdAt).toLocaleDateString()}</td>
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
