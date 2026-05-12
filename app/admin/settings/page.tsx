"use client";

import React, { useEffect, useState } from "react";
import { BulkImportDialog } from "@/components/admin/bulk-import-dialog";

type TabId = "general" | "permissions" | "integrations" | "security" | "appearance";

const TABS: { id: TabId; label: string }[] = [
  { id: "general", label: "General" },
  { id: "permissions", label: "Roles & Permissions" },
  { id: "integrations", label: "Integrations" },
  { id: "security", label: "Security" },
  { id: "appearance", label: "Appearance" },
];

// ── Icons ───────────────────────────────────────────
const Sun = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);
const Moon = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
  </svg>
);
const Check = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);
const X = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);
const Upload = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
  </svg>
);

// ── Reusable bits ───────────────────────────────────
function SettingRow({ label, desc, control }: { label: string; desc?: string; control: React.ReactNode }) {
  return (
    <div className="nx-setting-row">
      <div>
        <div className="nx-setting-label">{label}</div>
        {desc && <div className="nx-setting-desc">{desc}</div>}
      </div>
      <div className="nx-setting-control">{control}</div>
    </div>
  );
}

function TextField({ value, onChange, minWidth = 240 }: { value: string; onChange: (v: string) => void; minWidth?: number }) {
  return (
    <input
      className="nx-input"
      style={{ minWidth, padding: "0 10px", height: "var(--nx-btn-h)", border: "1px solid var(--nx-border-strong)", borderRadius: 6, background: "var(--nx-bg-elev)", color: "var(--nx-fg)", fontSize: 13 }}
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  );
}

