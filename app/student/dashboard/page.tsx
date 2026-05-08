"use client";

import React from "react";
import { useAuth } from "@/lib/auth/auth-provider";

export default function StudentDashboardPage() {
  const { user } = useAuth();
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
          <p className="nx-page-sub">{today} · Welcome back, {user?.name?.split(" ")[0] ?? "Student"}</p>
        </div>
      </div>

      <div className="nx-kpi-strip">
        <KPI label="My courses" />
        <KPI label="Active sessions" />
        <KPI label="Pending questions" />
        <KPI label="Announcements" />
      </div>

      <div className="nx-grid-2">
        <div className="nx-card">
          <div className="nx-card-head">
            <div>
              <h3 className="nx-card-title">Active sessions</h3>
              <p className="nx-card-sub">Live lectures you can join right now</p>
            </div>
          </div>
          <div className="nx-empty">
            <div className="nx-empty-title">No active sessions</div>
            <div className="nx-empty-sub">When an instructor starts a live session in one of your courses, it will appear here.</div>
          </div>
        </div>

        <div className="nx-card">
          <div className="nx-card-head">
            <h3 className="nx-card-title">Quick links</h3>
          </div>
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            <a className="nx-btn nx-btn-ghost" href="/student/sessions">Active sessions</a>
            <a className="nx-btn nx-btn-ghost" href="/student/courses">My courses</a>
            <a className="nx-btn nx-btn-ghost" href="/student/announcements">Announcements</a>
          </div>
        </div>
      </div>

      <div className="nx-card">
        <div className="nx-card-head">
          <h3 className="nx-card-title">Recent announcements</h3>
          <p className="nx-card-sub">Updates from your instructors</p>
        </div>
        <div className="nx-empty">
          <div className="nx-empty-title">No announcements yet</div>
          <div className="nx-empty-sub">You&apos;ll see new course announcements here as instructors post them.</div>
        </div>
      </div>
    </>
  );
}

function KPI({ label }: { label: string }) {
  return (
    <div className="nx-kpi">
      <p className="nx-kpi-label">{label}</p>
      <div className="nx-kpi-value">—</div>
    </div>
  );
}
