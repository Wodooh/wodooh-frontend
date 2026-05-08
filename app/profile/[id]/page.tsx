"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-provider";
import "../../nexus.css";

function dashboardForRole(role: string | undefined): string {
  switch (role) {
    case "admin":      return "/admin/dashboard";
    case "instructor": return "/instructor/dashboard";
    case "chairman":   return "/chairman/dashboard";
    case "student":    return "/student/dashboard";
    default:           return "/login";
  }
}

export default function ProfilePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { user, isAuthenticated, loading } = useAuth();

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("wodooh.theme") : null;
    const resolved = stored === "light" || stored === "dark"
      ? stored
      : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.dataset.nxTheme = resolved;
    document.documentElement.dataset.nxDensity = "compact";
  }, []);

  useEffect(() => {
    if (!loading && !isAuthenticated) router.replace("/login");
  }, [loading, isAuthenticated, router]);

  if (loading || !isAuthenticated || !user) {
    return (
      <div className="nx-shell" style={{ gridTemplateColumns: "1fr" }}>
        <div className="nx-loading"><span className="nx-spin" /> Loading…</div>
      </div>
    );
  }

  const isOwn = user._id === params.id;

  return (
    <main style={{ minHeight: "100vh", background: "var(--nx-bg)", color: "var(--nx-fg)", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div className="nx-topbar">
        <Link href={dashboardForRole(user.role)} className="nx-topbar-crumbs" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back to dashboard
        </Link>
      </div>

      <div className="nx-page" style={{ maxWidth: 720, margin: "0 auto" }}>
        <div className="nx-page-head">
          <div>
            <h1 className="nx-page-title">{isOwn ? "Your profile" : `User ${params.id}`}</h1>
            <p className="nx-page-sub">Shared profile route — accessible by every authenticated role</p>
          </div>
        </div>

        <div className="nx-card">
          {isOwn ? (
            <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="Name"  value={user.name} />
              <Field label="Email" value={user.email} mono />
              <Field label="Role"  value={
                <span className={`nx-badge nx-role-${user.role}`}>
                  <span className="nx-badge-dot" />
                  {user.role[0].toUpperCase() + user.role.slice(1)}
                </span>
              } />
              <Field label="ID"    value={user._id} mono />
            </div>
          ) : (
            <div className="nx-empty">
              <div className="nx-empty-title">Public profile</div>
              <div className="nx-empty-sub">
                Public profile view for user <span className="nx-version-pill">{params.id}</span>.
                Backend endpoint <span className="nx-version-pill">GET /users/:id/public</span> isn&apos;t
                implemented yet — once it is, this card will show their name, role, and any public bio fields.
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function Field({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span className="nx-field-label">{label}</span>
      <span className={mono ? "nx-tbl-mono" : undefined} style={{ fontSize: 13, color: "var(--nx-fg)" }}>{value}</span>
    </div>
  );
}
