"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import apiClient from "@/lib/api/client";
import API_ENDPOINTS from "@/lib/api/endpoints";
import "../nexus.css";
import "../login/login.css";

// ── Icons ────────────────────────────────────────────────
const Icon = ({ size = 14, children }: { size?: number; children: React.ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);
const Eye = () => <Icon size={16}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></Icon>;
const EyeOff = () => <Icon size={16}><path d="M3 3l18 18" /><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" /><path d="M9.9 4.24A10 10 0 0 1 12 4c6.5 0 10 7 10 7a18 18 0 0 1-3.16 4.19M6.61 6.6A18 18 0 0 0 2 11s3 6.5 9.5 7a10 10 0 0 0 4-1" /></Icon>;
const ArrowLeft = () => <Icon size={14}><path d="M19 12H5M12 5l-7 7 7 7" /></Icon>;
const Sun = () => <Icon size={16}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></Icon>;
const Moon = () => <Icon size={16}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" /></Icon>;
const Check = () => <Icon size={40}><path d="M20 6L9 17l-5-5" /></Icon>;

// ── Theme hook ───────────────────────────────────────────
function useTheme() {
  const [theme, setThemeState] = useState<"light" | "dark">("dark");
  useEffect(() => {
    const t = (localStorage.getItem("wodooh.theme") as "light" | "dark") || "dark";
    setThemeState(t);
    document.documentElement.dataset.nxTheme = t;
  }, []);
  const setTheme = (t: "light" | "dark") => {
    setThemeState(t);
    document.documentElement.dataset.nxTheme = t;
    localStorage.setItem("wodooh.theme", t);
  };
  return { theme, setTheme };
}

// ── Reset form ───────────────────────────────────────────
function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) setError("This reset link is invalid or has expired.");
  }, [token]);

  const validate = (): string | null => {
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (password !== confirm) return "Passwords do not match.";
    return null;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError(null);
    setLoading(true);
    try {
      await apiClient.post(API_ENDPOINTS.RESET_PASSWORD, { token, newPassword: password });
      setDone(true);
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 410) setError("This link has expired. Please request a new one.");
      else setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="nx-login-card">
        <div className="nx-login-head">
          <div className="nx-login-logo">W</div>
          <h1 className="nx-login-title">Invalid link</h1>
          <p className="nx-login-sub">This password reset link is missing or malformed.</p>
        </div>
        <div className="nx-login-form">
          <button className="nx-btn nx-btn-primary nx-login-submit" onClick={() => router.push("/login")}>
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="nx-login-card">
        <div className="nx-login-head">
          <div className="nx-login-logo" style={{ background: "var(--nx-success)" }}>
            <Check />
          </div>
          <h1 className="nx-login-title">Password updated</h1>
          <p className="nx-login-sub">Your password has been reset. You can now sign in with your new password.</p>
        </div>
        <div className="nx-login-form">
          <button
            className="nx-btn nx-btn-primary nx-login-submit"
            onClick={() => router.push("/login")}
          >
            Go to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="nx-login-card">
      <div className="nx-login-head">
        <div className="nx-login-logo">W</div>
        <h1 className="nx-login-title">Set new password</h1>
        <p className="nx-login-sub">Choose a strong password for your account.</p>
      </div>

      <form className="nx-login-form" onSubmit={submit} noValidate>
        {error && (
          <div className="nx-login-error" role="alert" style={{ display: "block" }}>
            {error}
          </div>
        )}

        <div className="nx-login-field">
          <label className="nx-field-label" htmlFor="new-password">New password</label>
          <div className="nx-login-input-wrap">
            <input
              id="new-password"
              className="nx-login-input"
              type={showPw ? "text" : "password"}
              autoFocus
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="nx-icon-btn"
              style={{ color: "var(--nx-fg-subtle)" }}
              onClick={() => setShowPw(v => !v)}
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? <EyeOff /> : <Eye />}
            </button>
          </div>
        </div>

        <div className="nx-login-field">
          <label className="nx-field-label" htmlFor="confirm-password">Confirm password</label>
          <div className="nx-login-input-wrap">
            <input
              id="confirm-password"
              className="nx-login-input"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Repeat your password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
            />
            <button
              type="button"
              className="nx-icon-btn"
              style={{ color: "var(--nx-fg-subtle)" }}
              onClick={() => setShowConfirm(v => !v)}
              aria-label={showConfirm ? "Hide password" : "Show password"}
            >
              {showConfirm ? <EyeOff /> : <Eye />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="nx-btn nx-btn-primary nx-login-submit"
          disabled={loading || !password || !confirm}
        >
          {loading ? <><span className="nx-spin" /> Updating…</> : "Set new password"}
        </button>

        <button
          type="button"
          className="nx-login-link"
          onClick={() => router.push("/login")}
          style={{ alignSelf: "center", display: "inline-flex", alignItems: "center", gap: 6, marginTop: 4 }}
        >
          <ArrowLeft /> Back to sign in
        </button>
      </form>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────
export default function ResetPasswordPage() {
  const { theme, setTheme } = useTheme();

  return (
    <main className="nx-login-shell">
      <div className="nx-login-topbar">
        <button
          className="nx-icon-btn"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
          title="Toggle theme"
        >
          {theme === "dark" ? <Sun /> : <Moon />}
        </button>
      </div>

      <div className="nx-login-main">
        <Suspense fallback={<span className="nx-spin" />}>
          <ResetForm />
        </Suspense>
      </div>
    </main>
  );
}
