"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-provider";
import "../nexus.css";

// ── Icons ────────────────────────────────────────────────
const I = {
  Dashboard: ({ size = 15 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  Users: ({ size = 15 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Departments: ({ size = 15 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01" />
    </svg>
  ),
  Courses: ({ size = 15 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </svg>
  ),
  System: ({ size = 15 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  ),
  Settings: ({ size = 15 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
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
  { key: "dashboard",   label: "Dashboard",   href: "/admin/dashboard",   icon: I.Dashboard },
  { key: "users",       label: "Users",       href: "/admin/users",       icon: I.Users },
  { key: "departments", label: "Departments", href: "/admin/departments", icon: I.Departments },
  { key: "courses",     label: "Courses",     href: "/admin/courses",     icon: I.Courses },
  { key: "system",      label: "System",      href: "/admin/system",      icon: I.System },
  { key: "settings",    label: "Settings",    href: "/admin/settings",    icon: I.Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
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
    document.documentElement.classList.toggle("dark", resolved === "dark");
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) { router.replace("/login"); return; }
    if (user && user.role !== "admin") {
      router.replace(
        user.role === "instructor" ? "/instructor/dashboard"
        : user.role === "chairman" ? "/chairman/dashboard"
        : "/student/dashboard"
      );
    }
  }, [loading, isAuthenticated, user, router]);

  const setTheme = (t: "light" | "dark") => {
    setThemeState(t);
    document.documentElement.dataset.nxTheme = t;
    document.documentElement.classList.toggle("dark", t === "dark");
    localStorage.setItem("wodooh.theme", t);
  };

  if (loading || !isAuthenticated || !user || user.role !== "admin") {
    return (
      <div className="nx-shell" style={{ gridTemplateColumns: "1fr" }}>
        <div className="nx-loading"><span className="nx-spin" /> Loading admin…</div>
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
        <Link href="/admin/dashboard" className="nx-sidebar-brand" style={{ textDecoration: "none" }}>
          <div className="nx-sidebar-logo">W</div>
          <div className="nx-sidebar-brand-text">
            WODOOH<span className="nx-sidebar-brand-sub">Admin</span>
          </div>
        </Link>

        <div className="nx-sidebar-section-label">Workspace</div>
        <nav className="nx-sidebar-nav">
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
          <div className="nx-sidebar-avatar">{initials || "A"}</div>
          <div className="nx-sidebar-user">
            <div className="nx-sidebar-user-name">{user.name}</div>
            <div className="nx-sidebar-user-email">{user.email}</div>
          </div>
          <span className="nx-version-pill">v0.1</span>
        </div>
      </aside>

      <main className="nx-main" id="nx-main">
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
