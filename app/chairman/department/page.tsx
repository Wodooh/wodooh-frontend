"use client";

import React from "react";
import Link from "next/link";
import { useChairmanMe, useChairmanCourses } from "@/lib/hooks/use-chairman";

export default function ChairmanDepartmentPage() {
  const { data: me, loading: meLoading } = useChairmanMe();
  const { data: courses, loading: coursesLoading } = useChairmanCourses();

  const dept = me?.department;
  const college = typeof dept?.collegeId === "string" || !dept?.collegeId ? null : dept.collegeId;

  return (
    <>
      <div className="nx-page-head">
        <div>
          <h1 className="nx-page-title">My department</h1>
          <p className="nx-page-sub">The single department under your chairmanship</p>
        </div>
      </div>

      <div className="nx-card">
        <div className="nx-card-head">
          <div>
            <h3 className="nx-card-title">{meLoading ? "…" : dept?.name ?? "Unassigned"}</h3>
            <p className="nx-card-sub">{dept?.description ?? "—"}</p>
          </div>
          <span className="nx-version-pill">{dept?.code ?? "—"}</span>
        </div>
        <div style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          <div>
            <p className="nx-kpi-label">College</p>
            <p style={{ fontSize: 14 }}>{college?.name ?? "—"}</p>
          </div>
          <div>
            <p className="nx-kpi-label">Code</p>
            <p style={{ fontSize: 14 }} className="nx-tbl-mono">{dept?.code ?? "—"}</p>
          </div>
          <div>
            <p className="nx-kpi-label">Courses</p>
            <p style={{ fontSize: 14 }} className="nx-tbl-mono">{me?.counts.courseCount ?? "—"}</p>
          </div>
          <div>
            <p className="nx-kpi-label">Sections</p>
            <p style={{ fontSize: 14 }} className="nx-tbl-mono">{me?.counts.sectionCount ?? "—"}</p>
          </div>
          <div>
            <p className="nx-kpi-label">Instructors</p>
            <p style={{ fontSize: 14 }} className="nx-tbl-mono">{me?.counts.instructorCount ?? "—"}</p>
          </div>
          <div>
            <p className="nx-kpi-label">Students</p>
            <p style={{ fontSize: 14 }} className="nx-tbl-mono">{me?.counts.studentCount ?? "—"}</p>
          </div>
        </div>
      </div>

      <div className="nx-card">
        <div className="nx-card-head">
          <div>
            <h3 className="nx-card-title">Courses in {dept?.code ?? "this department"}</h3>
            <p className="nx-card-sub">Click a course to drill into its sections and students</p>
          </div>
        </div>
        <div className="nx-tbl-wrap">
          <table className="nx-tbl">
            <thead>
              <tr>
                <th scope="col">Code</th>
                <th scope="col">Name</th>
                <th scope="col">Credits</th>
                <th scope="col">Sections</th>
                <th scope="col" style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {coursesLoading ? (
                <tr><td colSpan={5}>Loading…</td></tr>
              ) : (courses ?? []).length === 0 ? (
                <tr><td colSpan={5} style={{ color: "var(--nx-fg-muted)" }}>No courses in this department.</td></tr>
              ) : (courses ?? []).map(c => (
                <tr key={c._id}>
                  <td className="nx-tbl-mono">{c.code}</td>
                  <td>{c.name}</td>
                  <td className="nx-tbl-mono">{c.credits ?? "—"}</td>
                  <td className="nx-tbl-mono">{c.sectionCount}</td>
                  <td style={{ textAlign: "right" }}>
                    <Link className="nx-btn nx-btn-ghost" href={`/chairman/courses/${c._id}`}>Open</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
