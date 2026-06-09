"use client";

import React, { useState, useMemo } from "react";
import {
  useChairmanSessions,
  useChairmanSessionReport,
} from "@/lib/hooks/use-chairman";
import type { SessionReport, ChairmanSession } from "@/lib/types/chairman.types";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadialBarChart,
  RadialBar,
} from "recharts";

/* ------------------------------------------------------------------ */
/*  Colour palette — matches the existing nx- design-system tokens     */
/* ------------------------------------------------------------------ */

const COLORS = {
  opened:       "var(--nx-info,      #3b82f6)",
  resolved:     "var(--nx-success,   #22c55e)",
  autoResolved: "var(--nx-warning,   #f59e0b)",
  unresolved:   "var(--nx-danger,    #ef4444)",
  tooFast:      "#ef4444",
  tooSlow:      "#3b82f6",
  understood:   "#22c55e",
  notClear:     "#f59e0b",
  gauge:        "#22c55e",
  gaugeBg:      "var(--nx-border, #e2e8f0)",
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ChairmanReportsPage() {
  const { data: sessions, loading: sessionsLoading, error: sessionsError } = useChairmanSessions();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: report, loading: reportLoading, error: reportError } = useChairmanSessionReport(selectedId);

  const selectedSession = useMemo(
    () => (sessions ?? []).find(s => s._id === selectedId) ?? null,
    [sessions, selectedId],
  );

  return (
    <>
      <div className="nx-page-head">
        <div>
          <h1 className="nx-page-title">Reports</h1>
          <p className="nx-page-sub">Visual engagement analytics per session — pick a session to explore its data</p>
        </div>
      </div>

      <div className="nx-split-2">
        {/* ---------- SESSION PICKER (left) ---------- */}
        <div className="nx-card">
          <div className="nx-card-head">
            <div>
              <h3 className="nx-card-title">Sessions</h3>
              <p className="nx-card-sub">
                {sessionsLoading ? "Loading…" : `${(sessions ?? []).length} total`}
              </p>
            </div>
          </div>
          {sessionsError ? (
            <div style={{ padding: 16, color: "var(--nx-danger)" }}>{sessionsError}</div>
          ) : sessionsLoading ? (
            <div className="nx-empty"><span className="nx-spin" /></div>
          ) : (sessions ?? []).length === 0 ? (
            <div className="nx-empty">
              <div className="nx-empty-title">No sessions yet</div>
              <div className="nx-empty-sub">When instructors end sessions, they&apos;ll appear here.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", maxHeight: 580, overflow: "auto" }}>
              {(sessions ?? []).map(s => (
                <SessionButton key={s._id} session={s} selected={s._id === selectedId} onSelect={setSelectedId} />
              ))}
            </div>
          )}
        </div>

        {/* ---------- REPORT PANEL (right) ---------- */}
        <div className="nx-card" style={{ minHeight: 400 }}>
          <div className="nx-card-head">
            <div>
              <h3 className="nx-card-title">
                {selectedSession ? sessionTitle(selectedSession) : "Engagement Report"}
              </h3>
              {selectedSession && (
                <p className="nx-card-sub">
                  {new Date(selectedSession.startedAt).toLocaleString()}
                  {selectedSession.status === "live" ? " · 🟢 Live now" : ""}
                </p>
              )}
            </div>
          </div>

          {!selectedId ? (
            <div className="nx-empty">
              <div className="nx-empty-title">Select a session</div>
              <div className="nx-empty-sub">Pick a session from the list to explore its engagement report with charts.</div>
            </div>
          ) : reportError ? (
            <div style={{ padding: 16, color: "var(--nx-danger)" }}>{reportError}</div>
          ) : reportLoading ? (
            <div className="nx-empty"><span className="nx-spin" /></div>
          ) : !report ? null : (
            <ReportVisuals report={report} />
          )}
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Session button                                                     */
/* ------------------------------------------------------------------ */

function SessionButton({
  session: s,
  selected,
  onSelect,
}: {
  session: ChairmanSession;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const course = typeof s.courseId === "string" || !s.courseId ? null : s.courseId;
  const section = typeof s.sectionId === "string" || !s.sectionId ? null : s.sectionId;
  const instructor = typeof s.instructorId === "string" || !s.instructorId ? null : s.instructorId;

  return (
    <button
      type="button"
      onClick={() => onSelect(s._id)}
      style={{
        textAlign: "left",
        padding: "12px 16px",
        background: selected ? "var(--nx-bg-sub)" : "transparent",
        border: 0,
        borderBottom: "1px solid var(--nx-border)",
        borderLeft: selected ? "3px solid var(--nx-accent)" : "3px solid transparent",
        cursor: "pointer",
        color: "var(--nx-fg)",
        fontFamily: "inherit",
        fontSize: 13,
        transition: "background .15s, border-color .15s",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 2 }}>
        {course?.code ?? "?"} — Section {section?.sectionId ?? "?"}
        {s.status === "live" && <span style={{ marginLeft: 8, color: "var(--nx-success)", fontSize: 11 }}>● Live</span>}
      </div>
      {instructor && (
        <div style={{ fontSize: 11, color: "var(--nx-fg-muted)", marginBottom: 2 }}>
          {instructor.name}
        </div>
      )}
      <div className="nx-tbl-mono" style={{ color: "var(--nx-fg-muted)", fontSize: 11 }}>
        {new Date(s.startedAt).toLocaleString()}
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Report visuals — the chart-heavy panel                             */
/* ------------------------------------------------------------------ */

function ReportVisuals({ report }: { report: SessionReport }) {
  const { questionCount, openedCount, resolvedCount, autoResolvedCount, unresolvedCount, participantCount, reactionCounts } = report;

  /* ---------- Data for question donut ---------- */
  const questionData = useMemo(() => [
    { name: "Opened",        value: openedCount,       color: COLORS.opened },
    { name: "Resolved",      value: resolvedCount,     color: COLORS.resolved },
    { name: "Auto-resolved", value: autoResolvedCount, color: COLORS.autoResolved },
    { name: "Unresolved",    value: unresolvedCount,   color: COLORS.unresolved },
  ], [openedCount, resolvedCount, autoResolvedCount, unresolvedCount]);

  /* ---------- Data for reactions bar ---------- */
  const reactionData = useMemo(() => [
    { name: "Too Fast",  value: reactionCounts.TooFast,    fill: COLORS.tooFast },
    { name: "Too Slow",  value: reactionCounts.TooSlow,    fill: COLORS.tooSlow },
    { name: "Understood", value: reactionCounts.Understood, fill: COLORS.understood },
    { name: "Not Clear", value: reactionCounts.NotClear,   fill: COLORS.notClear },
  ], [reactionCounts]);

  const totalReactions = reactionCounts.TooFast + reactionCounts.TooSlow + reactionCounts.Understood + reactionCounts.NotClear;

  /* ---------- Insight generation ---------- */
  const questionInsight = useMemo(() => {
    if (questionCount === 0) return "No questions were asked in this session.";
    if (unresolvedCount === 0) return "All questions were resolved — great session!";
    const pct = Math.round((unresolvedCount / questionCount) * 100);
    if (pct > 30) return `⚠️ ${pct}% of questions remain unresolved — students may need follow-up.`;
    return `${pct}% of questions unresolved — mostly resolved.`;
  }, [questionCount, unresolvedCount]);

  const reactionInsight = useMemo(() => {
    if (totalReactions === 0) return "No reactions recorded in this session.";
    const negativeTotal = reactionCounts.TooFast + reactionCounts.NotClear;
    const positiveTotal = reactionCounts.Understood + reactionCounts.TooSlow;
    if (negativeTotal > positiveTotal * 1.5) return "⚠️ Negative reactions outweigh positive — the pace or clarity may need attention.";
    if (reactionCounts.Understood > totalReactions * 0.5) return "✅ Majority of reactions are positive — students are following along well.";
    return "Mixed reactions — consider reviewing pacing for this topic.";
  }, [reactionCounts, totalReactions]);

  return (
    <div style={{ padding: "8px 20px 24px" }}>
      {/* ---- KPI STRIP ---- */}
      <div className="nx-kpi-strip" style={{ marginBottom: 24 }}>
        <KPI label="Total Questions" value={questionCount} icon="💬" />
        <KPI label="Enrolled Students" value={participantCount} icon="🎓" />
        <KPI label="Total Reactions" value={totalReactions} icon="📊" />
        <KPI label="Unresolved" value={unresolvedCount} icon="⚠️" accent={unresolvedCount > 0 ? "var(--nx-danger, #ef4444)" : undefined} />
      </div>

      {/* ---- CHARTS ROW ---- */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>

        {/* == QUESTION DONUT == */}
        <div style={chartCardStyle}>
          <h4 style={chartTitleStyle}>Question Resolution Status</h4>
          <p style={chartSubStyle}>{questionInsight}</p>
          {questionCount === 0 ? (
            <div style={emptyChartStyle}>No data</div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={questionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {questionData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid var(--nx-border)" }}
                    formatter={(value: any, name: any) => [`${value} questions`, name]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value: string) => <span style={{ fontSize: 11, color: "var(--nx-fg-muted)" }}>{value}</span>}
                  />
                  {/* Center label */}
                  <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 28, fontWeight: 800, fill: "var(--nx-fg)" }}>
                    {questionCount}
                  </text>
                  <text x="50%" y="56%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 10, fill: "var(--nx-fg-muted)" }}>
                    total
                  </text>
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* == REACTION BAR == */}
        <div style={chartCardStyle}>
          <h4 style={chartTitleStyle}>Reaction Distribution</h4>
          <p style={chartSubStyle}>{reactionInsight}</p>
          {totalReactions === 0 ? (
            <div style={emptyChartStyle}>No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={reactionData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--nx-border, #e2e8f0)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "var(--nx-fg-muted)" }}
                  axisLine={{ stroke: "var(--nx-border)" }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "var(--nx-fg-muted)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid var(--nx-border)" }}
                  formatter={(value: any) => [`${value} reactions`]}
                  cursor={{ fill: "var(--nx-bg-hover, rgba(0,0,0,0.04))" }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {reactionData.map((entry, idx) => (
                    <Cell key={`bar-${idx}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ---- DETAILED BREAKDOWN ---- */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        {/* == QUESTION DETAILS == */}
        <div style={chartCardStyle}>
          <h4 style={chartTitleStyle}>Question Breakdown</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
            <MetricDetail label="Total asked" value={questionCount} />
            <MetricDetail label="Opened (visible)" value={openedCount} color={COLORS.opened} />
            <MetricDetail label="Resolved" value={resolvedCount} color={COLORS.resolved} />
            <MetricDetail label="Auto-resolved" value={autoResolvedCount} color={COLORS.autoResolved} />
            <MetricDetail label="Unresolved" value={unresolvedCount} color={COLORS.unresolved} />
            <MetricDetail label="Enrolled students" value={participantCount} />
          </div>
          {questionCount > 0 && participantCount > 0 && (
            <div style={statBarStyle}>
              <span style={{ fontSize: 11, color: "var(--nx-fg-muted)" }}>Questions per student:</span>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{(questionCount / participantCount).toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* == REACTION DETAILS == */}
        <div style={chartCardStyle}>
          <h4 style={chartTitleStyle}>Reaction Breakdown</h4>
          <div style={{ marginTop: 12 }}>
            {reactionData.map(r => {
              const pct = totalReactions > 0 ? Math.round((r.value / totalReactions) * 100) : 0;
              return (
                <div key={r.name} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span style={{ fontWeight: 500 }}>{r.name}</span>
                    <span style={{ color: "var(--nx-fg-muted)" }}>{r.value} ({pct}%)</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: "var(--nx-bg-sub, #f1f5f9)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, borderRadius: 4, background: r.fill, transition: "width .5s ease" }} />
                  </div>
                </div>
              );
            })}
          </div>
          {totalReactions > 0 && (
            <div style={statBarStyle}>
              <span style={{ fontSize: 11, color: "var(--nx-fg-muted)" }}>Positive ratio:</span>
              <span style={{ fontWeight: 700, fontSize: 14 }}>
                {Math.round(((reactionCounts.Understood + reactionCounts.TooSlow) / totalReactions) * 100)}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared sub-components                                              */
/* ------------------------------------------------------------------ */

function KPI({ label, value, icon, accent }: { label: string; value: number; icon: string; accent?: string }) {
  return (
    <div className="nx-kpi">
      <p className="nx-kpi-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span>{icon}</span> {label}
      </p>
      <div className="nx-kpi-value" style={accent ? { color: accent } : undefined}>{value}</div>
    </div>
  );
}

function MetricDetail({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ padding: "8px 10px", borderRadius: 8, background: "var(--nx-bg-sub, #f8fafc)" }}>
      <div style={{ fontSize: 11, color: "var(--nx-fg-muted)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: color ?? "var(--nx-fg)" }}>{value}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function sessionTitle(s: ChairmanSession): string {
  const course = typeof s.courseId === "string" || !s.courseId ? null : s.courseId;
  const section = typeof s.sectionId === "string" || !s.sectionId ? null : s.sectionId;
  return `${course?.code ?? "?"} — Section ${section?.sectionId ?? "?"}`;
}

/* ---- Inline style objects ---- */

const chartCardStyle: React.CSSProperties = {
  padding: "16px 18px",
  borderRadius: 12,
  border: "1px solid var(--nx-border, #e2e8f0)",
  background: "var(--nx-bg, #fff)",
};

const chartTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 14,
  fontWeight: 600,
  color: "var(--nx-fg)",
};

const chartSubStyle: React.CSSProperties = {
  margin: "4px 0 0",
  fontSize: 11,
  color: "var(--nx-fg-muted)",
  lineHeight: 1.4,
};

const emptyChartStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: 240,
  color: "var(--nx-fg-muted)",
  fontSize: 13,
};

const statBarStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: 14,
  padding: "8px 12px",
  borderRadius: 8,
  background: "var(--nx-bg-sub, #f8fafc)",
};
