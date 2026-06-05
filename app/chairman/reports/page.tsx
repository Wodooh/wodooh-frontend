"use client";

import React, { useState } from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Cell,
  Tooltip,
} from "recharts";
import {
  useChairmanSessions,
  useChairmanSessionReport,
  useChairmanCourses,
  useChairmanCourseCorrelation,
} from "@/lib/hooks/use-chairman";
import type { CourseCorrelation } from "@/lib/types/chairman.types";

export default function ChairmanReportsPage() {
  const { data: sessions, loading: sessionsLoading, error: sessionsError } = useChairmanSessions();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: report, loading: reportLoading, error: reportError } = useChairmanSessionReport(selectedId);

  const { data: courses, loading: coursesLoading, error: coursesError } = useChairmanCourses();
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const { data: correlation, loading: corrLoading, error: corrError } = useChairmanCourseCorrelation(selectedCourseId);

  return (
    <>
      <div className="nx-page-head">
        <div>
          <h1 className="nx-page-title">Reports</h1>
          <p className="nx-page-sub">Aggregated metrics per session — pick a session to load its report</p>
        </div>
      </div>

      <div className="nx-split-2">
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
              <Metric label="Questions"     value={report.questionCount} />
              <Metric label="Participants"  value={report.participantCount} />
              <Metric label="Opened"        value={report.openedCount} />
              <Metric label="Resolved"      value={report.resolvedCount} />
              <Metric label="Auto-resolved" value={report.autoResolvedCount} />
              <Metric label="Unresolved"    value={report.unresolvedCount} />
              <Metric label="TooFast"       value={report.reactionCounts.TooFast} />
              <Metric label="TooSlow"       value={report.reactionCounts.TooSlow} />
              <Metric label="Understood"    value={report.reactionCounts.Understood} />
              <Metric label="NotClear"      value={report.reactionCounts.NotClear} />
            </div>
          )}
        </div>
      </div>

      {/* FR-23 — course-level attendance × engagement × GPA correlation */}
      <div className="nx-card" style={{ marginTop: 16 }}>
        <div className="nx-card-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <h3 className="nx-card-title">Attendance × Engagement × GPA</h3>
          <select
            value={selectedCourseId ?? ""}
            onChange={e => setSelectedCourseId(e.target.value || null)}
            disabled={coursesLoading || !!coursesError}
            style={{
              padding: "6px 10px",
              background: "var(--nx-bg-sub)",
              border: "1px solid var(--nx-border)",
              borderRadius: 6,
              color: "var(--nx-fg)",
              fontFamily: "inherit",
              fontSize: 13,
            }}
          >
            <option value="">{coursesLoading ? "Loading courses…" : "Select a course…"}</option>
            {(courses ?? []).map(c => (
              <option key={c._id} value={c._id}>{c.code} — {c.name}</option>
            ))}
          </select>
        </div>

        {coursesError ? (
          <div style={{ padding: 16, color: "var(--nx-danger)" }}>{coursesError}</div>
        ) : !selectedCourseId ? (
          <div style={{ padding: 16, color: "var(--nx-fg-muted)" }}>
            Select a course to correlate attendance with engagement across its sessions
          </div>
        ) : corrError ? (
          <div style={{ padding: 16, color: "var(--nx-danger)" }}>{corrError}</div>
        ) : corrLoading ? (
          <div style={{ padding: 16, color: "var(--nx-fg-muted)" }}>Loading…</div>
        ) : !correlation ? null : (
          <CorrelationView correlation={correlation} />
        )}
      </div>
    </>
  );
}

function CorrelationView({ correlation }: { correlation: CourseCorrelation }) {
  const {
    coefficient,
    coefficientAttendanceGpa,
    coefficientEngagementGpa,
    gpaStudentCount,
    rows,
    totalSessions,
    studentCount,
  } = correlation;
  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 16 }}>
        <Coefficient label="Attendance × Engagement" value={coefficient} />
        <Coefficient label="Attendance × GPA" value={coefficientAttendanceGpa} />
        <Coefficient label="Engagement × GPA" value={coefficientEngagementGpa} />
        <Metric label="Students" value={studentCount} />
        <Metric label="With GPA" value={gpaStudentCount} />
        <Metric label="Sessions held" value={totalSessions} />
      </div>

      {rows.length === 0 ? (
        <div style={{ color: "var(--nx-fg-muted)", fontSize: 13 }}>No students to show for this course</div>
      ) : (
        <>
          <ScatterPanel correlation={correlation} />
          <div style={{ overflow: "auto" }}>
            <table className="nx-tbl" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--nx-fg-muted)" }}>
                  <th style={thStyle}>Student (anonymous)</th>
                  <th style={thStyle}>Attendance</th>
                  <th style={thStyle}>Engagement</th>
                  <th style={thStyle}>GPA</th>
                  <th style={thStyle}>Attended</th>
                  <th style={thStyle}>Absent (exc. / unexc.)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.anonymousCourseId} style={{ borderTop: "1px solid var(--nx-border)" }}>
                    <td className="nx-tbl-mono" style={tdStyle}>{r.anonymousCourseId}</td>
                    <td style={tdStyle}>{r.attendancePct === null ? "N/A" : `${Math.round(r.attendancePct * 100)}%`}</td>
                    <td style={tdStyle}>{r.engagementCount}</td>
                    <td style={tdStyle}>{r.gpa === null ? "N/A" : r.gpa.toFixed(2)}</td>
                    <td style={tdStyle}>{r.attendedSessions} / {totalSessions}</td>
                    <td style={tdStyle}>{r.absentSessions} ({r.excusedAbsences} / {r.unexcusedAbsences})</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

const GPA_SCALE_MAX = 5;

