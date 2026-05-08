"use client";

import React from "react";
import { useAuth } from "@/lib/auth/auth-provider";

const TODAYS_CLASSES = [
  { code: "CS-401", name: "Advanced Algorithms", time: "10:00 – 11:00", room: "Eng-204" },
  { code: "CS-220", name: "Data Structures",    time: "13:00 – 14:30", room: "Eng-118" },
];

const PENDING_QUESTIONS = [
  { id: "Q-2026-0481", course: "CS-401", excerpt: "What's the time complexity of the median-of-medians selection?", asked: "12 min ago" },
  { id: "Q-2026-0479", course: "CS-220", excerpt: "Can you clarify the difference between an AVL tree and a red-black tree?", asked: "47 min ago" },
  { id: "Q-2026-0476", course: "CS-401", excerpt: "Is the assignment 3 deadline still Friday?", asked: "2h ago" },
];

export default function InstructorDashboardPage() {
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
          <p className="nx-page-sub">{today} · Welcome back, {user?.name?.split(" ")[0] ?? "Instructor"}</p>
        </div>
      </div>

      <div className="nx-kpi-strip">
        <KPI label="Active courses" value="—" />
        <KPI label="Today's classes" value={String(TODAYS_CLASSES.length)} />
        <KPI label="Pending questions" value={String(PENDING_QUESTIONS.length)} />
        <KPI label="Open sessions" value="—" />
      </div>

      <div className="nx-grid-2">
        <div className="nx-card">
          <div className="nx-card-head">
            <div>
              <h3 className="nx-card-title">Today's classes</h3>
              <p className="nx-card-sub">Scheduled sessions for {today}</p>
            </div>
          </div>
          {TODAYS_CLASSES.length === 0 ? (
            <div className="nx-empty">
              <div className="nx-empty-title">No classes today</div>
              <div className="nx-empty-sub">Enjoy the day off — your next session is tomorrow.</div>
            </div>
          ) : (
            <div className="nx-tbl-wrap">
              <table className="nx-tbl">
                <thead>
                  <tr>
                    <th scope="col">Course</th>
                    <th scope="col">Time</th>
                    <th scope="col">Room</th>
                    <th scope="col" style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {TODAYS_CLASSES.map(c => (
                    <tr key={c.code}>
                      <td>
                        <div className="nx-user-cell-name">{c.code} · {c.name}</div>
                      </td>
                      <td className="nx-tbl-mono">{c.time}</td>
                      <td className="nx-tbl-mono">{c.room}</td>
                      <td style={{ textAlign: "right" }}>
                        <button className="nx-btn nx-btn-ghost">Start session</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="nx-card">
          <div className="nx-card-head">
            <h3 className="nx-card-title">Quick actions</h3>
          </div>
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            <a className="nx-btn nx-btn-ghost" href="/instructor/courses">My courses</a>
            <a className="nx-btn nx-btn-ghost" href="/instructor/sessions">Sessions</a>
            <a className="nx-btn nx-btn-ghost" href="/instructor/gradebook">Grade book</a>
            <a className="nx-btn nx-btn-ghost" href="/instructor/announcements">Compose announcement</a>
          </div>
        </div>
      </div>

      <div className="nx-card">
        <div className="nx-card-head">
          <div>
            <h3 className="nx-card-title">Pending questions</h3>
            <p className="nx-card-sub">Anonymous student questions awaiting your reply</p>
          </div>
          <span className="nx-filter-bar-count">{PENDING_QUESTIONS.length} open</span>
        </div>
        {PENDING_QUESTIONS.length === 0 ? (
          <div className="nx-empty">
            <div className="nx-empty-title">All caught up</div>
            <div className="nx-empty-sub">There are no unanswered questions across your courses.</div>
          </div>
        ) : (
          <div className="nx-tbl-wrap">
            <table className="nx-tbl">
              <thead>
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Course</th>
                  <th scope="col">Question</th>
                  <th scope="col">Asked</th>
                  <th scope="col" style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {PENDING_QUESTIONS.map(q => (
                  <tr key={q.id}>
                    <td className="nx-tbl-mono">{q.id}</td>
                    <td><span className="nx-badge nx-role-instructor"><span className="nx-badge-dot" />{q.course}</span></td>
                    <td>{q.excerpt}</td>
                    <td className="nx-tbl-mono">{q.asked}</td>
                    <td style={{ textAlign: "right" }}>
                      <button className="nx-btn nx-btn-ghost">Open</button>
                    </td>
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

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="nx-kpi">
      <p className="nx-kpi-label">{label}</p>
      <div className="nx-kpi-value">{value}</div>
    </div>
  );
}
