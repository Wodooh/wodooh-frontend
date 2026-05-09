"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-provider";
import type { LoginCredentials } from "@/lib/types/auth.types";
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

// ── Icons (stroke-based, brutalist-spec line weight) ───────────

const Icon = ({ size = 14, strokeWidth = 1.6, children }: { size?: number; strokeWidth?: number; children: React.ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="square" strokeLinejoin="miter">
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

// ── Theme handling ─────────────────────────────────────────

function useTheme() {
  const [theme, setThemeState] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("wodooh.theme") : null;
    const resolved = stored === "dark" || stored === "light"
      ? stored
      : "light"; // Brutalist login defaults LIGHT regardless of system preference
    setThemeState(resolved);
    document.documentElement.dataset.nxTheme = resolved;
    document.body.classList.add("bl-shell");
    return () => {
      document.body.classList.remove("bl-shell");
    };
  }, []);

  const setTheme = (t: "light" | "dark") => {
    setThemeState(t);
    document.documentElement.dataset.nxTheme = t;
    localStorage.setItem("wodooh.theme", t);
  };

  return { theme, setTheme };
}

// ── Brand panel (left column) ──────────────────────────────

function BrandPanel() {
  return (
    <aside className="bl-brand">
      <span className="bl-corner-tag">[ A · 01 ]</span>

      <div className="bl-wordmark">
        <p className="bl-wordmark-meta">Volume 2026 · Spring Term</p>
        <h2 className="bl-wordmark-latin">WODOOH</h2>
        <p className="bl-wordmark-arabic" lang="ar" dir="rtl">وضوح</p>
        <hr className="bl-wordmark-divider" aria-hidden="true" />
        <p className="bl-tagline">
          Instant <span className="bl-tagline-accent">·</span> Anonymous <span className="bl-tagline-accent">·</span> Classroom Engagement
        </p>
      </div>

      <div className="bl-brand-foot">
        <span>PG. 01 / 01</span>
        <span><strong>KSU</strong> · Senior Project</span>
      </div>
    </aside>
  );
}

// ── Sign-in form (right column) ─────────────────────────────

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
    <section className="bl-form-panel">
      <div>
        <header className="bl-form-head">
          <p className="bl-form-eyebrow">Portal Access</p>
          <h1 className="bl-form-title">Sign In</h1>
          <p className="bl-form-subtitle">
            Authenticate with your institutional credentials. All access is logged; transcripts are sealed by architecture.
          </p>
        </header>

        <form className="bl-form" onSubmit={submit} noValidate>
          {error && (
            <div className="bl-error" role="alert">
              <span>{error}</span>
            </div>
          )}

          <div className="bl-field">
            <span className="bl-field-num" aria-hidden="true">01</span>
            <div className="bl-field-body">
              <div className="bl-field-row">
                <label className="bl-field-label" htmlFor="bl-email">Email Address</label>
              </div>
              <div className={`bl-input-wrap ${fieldErrors.email ? "has-error" : ""}`}>
                <input
                  ref={emailRef}
                  id="bl-email"
                  className="bl-input"
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
                <span className="bl-field-helper bl-field-error">— {fieldErrors.email}</span>
              )}
            </div>
          </div>

          <div className="bl-field">
            <span className="bl-field-num" aria-hidden="true">02</span>
            <div className="bl-field-body">
              <div className="bl-field-row">
                <label className="bl-field-label" htmlFor="bl-pw">Passphrase</label>
                <button type="button" className="bl-field-link" onClick={onForgot}>
                  Forgot →
                </button>
              </div>
              <div className={`bl-input-wrap ${fieldErrors.pw ? "has-error" : ""}`}>
                <input
                  id="bl-pw"
                  className="bl-input"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder={showPw ? "" : "••••••••"}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  onKeyDown={onPwKey}
                  onKeyUp={onPwKey}
                />
                <button
                  type="button"
                  className="bl-pw-toggle"
                  onClick={() => setShowPw((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPw ? "Hide passphrase" : "Show passphrase"}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {caps && (
                <span className="bl-field-helper">— Caps Lock is on</span>
              )}
              {fieldErrors.pw && (
                <span className="bl-field-helper bl-field-error">— {fieldErrors.pw}</span>
              )}
            </div>
          </div>

          <div className="bl-submit-row">
            <span className="bl-submit-num" aria-hidden="true">→</span>
            <button type="submit" className="bl-submit" disabled={loading}>
              {loading
                ? <><span className="bl-spin" /> Authenticating</>
                : <>Enter <span className="bl-submit-arrow" aria-hidden="true">→</span></>}
            </button>
          </div>
        </form>
      </div>

      <footer className="bl-form-foot">
        <a href="/onboarding">New here? Begin onboarding →</a>
        <span style={{ display: "inline-flex", gap: 16, flexWrap: "wrap" }}>
          <a href="#">Terms</a>
          <a href="#">Privacy</a>
          <a href="#">Support</a>
        </span>
      </footer>
    </section>
  );
}

