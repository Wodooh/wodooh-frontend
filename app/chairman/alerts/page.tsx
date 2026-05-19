"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useChairmanAlerts } from "@/lib/hooks/use-chairman";

export default function ChairmanAlertsPage() {
  const router = useRouter();
  const { data: alerts, loading, error } = useChairmanAlerts();

  return (
    <>
      <div className="nx-page-head">
        <div>
          <h1 className="nx-page-title">Alerts</h1>
          <p className="nx-page-sub">System alerts for your department</p>
        </div>
      </div>

      {error ? <div className="nx-card" style={{ padding: 16, color: "var(--nx-danger)" }}>{error}</div> : null}

      {loading ? (
        <div className="nx-card" style={{ padding: 16, color: "var(--nx-fg-muted)" }}>Loading…</div>
      ) : (alerts ?? []).length === 0 ? (
        <div className="nx-card" style={{ padding: 16, color: "var(--nx-fg-muted)" }}>No alerts at this time.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
          {(alerts ?? []).map(a => {
            const section = typeof a.sectionId === "string" || !a.sectionId ? null : a.sectionId;
            return (
              <div key={a._id} className="nx-card" style={{ padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="nx-version-pill">{a.type}</span>
                  <span className="nx-tbl-mono" style={{ fontSize: 11, color: "var(--nx-fg-muted)" }}>
                    {new Date(a.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p style={{ marginTop: 12, fontSize: 13 }}>{a.message}</p>
                {section ? (
                  <p className="nx-tbl-mono" style={{ marginTop: 6, fontSize: 11, color: "var(--nx-fg-muted)" }}>
                    Section {section.sectionId}
                  </p>
                ) : null}
                <div style={{ marginTop: 12 }}>
                  {a.anonymousCourseId ? (
                    <button
                      className="nx-btn"
                      onClick={() => router.push(`/chairman/students?anonymousCourseId=${encodeURIComponent(a.anonymousCourseId!)}`)}
                    >
                      Reveal identity
                    </button>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--nx-fg-muted)" }}>No anonymous ID attached.</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
