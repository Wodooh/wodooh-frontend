"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-provider";
import "../nexus.css";

const I = {
  Dashboard: ({ size = 15 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  Courses: ({ size = 15 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </svg>
  ),
  Sessions: ({ size = 15 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  GradeBook: ({ size = 15 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 7h8M8 12h8M8 17h5" />
    </svg>
  ),
  Reports: ({ size = 15 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M7 14l4-4 4 4 5-7" />
    </svg>
  ),
  Announcements: ({ size = 15 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11v2a2 2 0 0 0 2 2h3l5 4V5L8 9H5a2 2 0 0 0-2 2Z" />
      <path d="M19 7c1.5 1.4 1.5 8.6 0 10" />
    </svg>
  ),
  Sun: ({ size = 15 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  ),
  Moon: ({ size = 15 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  ),
  Logout: ({ size = 14 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
};

const NAV: { key: string; label: string; href: string; icon: React.FC<{ size?: number }> }[] = [
  { key: "dashboard",     label: "Dashboard",     href: "/instructor/dashboard",     icon: I.Dashboard },
  { key: "courses",       label: "My Courses",    href: "/instructor/courses",       icon: I.Courses },
  { key: "sessions",      label: "Sessions",      href: "/instructor/sessions",      icon: I.Sessions },
  { key: "gradebook",     label: "Grade Book",    href: "/instructor/gradebook",     icon: I.GradeBook },
  { key: "announcements", label: "Announcements", href: "/instructor/announcements", icon: I.Announcements },
  { key: "reports",       label: "Reports",       href: "/instructor/reports",       icon: I.Reports },
];

export default function InstructorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [theme, setThemeState] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("wodooh.theme") : null;
    const resolved = stored === "light" || stored === "dark"
      ? stored
      : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    setThemeState(resolved);
    document.documentElement.dataset.nxTheme = resolved;
    document.documentElement.dataset.nxDensity = "compact";
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) { router.replace("/login"); return; }
    if (user && user.role !== "instructor") {
      router.replace(
        user.role === "admin"    ? "/admin/dashboard"
        : user.role === "chairman" ? "/chairman/dashboard"
        : user.role === "student" ? "/student/dashboard"
        : "/login"
      );
    }
  }, [loading, isAuthenticated, user, router]);

  const setTheme = (t: "light" | "dark") => {
    setThemeState(t);
    document.documentElement.dataset.nxTheme = t;
    localStorage.setItem("wodooh.theme", t);
  };

  if (loading || !isAuthenticated || !user || user.role !== "instructor") {
    return (
      <div className="nx-shell" style={{ gridTemplateColumns: "1fr" }}>
        <div className="nx-loading"><span className="nx-spin" /> Loading…</div>
      </div>
    );
  }

  const initials = user.name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
  const activeKey = (() => {
    for (const item of [...NAV].sort((a, b) => b.href.length - a.href.length)) {
      if (pathname === item.href || pathname.startsWith(item.href + "/")) return item.key;
    }
    return "dashboard";
  })();

  return (
    <div className="nx-shell">
      <aside className="nx-sidebar">
        <Link href="/instructor/dashboard" className="nx-sidebar-brand" style={{ textDecoration: "none" }}>
          <div className="nx-sidebar-logo">W</div>
          <div className="nx-sidebar-brand-text">
            WODOOH<span className="nx-sidebar-brand-sub">Faculty</span>
          </div>
        </Link>

        <div className="nx-sidebar-section-label">Workspace</div>
        <nav className="nx-sidebar-nav" role="navigation" aria-label="Faculty Portal Navigation">
          {NAV.map(item => {
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`nx-nav-item ${activeKey === item.key ? "is-active" : ""}`}
              >
                <Icon size={15} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="nx-sidebar-footer">
          <div className="nx-sidebar-avatar">{initials || "F"}</div>
          <div className="nx-sidebar-user">
            <div className="nx-sidebar-user-name">{user.name}</div>
            <div className="nx-sidebar-user-email">{user.email}</div>
          </div>
          <span className="nx-version-pill">v0.1</span>
        </div>
      </aside>

      <main className="nx-main">
        <div className="nx-topbar">
          <div className="nx-topbar-crumbs">{NAV.find(n => n.key === activeKey)?.label}</div>
          <div className="nx-topbar-actions">
            <button
              className="nx-icon-btn"
              title="Toggle theme"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <I.Sun /> : <I.Moon />}
            </button>
            <button
              className="nx-icon-btn"
              title="Sign out"
              onClick={logout}
            >
              <I.Logout />
            </button>
          </div>
        </div>
        <div className="nx-page">{children}</div>
      </main>
    </div>
  );
}
