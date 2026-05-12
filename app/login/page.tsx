"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-provider";
import type { LoginCredentials } from "@/lib/types/auth.types";
import "../nexus.css";
import "./login.css";

type View = "signin" | "forgot";

function dashboardPathForRole(role: string | undefined): string {
  switch (role) {
    case "admin":      return "/admin/dashboard";
    case "instructor": return "/instructor/dashboard";
    case "chairman":   return "/chairman/dashboard";
    case "student":
    default:           return "/student/dashboard";
  }
}

// ── Icons ────────────────────────────────────────────────

const Icon = ({ size = 14, children }: { size?: number; children: React.ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

const Eye = ({ size = 16 }: { size?: number }) => (
  <Icon size={size}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);

const EyeOff = ({ size = 16 }: { size?: number }) => (
  <Icon size={size}>
    <path d="M3 3l18 18" />
    <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
    <path d="M9.9 4.24A10 10 0 0 1 12 4c6.5 0 10 7 10 7a18 18 0 0 1-3.16 4.19M6.61 6.6A18 18 0 0 0 2 11s3 6.5 9.5 7a10 10 0 0 0 4-1" />
  </Icon>
);

const Sun = ({ size = 16 }: { size?: number }) => (
  <Icon size={size}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </Icon>
);

const Moon = ({ size = 16 }: { size?: number }) => (
  <Icon size={size}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
  </Icon>
);

const ArrowLeft = ({ size = 14 }: { size?: number }) => (
  <Icon size={size}>
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </Icon>
);

// ── Theme ───────────────────────────────────────────────

function useTheme() {
  const [theme, setThemeState] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("wodooh.theme") : null;
    const resolved = stored === "dark" || stored === "light"
      ? stored
      : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    setThemeState(resolved);
    document.documentElement.dataset.nxTheme = resolved;
    document.documentElement.dataset.nxDensity = "compact";
  }, []);

  const setTheme = (t: "light" | "dark") => {
    setThemeState(t);
    document.documentElement.dataset.nxTheme = t;
    localStorage.setItem("wodooh.theme", t);
  };

  return { theme, setTheme };
}

// ── Dev quick-login ──────────────────────────────────────

const DEV_ROLES = [
  { role: "student",    email: "student@gmail.com",    label: "Student" },
  { role: "instructor", email: "instructor@gmail.com", label: "Instructor" },
  { role: "chairman",   email: "chairman@gmail.com",   label: "Chairman" },
  { role: "admin",      email: "admin@wodooh.com",     label: "Admin" },
] as const;

const PersonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
  </svg>
);

function DevRoleButtons({
  login,
  onSuccess,
}: {
  login: (creds: LoginCredentials) => Promise<void>;
  onSuccess: (role: string) => void;
}) {
  const [active, setActive] = useState<string | null>(null);

  const loginAs = async (email: string, role: string) => {
    if (active) return;
    setActive(role);
    try {
      await login({ email, password: "Password123" });
      onSuccess(role);
    } catch { /* ignore */ } finally {
      setActive(null);
    }
  };

  return (
    <div className="nx-dev-section">
      <div className="nx-dev-divider">Dev · Sign in as</div>
      <div className="nx-dev-grid">
        {DEV_ROLES.map(({ role, email, label }) => (
          <button
            key={role}
            type="button"
            className="nx-dev-btn"
            disabled={active !== null}
            onClick={() => loginAs(email, role)}
            title={email}
          >
            <span className="nx-dev-icon">
              {active === role ? <span className="nx-spin" /> : <PersonIcon />}
            </span>
            <span className="nx-dev-label">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Sign in ─────────────────────────────────────────────

function SignInForm({ onForgot }: { onForgot: () => void }) {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [caps, setCaps] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; pw?: string }>({});
  const [loading, setLoading] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => { emailRef.current?.focus(); }, []);

  const onPwKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setCaps(e.getModifierState?.("CapsLock") ?? false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const fe: { email?: string; pw?: string } = {};
    if (!email.trim()) fe.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) fe.email = "Enter a valid email.";
    if (!pw) fe.pw = "Password is required.";
    if (Object.keys(fe).length) { setFieldErrors(fe); return; }

    setLoading(true);
    try {
      const credentials: LoginCredentials = {
        email: email.trim().toLowerCase(),
        password: pw,
      };
      await login(credentials);

      const token = localStorage.getItem("wodooh.token");
      let role: string | undefined;
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          role = payload.role;
        } catch { /* fall through */ }
      }
      router.replace(dashboardPathForRole(role));
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string; statusCode?: number };
      if (e?.statusCode === 401 || e?.code === "INVALID_CREDENTIALS") {
        setError("Incorrect email or password.");
      } else if (e?.statusCode === 503) {
        setError("Service temporarily unavailable. Please try again in a moment.");
      } else {
        setError(e?.message || "Sign-in failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="nx-login-card">
      <div className="nx-login-head">
        <div className="nx-login-logo">W</div>
        <h1 className="nx-login-title">Sign in to WODOOH</h1>
        <p className="nx-login-sub">Use your institutional credentials</p>
      </div>

      <form className="nx-login-form" onSubmit={submit} noValidate>
        {error && (
          <div className="nx-login-error" role="alert">{error}</div>
        )}

        <div className="nx-login-field">
          <label className="nx-field-label" htmlFor="email">Email</label>
          <div className={`nx-login-input-wrap ${fieldErrors.email ? "has-error" : ""}`}>
            <input
              ref={emailRef}
              id="email"
              className="nx-login-input"
              type="email"
              autoComplete="username"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="name@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {fieldErrors.email && (
            <span className="nx-login-helper is-error">{fieldErrors.email}</span>
          )}
        </div>

        <div className="nx-login-field">
          <div className="nx-login-field-row">
            <label className="nx-field-label" htmlFor="password">Password</label>
            <button type="button" className="nx-login-link" onClick={onForgot}>
              Forgot password?
            </button>
          </div>
          <div className={`nx-login-input-wrap ${fieldErrors.pw ? "has-error" : ""}`}>
            <input
              id="password"
              className="nx-login-input"
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              onKeyDown={onPwKey}
              onKeyUp={onPwKey}
            />
            <button
              type="button"
              className="nx-login-pw-toggle"
              onClick={() => setShowPw((v) => !v)}
              tabIndex={-1}
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? <EyeOff /> : <Eye />}
            </button>
          </div>
          {caps && <span className="nx-login-helper">Caps Lock is on</span>}
          {fieldErrors.pw && (
            <span className="nx-login-helper is-error">{fieldErrors.pw}</span>
          )}
        </div>

        <button
          type="submit"
          className="nx-btn nx-btn-primary nx-login-submit"
          disabled={loading}
        >
          {loading ? <><span className="nx-spin" /> Signing in…</> : "Sign in"}
        </button>

        {process.env.NODE_ENV === "development" && (
          <DevRoleButtons
            login={login}
            onSuccess={(role) => router.replace(dashboardPathForRole(role))}
          />
        )}
      </form>
    </div>
  );
}

