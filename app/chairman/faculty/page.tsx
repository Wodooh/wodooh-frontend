"use client";

import React from "react";
import { useChairmanInstructors } from "@/lib/hooks/use-chairman";

export default function ChairmanFacultyPage() {
  const { data, loading, error } = useChairmanInstructors();

  return (
    <>
      <div className="nx-page-head">
        <div>
          <h1 className="nx-page-title">Faculty</h1>
          <p className="nx-page-sub">Instructors teaching in your department</p>
        </div>
      </div>

      {error ? <div className="nx-card" style={{ padding: 16, color: "var(--nx-danger)" }}>{error}</div> : null}

      <div className="nx-card">
        <div className="nx-card-head">
          <div>
            <h3 className="nx-card-title">Instructors</h3>
            <p className="nx-card-sub">{loading ? "Loading…" : `${(data ?? []).length} instructor(s)`}</p>
          </div>
        </div>
        <div className="nx-tbl-wrap">
          <table className="nx-tbl">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Sections in dept</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3}>Loading…</td></tr>
              ) : (data ?? []).length === 0 ? (
                <tr><td colSpan={3} style={{ color: "var(--nx-fg-muted)" }}>No instructors in this department.</td></tr>
              ) : (data ?? []).map(i => (
                <tr key={i._id}>
                  <td>{i.name}</td>
                  <td className="nx-tbl-mono">{i.email}</td>
                  <td className="nx-tbl-mono">{i.assignedSectionCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
