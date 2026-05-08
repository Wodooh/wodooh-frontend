"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-provider";
import { ProtectedRoute } from "@/lib/auth/auth-provider";

const SIDEBAR_NAV = [
  { id: "overview", label: "Overview" },
  { id: "departments", label: "Departments" },
  { id: "faculty", label: "Faculty" },
  { id: "students", label: "Students" },
  { id: "reports", label: "Reports" },
  { id: "policy", label: "Policy" },
];

const KPI_CARDS = [
  {
    label: "Total Enrolled",
    value: "3,847",
    delta: "↑ 12.4% vs Last Semester",
    deltaColor: "#F0C020",
  },
  {
    label: "Faculty Count",
    value: "214",
    delta: "↑ 3.8% vs Last Semester",
    deltaColor: "#F0C020",
  },
  {
    label: "Pass Rate",
    value: "87.6%",
    delta: "↓ 1.2% vs Last Semester",
    deltaColor: "#991B1B",
  },
  {
    label: "Pending Approvals",
    value: "23",
    delta: "Action Required",
    deltaColor: "#92400E",
  },
];

const APPROVAL_QUEUE = [
  {
    id: "REQ-2026-0481",
    title: "New Course Proposal: CS-512 Quantum Computing",
    submitter: "Dr. Vasquez",
    submitted: "02 May 2026",
    type: "Course",
  },
  {
    id: "REQ-2026-0479",
    title: "Faculty Sabbatical Request",
    submitter: "Dr. Hartwell",
    submitted: "01 May 2026",
    type: "Faculty",
  },
  {
    id: "REQ-2026-0476",
    title: "Curriculum Revision: BS Software Engineering",
    submitter: "Curriculum Committee",
    submitted: "29 Apr 2026",
    type: "Curriculum",
  },
];

const DEPARTMENT_REPORTS = [
  {
    id: "cs",
    name: "Computer Science",
    code: "CS",
    enrolled: "1,284",
    passRate: "89.2%",
    rows: [
      { id: "2024-CS-0041", name: "Aisha Rahman", course: "CS-401", grade: "A", gpa: "3.85", status: "Passed" },
      { id: "2024-CS-0118", name: "Lina Karimov", course: "CS-410", grade: "B+", gpa: "3.42", status: "Passed" },
      { id: "2024-CS-0207", name: "Omar Faruq", course: "CS-220", grade: "C", gpa: "2.10", status: "Passed" },
    ],
  },
  {
    id: "ee",
    name: "Electrical Engineering",
    code: "EE",
    enrolled: "892",
    passRate: "85.4%",
    rows: [
      { id: "2024-EE-0034", name: "Yusuf Hadid", course: "EE-302", grade: "A-", gpa: "3.71", status: "Passed" },
      { id: "2024-EE-0089", name: "Maryam Al-Saud", course: "EE-415", grade: "F", gpa: "1.20", status: "Failed" },
    ],
  },
  {
    id: "math",
    name: "Mathematics",
    code: "MATH",
    enrolled: "671",
    passRate: "91.0%",
    rows: [
      { id: "2024-MA-0052", name: "Khalid Nasser", course: "MATH-301", grade: "A", gpa: "3.92", status: "Passed" },
      { id: "2024-MA-0144", name: "Rania Sabbagh", course: "MATH-220", grade: "B", gpa: "3.05", status: "Passed" },
    ],
  },
];

const POLICIES = [
  {
    id: "POL-2026-014",
    issued: "01 May 2026",
    title: "Updated Academic Integrity Guidelines for Spring 2026",
    tags: ["Academic", "Mandatory"],
  },
  {
    id: "POL-2026-013",
    issued: "24 Apr 2026",
    title: "Revised Faculty Workload Distribution Framework",
    tags: ["Faculty", "HR"],
  },
  {
    id: "POL-2026-012",
    issued: "18 Apr 2026",
    title: "Department Budget Allocation Circular Q3 2026",
    tags: ["Finance", "Internal"],
  },
];

function ChairmanDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [activeNav, setActiveNav] = useState("overview");
  const [openDept, setOpenDept] = useState<string | null>("cs");

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (user && user.role !== "chairman") {
      router.replace(
        user.role === "admin" ? "/admin/dashboard"
        : user.role === "instructor" ? "/instructor/dashboard"
        : "/student/dashboard"
      );
    }
  }, [loading, isAuthenticated, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0F0F0]">
        <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">
          Loading...
        </p>
      </div>
    );
  }

  if (!isAuthenticated || !user) return null;

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const pendingCount = APPROVAL_QUEUE.length;

  return (
    <div className="min-h-screen bg-[#F0F0F0] text-[#121212]">
      {/* Sidebar */}
      <aside
        role="navigation"
        aria-label="Chairman Portal Navigation"
        className="fixed left-0 top-0 bottom-0 w-64 border-r-4 border-[#121212] bg-[#121212] bauhaus-dot-grid-dark overflow-y-auto"
      >
        <div className="border-b-4 border-[#D02020] p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400">
            Wodooh University
          </p>
          <h2 className="font-black text-2xl mt-2 leading-tight text-white">
            Chairman Portal
          </h2>
          <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 mt-2">
            Vol. 2026 · Spring Semester
          </p>
        </div>

        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500 px-6 py-2 mt-4">
          Administration
        </p>
        <ul>
          {SIDEBAR_NAV.map((item) => {
            const active = activeNav === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setActiveNav(item.id)}
                  className={[
                    "w-full text-left px-6 py-3 font-black text-xs uppercase tracking-widest min-h-[44px] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D02020] focus-visible:ring-offset-2",
                    active
                      ? "bg-[#D02020] text-white"
                      : "text-neutral-300 hover:bg-neutral-800",
                  ].join(" ")}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="flex items-center justify-between w-full">
                    {item.label}
                    {item.id === "overview" && (
                      <span className="bg-white text-[#D02020] font-black text-xs px-2 py-0.5 leading-none">
                        {pendingCount}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="absolute bottom-0 left-0 right-0 border-t-4 border-[#121212] p-6 bg-[#121212]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 border-2 border-[#D02020] flex items-center justify-center font-mono text-xs uppercase text-white bg-[#D02020]">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate text-white">
                {user.name}
              </p>
              <span className="bg-[#D02020] text-white border-2 border-[#D02020] px-2 py-0.5 font-black text-[10px] uppercase tracking-widest inline-block mt-1">
                Chairman
              </span>
            </div>
          </div>
          <button
            id="logout-button-chairman"
            type="button"
            onClick={logout}
            className="w-full border-4 border-[#D02020] text-[#D02020] font-black text-xs uppercase tracking-widest px-6 py-3 hover:bg-[#D02020] hover:text-white transition-all duration-200 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D02020] focus-visible:ring-offset-2"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-64 max-w-screen-xl mx-auto px-6 py-8">
        {/* Black ticker strip — inverted section */}
        <section
          className="bg-[#121212] text-[#F0F0F0] py-3 px-6 font-mono text-xs uppercase tracking-widest relative overflow-hidden mb-8 flex items-center gap-6"
          aria-label="Live administrative ticker"
        >
          <span className="bg-[#D02020] text-[#F0F0F0] px-2 py-0.5 font-black text-[10px] uppercase tracking-widest shrink-0">
            ALERT
          </span>
          <span className="shrink-0">Senate Convening · 05 May 2026 · 10:00</span>
          <span className="text-[#525252] shrink-0">||</span>
          <span className="shrink-0">{pendingCount} Approvals Pending</span>
          <span className="text-[#525252] shrink-0">||</span>
          <span className="bg-[#D02020] text-[#F0F0F0] px-2 py-0.5 font-black text-[10px] uppercase tracking-widest shrink-0">
            LIVE
          </span>
          <span className="shrink-0">Spring 2026 Final Grades — Window Open</span>
        </section>

        {/* Title bar */}
        <header className="border-b-4 border-[#121212] pb-6 mb-8">
          <p className="font-mono text-xs uppercase tracking-widest text-neutral-500 mb-2">
            Department of Computer Science · Spring 2026
          </p>
          <h1 className="font-black text-5xl tracking-tight">
            Welcome, {user.name}
          </h1>
          <p className="text-base text-neutral-700 mt-3 leading-relaxed max-w-2xl">
            Department oversight, faculty governance, and academic policy
            review — all consolidated for the chairman&apos;s office.
          </p>
        </header>

        {/* KPI Row */}
        <section aria-labelledby="kpi-heading" className="mb-12">
          <h2 id="kpi-heading" className="sr-only">
            Key Performance Indicators
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {KPI_CARDS.map((kpi) => {
              const isPending = kpi.label === "Pending Approvals";
              return (
              <div
                key={kpi.label}
                className={[
                  "p-6 relative hard-shadow-hover transition-all duration-200",
                  isPending
                    ? "bg-[#FFF0F0] border-4 border-[#D02020] shadow-[6px_6px_0px_0px_#D02020]"
                    : "border-4 border-[#121212] shadow-[6px_6px_0px_0px_#121212] bg-white",
                ].join(" ")}
              >
                <p className="font-mono text-xs uppercase tracking-widest text-neutral-500 mb-1">
                  {kpi.label}
                </p>
                <p className="font-black text-5xl leading-none text-[#121212]">
                  {kpi.value}
                </p>
                <p
                  className="font-mono text-xs mt-2 uppercase tracking-wide"
                  style={{ color: kpi.deltaColor }}
                >
                  {kpi.delta}
                </p>
              </div>
              );
            })}
          </div>
        </section>

        {/* Row 2: Analytics 8/4 + Approval Queue */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-12">
          {/* Analytics panel */}
          <div className="lg:col-span-8 border-4 border-[#121212] shadow-[8px_8px_0px_0px_#121212] bg-white p-6">
            <p className="font-mono text-xs text-neutral-400 mb-4 uppercase tracking-widest">
              Wodooh University · Dept. of Computer Science · Spring 2026 ·
              Generated: 03 May 2026
            </p>
            <div className="flex items-baseline justify-between border-b-4 border-[#121212] pb-3 mb-4">
              <h3 className="font-black text-xl lg:text-2xl">
                Enrollment Analytics
              </h3>
              <span className="font-black text-xs uppercase tracking-widest text-neutral-600">
                Last 6 Semesters
              </span>
            </div>

            {/* Bar chart */}
            <div className="font-mono text-xs space-y-2">
              {[
                { term: "Fall 2023", value: 3120, bar: 62 },
                { term: "Spr 2024", value: 3290, bar: 66 },
                { term: "Fall 2024", value: 3410, bar: 68 },
                { term: "Spr 2025", value: 3580, bar: 72 },
                { term: "Fall 2025", value: 3710, bar: 74 },
                { term: "Spr 2026", value: 3847, bar: 77 },
              ].map((d) => (
                <div key={d.term} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 uppercase tracking-widest text-neutral-600">
                    {d.term}
                  </span>
                  <div
                    className="bg-[#D02020] h-6"
                    style={{ width: `${d.bar}%` }}
                    aria-hidden="true"
                  />
                  <span className="font-mono">{d.value.toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t-4 border-[#121212] grid grid-cols-3 gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                  Avg. GPA
                </p>
                <p className="font-black text-4xl text-[#121212] uppercase tracking-tight">3.21</p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                  Retention
                </p>
                <p className="font-black text-4xl text-[#121212] uppercase tracking-tight">94.8%</p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                  Graduation
                </p>
                <p className="font-black text-4xl text-[#121212] uppercase tracking-tight">82.3%</p>
              </div>
            </div>
          </div>

          {/* Approval Queue */}
          <aside
            className="lg:col-span-4 bg-[#FFF0F0] border-4 border-[#D02020] shadow-[6px_6px_0px_0px_#D02020] p-6"
            aria-labelledby="approval-heading"
          >
            <div className="flex items-baseline justify-between border-b-4 border-[#D02020] pb-3 mb-4">
              <h3
                id="approval-heading"
                className="font-black text-xl text-[#D02020]"
              >
                Approval Queue
              </h3>
              <span
                role="status"
                aria-live="polite"
                className="font-black text-xs px-2 py-0.5 uppercase tracking-wide bg-[#D02020] text-white border-2 border-[#D02020]"
              >
                {pendingCount} Pending
              </span>
            </div>

            <ul aria-live="polite" className="space-y-4">
              {APPROVAL_QUEUE.map((item) => (
                <li
                  key={item.id}
                  className="border-4 border-[#121212] border-l-[#D02020] bg-white p-4 shadow-[4px_4px_0px_0px_#121212]"
                  style={{ borderLeftColor: "#D02020", borderLeftWidth: "6px" }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                      {item.id}
                    </span>
                    <span className="font-black text-[10px] uppercase tracking-widest text-neutral-600">
                      {item.type}
                    </span>
                  </div>
                  <p className="font-bold text-sm leading-snug mb-2 text-[#121212]">
                    {item.title}
                  </p>
                  <p className="font-mono text-[11px] text-neutral-600 mb-3">
                    {item.submitter} · {item.submitted}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="flex-1 border-4 border-[#1040C0] text-[#1040C0] font-black uppercase tracking-widest text-[10px] px-3 py-2 hover:bg-[#1040C0] hover:text-white transition-all duration-200 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D02020] focus-visible:ring-offset-2"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="flex-1 border-4 border-[#D02020] text-[#D02020] font-black text-[10px] uppercase tracking-widest px-3 py-2 hover:bg-[#D02020] hover:text-white transition-all duration-200 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D02020] focus-visible:ring-offset-2"
                    >
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </aside>
        </section>

        {/* Section ornament */}
        <div className="py-6 text-center font-mono text-xs text-neutral-400 tracking-[1em] uppercase">
          · · · · ·
        </div>

        {/* Row 3: Departmental Reports accordion */}
        <section aria-labelledby="dept-heading" className="mb-12">
          <div className="flex items-baseline justify-between border-b-4 border-[#121212] pb-3 mb-6">
            <h2
              id="dept-heading"
              className="font-black text-2xl lg:text-3xl uppercase tracking-tight"
            >
              Departmental Reports
            </h2>
            <span className="font-black text-xs uppercase tracking-widest text-neutral-600">
              Spring 2026
            </span>
          </div>

          <div className="space-y-3">
            {DEPARTMENT_REPORTS.map((dept) => {
              const expanded = openDept === dept.id;
              return (
                <div
                  key={dept.id}
                  className="border-4 border-[#121212] shadow-[6px_6px_0px_0px_#121212] bg-white"
                >
                  <button
                    type="button"
                    onClick={() => setOpenDept(expanded ? null : dept.id)}
                    aria-expanded={expanded}
                    aria-controls={`dept-panel-${dept.id}`}
                    className="w-full flex items-center justify-between px-6 py-4 min-h-[44px] hover:bg-[#F0F0F0] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D02020] focus-visible:ring-offset-2"
                  >
                    <div className="flex items-center gap-4">
                      <span className="border-4 border-[#121212] font-black text-xs px-2 py-0.5 bg-[#D02020] text-white">
                        {dept.code}
                      </span>
                      <span className="font-black text-lg text-[#121212]">
                        {dept.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-6">
                      <span className="hidden sm:inline font-mono text-xs uppercase tracking-widest text-neutral-600">
                        Enrolled: <span className="text-[#121212] font-black">{dept.enrolled}</span>
                      </span>
                      <span className="hidden md:inline font-mono text-xs uppercase tracking-widest text-neutral-600">
                        Pass: <span className="text-[#121212] font-black">{dept.passRate}</span>
                      </span>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        className="transition-transform duration-300"
                        style={{
                          transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                        }}
                        aria-hidden="true"
                      >
                        <path
                          d="M3 6l5 5 5-5"
                          stroke="#121212"
                          strokeWidth="1.5"
                          fill="none"
                          strokeLinecap="square"
                        />
                      </svg>
                    </div>
                  </button>
                  <div
                    id={`dept-panel-${dept.id}`}
                    className="grid transition-all duration-300 ease-out"
                    style={{
                      gridTemplateRows: expanded ? "1fr" : "0fr",
                      opacity: expanded ? 1 : 0,
                    }}
                  >
                    <div className="overflow-hidden">
                      <div className="border-t-4 border-[#121212] p-6">
                        <p className="font-mono text-xs text-neutral-400 mb-4 uppercase tracking-widest">
                          Wodooh University · Dept. of {dept.name} · Spring
                          2026 · Generated: 03 May 2026
                        </p>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse border-4 border-[#121212] font-mono text-sm min-w-[640px]">
                            <thead>
                              <tr className="bg-[#121212] text-[#F0F0F0]">
                                <th
                                  scope="col"
                                  aria-sort="none"
                                  className="border border-[#333] px-4 py-3 text-left text-xs uppercase tracking-widest font-black"
                                >
                                  Student ID
                                </th>
                                <th
                                  scope="col"
                                  aria-sort="none"
                                  className="border border-[#333] px-4 py-3 text-left text-xs uppercase tracking-widest font-black"
                                >
                                  Name
                                </th>
                                <th
                                  scope="col"
                                  className="border border-[#333] px-4 py-3 text-left text-xs uppercase tracking-widest font-black"
                                >
                                  Course
                                </th>
                                <th
                                  scope="col"
                                  aria-sort="none"
                                  className="border border-[#333] px-4 py-3 text-left text-xs uppercase tracking-widest font-black"
                                >
                                  Grade
                                </th>
                                <th
                                  scope="col"
                                  aria-sort="none"
                                  className="border border-[#333] px-4 py-3 text-left text-xs uppercase tracking-widest font-black"
                                >
                                  GPA
                                </th>
                                <th
                                  scope="col"
                                  className="border border-[#333] px-4 py-3 text-left text-xs uppercase tracking-widest font-black"
                                >
                                  Status
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {dept.rows.map((r) => {
                                const passed = r.status === "Passed";
                                return (
                                  <tr
                                    key={r.id}
                                    className="hover:bg-[#F0F0F0] transition-colors duration-150"
                                  >
                                    <td className="border border-[#D4D4D4] px-4 py-3 font-mono">
                                      {r.id}
                                    </td>
                                    <td className="border border-[#D4D4D4] px-4 py-3 font-bold">
                                      {r.name}
                                    </td>
                                    <td className="border border-[#D4D4D4] px-4 py-3">
                                      <span className="border-2 border-[#121212] font-mono text-xs px-2 py-0.5">
                                        {r.course}
                                      </span>
                                    </td>
                                    <td className="border border-[#D4D4D4] px-4 py-3 font-mono">
                                      {r.grade}
                                    </td>
                                    <td className="border border-[#D4D4D4] px-4 py-3 font-mono">
                                      {r.gpa}
                                    </td>
                                    <td className="border border-[#D4D4D4] px-4 py-3">
                                      <span
                                        className={
                                          passed
                                            ? "font-black text-xs px-2 py-0.5 uppercase tracking-wide bg-[#F0C020] text-[#121212] border-2 border-[#121212]"
                                            : "font-black text-xs px-2 py-0.5 uppercase tracking-wide bg-[#D02020] text-white border-2 border-[#D02020]"
                                        }
                                      >
                                        {r.status}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Row 4: Policy & Circulars */}
        <section aria-labelledby="policy-heading" className="mb-12">
          <div className="flex items-baseline justify-between border-b-4 border-[#121212] pb-3 mb-6">
            <h2
              id="policy-heading"
              className="font-black text-2xl lg:text-3xl uppercase tracking-tight"
            >
              Policy &amp; Circulars
            </h2>
            <span className="font-black text-xs uppercase tracking-widest text-neutral-600">
              Recently Issued
            </span>
          </div>

          <ul className="divide-y-4 divide-[#121212] border-4 border-[#121212] shadow-[8px_8px_0px_0px_#121212] bg-white">
            {POLICIES.map((p) => (
              <li
                key={p.id}
                className="p-6 hover:bg-[#F0F0F0] transition-colors duration-150"
              >
                <div className="flex flex-wrap items-baseline gap-4 mb-2">
                  <span className="font-mono text-[11px] uppercase tracking-widest text-neutral-500">
                    {p.id}
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-widest text-neutral-500">
                    Issued: {p.issued}
                  </span>
                </div>
                <h3 className="font-black text-lg leading-snug mb-3 text-[#121212]">
                  {p.title}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {p.tags.map((t) => (
                    <span
                      key={t}
                      className="font-black text-[10px] uppercase tracking-widest border-2 border-[#121212] px-2 py-0.5 bg-[#F0C020] text-[#121212]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <footer className="border-t-4 border-[#121212] pt-6 pb-2 flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
            Wodooh University · Chairman Portal · {user.email}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
            Vol. 2026 · Spring Semester
          </p>
        </footer>
      </main>
    </div>
  );
}

export default function ChairmanDashboardPage() {
  return (
    <ProtectedRoute allowedRoles="chairman">
      <ChairmanDashboard />
    </ProtectedRoute>
  );
}