// ── Forgot password ─────────────────────────────────────

function ForgotForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email.");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    setSent(true);
  };

  return (
    <div className="nx-login-card">
      <div className="nx-login-head">
        <div className="nx-login-logo">W</div>
        <h1 className="nx-login-title">Reset your password</h1>
        <p className="nx-login-sub">
          {sent
            ? "Check your inbox for the reset link."
            : "Enter your email and we’ll send you a reset link."}
        </p>
      </div>

      {sent ? (
        <div className="nx-login-form">
          <div className="nx-login-error" role="status" style={{
            borderColor: "color-mix(in oklab, var(--nx-success) 35%, transparent)",
            background: "var(--nx-success-soft)",
            color: "var(--nx-success)",
          }}>
            If an account exists for <strong>{email}</strong>, a password-reset link has been sent.
          </div>
          <button
            type="button"
            className="nx-btn nx-btn-ghost nx-login-submit"
            onClick={onBack}
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            <ArrowLeft /> Back to sign in
          </button>
        </div>
      ) : (
        <form className="nx-login-form" onSubmit={submit} noValidate>
          {error && <div className="nx-login-error" role="alert">{error}</div>}

          <div className="nx-login-field">
            <label className="nx-field-label" htmlFor="reset-email">Email</label>
            <div className="nx-login-input-wrap">
              <input
                id="reset-email"
                className="nx-login-input"
                type="email"
                autoFocus
                autoComplete="email"
                placeholder="name@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            className="nx-btn nx-btn-primary nx-login-submit"
            disabled={loading}
          >
            {loading ? <><span className="nx-spin" /> Sending…</> : "Send reset link"}
          </button>

          <button
            type="button"
            className="nx-login-link"
            onClick={onBack}
            style={{ alignSelf: "center", display: "inline-flex", alignItems: "center", gap: 6, marginTop: 4 }}
          >
            <ArrowLeft /> Back to sign in
          </button>
        </form>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { theme, setTheme } = useTheme();
  const [view, setView] = useState<View>("signin");

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace(dashboardPathForRole(user?.role));
    }
  }, [authLoading, isAuthenticated, user, router]);

  if (authLoading) {
    return (
      <main className="nx-login-shell">
        <div className="nx-login-main">
          <span className="nx-spin" />
        </div>
      </main>
    );
  }
  if (isAuthenticated) return null;

  return (
    <main className="nx-login-shell">
      <div className="nx-login-topbar">
        <button
          className="nx-icon-btn"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          title="Toggle theme"
        >
          {theme === "dark" ? <Sun /> : <Moon />}
        </button>
      </div>

      <div className="nx-login-main">
        {view === "signin"
          ? <SignInForm onForgot={() => setView("forgot")} />
          : <ForgotForm onBack={() => setView("signin")} />}

        {view === "signin" && (
          <p className="nx-login-meta">
            New to WODOOH? <a href="/onboarding">Create an account</a>
          </p>
        )}
      </div>

      <footer className="nx-login-foot">
        <a href="#">Terms</a>
        <a href="#">Privacy</a>
        <a href="#">Support</a>
      </footer>
    </main>
  );
}
