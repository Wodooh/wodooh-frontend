"use client";

import { useState } from "react";
import { useHealth } from "@/lib/hooks/use-health";
import apiClient from "@/lib/api/client";
import API_ENDPOINTS from "@/lib/api/endpoints";

interface SyncResult {
  source: string;
  departments: { imported: number; skipped: number; reconciled: number };
  courses: { imported: number; skipped: number; reconciled: number };
  sections: { imported: number; skipped: number };
  students: { imported: number; skipped: number; reconciled: number };
}

export default function AdminSystemPage() {
  const { data: health, loading, error, checkHealth } = useHealth({ refreshInterval: 30000 });

  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const isUp = !error && health?.dbConnected === true;
  const statusLabel = loading ? "Checking…" : error ? "Unreachable" : health?.dbConnected ? "Healthy" : "Degraded";
  const statusBadge = loading ? "nx-role-student" : isUp ? "nx-role-instructor" : "nx-role-chairman";

  async function handleRunSync() {
    setSyncing(true);
    setSyncResult(null);
    setSyncError(null);
    try {
      const res = await apiClient.post<SyncResult>(API_ENDPOINTS.ADMIN_SYNC);
      setSyncResult(res.data ?? null);
    } catch (e: unknown) {
      setSyncError(e instanceof Error ? e.message : "Sync failed.");
    } finally {
      setSyncing(false);
    }
  }

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
          </div>
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              className="nx-btn nx-btn-ghost"
              disabled={syncing}
              onClick={handleRunSync}
              style={{ alignSelf: "flex-start" }}
            >
              {syncing ? <><span className="nx-spin" /> Syncing…</> : "▶ Run sync now"}
            </button>

            {syncError && (
              <div style={{ fontSize: 13, color: "var(--nx-danger)" }}>{syncError}</div>
            )}

            {syncResult && (
              <div style={{ fontSize: 12, color: "var(--nx-fg-muted)", display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontWeight: 600, color: "var(--nx-fg)", fontSize: 13 }}>
                  Sync complete — source: {syncResult.source}
                </span>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                  <li>Departments: <strong>{syncResult.departments.imported}</strong> imported, <strong>{syncResult.departments.skipped}</strong> skipped, <strong>{syncResult.departments.reconciled}</strong> reconciled</li>
                  <li>Courses: <strong>{syncResult.courses.imported}</strong> imported, <strong>{syncResult.courses.skipped}</strong> skipped, <strong>{syncResult.courses.reconciled}</strong> reconciled</li>
                  <li>Sections: <strong>{syncResult.sections.imported}</strong> imported, <strong>{syncResult.sections.skipped}</strong> skipped</li>
                  <li>Students: <strong>{syncResult.students.imported}</strong> imported, <strong>{syncResult.students.skipped}</strong> skipped, <strong>{syncResult.students.reconciled}</strong> reconciled</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