/**
 * Three variables in one view: x = attendance %, y = engagement count, GPA as
 * point colour (red→green gradient over the 0–5 scale). Students with no GPA on
 * record render in a neutral colour (never dropped) and sit outside the gradient
 * legend. Students with null attendance (no sessions held) have no x position,
 * so they are omitted from the plot with a noted count — the table still lists
 * them. Tooltip carries the pseudonym only; no name, email, or studentId.
 */
function ScatterPanel({ correlation }: { correlation: CourseCorrelation }) {
  const plotted = correlation.rows
    .filter(r => r.attendancePct !== null)
    .map(r => ({
      x: Math.round((r.attendancePct as number) * 100),
      y: r.engagementCount,
      gpa: r.gpa,
      anon: r.anonymousCourseId,
    }));
  const omittedNullAttendance = correlation.rows.length - plotted.length;
  const hasNullGpa = plotted.some(p => p.gpa === null);

  if (plotted.length === 0) {
    return (
      <div style={{ color: "var(--nx-fg-muted)", fontSize: 13, marginBottom: 16 }}>
        No sessions held yet — attendance is undefined, so there is nothing to plot.
        {omittedNullAttendance > 0 ? ` (${omittedNullAttendance} student(s) hidden.)` : ""}
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer>
          <ScatterChart margin={{ top: 8, right: 16, bottom: 28, left: 8 }}>
            <CartesianGrid stroke="var(--nx-border)" strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="x"
              name="Attendance"
              unit="%"
              domain={[0, 100]}
              tick={{ fill: "var(--nx-fg-muted)", fontSize: 11 }}
              stroke="var(--nx-border)"
              label={{ value: "Attendance %", position: "insideBottom", offset: -16, fill: "var(--nx-fg-muted)", fontSize: 12 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Engagement"
              allowDecimals={false}
              tick={{ fill: "var(--nx-fg-muted)", fontSize: 11 }}
              stroke="var(--nx-border)"
              label={{ value: "Engagement", angle: -90, position: "insideLeft", fill: "var(--nx-fg-muted)", fontSize: 12 }}
            />
            <ZAxis type="number" dataKey="y" range={[60, 60]} />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} content={<ScatterTooltip />} />
            <Scatter data={plotted} isAnimationActive={false}>
              {plotted.map(p => (
                <Cell key={p.anon} fill={gpaColor(p.gpa)} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <GpaLegend hasNullGpa={hasNullGpa} />
      {omittedNullAttendance > 0 && (
        <p style={{ color: "var(--nx-fg-muted)", fontSize: 11, marginTop: 6 }}>
          {omittedNullAttendance} student(s) with no sessions held are omitted from the plot (still listed below).
        </p>
      )}
    </div>
  );
}

/** GPA → red(low)→green(high) hue over the 0–5 scale; null GPA renders neutral. */
function gpaColor(gpa: number | null): string {
  if (gpa === null) return "var(--nx-fg-muted)";
  const t = Math.max(0, Math.min(1, gpa / GPA_SCALE_MAX));
  return `hsl(${Math.round(t * 120)}, 70%, 45%)`;
}

function GpaLegend({ hasNullGpa }: { hasNullGpa: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 10, fontSize: 11, color: "var(--nx-fg-muted)" }}>
      <span>GPA</span>
      <span>0.0</span>
      <span
        aria-hidden="true"
        style={{
          width: 140,
          height: 10,
          borderRadius: 5,
          background: `linear-gradient(to right, ${gpaColor(0)}, ${gpaColor(2.5)}, ${gpaColor(5)})`,
        }}
      />
      <span>5.0</span>
      {hasNullGpa && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, marginLeft: 8 }}>
          <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 5, background: "var(--nx-fg-muted)", display: "inline-block" }} />
          No GPA on record
        </span>
      )}
    </div>
  );
}

interface ScatterPoint { x: number; y: number; gpa: number | null; anon: string }

function ScatterTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ScatterPoint }> }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div style={{ background: "var(--nx-bg-elev)", border: "1px solid var(--nx-border)", borderRadius: 6, padding: "8px 10px", fontSize: 12 }}>
      <div className="nx-tbl-mono" style={{ color: "var(--nx-fg)", marginBottom: 4 }}>{p.anon}</div>
      <div style={{ color: "var(--nx-fg-muted)" }}>Attendance: {p.x}%</div>
      <div style={{ color: "var(--nx-fg-muted)" }}>Engagement: {p.y}</div>
      <div style={{ color: "var(--nx-fg-muted)" }}>GPA: {p.gpa === null ? "N/A" : p.gpa.toFixed(2)}</div>
    </div>
  );
}

function Coefficient({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="nx-kpi">
      <p className="nx-kpi-label">{label}</p>
      <div className="nx-kpi-value">{value === null ? "N/A" : value.toFixed(2)}</div>
      <p className="nx-kpi-label" style={{ marginTop: 4 }}>{interpret(value)}</p>
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: "8px 10px", fontWeight: 500 };
const tdStyle: React.CSSProperties = { padding: "8px 10px", color: "var(--nx-fg)" };

/** Plain one-line reading of a Pearson coefficient. */
function interpret(r: number | null): string {
  if (r === null) return "N/A (insufficient data)";
  const mag = Math.abs(r);
  const strength =
    mag < 0.1 ? "negligible" :
    mag < 0.3 ? "weak" :
    mag < 0.5 ? "moderate" :
    mag < 0.7 ? "strong" : "very strong";
  if (mag < 0.1) return "negligible correlation";
  const direction = r > 0 ? "positive" : "negative";
  return `${strength} ${direction} correlation`;
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="nx-kpi">
      <p className="nx-kpi-label">{label}</p>
      <div className="nx-kpi-value">{value}</div>
    </div>
  );
}