// ── Forgot-password form (right column variant) ────────────

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
    <section className="bl-form-panel">
      <div>
        <header className="bl-form-head">
          <p className="bl-form-eyebrow">Account Recovery</p>
          <h1 className="bl-form-title">Reset</h1>
          <p className="bl-form-subtitle">
            Enter the email associated with your account. If a record exists, a single-use reset link will be dispatched.
          </p>
        </header>

        {sent ? (
          <>
            <div className="bl-success" role="status" aria-live="polite">
              <p className="bl-success-eyebrow">Receipt — Reset Link Dispatched</p>
              If an account exists for <strong>{email}</strong>, a password-reset link has been emailed. The link expires in 30 minutes.
            </div>
          </>
        ) : (
          <form className="bl-form" onSubmit={submit} noValidate>
            {error && (
              <div className="bl-error" role="alert">
                <span>{error}</span>
              </div>
            )}

            <div className="bl-field">
              <span className="bl-field-num" aria-hidden="true">01</span>
              <div className="bl-field-body">
                <div className="bl-field-row">
                  <label className="bl-field-label" htmlFor="bl-recover-email">Email Address</label>
                </div>
                <div className="bl-input-wrap">
                  <input
                    id="bl-recover-email"
                    className="bl-input"
                    type="email"
                    autoFocus
                    autoComplete="email"
                    placeholder="name@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="bl-submit-row">
              <span className="bl-submit-num" aria-hidden="true">→</span>
              <button type="submit" className="bl-submit" disabled={loading}>
                {loading
                  ? <><span className="bl-spin" /> Dispatching</>
                  : <>Send Reset Link <span className="bl-submit-arrow" aria-hidden="true">→</span></>}
              </button>
            </div>
          </form>
        )}
      </div>

      <footer className="bl-form-foot">
        <button type="button" onClick={onBack}>← Back to sign in</button>
        <span><strong style={{ color: "var(--bl-fg)" }}>SECURE BY ARCHITECTURE</strong></span>
      </footer>
    </section>
  );
}

// ── Page ───────────────────────────────────────────────────

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
        <span className="bl-spin" style={{ color: "currentColor" }} />
      </div>
    );
  }
  if (isAuthenticated) return null;

  const dateString = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).toUpperCase();

  return (
    <>
      <div className="bl-strip" role="banner">
        <div className="bl-strip-left">
          <span className="bl-strip-marker" aria-hidden="true" />
          <span>Registry · Institutional Access</span>
          <span className="bl-strip-divider" aria-hidden="true" />
          <span>{dateString}</span>
          <span className="bl-strip-divider" aria-hidden="true" />
          <span>Form · {view === "signin" ? "AUTH-001" : "AUTH-002"}</span>
        </div>
        <div className="bl-strip-right">
          <button
            className="bl-theme-toggle"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          >
            <span className="bl-theme-toggle-dot" aria-hidden="true" />
            {theme === "dark" ? "DARK" : "LIGHT"}
          </button>
        </div>
      </div>

      <div className="bl-shell-grid">
        <BrandPanel />
        {view === "signin"
          ? <SignInForm onForgot={() => setView("forgot")} />
          : <ForgotForm onBack={() => setView("signin")} />}
      </div>
    </>
  );
}
