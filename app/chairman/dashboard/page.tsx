"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth/auth-provider";

const KPIS = [
  { label: "Total enrolled",     value: "3,847", trend: "↑ 12.4% vs last semester", kind: "up" },
  { label: "Faculty count",      value: "214",   trend: "↑ 3.8% vs last semester",  kind: "up" },
  { label: "Pass rate",          value: "87.6%", trend: "↓ 1.2% vs last semester",  kind: "down" },
  { label: "Pending approvals",  value: "23",    trend: "Action required",           kind: "warn" },
] as const;

const APPROVAL_QUEUE = [
  { id: "REQ-2026-0481", title: "New course proposal: CS-512 Quantum Computing", submitter: "Dr. Vasquez",         submitted: "02 May 2026", type: "Course" },
  { id: "REQ-2026-0479", title: "Faculty sabbatical request",                    submitter: "Dr. Hartwell",        submitted: "01 May 2026", type: "Faculty" },
  { id: "REQ-2026-0476", title: "Curriculum revision: BS Software Engineering",  submitter: "Curriculum Cttee.",   submitted: "29 Apr 2026", type: "Curriculum" },
];

const DEPARTMENTS = [
  {
    id: "cs", name: "Computer Science", code: "CS", enrolled: "1,284", passRate: "89.2%",
    rows: [
      { id: "2024-CS-0041", name: "Aisha Rahman", course: "CS-401", grade: "A",  gpa: "3.85", status: "passed" as const },
      { id: "2024-CS-0118", name: "Lina Karimov", course: "CS-410", grade: "B+", gpa: "3.42", status: "passed" as const },
      { id: "2024-CS-0207", name: "Omar Faruq",   course: "CS-220", grade: "C",  gpa: "2.10", status: "passed" as const },
    ],
  },
  {
    id: "ee", name: "Electrical Engineering", code: "EE", enrolled: "892", passRate: "85.4%",
    rows: [
      { id: "2024-EE-0034", name: "Yusuf Hadid",     course: "EE-302", grade: "A-", gpa: "3.71", status: "passed" as const },
      { id: "2024-EE-0089", name: "Maryam Al-Saud",  course: "EE-415", grade: "F",  gpa: "1.20", status: "failed" as const },
    ],
  },
  {
    id: "math", name: "Mathematics", code: "MATH", enrolled: "671", passRate: "91.0%",
    rows: [
      { id: "2024-MA-0052", name: "Khalid Nasser",  course: "MATH-301", grade: "A", gpa: "3.92", status: "passed" as const },
      { id: "2024-MA-0144", name: "Rania Sabbagh",  course: "MATH-220", grade: "B", gpa: "3.05", status: "passed" as const },
    ],
  },
];

const POLICIES = [
  { id: "POL-2026-014", issued: "01 May 2026", title: "Updated academic integrity guidelines for Spring 2026", tags: ["Academic", "Mandatory"] },
  { id: "POL-2026-013", issued: "24 Apr 2026", title: "Revised faculty workload distribution framework",       tags: ["Faculty", "HR"] },
  { id: "POL-2026-012", issued: "18 Apr 2026", title: "Department budget allocation circular Q3 2026",          tags: ["Finance", "Internal"] },
];