// ── Page ────────────────────────────────────────────
export default function AdminSettingsPage() {
  const [tab, setTab] = useState<TabId>("general");
  const [toast, setToast] = useState<{ msg: string; kind: "success" | "info" | "error" } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (msg: string, kind: "success" | "info" | "error" = "success") => setToast({ msg, kind });

  return (
    <>
      <div className="nx-page-head">
        <div>
          <h1 className="nx-page-title">Settings</h1>
          <p className="nx-page-sub">System configuration</p>
        </div>
      </div>

      <div className="nx-tabs">
        {TABS.map(t => (
          <button key={t.id} className="nx-tab" data-active={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {tab === "general" && <General onSave={(msg) => showToast(msg)} />}
      {tab === "permissions" && <Permissions />}
      {tab === "integrations" && <Integrations onToast={showToast} />}
      {tab === "security" && <Security onSave={(msg) => showToast(msg)} />}
      {tab === "appearance" && <Appearance />}

      {toast && (
        <div className="nx-toast-region">
          <div className={`nx-toast nx-toast-${toast.kind}`}>{toast.msg}</div>
        </div>
      )}
    </>
  );
}

// ── General ────────────────────────────────────────
function General({ onSave }: { onSave: (msg: string) => void }) {
  const [name, setName] = useState("WODOOH University");
  const [tz, setTz] = useState("Asia/Riyadh");
  const [year, setYear] = useState("2025-26");
  const [domain, setDomain] = useState("uni.edu");
  const [dirty, setDirty] = useState(false);

  const mark = (fn: () => void) => { fn(); setDirty(true); };

  return (
    <>
      <div className="nx-card">
        <div style={{ padding: "4px 20px" }}>
          <SettingRow
            label="University name"
            desc="Visible to all users in headers and emails."
            control={<TextField value={name} onChange={(v) => mark(() => setName(v))} />}
          />
          <SettingRow
            label="Time zone"
            desc="Default for all scheduled jobs and audit timestamps."
            control={
              <select className="nx-select" value={tz} onChange={e => mark(() => setTz(e.target.value))}>
                <option value="Asia/Riyadh">Arabia (UTC+3)</option>
                <option value="Europe/Istanbul">Türkiye (UTC+3)</option>
                <option value="Europe/Berlin">Central Europe (UTC+1)</option>
                <option value="Europe/London">London (UTC+0)</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern US (UTC−5)</option>
                <option value="America/Los_Angeles">Pacific US (UTC−8)</option>
              </select>
            }
          />
          <SettingRow
            label="Academic year"
            desc="Affects course archival and term rollover."
            control={
              <select className="nx-select" value={year} onChange={e => mark(() => setYear(e.target.value))}>
                <option value="2024-25">2024 – 2025</option>
                <option value="2025-26">2025 – 2026</option>
                <option value="2026-27">2026 – 2027</option>
              </select>
            }
          />
          <SettingRow
            label="Email domain"
            desc="Restrict signup to this domain (used for university-issued accounts)."
            control={<TextField value={domain} onChange={(v) => mark(() => setDomain(v))} />}
          />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
        <button className="nx-btn nx-btn-ghost" disabled={!dirty} onClick={() => setDirty(false)}>Discard</button>
        <button
          className="nx-btn nx-btn-primary"
          disabled={!dirty}
          onClick={() => { setDirty(false); onSave("Settings saved (demo — needs backend endpoint)."); }}
        >
          Save changes
        </button>
      </div>
    </>
  );
}

// ── Roles & Permissions ────────────────────────────
function Permissions() {
  const matrix: [string, boolean, boolean, boolean, boolean][] = [
    ["View own profile",                true,  true,  true,  true],
    ["View course rosters",             false, true,  true,  true],
    ["Edit own department courses",     false, false, true,  true],
    ["Assign instructors to sections",  false, false, true,  true],
    ["Create/edit departments",         false, false, false, true],
    ["Manage user roles",               false, false, false, true],
    ["Run system sync",                 false, false, false, true],
  ];

  return (
    <div className="nx-card">
      <div className="nx-card-head">
        <div>
          <h3 className="nx-card-title">What each role can do</h3>
          <p className="nx-card-sub">Granular permission matrix · changes take effect immediately</p>
        </div>
      </div>
      <div className="nx-tbl-wrap">
        <table className="nx-tbl">
          <thead>
            <tr>
              <th style={{ width: "40%" }}>Capability</th>
              <th className="nx-perm-cell">Student</th>
              <th className="nx-perm-cell">Instructor</th>
              <th className="nx-perm-cell">Chairman</th>
              <th className="nx-perm-cell">Admin</th>
            </tr>
          </thead>
          <tbody>
            {matrix.map(([cap, ...vals], i) => (
              <tr key={i}>
                <td style={{ fontWeight: 500 }}>{cap}</td>
                {vals.map((v, j) => (
                  <td key={j} className={`nx-perm-cell ${v ? "nx-perm-yes" : "nx-perm-no"}`}>
                    {v ? <Check /> : <X />}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Integrations ───────────────────────────────────
function Integrations({ onToast }: { onToast: (msg: string, kind?: "success" | "info" | "error") => void }) {
  const [importOpen, setImportOpen] = useState(false);

  return (
    <div className="nx-card">
      <BulkImportDialog open={importOpen} onOpenChange={setImportOpen} onToast={onToast} />
      <div style={{ padding: "4px 20px" }}>
        <SettingRow
          label="Sync endpoint"
          desc="The URL the SIS posts to when student records change."
          control={
            <>
              <span className="nx-badge nx-role-instructor"><span className="nx-badge-dot" />Connected</span>
              <button className="nx-btn nx-btn-ghost" onClick={() => onToast("Endpoint saved · /api/v1/sis/webhook (demo).", "success")}>Configure</button>
            </>
          }
        />
        <SettingRow
          label="Bulk import"
          desc="Upload CSV or JSON files to create multiple users, departments, or courses at once."
          control={
            <button className="nx-btn nx-btn-ghost" onClick={() => setImportOpen(true)}>
              <Upload /> Bulk import
            </button>
          }
        />
        <SettingRow
          label="SSO provider"
          desc="Sign in with Google Workspace, Microsoft 365, or your university IdP."
          control={
            <>
              <span className="nx-badge" style={{ background: "var(--nx-bg-hover)", color: "var(--nx-fg-muted)" }}>Not configured</span>
              <button className="nx-btn nx-btn-ghost" onClick={() => onToast("SSO setup needs the backend integrations endpoint.", "info")}>Configure</button>
            </>
          }
        />
        <SettingRow
          label="Email provider"
          desc="Outbound transactional mail (invites, password resets)."
          control={
            <>
              <span className="nx-badge" style={{ background: "var(--nx-bg-hover)", color: "var(--nx-fg-muted)" }}>Not configured</span>
              <button className="nx-btn nx-btn-ghost" onClick={() => onToast("Email provider setup needs the backend integrations endpoint.", "info")}>Configure</button>
            </>
          }
        />
      </div>
    </div>
  );
}

// ── Security ───────────────────────────────────────
function Security({ onSave }: { onSave: (msg: string) => void }) {
  const [sessionDays, setSessionDays] = useState("14");
  const [mfa, setMfa] = useState(true);

  return (
    <div className="nx-card">
      <div style={{ padding: "4px 20px" }}>
        <SettingRow
          label="Session lifetime"
          desc="How long users stay signed in across devices. Backend currently uses a 1-hour JWT — this is a placeholder."
          control={
            <select className="nx-select" value={sessionDays} onChange={e => { setSessionDays(e.target.value); onSave("Saved (demo)."); }}>
              <option value="1">1 day</option>
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
            </select>
          }
        />
        <SettingRow
          label="Require MFA for admins"
          desc="Force second-factor verification for any user with the admin role."
          control={
            <button
              type="button"
              role="switch"
              aria-checked={mfa}
              onClick={() => { setMfa(v => !v); onSave("Saved (demo)."); }}
              style={{
                position: "relative", width: 32, height: 18,
                background: mfa ? "var(--nx-fg)" : "var(--nx-bg-active)",
                border: `1px solid ${mfa ? "var(--nx-fg)" : "var(--nx-border)"}`,
                borderRadius: 999, cursor: "pointer", transition: "background 120ms",
              }}
            >
              <span style={{
                position: "absolute", left: 2, top: 1,
                width: 14, height: 14,
                background: "white",
                borderRadius: "50%",
                transition: "transform 120ms",
                transform: mfa ? "translateX(13px)" : "translateX(0)",
                boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
              }} />
            </button>
          }
        />
        <SettingRow
          label="Allowed IP ranges"
          desc="Restrict admin sign-ins to specific networks."
          control={<button className="nx-btn nx-btn-ghost" onClick={() => onSave("IP ranges feature is not yet implemented.")}>Configure</button>}
        />
      </div>
    </div>
  );
}

// ── Appearance ─────────────────────────────────────
function Appearance() {
  const [theme, setThemeState] = useState<"light" | "dark">("dark");
  const [density, setDensityState] = useState<"compact" | "balanced">("compact");

  useEffect(() => {
    const t = (localStorage.getItem("wodooh.theme") as "light" | "dark") || "dark";
    const d = (localStorage.getItem("wodooh.density") as "compact" | "balanced") || "compact";
    setThemeState(t);
    setDensityState(d);
  }, []);

  const setTheme = (t: "light" | "dark") => {
    setThemeState(t);
    document.documentElement.dataset.nxTheme = t;
    localStorage.setItem("wodooh.theme", t);
  };
  const setDensity = (d: "compact" | "balanced") => {
    setDensityState(d);
    document.documentElement.dataset.nxDensity = d;
    localStorage.setItem("wodooh.density", d);
  };

  return (
    <div className="nx-card">
      <div style={{ padding: "4px 20px" }}>
        <SettingRow
          label="Color theme"
          desc="Light is recommended for accessibility. Dark dims the entire workspace."
          control={
            <div className="nx-segmented">
              <button className="nx-segmented-btn" data-active={theme === "light"} onClick={() => setTheme("light")}><Sun /> Light</button>
              <button className="nx-segmented-btn" data-active={theme === "dark"} onClick={() => setTheme("dark")}><Moon /> Dark</button>
            </div>
          }
        />
        <SettingRow
          label="Layout size"
          desc="How tightly things are packed. Balanced gives more breathing room; Compact fits more on screen at once."
          control={
            <div className="nx-segmented">
              <button className="nx-segmented-btn" data-active={density === "balanced"} onClick={() => setDensity("balanced")}>Balanced</button>
              <button className="nx-segmented-btn" data-active={density === "compact"} onClick={() => setDensity("compact")}>Compact</button>
            </div>
          }
        />
      </div>
    </div>
  );
}
