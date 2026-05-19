"use client";

import React, { useState } from "react";
import { useChairmanSessions, useChairmanSessionReport } from "@/lib/hooks/use-chairman";

export default function ChairmanReportsPage() {
  const { data: sessions, loading: sessionsLoading, error: sessionsError } = useChairmanSessions();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: report, loading: reportLoading, error: reportError } = useChairmanSessionReport(selectedId);

  return (
    <>
      <div className="nx-page-head">
        <div>
          <h1 className="nx-page-title">Reports</h1>
          <p className="nx-page-sub">Aggregated metrics per session — pick a session to load its report</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 1fr) 2fr", gap: 16, alignItems: "start" }}>
        <div className="nx-card">
          <div className="nx-card-head">
            <h3 className="nx-card-title">Sessions</h3>
          </div>
          {sessionsError ? (
            <div style={{ padding: 16, color: "var(--nx-danger)" }}>{sessionsError}</div>
          ) : sessionsLoading ? (
            <div style={{ padding: 16, color: "var(--nx-fg-muted)" }}>Loading…</div>
          ) : (sessions ?? []).length === 0 ? (
            <div style={{ padding: 16, color: "var(--nx-fg-muted)" }}>No sessions to show</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", maxHeight: 480, overflow: "auto" }}>
              {(sessions ?? []).map(s => {
                const course = typeof s.courseId === "string" || !s.courseId ? null : s.courseId;
                const section = typeof s.sectionId === "string" || !s.sectionId ? null : s.sectionId;
                const isSelected = s._id === selectedId;
                return (
                  <button
                    key={s._id}
                    type="button"
                    onClick={() => setSelectedId(s._id)}
                    style={{
                      textAlign: "left",
                      padding: "10px 14px",
                      background: isSelected ? "var(--nx-bg-sub)" : "transparent",
                      border: 0,
                      borderBottom: "1px solid var(--nx-border)",
                      cursor: "pointer",
                      color: "var(--nx-fg)",
                      fontFamily: "inherit",
                      fontSize: 13,
                    }}
                  >
                    <div style={{ fontWeight: 500 }}>
                      {course?.code ?? "?"} — section {section?.sectionId ?? "?"}
                      {s.status === "live" ? <span style={{ marginLeft: 6, color: "var(--nx-success)" }}>(live)</span> : null}
                    </div>
                    <div className="nx-tbl-mono" style={{ color: "var(--nx-fg-muted)", fontSize: 11 }}>
                      {new Date(s.startedAt).toLocaleString()}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="nx-card">
          <div className="nx-card-head">
            <h3 className="nx-card-title">Report</h3>
          </div>
          {!selectedId ? (
            <div style={{ padding: 16, color: "var(--nx-fg-muted)" }}>Select a session to load its report</div>
          ) : reportError ? (
            <div style={{ padding: 16, color: "var(--nx-danger)" }}>{reportError}</div>
          ) : reportLoading ? (
            <div style={{ padding: 16, color: "var(--nx-fg-muted)" }}>Loading…</div>
          ) : !report ? null : (
            <div style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
              <Metric label="Questions"   value={report.questionCount} />
              <Metric label="Participants" value={report.participantCount} />
              <Metric label="Opened"      value={report.openedCount} />
              <Metric label="Resolved"    value={report.resolvedCount} />
              <Metric label="TooFast"     value={report.reactionCounts.TooFast} />
              <Metric label="TooSlow"     value={report.reactionCounts.TooSlow} />
              <Metric label="Understood"  value={report.reactionCounts.Understood} />
              <Metric label="NotClear"    value={report.reactionCounts.NotClear} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="nx-kpi">
      <p className="nx-kpi-label">{label}</p>
      <div className="nx-kpi-value">{value}</div>
    </div>
  );
}
