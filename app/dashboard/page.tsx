"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, ProtectedRoute } from "@/lib/auth/auth-provider";
import { SidebarNavigation, type NavItem } from "@/components/ui/sidebar-navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",     href: "/dashboard",               icon: "dashboard"      },
  { label: "My Courses",    href: "/dashboard/courses",       icon: "menu_book"      },
  { label: "Transcript",    href: "/dashboard/transcript",    icon: "description"    },
  { label: "Timetable",     href: "/dashboard/timetable",     icon: "calendar_today" },
  { label: "Announcements", href: "/dashboard/announcements", icon: "notifications"  },
];

const ENROLLED_COURSES = [
  { code: "CS-401",   title: "Advanced Algorithms",  instructor: "Dr. Vasquez",   schedule: "MWF 10:00–11:00",  credits: 3, status: "Enrolled" },
  { code: "MATH-302", title: "Linear Algebra",        instructor: "Dr. Chen",      schedule: "TTh 13:00–14:30",  credits: 4, status: "Enrolled" },
  { code: "ENG-210",  title: "Technical Writing",     instructor: "Prof. Anderson",schedule: "MWF 09:00–09:50",  credits: 2, status: "Enrolled" },
  { code: "PHYS-201", title: "Classical Mechanics",   instructor: "Dr. Okonkwo",   schedule: "TTh 10:00–11:30",  credits: 4, status: "Enrolled" },
  { code: "HIST-150", title: "Modern World History",  instructor: "Prof. Larsen",  schedule: "MWF 14:00–14:50",  credits: 3, status: "Enrolled" },
  { code: "PHIL-101", title: "Introduction to Logic", instructor: "Dr. Greene",    schedule: "TTh 15:00–16:30",  credits: 3, status: "Pending"  },
];

const TODAYS_SCHEDULE = [
  { time: "10:00", code: "CS-401",   room: "Eng 204" },
  { time: "13:00", code: "MATH-302", room: "Sci 118" },
  { time: "15:00", code: "PHIL-101", room: "Hum 301" },
];

const UPCOMING_DEADLINES = [
  { due: "06 May", code: "CS-401",   task: "Problem Set 7"    },
  { due: "09 May", code: "ENG-210",  task: "Final Essay Draft" },
  { due: "12 May", code: "MATH-302", task: "Midterm Exam"      },
];

const ANNOUNCEMENTS = [
  {
    date:   "01 May 2026",
    course: "CS-401",
    title:  "Office hours moved to Thursday",
    body:   "Dr. Vasquez will hold extended office hours this week ahead of the midterm. Sign up via the course portal.",
  },
  {
    date:   "29 Apr 2026",
    course: "MATH-302",
    title:  "Practice problems posted",
    body:   "Supplementary practice problems for Chapters 5–7 are available on the course materials page.",
  },
  {
    date:   "27 Apr 2026",
    course: "REGISTRAR",
    title:  "Spring registration closes 15 May",
    body:   "Confirm your fall 2026 enrollment selections before the deadline. Late registration incurs a $50 fee.",
  },
];

