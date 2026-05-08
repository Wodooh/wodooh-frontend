"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-provider";
import type { LoginCredentials } from "@/lib/types/auth.types";
import "./login.css";

type View = "signin" | "forgot";

function dashboardPathForRole(role: string | undefined): string {
  switch (role) {
    case "admin": return "/admin/dashboard";
    case "instructor": return "/instructor/dashboard";
    case "chairman": return "/chairman/dashboard";
    case "student":
    default: return "/student/dashboard";
  }
}

// ── Icons ────────────────────────────────────────────────
const Icon = ({ size = 14, children }: { size?: number; children: React.ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

const Eye = ({ size = 15 }: { size?: number }) => (
  <Icon size={size}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);

const EyeOff = ({ size = 15 }: { size?: number }) => (
  <Icon size={size}>
    <path d="M3 3l18 18" />
    <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
    <path d="M9.9 4.24A10 10 0 0 1 12 4c6.5 0 10 7 10 7a18 18 0 0 1-3.16 4.19M6.61 6.6A18 18 0 0 0 2 11s3 6.5 9.5 7a10 10 0 0 0 4-1" />
  </Icon>
);

const AlertTriangle = ({ size = 12 }: { size?: number }) => (
  <Icon size={size}>
    <path d="m12 3 10 18H2L12 3Z" />
    <path d="M12 9v5" />
    <circle cx="12" cy="17.5" r=".6" fill="currentColor" />
  </Icon>
);

const AlertCircle = ({ size = 15 }: { size?: number }) => (
  <Icon size={size}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v6" />
    <circle cx="12" cy="16.5" r=".6" fill="currentColor" />
  </Icon>
);

const ArrowLeft = ({ size = 12 }: { size?: number }) => (
  <Icon size={size}>
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </Icon>
);

const Sun = ({ size = 15 }: { size?: number }) => (
  <Icon size={size}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </Icon>
);

const Moon = ({ size = 15 }: { size?: number }) => (
  <Icon size={size}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
  </Icon>
);

// ── Theme handling ──────────────────────────────────────
function useTheme() {
  const [theme, setThemeState] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("wodooh.theme") : null;
    const resolved = stored === "dark" || stored === "light"
      ? stored
      : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    setThemeState(resolved);
    document.documentElement.dataset.nxTheme = resolved;
    document.body.classList.add("nx-login-body");
    return () => { document.body.classList.remove("nx-login-body"); };
  }, []);

  const setTheme = (t: "light" | "dark") => {
    setThemeState(t);
    document.documentElement.dataset.nxTheme = t;
    localStorage.setItem("wodooh.theme", t);
  };

  return { theme, setTheme };
}

// ── Sign in form ────────────────────────────────────────
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

      // Re-read user from localStorage / token after login.
      // useAuth state updates are async; pull role from JWT directly to avoid a stale render.
      const token = localStorage.getItem("wodooh.token");
      let role: string | undefined;
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          role = payload.role;
        } catch { /* fall through to default */ }
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
    <>
      <div className="nx-login-top">
        <div className="nx-login-logo">W</div>
        <h1 className="nx-login-h1">Sign in to WODOOH</h1>
      </div>

      <form className="nx-login-card" onSubmit={submit} noValidate>
        <div className="nx-login-form">
          {error && (
            <div className="nx-login-error" role="alert">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          <div className="nx-login-field">
            <span className="nx-login-label">Email address</span>
            <div className={`nx-login-input-wrap ${fieldErrors.email ? "has-error" : ""}`}>
              <input
                ref={emailRef}
                className="nx-login-input"
                type="email"
                autoComplete="username"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {fieldErrors.email && (
              <span className="nx-login-caps" style={{ color: "var(--nl-danger)" }}>
                <AlertCircle size={11} />{fieldErrors.email}
              </span>
            )}
          </div>

          <div className="nx-login-field">
            <div className="nx-login-label-row">
              <span className="nx-login-label">Password</span>
              <button type="button" className="nx-login-label-link" onClick={onForgot}>
                Forgot password?
              </button>
            </div>
            <div className={`nx-login-input-wrap ${fieldErrors.pw ? "has-error" : ""}`}>
              <input
                className="nx-login-input"
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
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
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {caps && (
              <div className="nx-login-caps">
                <AlertTriangle size={12} /> Caps Lock is on.
              </div>
            )}
            {fieldErrors.pw && (
              <span className="nx-login-caps" style={{ color: "var(--nl-danger)" }}>
                <AlertCircle size={11} />{fieldErrors.pw}
              </span>
            )}
          </div>

          <button type="submit" className="nx-login-submit" disabled={loading}>
            {loading ? (<><span className="nx-login-spin" /> Signing in…</>) : "Sign in"}
          </button>
        </div>
      </form>

      <div className="nx-login-foot-card">
        New to WODOOH? <a href="/onboarding">Create an account</a>
      </div>
    </>
  );
}

// ── Forgot password screen ─────────────────────────────
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
    // No backend endpoint yet — surface generic success to avoid email enumeration.
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    setSent(true);
  };

  return (
    <>
      <div className="nx-login-top">
        <div className="nx-login-logo">W</div>
        <h1 className="nx-login-h1">Reset your password</h1>
      </div>

      <form className="nx-forgot-card" onSubmit={submit} noValidate>
        {sent ? (
          <div className="nx-forgot-success">
            If an account exists for <strong>{email}</strong>, a password-reset link has been sent. Check your inbox.
          </div>
        ) : (
          <>
            <p className="nx-forgot-intro">
              Enter the email address associated with your account, and we&apos;ll email you a link to reset your password.
            </p>
            <div className="nx-login-form">
              {error && (
                <div className="nx-login-error" role="alert">
                  <AlertCircle size={15} />
                  <span>{error}</span>
                </div>
              )}
              <div className="nx-login-field">
                <span className="nx-login-label">Email address</span>
                <div className="nx-login-input-wrap">
                  <input
                    className="nx-login-input"
                    type="email"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <button type="submit" className="nx-login-submit" disabled={loading}>
                {loading ? (<><span className="nx-login-spin" /> Sending…</>) : "Send password reset email"}
              </button>
            </div>
          </>
        )}
      </form>

      <div className="nx-login-foot-card">
        <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <ArrowLeft size={12} /> Back to sign in
        </button>
      </div>
    </>
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <span className="nx-login-spin" style={{ borderTopColor: "currentColor", color: "#888" }} />
      </div>
    );
  }
  if (isAuthenticated) return null;

  return (
    <>
      <button
        className="nx-login-theme-toggle"
        title="Toggle theme"
        aria-label="Toggle theme"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        {theme === "dark" ? <Moon size={15} /> : <Sun size={15} />}
      </button>

      {view === "signin"
        ? <SignInForm onForgot={() => setView("forgot")} />
        : <ForgotForm onBack={() => setView("signin")} />}

      <div className="nx-login-foot">
        <a href="#">Terms</a>
        <a href="#">Privacy</a>
        <a href="#">Security</a>
        <a href="#">Contact support</a>
      </div>
    </>
  );
}
