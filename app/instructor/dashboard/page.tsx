"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-provider";
import { ProtectedRoute } from "@/lib/auth/auth-provider";

// ─── Sidebar nav item ──────────────────────────────────────
function NavItem({
  label,
  active = false,
}: {
  label: string;
  active?: boolean;
}) {
  return (
    <a
      href="#"
      className={
        active
          ? "block px-6 py-3 text-xs uppercase tracking-widest border-l-4 border-l-[#F0C020] bg-neutral-100 text-[#F0C020] min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0C020] focus-visible:ring-offset-2"
          : "block px-6 py-3 text-xs uppercase tracking-widest border-l-4 border-transparent text-neutral-700 hover:bg-neutral-100 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0C020] focus-visible:ring-offset-2"
      }
    >
      {label}
    </a>
  );
}

// ─── Course code chip ──────────────────────────────────────
function CourseCodeChip({ code }: { code: string }) {
  return (
    <span className="border border-[#121212] text-xs px-2 py-0.5">
      {code}
    </span>
  );
}

// ─── Status badge ──────────────────────────────────────
function StatusBadge({
  label,
  variant,
}: {
  label: string;
  variant: "active" | "overdue" | "pending" | "enrolled" | "draft";
}) {
  const styles: Record<typeof variant, string> = {
    active:
      "bg-[#DCFCE7] text-[#166534] border border-[#166534]",
    overdue:
      "bg-[#FEE2E2] text-[#991B1B] border border-[#991B1B]",
    pending:
      "bg-[#FEF3C7] text-[#92400E] border border-[#92400E]",
    draft:
      "bg-[#FEF3C7] text-[#92400E] border border-[#92400E]",
    enrolled:
      "bg-[#DBEAFE] text-[#1E3A5F] border border-[#1E3A5F]",
  };
  return (
    <span
      role="status"
      className={`text-xs px-2 py-0.5 uppercase tracking-wide ${styles[variant]}`}
    >
      {label}
    </span>
  );
}

