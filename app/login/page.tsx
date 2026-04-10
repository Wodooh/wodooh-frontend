"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-provider";
import type { LoginCredentials, UserRole } from "@/lib/types/auth.types";

// ─── Error icon mapping ──────────────────────────────────────
const ERROR_ICONS: Record<string, string> = {
  INVALID_CREDENTIALS: "🔒",
  SSO_UNAVAILABLE: "🔧",
  RATE_LIMITED: "⏳",
  NO_ROLE: "👤",
  NON_UNIVERSITY_EMAIL: "🎓",
  UNKNOWN_ERROR: "⚠️",
};

export default function LoginPage() {
  const router = useRouter();
  const { login, user, isAuthenticated, loading: authLoading } = useAuth();

  const [credential, setCredential] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<{
    code: string;
    message: string;
  } | null>(null);
  const [credentialTouched, setCredentialTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, authLoading, router]);

  // ── Client-side validation ─────────────────────────────────
  // Accept: university email (contains @) OR username (no @, 2+ chars)
  const isValidCredentialFormat = (val: string): boolean => {
    if (!val.trim()) return false;
    if (val.includes("@")) {
      // University email validation - only accepts .edu.sa domain
      // return /^[^\s@]+@[^.\s@]+\.(edu\.sa)$/i.test(val);

      // Temporary: Accept any email format (university validation commented out)
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    }
    return /^[a-zA-Z0-9._-]{2,}$/.test(val);
  };

  const credentialError =
    credentialTouched && !credential.trim()
      ? "Email or username is required."
      : credentialTouched && !isValidCredentialFormat(credential)
        ? "Please enter a valid university email or username."
        : null;

  const passwordError =
    passwordTouched && !password ? "Password is required." : null;

  const isFormValid =
    isValidCredentialFormat(credential) &&
    password &&
    !isSubmitting;

  // ── Handle form submission ─────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredentialTouched(true);
    setPasswordTouched(true);

    if (!isFormValid) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const credentials: LoginCredentials = {
        email: credential.trim().toLowerCase(),
        password,
      };
      await login(credentials);

      // After successful login, use the user from auth context to determine redirect
      if (user) {
        switch (user.role) {
          case "instructor":
            router.replace("/dashboard/instructor");
            break;
          case "chairman":
            router.replace("/dashboard/chairman");
            break;
          case "student":
          default:
            router.replace("/dashboard");
            break;
        }
      } else {
        router.replace("/dashboard");
      }
    } catch (err: any) {
      setError({
        code: err?.code || "UNKNOWN_ERROR",
        message: err?.message || "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show nothing while checking auth state
  if (authLoading) {
    return (
      <div className="login-page">
        <div className="login-loader">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  // If already authenticated, show nothing (redirect is happening)
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="login-page">
      {/* Animated background elements */}
      <div className="login-bg-orb login-bg-orb-1" />
      <div className="login-bg-orb login-bg-orb-2" />
      <div className="login-bg-orb login-bg-orb-3" />

      <main className="login-container">
        {/* Glass card */}
        <div className="login-card">
          {/* Logo / Brand */}
          <div className="login-brand">
            <div className="login-logo-img mb-6">
              <img
                src="/logo.png"
                alt="WODOOH Logo"
                className="h-20 w-auto object-contain"
              />
            </div>
            <h1 className="login-title">WODOOH</h1>
            <p className="login-subtitle">
              Sign in with your university credentials
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div
              className={`login-error login-error-${error.code.toLowerCase()}`}
              role="alert"
              id="login-error-message"
            >
              <span className="login-error-icon">
                {ERROR_ICONS[error.code]}
              </span>
              <p className="login-error-text">{error.message}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="login-form" noValidate>
            {/* Email or Username field */}
            <div className="login-field">
              <label htmlFor="login-credential" className="login-label">
                University Email or Username
              </label>
              <div className={`login-input-wrapper ${credentialError ? "login-input-error" : ""}`}>
                <svg
                  className="login-input-icon"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <path
                    d="M2.5 6.667L9.025 11.05c.3.2.45.3.614.339a1 1 0 00.722 0c.164-.04.314-.14.614-.34L17.5 6.668M5.667 16.667h8.666c1.4 0 2.1 0 2.635-.273a2.5 2.5 0 001.093-1.093c.272-.535.272-1.235.272-2.635V7.334c0-1.4 0-2.1-.272-2.635a2.5 2.5 0 00-1.093-1.093c-.535-.273-1.235-.273-2.635-.273H5.667c-1.4 0-2.1 0-2.635.273a2.5 2.5 0 00-1.093 1.093c-.272.535-.272 1.235-.272 2.635v5.332c0 1.4 0 2.1.272 2.635a2.5 2.5 0 001.093 1.093c.535.273 1.235.273 2.635.273z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <input
                  id="login-credential"
                  type="text"
                  placeholder="your.name@university.edu.sa"
                  value={credential}
                  onChange={(e) => setCredential(e.target.value)}
                  onBlur={() => setCredentialTouched(true)}
                  disabled={isSubmitting}
                  autoComplete="username"
                  autoFocus
                  aria-describedby={credentialError ? "credential-error" : undefined}
                  aria-invalid={!!credentialError}
                />
              </div>
              {credentialError && (
                <p id="credential-error" className="login-field-error">
                  {credentialError}
                </p>
              )}
            </div>

            {/* Password field */}
            <div className="login-field">
              <label htmlFor="login-password" className="login-label">
                Password
              </label>
              <div
                className={`login-input-wrapper ${passwordError ? "login-input-error" : ""}`}
              >
                <svg
                  className="login-input-icon"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <path
                    d="M14.167 8.333V6.667a4.167 4.167 0 00-8.334 0v1.666M10 12.083v1.667M6.833 16.667h6.334c1.4 0 2.1 0 2.635-.273a2.5 2.5 0 001.093-1.093c.272-.535.272-1.235.272-2.635v-1.332c0-1.4 0-2.1-.272-2.635a2.5 2.5 0 00-1.093-1.093c-.535-.273-1.235-.273-2.635-.273H6.833c-1.4 0-2.1 0-2.635.273a2.5 2.5 0 00-1.093 1.093c-.272.535-.272 1.235-.272 2.635v1.332c0 1.4 0 2.1.272 2.635a2.5 2.5 0 001.093 1.093c.535.273 1.235.273 2.635.273z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setPasswordTouched(true)}
                  disabled={isSubmitting}
                  autoComplete="current-password"
                  aria-describedby={passwordError ? "password-error" : undefined}
                  aria-invalid={!!passwordError}
                />
                <button
                  type="button"
                  className="login-toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path
                        d="M2.5 2.5l15 15M8.235 8.293A2.5 2.5 0 0011.707 11.765M4.7 5.048C3.282 6.133 2.167 7.663 1.667 10c1.048 4.872 5 7.5 8.333 7.5 1.73 0 3.388-.67 4.786-1.72M9.583 2.542c.139-.014.278-.025.417-.042A8.27 8.27 0 0110 2.5c3.333 0 7.285 2.628 8.333 7.5a10.58 10.58 0 01-1.2 3.06"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path
                        d="M1.667 10c1.048-4.872 5-7.5 8.333-7.5s7.285 2.628 8.333 7.5c-1.048 4.872-5 7.5-8.333 7.5s-7.285-2.628-8.333-7.5z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle
                        cx="10"
                        cy="10"
                        r="2.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                    </svg>
                  )}
                </button>
              </div>
              {passwordError && (
                <p id="password-error" className="login-field-error">
                  {passwordError}
                </p>
              )}
            </div>

            {/* Submit button */}
            <button
              id="login-submit"
              type="submit"
              className="login-button"
              disabled={!isFormValid}
            >
              {isSubmitting ? (
                <>
                  <div className="spinner spinner-small" />
                  <span>Signing In…</span>
                </>
              ) : (
                <span>Log In</span>
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="login-footer">
            Protected by institutional authentication.
            <br />
            <span className="login-footer-muted">
              Your credentials are validated securely via your university&apos;s SSO system.
            </span>
            <br />
            <span className="login-footer-muted">
              New student?{" "}
              <a href="/onboarding" className="login-footer-link">
                Register manually
              </a>
            </span>
          </p>
        </div>
      </main>
    </div>
  );
}
