"use client";

import { useHealth } from "@/lib/hooks/use-health";

export default function AdminSystemPage() {
  const { data: health, loading, error, checkHealth } = useHealth({ refreshInterval: 30000 });

  const isUp = !error && health?.dbConnected === true;
  const statusLabel = loading ? "Checking…" : error ? "Unreachable" : health?.dbConnected ? "Healthy" : "Degraded";
  const statusBadge = loading ? "nx-role-student" : isUp ? "nx-role-instructor" : "nx-role-chairman";

  return (
    <>
      <div className="nx-page-head">
        <div>
          <h1 className="nx-page-title">System</h1>
          <p className="nx-page-sub">Backend health and integrations</p>
        </div>
        <button className="nx-btn nx-btn-ghost" disabled={loading} onClick={checkHealth}>
          {loading ? <><span className="nx-spin" /> Checking…</> : "↻ Refresh"}
        </button>
      </div>

      <div className="nx-grid-2">
        <div className="nx-card">
          <div className="nx-card-head">
            <h3 className="nx-card-title">Backend health</h3>
            <span className={`nx-badge ${statusBadge}`}>
              <span className="nx-badge-dot" />
              {statusLabel}
            </span>
          </div>
          <div style={{ padding: 16, fontSize: 13, color: "var(--nx-fg-muted)" }}>
            {error ? (
              <div style={{ color: "var(--nx-danger)" }}>Could not reach backend: {error}</div>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                <li>Message: <strong style={{ color: "var(--nx-fg)" }}>{loading ? "—" : (health?.message || "—")}</strong></li>
                <li>Database: <strong style={{ color: health?.dbConnected ? "var(--nx-success)" : "var(--nx-danger)" }}>
                  {loading ? "—" : health?.dbConnected ? "Connected" : "Disconnected"}
                </strong></li>
                <li>Last checked: <span className="nx-tbl-mono">
                  {health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : "—"}
                </span></li>
              </ul>
            )}
          </div>
        </div>

        <div className="nx-card">
          <div className="nx-card-head">
            <h3 className="nx-card-title">SIS connection</h3>
            <span className="nx-badge nx-role-student"><span className="nx-badge-dot" />Not configured</span>
          </div>
          <div style={{ padding: 16, color: "var(--nx-fg-muted)", fontSize: 13 }}>
            SIS integration is not yet implemented. Sync actions will appear here once the backend exposes a sync endpoint.
          </div>
        </div>
      </div>
    </>
  );
}