function InstructorDashboardInner() {
  const router = useRouter();
  const { user, isAuthenticated, loading: isLoading, logout } = useAuth();

  const [isPending, setIsPending] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "roster" | "attendance" | "grades" | "materials"
  >("roster");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (user && user.role !== "instructor") {
      router.replace(
        user.role === "admin" ? "/admin/dashboard"
        : user.role === "chairman" ? "/chairman/dashboard"
        : "/student/dashboard"
      );
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("wodooh_instructor_onboarding");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.status === "pending") setIsPending(true);
      }
    } catch {
      // ignore
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F0F0F0] text-[#121212] flex items-center justify-center">
        <p className="text-xs uppercase tracking-widest text-neutral-500">
          Loading…
        </p>
      </div>
    );
  }

  if (!isAuthenticated || !user) return null;

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "??";

  return (
    <div className="min-h-screen bg-[#F0F0F0] text-[#121212]">
      {/* ── Sidebar ──────────────────────────────────── */}
      <aside
        className="fixed top-0 left-0 h-full w-64 border-r-4 border-[#121212] bg-[#F0F0F0] z-10 overflow-y-auto"
        role="navigation"
        aria-label="Faculty Portal Navigation"
      >
        {/* Sidebar header */}
        <div className="border-b-4 border-[#121212] p-6 bg-[#F0C020]">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#121212]">
            Wodooh University
          </p>
          <h2 className="text-2xl font-black mt-1 leading-tight uppercase tracking-tight">
            Faculty Portal
          </h2>
          <p className="text-[10px] uppercase tracking-[0.15em] text-[#121212] mt-2">
            Vol. 2026 · Spring Semester
          </p>
        </div>

        {/* Main nav section */}
        <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 px-6 py-2 mt-4">
          Main
        </p>
        <nav>
          <NavItem label="Dashboard" active />
          <NavItem label="My Courses" />
          <NavItem label="Grade Book" />
          <NavItem label="Announcements" />
          <NavItem label="Reports" />
        </nav>

        {/* Account section */}
        <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 px-6 py-2 mt-4">
          Account
        </p>
        <div className="px-6 py-3 flex items-start gap-3">
          <div className="w-12 h-12 border-4 border-[#121212] bg-[#F0C020] flex items-center justify-center shrink-0 shadow-[4px_4px_0px_0px_#121212]">
            <span className="text-sm font-black text-[#121212]">
              {initials}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight uppercase">
              {user.name}
            </p>
            <p className="text-xs text-neutral-500 break-all mt-0.5">
              {user.email}
            </p>
            <span className="inline-block mt-2 bg-[#F0C020] text-[#121212] border-2 border-[#F0C020] uppercase font-black text-[10px] tracking-widest px-2 py-1">
              Faculty
            </span>
          </div>
        </div>
        <div className="px-6 pb-6 mt-2">
          <button
            id="logout-button-instructor"
            onClick={logout}
            className="w-full border-4 border-[#D02020] text-[#D02020] font-black text-xs uppercase tracking-widest px-6 py-3 hover:bg-[#D02020] hover:text-white transition-colors duration-200 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0C020] focus-visible:ring-offset-2"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────── */}
      <main className="ml-64 max-w-screen-xl mx-auto px-6 py-8">
        {/* ── Page header ── */}
        <header className="dashboard-header mb-8 border-b-4 border-[#121212] pb-6">
          {/* Editorial metadata strip */}
          <p className="text-xs text-neutral-400 uppercase tracking-widest mb-4">
            Wodooh University · Faculty Portal · Spring 2026 · Generated: 03 May 2026
          </p>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 mb-1">
                Welcome,
              </p>
              <h1 className="text-6xl font-black uppercase tracking-tight leading-none">
                {user.name}
              </h1>
              <p className="text-sm lg:text-base text-neutral-700 mt-3 leading-relaxed">
                Signed in as <span className="font-mono">{user.email}</span>.{" "}
                {isPending
                  ? "Your application is under review. Read-only access is enabled."
                  : "Manage your courses, attendance, grades, and announcements."}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="bg-[#F0C020] text-[#121212] border-2 border-[#F0C020] uppercase font-black text-[10px] tracking-widest px-2 py-1">
                Faculty
              </span>
              {isPending && (
                <span
                  id="pending-pill-badge"
                  className="instructor-pending-pill text-xs px-3 py-1 uppercase tracking-wide"
                  role="status"
                >
                  Pending Review
                </span>
              )}
            </div>
          </div>
        </header>

        {/* ── Pending Approval Panel ── */}
        {isPending && (
          <section
            id="instructor-pending-banner"
            role="alert"
            className="instructor-pending-banner border-4 border-[#121212] border-l-8 border-l-[#F0C020] p-6 mb-8 shadow-[8px_8px_0px_0px_#121212]"
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <span className="text-xs px-2 py-0.5 uppercase tracking-widest bg-[#121212] text-[#F0C020] font-black">
                  Pending Review
                </span>
                <h2 className="text-2xl font-black mt-3 text-[#121212] uppercase tracking-tight">
                  Your profile is pending admin approval
                </h2>
              </div>
            </div>
            <p className="text-sm text-[#121212] leading-relaxed">
              You have <strong>read-only access</strong> until your instructor
              profile is verified. Lecture management, attendance tracking, and
              grading tools will unlock once an administrator approves your
              application.
            </p>
            <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 border-t-4 border-[#121212] pt-4">
              {[
                "Create Lecture Sessions",
                "Manage Attendance",
                "Grade Submissions",
                "Export Reports",
              ].map((feat) => (
                <li
                  key={feat}
                  className="text-xs uppercase tracking-widest text-[#121212] flex items-center gap-2 border-2 border-[#121212] px-3 py-2 bg-white font-bold"
                >
                  <span aria-hidden="true" className="text-base leading-none text-[#F0C020]">·</span>
                  {feat}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Row 1: 5/7 split — Today's Classes | Pending Grading ── */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* Today's Classes (5/12) */}
          <div className="dashboard-stat-card lg:col-span-5 border-4 border-[#121212] bg-[#F0F0F0] p-6 shadow-[8px_8px_0px_0px_#121212]">
            <p className="text-xs text-neutral-400 mb-4 uppercase tracking-widest">
              Today · 03 May 2026
            </p>
            <h2 className="text-2xl font-black mb-4 uppercase tracking-tight">
              Today&apos;s Classes
            </h2>
            <ul>
              {[
                {
                  code: "CS-401",
                  title: "Advanced Algorithms",
                  time: "10:00–11:00",
                  room: "Bldg 6 · Room 214",
                  first: true,
                },
                {
                  code: "CS-220",
                  title: "Data Structures",
                  time: "13:00–14:30",
                  room: "Bldg 6 · Room 108",
                  first: false,
                },
                {
                  code: "CS-305",
                  title: "Operating Systems Lab",
                  time: "15:00–17:00",
                  room: "Bldg 6 · Lab B",
                  first: false,
                },
              ].map((c) => (
                <li
                  key={c.code}
                  className={`py-3 flex items-center gap-3 border-b border-[#121212] last:border-b-0${c.first ? " border-l-8 border-l-[#F0C020] pl-3 -ml-3" : ""}`}
                >
                  <span className="text-lg font-black text-[#121212] whitespace-nowrap w-28 shrink-0">
                    {c.time}
                  </span>
                  <div className="flex items-start gap-2 min-w-0">
                    <CourseCodeChip code={c.code} />
                    <div className="min-w-0">
                      <p className="text-base font-bold truncate leading-tight uppercase">
                        {c.title}
                      </p>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {c.room}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Pending Grading Tasks (7/12) */}
          <div className="dashboard-stat-card lg:col-span-7 border-4 border-[#121212] bg-[#F0F0F0] p-6 shadow-[8px_8px_0px_0px_#121212]">
            <p className="text-xs text-neutral-400 mb-4 uppercase tracking-widest">
              Faculty Queue · Grading
            </p>
            <h2 className="text-2xl font-black mb-4 uppercase tracking-tight">
              Pending Grading Tasks
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border-4 border-[#121212] text-sm min-w-[640px]">
                <thead>
                  <tr className="bg-[#121212] text-[#F0F0F0]">
                    <th
                      scope="col"
                      className="border-2 border-[#333] px-4 py-3 text-left text-xs uppercase tracking-widest font-black"
                    >
                      Course
                    </th>
                    <th
                      scope="col"
                      className="border-2 border-[#333] px-4 py-3 text-left text-xs uppercase tracking-widest font-black"
                    >
                      Assignment
                    </th>
                    <th
                      scope="col"
                      className="border-2 border-[#333] px-4 py-3 text-left text-xs uppercase tracking-widest font-black"
                    >
                      Due
                    </th>
                    <th
                      scope="col"
                      className="border-2 border-[#333] px-4 py-3 text-left text-xs uppercase tracking-widest font-black"
                    >
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      code: "CS-401",
                      asg: "Midterm Project",
                      due: "05 May 2026",
                      status: "pending" as const,
                      label: "Pending",
                    },
                    {
                      code: "CS-220",
                      asg: "Lab 04 — Linked Lists",
                      due: "02 May 2026",
                      status: "overdue" as const,
                      label: "Overdue",
                    },
                    {
                      code: "CS-305",
                      asg: "Quiz 02",
                      due: "07 May 2026",
                      status: "draft" as const,
                      label: "Draft",
                    },
                  ].map((row) => (
                    <tr
                      key={`${row.code}-${row.asg}`}
                      className="hover:bg-neutral-100 transition-colors duration-150"
                    >
                      <td className="border-2 border-[#121212] px-4 py-3">
                        <CourseCodeChip code={row.code} />
                      </td>
                      <td className="border-2 border-[#121212] px-4 py-3">
                        {row.asg}
                      </td>
                      <td className="border-2 border-[#121212] px-4 py-3">
                        {row.due}
                      </td>
                      <td className="border-2 border-[#121212] px-4 py-3">
                        <StatusBadge label={row.label} variant={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── Row 2: Course Management Tabs ── */}
        <section className="dashboard-stat-card border-4 border-[#121212] bg-[#F0F0F0] p-6 mb-8 shadow-[8px_8px_0px_0px_#121212]">
          <p className="text-xs text-neutral-400 mb-4 uppercase tracking-widest">
            Course Management · CS-401 · Advanced Algorithms
          </p>
          <h2 className="text-2xl font-black mb-4 uppercase tracking-tight">
            Course Management
          </h2>

          <div
            className="border-b-4 border-[#121212] flex flex-wrap gap-0"
            role="tablist"
            aria-label="Course Management"
          >
            {(
              [
                { key: "roster", label: "Roster" },
                { key: "attendance", label: "Attendance" },
                { key: "grades", label: "Grades" },
                { key: "materials", label: "Materials" },
              ] as const
            ).map((t) => {
              const isActive = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(t.key)}
                  className={
                    isActive
                      ? "px-6 py-3 -mb-px border-b-4 border-[#F0C020] text-[#121212] font-black text-xs uppercase tracking-widest min-h-[44px] bg-[#F0C020] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0C020] focus-visible:ring-offset-2"
                      : "px-6 py-3 -mb-px border-b-4 border-transparent text-neutral-700 font-bold text-xs uppercase tracking-widest hover:bg-neutral-100 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0C020] focus-visible:ring-offset-2"
                  }
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="pt-6">
            <p className="text-xs text-neutral-400 mb-4 uppercase tracking-widest">
              CS-401 · 28 Enrolled · Spring 2026
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border-4 border-[#121212] text-sm min-w-[640px]">
                <thead>
                  <tr className="bg-[#121212] text-[#F0F0F0]">
                    <th
                      scope="col"
                      className="border-2 border-[#333] px-4 py-3 text-left text-xs uppercase tracking-widest font-black"
                    >
                      Student ID
                    </th>
                    <th
                      scope="col"
                      className="border-2 border-[#333] px-4 py-3 text-left text-xs uppercase tracking-widest font-black"
                    >
                      Name
                    </th>
                    {activeTab === "grades" && (
                      <th
                        scope="col"
                        className="border-2 border-[#333] px-4 py-3 text-left text-xs uppercase tracking-widest font-black"
                      >
                        Midterm
                      </th>
                    )}
                    {activeTab === "attendance" && (
                      <th
                        scope="col"
                        className="border-2 border-[#333] px-4 py-3 text-left text-xs uppercase tracking-widest font-black"
                      >
                        Attendance
                      </th>
                    )}
                    {activeTab === "materials" && (
                      <th
                        scope="col"
                        className="border-2 border-[#333] px-4 py-3 text-left text-xs uppercase tracking-widest font-black"
                      >
                        Last Access
                      </th>
                    )}
                    <th
                      scope="col"
                      className="border-2 border-[#333] px-4 py-3 text-left text-xs uppercase tracking-widest font-black"
                    >
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      id: "2024-CS-0041",
                      name: "Layla Al-Otaibi",
                      mid: "92",
                      att: "96%",
                      acc: "02 May 2026",
                      ok: true,
                    },
                    {
                      id: "2024-CS-0042",
                      name: "Omar Khalid",
                      mid: "78",
                      att: "84%",
                      acc: "01 May 2026",
                      ok: true,
                    },
                    {
                      id: "2024-CS-0043",
                      name: "Reem Saud",
                      mid: "55",
                      att: "62%",
                      acc: "26 Apr 2026",
                      ok: false,
                    },
                  ].map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-neutral-100 transition-colors duration-150"
                    >
                      <td className="border-2 border-[#121212] px-4 py-3">
                        {r.id}
                      </td>
                      <td className="border-2 border-[#121212] px-4 py-3 font-bold">
                        {r.name}
                      </td>
                      {activeTab === "grades" && (
                        <td className="border-2 border-[#121212] px-4 py-3">
                          {r.mid}
                        </td>
                      )}
                      {activeTab === "attendance" && (
                        <td className="border-2 border-[#121212] px-4 py-3">
                          {r.att}
                        </td>
                      )}
                      {activeTab === "materials" && (
                        <td className="border-2 border-[#121212] px-4 py-3">
                          {r.acc}
                        </td>
                      )}
                      <td className="border-2 border-[#121212] px-4 py-3">
                        {r.ok ? (
                          <StatusBadge label="Active" variant="active" />
                        ) : (
                          <StatusBadge label="Overdue" variant="overdue" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── Row 3: Announcement Composer ── */}
        <section className="border-4 border-[#121212] border-l-8 border-l-[#F0C020] bg-[#F0F0F0] p-6 mb-8 shadow-[8px_8px_0px_0px_#121212]">
          <p className="text-xs text-neutral-400 mb-4 uppercase tracking-widest">
            Faculty Composer · Course Announcement
          </p>
          <h2 className="text-2xl font-black mb-6 uppercase tracking-tight">
            Post a Course Announcement
          </h2>

          <form
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
            onSubmit={(e) => e.preventDefault()}
          >
            <div className="md:col-span-1">
              <label
                htmlFor="ann-course"
                className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 block mb-2 font-bold"
              >
                Course
              </label>
              <select
                id="ann-course"
                disabled={isPending}
                style={{ borderRadius: 0 }}
                className="border-b-4 border-[#121212] bg-transparent px-3 py-2 text-sm w-full focus-visible:bg-[#F0F0F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0C020] transition-colors duration-200 min-h-[44px]"
              >
                <option>CS-401 · Advanced Algorithms</option>
                <option>CS-220 · Data Structures</option>
                <option>CS-305 · Operating Systems</option>
              </select>
            </div>

            <div className="md:col-span-1">
              <label
                htmlFor="ann-title"
                className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 block mb-2 font-bold"
              >
                Title
              </label>
              <input
                id="ann-title"
                type="text"
                disabled={isPending}
                placeholder="Midterm rescheduled"
                style={{ borderRadius: 0 }}
                className="border-b-4 border-[#121212] bg-transparent px-3 py-2 text-sm w-full focus-visible:bg-[#F0F0F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0C020] transition-colors duration-200 min-h-[44px]"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="ann-body"
                className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 block mb-2 font-bold"
              >
                Message
              </label>
              <textarea
                id="ann-body"
                rows={4}
                disabled={isPending}
                placeholder="Type your announcement here…"
                style={{ borderRadius: 0 }}
                className="border-b-4 border-[#121212] bg-transparent px-3 py-2 text-sm w-full focus-visible:bg-[#F0F0F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0C020] transition-colors duration-200"
              />
            </div>

            <div className="md:col-span-2 flex flex-wrap items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="bg-[#121212] text-[#F0F0F0] border-4 border-[#121212] font-black uppercase tracking-widest text-xs px-8 py-3 hover:bg-white hover:text-[#121212] transition-all duration-200 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0C020] focus-visible:ring-offset-2"
              >
                Publish
              </button>
              <button
                type="button"
                disabled={isPending}
                className="border-4 border-[#F0C020] text-[#121212] bg-[#F0C020] font-black uppercase tracking-widest text-xs px-8 py-3 hover:bg-[#121212] hover:text-[#F0C020] transition-all duration-200 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0C020] focus-visible:ring-offset-2"
              >
                Save Draft
              </button>
              {isPending && (
                <span className="text-xs uppercase tracking-widest text-[#92400E] font-bold">
                  Read-only · Approval required
                </span>
              )}
            </div>
          </form>
        </section>

        {/* Section ornament */}
        <div className="py-6 text-center text-xs text-neutral-400 tracking-[1em] uppercase font-black">
          · · · · ·
        </div>

        {/* ── Inverted Black Section: Course Enrollment Cap Indicator ── */}
        <section
          className="bg-[#121212] text-[#F0F0F0] py-12 px-6 relative mb-8"
          aria-label="Course Enrollment Cap Indicator"
        >
          <p className="text-xs text-neutral-400 mb-4 uppercase tracking-widest">
            Enrollment Caps · Spring 2026
          </p>
          <h2 className="text-2xl lg:text-3xl font-black mb-6 uppercase tracking-tight">
            Course Enrollment Cap Indicator
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { code: "CS-401", title: "Advanced Algorithms", current: 28, cap: 30 },
              { code: "CS-220", title: "Data Structures", current: 45, cap: 45 },
              { code: "CS-305", title: "Operating Systems", current: 22, cap: 35 },
            ].map((c) => {
              const pct = Math.round((c.current / c.cap) * 100);
              const atCapacity = pct >= 100;
              return (
                <div
                  key={c.code}
                  className="border-4 border-[#F0C020] p-6 shadow-[8px_8px_0px_0px_#F0C020]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="border-2 border-[#F0F0F0] text-xs px-2 py-0.5 font-black uppercase">
                      {c.code}
                    </span>
                    <span className="text-xs uppercase tracking-widest text-neutral-400 font-black">
                      {pct}%
                    </span>
                  </div>
                  <h3 className="text-lg font-black mt-2 uppercase tracking-tight">
                    {c.title}
                  </h3>
                  <p className="text-5xl font-black leading-none mt-4">
                    {c.current}
                    <span className="text-neutral-400 text-2xl">/{c.cap}</span>
                  </p>
                  <div
                    className="mt-4 h-1.5 w-full bg-[#333]"
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${c.code} enrollment ${pct}%`}
                  >
                    <div
                      className={`h-full ${atCapacity ? "bg-[#D02020]" : "bg-[#F0C020]"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className={`text-xs uppercase tracking-wide mt-3 font-black ${atCapacity ? "text-[#D02020]" : "text-[#F0C020]"}`}>
                    {pct >= 100
                      ? "At Capacity"
                      : pct >= 90
                      ? "Near Capacity"
                      : "Open"}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <footer className="pt-6 border-t-4 border-[#121212]">
          <p className="text-xs text-neutral-400 uppercase tracking-widest font-bold">
            Wodooh University · Faculty Portal · Vol. 2026
          </p>
        </footer>
      </main>
    </div>
  );
}

export default function InstructorDashboardPage() {
  return (
    <ProtectedRoute allowedRoles="instructor">
      <InstructorDashboardInner />
    </ProtectedRoute>
  );
}
