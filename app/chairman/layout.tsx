"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-provider";
import { displayName, displayInitials } from "@/lib/utils";
import "../nexus.css";

const I = {
  Overview: ({ size = 15 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  Departments: ({ size = 15 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01" />
    </svg>
  ),
  Faculty: ({ size = 15 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Students: ({ size = 15 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 14l9-5-9-5-9 5 9 5Z" />
      <path d="M12 14v7" />
      <path d="M5 11v4l7 4 7-4v-4" />
    </svg>
  ),
  Reports: ({ size = 15 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M7 14l4-4 4 4 5-7" />
    </svg>
  ),
  Policy: ({ size = 15 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="M9 13h6M9 17h4" />
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
  { key: "dashboard",   label: "Overview",     href: "/chairman/dashboard",   icon: I.Overview },
  { key: "department",  label: "My department", href: "/chairman/department",  icon: I.Departments },
  { key: "faculty",     label: "Faculty",      href: "/chairman/faculty",     icon: I.Faculty },
  { key: "students",    label: "Students",     href: "/chairman/students",    icon: I.Students },
  { key: "reports",     label: "Reports",      href: "/chairman/reports",     icon: I.Reports },
  { key: "alerts",      label: "Alerts",       href: "/chairman/alerts",      icon: I.Policy },
  { key: "audit-log",   label: "Audit log",    href: "/chairman/audit-log",   icon: I.Policy },
];

export default function ChairmanLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [theme, setThemeState] = useState<"light" | "dark">("dark");
  const [menuOpen, setMenuOpen] = useState(false);

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
    if (user && user.role !== "chairman") {
      router.replace(
        user.role === "admin"      ? "/admin/dashboard"
        : user.role === "instructor" ? "/instructor/dashboard"
        : user.role === "student"  ? "/student/dashboard"
        : "/login"
      );
    }
  }, [loading, isAuthenticated, user, router]);

  const setTheme = (t: "light" | "dark") => {
    setThemeState(t);
    document.documentElement.dataset.nxTheme = t;
    localStorage.setItem("wodooh.theme", t);
  };

  if (loading || !isAuthenticated || !user || user.role !== "chairman") {
    return (
      <div className="nx-shell" style={{ gridTemplateColumns: "1fr" }}>
        <div className="nx-loading"><span className="nx-spin" /> Loading…</div>
      </div>
    );
  }

  const initials = displayInitials(user);
  const fullName = displayName(user);
  const activeKey = (() => {
    for (const item of [...NAV].sort((a, b) => b.href.length - a.href.length)) {
      if (pathname === item.href || pathname.startsWith(item.href + "/")) return item.key;
    }
    return "dashboard";
  })();

  return (
    <div className={`nx-shell ${menuOpen ? "is-menu-open" : ""}`}>
      <div className="nx-sidebar-overlay" onClick={() => setMenuOpen(false)} aria-hidden="true" />
      <aside className="nx-sidebar">
        <Link href="/chairman/dashboard" className="nx-sidebar-brand" style={{ textDecoration: "none" }}>
          <div className="nx-sidebar-logo">W</div>
          <div className="nx-sidebar-brand-text">
            WODOOH<span className="nx-sidebar-brand-sub">Chairman</span>
          </div>
        </Link>

        <div className="nx-sidebar-section-label">Workspace</div>
        <nav className="nx-sidebar-nav" role="navigation" aria-label="Chairman Portal Navigation">
          {NAV.map(item => {
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`nx-nav-item ${activeKey === item.key ? "is-active" : ""}`}
                onClick={() => setMenuOpen(false)}
              >
                <Icon size={15} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="nx-sidebar-footer">
          <div className="nx-sidebar-avatar">{initials}</div>
          <div className="nx-sidebar-user">
            <div className="nx-sidebar-user-name">{fullName}</div>
            <div className="nx-sidebar-user-email">{user.email}</div>
          </div>
        </div>
      </aside>

      <main className="nx-main">
        <div className="nx-topbar">
          <div className="nx-topbar-lead">
            <button
              className="nx-menu-btn"
              aria-label="Toggle navigation menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(o => !o)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div className="nx-topbar-crumbs">{NAV.find(n => n.key === activeKey)?.label}</div>
          </div>
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
