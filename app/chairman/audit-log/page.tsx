"use client";

import React, { useState } from "react";
import { useChairmanAuditLog } from "@/lib/hooks/use-chairman";

export default function ChairmanAuditLogPage() {
  const [page, setPage] = useState(1);
  const { data, pagination, loading, error } = useChairmanAuditLog({ page, limit: 20 });

  return (
    <>
      <div className="nx-page-head">
        <div>
          <h1 className="nx-page-title">Audit log</h1>
          <p className="nx-page-sub">Every de-anonymization request you have made</p>
        </div>
      </div>

      {error ? <div className="nx-card" style={{ padding: 16, color: "var(--nx-danger)" }}>{error}</div> : null}

      <div className="nx-card">
        <div className="nx-card-head">
          <div>
            <h3 className="nx-card-title">DEANONYMIZE entries</h3>
            <p className="nx-card-sub">{pagination ? `${pagination.totalUsers} entry(ies)` : ""}</p>
          </div>
        </div>
        <div className="nx-tbl-wrap">
          <table className="nx-tbl">
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Course</th>
                <th scope="col">Anonymous ID</th>
                <th scope="col">Target student</th>
                <th scope="col">Justification</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5}>Loading…</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={5} style={{ color: "var(--nx-fg-muted)" }}>No audit entries yet.</td></tr>
              ) : data.map(e => (
                <tr key={e._id}>
                  <td className="nx-tbl-mono">{new Date(e.createdAt).toLocaleString()}</td>
                  <td className="nx-tbl-mono">{e.details?.courseCode ?? "—"}</td>
                  <td className="nx-tbl-mono">{e.details?.anonymousCourseId ?? "—"}</td>
                  <td className="nx-tbl-mono">{e.targetId ?? "—"}</td>
                  <td style={{ maxWidth: 320, whiteSpace: "normal" }}>{e.details?.justification ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination && pagination.totalPages > 1 ? (
          <div style={{ padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button className="nx-btn nx-btn-ghost" disabled={!pagination.hasPrevPage} onClick={() => setPage(p => Math.max(1, p - 1))}>← Previous</button>
            <span className="nx-tbl-mono">{pagination.currentPage} / {pagination.totalPages}</span>
            <button className="nx-btn nx-btn-ghost" disabled={!pagination.hasNextPage} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        ) : null}
      </div>
    </>
  );
}
