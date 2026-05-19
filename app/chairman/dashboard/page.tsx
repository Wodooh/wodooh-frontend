"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-provider";
import { useChairmanMe, useChairmanAlerts, useChairmanSessions } from "@/lib/hooks/use-chairman";

export default function ChairmanDashboardPage() {
  const { user } = useAuth();
  const { data: me, loading: meLoading, error: meError } = useChairmanMe();
  const { data: alerts, loading: alertsLoading } = useChairmanAlerts();
  const { data: sessions, loading: sessionsLoading } = useChairmanSessions();

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const recentSessions = (sessions ?? []).slice(0, 5);
  const recentAlerts = (alerts ?? []).slice(0, 5);
  const liveCount = (sessions ?? []).filter(s => s.status === "live").length;

  const kpis = [
    { label: "Courses",       value: me?.counts.courseCount ?? "—",     hint: "in your department" },
    { label: "Sections",      value: me?.counts.sectionCount ?? "—",    hint: "total sections" },
    { label: "Instructors",   value: me?.counts.instructorCount ?? "—", hint: "teaching staff" },
    { label: "Students",      value: me?.counts.studentCount ?? "—",    hint: "enrolled in dept" },
    { label: "Live sessions", value: liveCount,                          hint: "right now" },
    { label: "Alerts",        value: (alerts ?? []).length,              hint: "to review" },
  ];

  return (
    <>
      <div className="nx-page-head">
        <div>
          <h1 className="nx-page-title">Overview</h1>
          <p className="nx-page-sub">
            {today} · {user?.name ?? "Chairman"}
            {me?.department?.name ? <> · {me.department.name}</> : null}
          </p>
        </div>
      </div>

      {meError ? (
        <div className="nx-card" style={{ padding: 16, color: "var(--nx-danger)" }}>
          {meError}
        </div>
      ) : null}

      <div className="nx-kpi-strip">
        {kpis.map(k => (
          <div className="nx-kpi" key={k.label}>
            <p className="nx-kpi-label">{k.label}</p>
            <div className="nx-kpi-value">{meLoading ? "…" : k.value}</div>
            <p className="nx-kpi-trend" style={{ color: "var(--nx-fg-muted)" }}>{k.hint}</p>
          </div>
        ))}
      </div>

      <div className="nx-card">
        <div className="nx-card-head">
          <div>
            <h3 className="nx-card-title">Recent sessions</h3>
            <p className="nx-card-sub">Latest sessions across your department</p>
          </div>
          <Link className="nx-btn nx-btn-ghost" href="/chairman/reports">View reports</Link>
        </div>
        <div className="nx-tbl-wrap">
          <table className="nx-tbl">
            <thead>
              <tr>
                <th scope="col">Course</th>
                <th scope="col">Section</th>
                <th scope="col">Instructor</th>
                <th scope="col">Started</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {sessionsLoading ? (
                <tr><td colSpan={5}>Loading…</td></tr>
              ) : recentSessions.length === 0 ? (
                <tr><td colSpan={5} style={{ color: "var(--nx-fg-muted)" }}>No sessions yet.</td></tr>
              ) : recentSessions.map(s => {
                const course = typeof s.courseId === "string" ? null : s.courseId;
                const section = typeof s.sectionId === "string" || !s.sectionId ? null : s.sectionId;
                const instr = typeof s.instructorId === "string" || !s.instructorId ? null : s.instructorId;
                return (
                  <tr key={s._id}>
                    <td>{course ? `${course.code} — ${course.name}` : "—"}</td>
                    <td className="nx-tbl-mono">{section ? String(section.sectionId) : "—"}</td>
                    <td>{instr?.name ?? "—"}</td>
                    <td className="nx-tbl-mono">{new Date(s.startedAt).toLocaleString()}</td>
                    <td>
                      <span className={`nx-badge ${s.status === "live" ? "nx-role-instructor" : "nx-role-chairman"}`}>
                        <span className="nx-badge-dot" />
                        {s.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="nx-card">
        <div className="nx-card-head">
          <div>
            <h3 className="nx-card-title">Active alerts</h3>
            <p className="nx-card-sub">System alerts for your department</p>
          </div>
          <Link className="nx-btn nx-btn-ghost" href="/chairman/alerts">View all</Link>
        </div>
        <div className="nx-tbl-wrap">
          <table className="nx-tbl">
            <thead>
              <tr>
                <th scope="col">Type</th>
                <th scope="col">Section</th>
                <th scope="col">Message</th>
                <th scope="col">Created</th>
              </tr>
            </thead>
            <tbody>
              {alertsLoading ? (
                <tr><td colSpan={4}>Loading…</td></tr>
              ) : recentAlerts.length === 0 ? (
                <tr><td colSpan={4} style={{ color: "var(--nx-fg-muted)" }}>No alerts.</td></tr>
              ) : recentAlerts.map(a => {
                const section = typeof a.sectionId === "string" || !a.sectionId ? null : a.sectionId;
                return (
                  <tr key={a._id}>
                    <td><span className="nx-version-pill">{a.type}</span></td>
                    <td className="nx-tbl-mono">{section ? String(section.sectionId) : "—"}</td>
                    <td>{a.message}</td>
                    <td className="nx-tbl-mono">{new Date(a.createdAt).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