export default function ChairmanDashboardPage() {
  const { user } = useAuth();
  const [openDept, setOpenDept] = useState<string>("cs");
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const trendColor = (kind: "up" | "down" | "warn") =>
    kind === "up"   ? "var(--nx-success)" :
    kind === "down" ? "var(--nx-danger)"  :
                      "var(--nx-warning)";

  return (
    <>
      <div className="nx-page-head">
        <div>
          <h1 className="nx-page-title">Overview</h1>
          <p className="nx-page-sub">{today} · {user?.name ?? "Department"} · Spring 2026</p>
        </div>
      </div>

      <div className="nx-kpi-strip">
        {KPIS.map(k => (
          <div className="nx-kpi" key={k.label}>
            <p className="nx-kpi-label">{k.label}</p>
            <div className="nx-kpi-value">{k.value}</div>
            <p className="nx-kpi-trend" style={{ color: trendColor(k.kind) }}>{k.trend}</p>
          </div>
        ))}
      </div>

      <div className="nx-grid-2">
        <div className="nx-card">
          <div className="nx-card-head">
            <div>
              <h3 className="nx-card-title">Approval queue</h3>
              <p className="nx-card-sub">Requests awaiting your decision</p>
            </div>
            <span className="nx-filter-bar-count">{APPROVAL_QUEUE.length} pending</span>
          </div>
          <div className="nx-tbl-wrap">
            <table className="nx-tbl">
              <thead>
                <tr>
                  <th scope="col">Request</th>
                  <th scope="col">Submitter</th>
                  <th scope="col">Submitted</th>
                  <th scope="col" style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {APPROVAL_QUEUE.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div className="nx-user-cell-name">{r.title}</div>
                      <div className="nx-user-cell-email">{r.id} · {r.type}</div>
                    </td>
                    <td>{r.submitter}</td>
                    <td className="nx-tbl-mono">{r.submitted}</td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <button className="nx-btn nx-btn-ghost">Review</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="nx-card">
          <div className="nx-card-head">
            <h3 className="nx-card-title">Quick links</h3>
          </div>
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            <a className="nx-btn nx-btn-ghost" href="/chairman/departments">Departments</a>
            <a className="nx-btn nx-btn-ghost" href="/chairman/faculty">Faculty</a>
            <a className="nx-btn nx-btn-ghost" href="/chairman/students">Students</a>
            <a className="nx-btn nx-btn-ghost" href="/chairman/reports">Reports</a>
            <a className="nx-btn nx-btn-ghost" href="/chairman/policy">Policy archive</a>
          </div>
        </div>
      </div>

      <div className="nx-card">
        <div className="nx-card-head">
          <div>
            <h3 className="nx-card-title">Departmental reports</h3>
            <p className="nx-card-sub">Spring 2026 · pass rates and recent grade entries</p>
          </div>
        </div>
        <div style={{ padding: "0 0 4px" }}>
          {DEPARTMENTS.map(d => {
            const open = openDept === d.id;
            return (
              <div
                key={d.id}
                style={{ borderBottom: "1px solid var(--nx-border)" }}
              >
                <button
                  type="button"
                  onClick={() => setOpenDept(open ? "" : d.id)}
                  aria-expanded={open}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "transparent",
                    border: 0,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    color: "var(--nx-fg)",
                    fontSize: 13,
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span className="nx-version-pill">{d.code}</span>
                    <span style={{ fontWeight: 500 }}>{d.name}</span>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 16, color: "var(--nx-fg-muted)" }}>
                    <span className="nx-tbl-mono">{d.enrolled} enrolled</span>
                    <span className="nx-tbl-mono">{d.passRate} pass</span>
                    <span style={{ width: 12, transition: "transform 150ms", transform: open ? "rotate(90deg)" : "rotate(0deg)" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m9 6 6 6-6 6" />
                      </svg>
                    </span>
                  </span>
                </button>
                {open && (
                  <div className="nx-tbl-wrap" style={{ background: "var(--nx-bg-sub)" }}>
                    <table className="nx-tbl">
                      <thead>
                        <tr>
                          <th scope="col">Student ID</th>
                          <th scope="col">Name</th>
                          <th scope="col">Course</th>
                          <th scope="col">Grade</th>
                          <th scope="col">GPA</th>
                          <th scope="col">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.rows.map(r => (
                          <tr key={r.id}>
                            <td className="nx-tbl-mono">{r.id}</td>
                            <td>{r.name}</td>
                            <td className="nx-tbl-mono">{r.course}</td>
                            <td className="nx-tbl-mono">{r.grade}</td>
                            <td className="nx-tbl-mono">{r.gpa}</td>
                            <td>
                              <span
                                className={`nx-badge ${r.status === "passed" ? "nx-role-instructor" : "nx-role-chairman"}`}
                              >
                                <span className="nx-badge-dot" />
                                {r.status === "passed" ? "Passed" : "Failed"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="nx-card">
        <div className="nx-card-head">
          <div>
            <h3 className="nx-card-title">Policy archive</h3>
            <p className="nx-card-sub">Recent policy circulars</p>
          </div>
          <a className="nx-btn nx-btn-ghost" href="/chairman/policy">View all</a>
        </div>
        <div className="nx-tbl-wrap">
          <table className="nx-tbl">
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Title</th>
                <th scope="col">Tags</th>
                <th scope="col">Issued</th>
              </tr>
            </thead>
            <tbody>
              {POLICIES.map(p => (
                <tr key={p.id}>
                  <td className="nx-tbl-mono">{p.id}</td>
                  <td>{p.title}</td>
                  <td>
                    <span style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {p.tags.map(t => (
                        <span key={t} className="nx-version-pill">{t}</span>
                      ))}
                    </span>
                  </td>
                  <td className="nx-tbl-mono">{p.issued}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