function DashboardContent() {
  const router = useRouter();
  const { user, isAuthenticated, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) { router.replace("/login"); return; }
    if (user) {
      if (user.role === "instructor") router.replace("/dashboard/instructor");
      else if (user.role === "chairman") router.replace("/dashboard/chairman");
    }
  }, [loading, isAuthenticated, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <p className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-[0.18em]">
          Loading session…
        </p>
      </div>
    );
  }

  if (!isAuthenticated || !user) return null;

  const firstName = (user.name || user.email || "Student").split(" ")[0];
  const initials  = (user.name || user.email || "?")
    .split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const logoutFooter = (
    <button
      id="logout-button"
      onClick={logout}
      className="w-full py-2 text-xs font-semibold text-[#64748B] border border-[#E2E8F0] bg-white rounded-lg hover:bg-[#FEF2F2] hover:text-[#DC2626] hover:border-[#FECACA] transition-colors duration-150 min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1040C0] focus-visible:ring-offset-1"
    >
      Sign Out
    </button>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-[#0F172A] flex">

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <div className="hidden md:block fixed inset-y-0 left-0 z-10">
        <SidebarNavigation
          items={NAV_ITEMS}
          logo={
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] text-[#94A3B8] uppercase">
                Northfield University
              </p>
              <p className="text-sm font-semibold text-[#0F172A] mt-1 tracking-tight">
                Student Portal
              </p>
              <p className="text-[10px] text-[#CBD5E1] mt-1.5">Vol. 2026 · Spring Semester</p>
            </div>
          }
          userName={user.name || user.email}
          userRole="Student"
          userInitials={initials}
          footer={logoutFooter}
          className="h-full"
        />
      </div>

      {/* ── Main content ─────────────────────────────────────────── */}
      <main className="md:ml-64 flex-1 max-w-screen-xl mx-auto px-8 py-10">

        <PageHeader
          meta="Dept. of Computer Science · Spring 2026 · Generated: 03 May 2026"
          greeting="Good morning,"
          title={`${firstName}.`}
          description="Your spring 2026 enrollment summary, daily schedule, and pending coursework."
          className="pb-8 border-b border-[#E2E8F0] mb-10"
        />

        {/* ── Row 1: KPI summary cards ──────────────────────────── */}
        <section aria-label="Semester overview" className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-10">

          {/* GPA */}
          <Card>
            <CardContent className="flex flex-col justify-between h-full">
              <div>
                <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2">
                  Cumulative GPA
                </p>
                <p className="text-5xl font-black text-[#0F172A] tracking-tight leading-none">3.74</p>
                <p className="text-sm font-medium text-[#059669] mt-3 flex items-center gap-1">
                  <span className="text-base leading-none">↑</span> 0.08 vs last semester
                </p>
              </div>
              <div className="flex justify-between items-end border-t border-[#F1F5F9] pt-4 mt-6">
                <div>
                  <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1">Credits</p>
                  <p className="font-bold text-[#0F172A] text-sm">86</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1">Standing</p>
                  <p className="font-bold text-[#0F172A] text-sm">Junior</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1">Dean&apos;s List</p>
                  <p className="font-bold text-[#1040C0] text-sm">Yes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Today's schedule */}
          <Card>
            <CardContent>
              <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2">
                Today&apos;s Schedule
              </p>
              <p className="text-5xl font-black text-[#0F172A] tracking-tight leading-none">
                {TODAYS_SCHEDULE.length}
              </p>
              <p className="text-sm font-medium text-[#475569] mt-3 mb-5">Classes scheduled</p>
              <ul className="space-y-3 border-t border-[#F1F5F9] pt-4">
                {TODAYS_SCHEDULE.map((entry) => (
                  <li key={entry.code + entry.time} className="flex items-center gap-3 text-sm">
                    <span className="w-12 text-[#94A3B8] font-medium tabular-nums shrink-0">
                      {entry.time}
                    </span>
                    <Badge variant="code" shape="rect" className="shrink-0 h-auto px-2 py-1 text-xs font-bold">
                      {entry.code}
                    </Badge>
                    <span className="text-[#475569]">{entry.room}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Upcoming deadlines */}
          <Card>
            <CardContent>
              <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2">
                Upcoming Deadlines
              </p>
              <p className="text-5xl font-black text-[#0F172A] tracking-tight leading-none">
                {UPCOMING_DEADLINES.length}
              </p>
              <p className="text-sm font-medium text-[#B45309] mt-3 mb-5">Within 14 days</p>
              <ul className="space-y-3 border-t border-[#F1F5F9] pt-4">
                {UPCOMING_DEADLINES.map((d) => (
                  <li key={d.code + d.task} className="flex items-center gap-3 text-sm">
                    <span className="w-14 text-[#94A3B8] font-medium tabular-nums shrink-0">
                      {d.due}
                    </span>
                    <Badge variant="code" shape="rect" className="shrink-0 h-auto px-2 py-1 text-xs font-bold">
                      {d.code}
                    </Badge>
                    <span className="text-[#475569] truncate">{d.task}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

        </section>

        {/* ── Row 2: Enrolled courses ───────────────────────────── */}
        <section aria-label="Enrolled courses" className="mb-10">
          <div className="flex items-end justify-between pb-4 mb-6 border-b border-[#E2E8F0]">
            <h2 className="text-lg font-bold text-[#0F172A] tracking-tight">Enrolled Courses</h2>
            <p className="text-sm text-[#94A3B8] font-medium">
              {ENROLLED_COURSES.length} courses · 19 credits
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {ENROLLED_COURSES.map((course) => (
              <Card
                key={course.code}
                className="hover:shadow-md cursor-pointer transition-shadow duration-200"
              >
                <CardContent>
                  <div className="flex justify-between items-start mb-4">
                    <Badge variant="code" shape="rect" className="h-auto px-2 py-1 text-xs font-bold">
                      {course.code}
                    </Badge>
                    <Badge
                      variant={course.status === "Pending" ? "pending" : "enrolled"}
                      shape="rect"
                      className="h-auto px-2 py-1 text-[10px] font-bold uppercase tracking-wide"
                      role="status"
                    >
                      {course.status}
                    </Badge>
                  </div>

                  <h3 className="font-black text-lg text-[#0F172A] tracking-tight leading-snug mb-1">
                    {course.title}
                  </h3>
                  <p className="text-sm text-[#475569] mb-0.5">{course.instructor}</p>
                  <p className="text-xs text-[#94A3B8]">{course.schedule}</p>

                  <div className="mt-4 pt-3 border-t border-[#F1F5F9]">
                    <span className="text-xs font-semibold text-[#64748B]">
                      {course.credits} credits
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* ── Semester summary ─────────────────────────────────── */}
        <Card className="p-8 mb-10 relative overflow-hidden">
          {/* Watermark */}
          <p
            aria-hidden="true"
            className="pointer-events-none select-none absolute -bottom-3 right-0 font-black text-[8rem] lg:text-[11rem] leading-none text-[#1040C0]/[0.04] uppercase tracking-tighter whitespace-nowrap"
          >
            Spring 2026
          </p>

          <div className="relative z-10">
            <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-3">
              Semester Summary · Spring 2026
            </p>
            <h2 className="font-black text-2xl lg:text-3xl tracking-tight text-[#0F172A]">
              Steady progress.
            </h2>
            <p className="text-sm text-[#64748B] mt-2 max-w-xl leading-relaxed">
              You&apos;re on pace to complete the semester with academic distinction. Continue
              on this trajectory to maintain Dean&apos;s List eligibility.
            </p>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-6 pt-6 border-t border-[#F1F5F9]">
              <div>
                <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1">
                  Semester GPA
                </p>
                <p className="font-black text-3xl tracking-tight text-[#0F172A]">3.82</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1">
                  Cumulative GPA
                </p>
                <p className="font-black text-3xl tracking-tight text-[#0F172A]">3.74</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1">
                  Credits Earned
                </p>
                <p className="font-black text-3xl tracking-tight text-[#0F172A]">86</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1">
                  Standing
                </p>
                <Badge variant="enrolled" shape="pill" className="mt-1 h-auto px-3 py-1 text-xs font-bold">
                  Dean&apos;s List
                </Badge>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/dashboard/transcript"
                className="text-xs font-semibold text-white bg-[#1040C0] px-5 py-2.5 rounded-lg hover:bg-[#0B2E8A] transition-colors duration-150 min-h-[36px] inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1040C0] focus-visible:ring-offset-2"
              >
                View Full Transcript
              </Link>
              <Link
                href="/dashboard/timetable"
                className="text-xs font-semibold text-[#1040C0] border border-[#C7D2FE] bg-[#EEF2FF] px-5 py-2.5 rounded-lg hover:bg-[#E0E7FF] transition-colors duration-150 min-h-[36px] inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1040C0] focus-visible:ring-offset-2"
              >
                Open Timetable
              </Link>
            </div>
          </div>
        </Card>

        {/* ── Announcements ────────────────────────────────────── */}
        <section aria-label="Recent announcements" className="mb-12">
          <div className="flex items-end justify-between pb-4 mb-6 border-b border-[#E2E8F0]">
            <h2 className="text-lg font-bold text-[#0F172A] tracking-tight">Recent Announcements</h2>
            <Link
              href="/dashboard/announcements"
              className="text-xs font-semibold text-[#1040C0] hover:text-[#0B2E8A] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1040C0] focus-visible:ring-offset-1"
            >
              View all →
            </Link>
          </div>

          <ul className="space-y-4">
            {ANNOUNCEMENTS.map((a) => (
              <li key={a.title}>
                <Card className="border-l-[3px] border-l-[#1040C0]">
                  <CardContent>
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <Badge variant="code" shape="rect" className="h-auto px-2 py-1 text-xs font-bold uppercase tracking-wide">
                        {a.course}
                      </Badge>
                      <span className="text-[10px] font-medium text-[#94A3B8] uppercase tracking-widest">
                        {a.date}
                      </span>
                    </div>
                    <h3 className="font-bold text-base text-[#0F172A] leading-snug mb-2">{a.title}</h3>
                    <p className="text-sm text-[#64748B] leading-relaxed">{a.body}</p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </section>

        <footer className="border-t border-[#E2E8F0] pt-6 pb-12">
          <p className="text-[10px] font-medium text-[#CBD5E1] uppercase tracking-widest text-center">
            Northfield University Academic Platform · Outfit · Spring 2026
          </p>
        </footer>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
