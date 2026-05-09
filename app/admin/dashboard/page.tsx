"use client";

import React from "react";
import { useUsers } from "@/lib/hooks/use-users";
import type { UserRole } from "@/lib/types/user.types";

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Admins",
  instructor: "Instructors",
  chairman: "Chairmen",
  student: "Students",
};

function initials(name: string | undefined) {
  if (!name) return "?";
  return name.split(" ").filter(Boolean).map(p => p[0]).join("").slice(0, 2).toUpperCase() || "?";
}

export default function AdminDashboardPage() {
  const { data, users, loading, error } = useUsers({ limit: 100 });
  const userList = users ?? [];

  const fetchFailed = !!error;
  const total = fetchFailed ? -1 : (data?.pagination?.totalUsers ?? 0);
  const baseCounts: Record<UserRole, number> = { admin: 0, instructor: 0, chairman: 0, student: 0 };
  const counts: Record<UserRole, number> = fetchFailed
    ? { admin: -1, instructor: -1, chairman: -1, student: -1 }
    : userList.reduce<Record<UserRole, number>>((acc, u) => {
        if (u.role && u.role in acc) acc[u.role] = (acc[u.role] ?? 0) + 1;
        return acc;
      }, baseCounts);

  const fmt = (n: number) => (n < 0 ? "—" : n.toString());

  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  // Recent activity = 5 most recently created users (best signal we have without an audit log)
  const recent = [...userList]
    .sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0))
    .slice(0, 5);

  return (
    <>
      <div className="nx-page-head">
        <div>
          <h1 className="nx-page-title">Dashboard</h1>
          <p className="nx-page-sub">{today} · Snapshot of users and platform health</p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="nx-kpi-strip">
        <KPI label="Total users" value={loading ? "—" : fmt(total)} />
        <KPI label="Instructors" value={loading ? "—" : fmt(counts.instructor)} />
        <KPI label="Chairmen"    value={loading ? "—" : fmt(counts.chairman)} />
        <KPI label="Students"    value={loading ? "—" : fmt(counts.student)} />
      </div>

      {error && (
        <div className="nx-card nx-card-padded" style={{ marginBottom: "var(--nx-stack)", borderColor: "var(--nx-danger)", color: "var(--nx-danger)" }}>
          Failed to load users: {error}
        </div>
      )}

      <div className="nx-card">
        <div className="nx-card-head">
          <div>
            <h3 className="nx-card-title">Recent signups</h3>
            <p className="nx-card-sub">Latest users added to the platform</p>
          </div>
          <a className="nx-btn nx-btn-ghost" href="/admin/users">View all users</a>
        </div>
        {loading ? (
          <div className="nx-loading"><span className="nx-spin" /> Loading…</div>
        ) : recent.length === 0 ? (
          <div className="nx-empty">
            <div className="nx-empty-title">No users yet</div>
            <div className="nx-empty-sub">When users sign up, they&apos;ll show here.</div>
          </div>
        ) : (
          <div className="nx-tbl-wrap">
            <table className="nx-tbl">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(u => (
                  <tr key={u._id}>
                    <td>
                      <div className="nx-user-cell">
                        <div className="nx-avatar">{initials(u.name)}</div>
                        <div>
                          <div className="nx-user-cell-name">{u.name}</div>
                          <div className="nx-user-cell-email">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><RoleBadge role={u.role} /></td>
                    <td className="nx-tbl-mono">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</td>
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

function RoleBadge({ role }: { role: UserRole | undefined }) {
  if (!role) return <span className="nx-badge" style={{ background: "var(--nx-bg-hover)", color: "var(--nx-fg-muted)" }}>—</span>;
  return (
    <span className={`nx-badge nx-role-${role}`}>
      <span className="nx-badge-dot" />
      {ROLE_LABEL[role].slice(0, -1) /* singular */}
    </span>
  );
}
