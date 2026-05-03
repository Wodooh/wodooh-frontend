"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-provider";
import type { LoginCredentials } from "@/lib/types/auth.types";
import { Card, CardContent } from "@/components/ui/card";

const FEATURES = [
  { icon: "visibility_off", label: "Anonymous by default"         },
  { icon: "bolt",           label: "Real-time classroom signals"  },
  { icon: "lock",           label: "Zero tracking, zero retention"},
];

type ErrorTheme = { bg: string; border: string; heading: string; body: string };

function errorTheme(code: string): ErrorTheme {
  const c = code.toLowerCase();
  if (c === "sso_unavailable") return {
    bg: "bg-[#FFFBEB]", border: "border-[#FDE68A]",
    heading: "text-[#92400E]", body: "text-[#78350F]",
  };
  if (c === "no_role" || c === "non_university_email") return {
    bg: "bg-[#EEF2FF]", border: "border-[#C7D2FE]",
    heading: "text-[#3730A3]", body: "text-[#1040C0]",
  };
  return {
    bg: "bg-[#FEF2F2]", border: "border-[#FECACA]",
    heading: "text-[#991B1B]", body: "text-[#7F1D1D]",
  };
}

export default function LoginPage() {
  const router = useRouter();
  const { login, user, isAuthenticated, loading: authLoading } = useAuth();

  const [credential,       setCredential]       = useState("");
  const [password,         setPassword]         = useState("");
  const [showPassword,     setShowPassword]     = useState(false);
  const [isSubmitting,     setIsSubmitting]     = useState(false);
  const [error,            setError]            = useState<{ code: string; message: string } | null>(null);
  const [credentialTouched, setCredentialTouched] = useState(false);
  const [passwordTouched,   setPasswordTouched]   = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) router.replace("/dashboard");
  }, [isAuthenticated, authLoading, router]);

  const isValidCredentialFormat = (val: string): boolean => {
    if (!val.trim()) return false;
    if (val.includes("@")) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
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

  const isFormValid = isValidCredentialFormat(credential) && password && !isSubmitting;

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

      if (user) {
        switch (user.role) {
          case "instructor": router.replace("/dashboard/instructor"); break;
          case "chairman":   router.replace("/dashboard/chairman");   break;
          default:           router.replace("/dashboard");            break;
        }
      } else {
        router.replace("/dashboard");
      }
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      setError({
        code:    e?.code    || "UNKNOWN_ERROR",
        message: e?.message || "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <p className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-[0.18em]">
          Loading…
        </p>
      </div>
    );
  }

  if (isAuthenticated) return null;

  const inputBase =
    "w-full h-12 px-4 bg-white border border-[#E2E8F0] rounded-xl text-sm text-[#0F172A] " +
    "placeholder:text-[#94A3B8] transition-all duration-150 " +
    "focus:outline-none focus:border-[#1040C0] focus:ring-2 focus:ring-[#1040C0]/20 " +
    "disabled:bg-[#F8FAFC] disabled:text-[#94A3B8] disabled:cursor-not-allowed";

  const inputError = "border-[#EF4444] ring-2 ring-[#EF4444]/20 focus:border-[#EF4444] focus:ring-[#EF4444]/20";

  return (
    <>
      <style>{`
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 30px #ffffff inset !important;
          -webkit-text-fill-color: #0F172A !important;
        }
        @keyframes panel-in  { from { opacity:0; transform:translateX(-10px); } to { opacity:1; transform:translateX(0); } }
        @keyframes form-in   { from { opacity:0; transform:translateY(14px);  } to { opacity:1; transform:translateY(0);  } }
        .login-panel-animate { animation: panel-in  0.6s cubic-bezier(0.16,1,0.3,1) both; }
        .login-form-animate  { animation: form-in   0.6s 0.1s cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>

      <main className="min-h-screen flex">

        {/* ── Left: brand panel ─────────────────────────────────── */}
        <div
          aria-hidden="true"
          className="hidden lg:flex flex-col justify-between w-[480px] shrink-0 bg-[#0F172A] px-14 py-12 relative overflow-hidden login-panel-animate"
        >
          {/* Subtle radial glow */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 70% 60% at 30% 60%, rgba(16,64,192,0.18) 0%, transparent 70%)" }} />

          {/* Fine dot grid */}
          <div className="absolute inset-0 pointer-events-none opacity-30"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
              backgroundPosition: "12px 12px",
            }} />

          {/* Top meta */}
          <p className="relative z-10 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">
            Wodooh · Authentication Portal · Spring 2026
          </p>

          {/* Centre wordmark + mission */}
          <div className="relative z-10 space-y-8">
            <div className="space-y-1">
              <p
                className="text-[5.5rem] font-black text-white leading-none tracking-tight"
                lang="ar"
                dir="rtl"
              >
                وضوح
              </p>
              <p className="text-2xl font-bold text-white/30 tracking-tight leading-none">
                Wodooh
              </p>
            </div>

            <p className="text-base text-white/70 leading-relaxed max-w-[300px]">
              Instant, anonymous classroom engagement and feedback — built for honest academic exchange.
            </p>

            <ul className="space-y-3">
              {FEATURES.map(({ icon, label }) => (
                <li key={label} className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[16px] text-[#1040C0] shrink-0" aria-hidden="true">
                    {icon}
                  </span>
                  <span className="text-sm text-white/60">{label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Bottom privacy */}
          <div className="relative z-10 space-y-1 border-t border-white/10 pt-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">
              Privacy by Architecture
            </p>
            <p className="text-xs text-white/20 leading-relaxed">
              Identity is never stored or shared. Session-based encryption is active.
            </p>
          </div>
        </div>

        {/* ── Right: form ────────────────────────────────────────── */}
        <div className="flex-1 bg-[#F8FAFC] flex flex-col items-center justify-center px-6 py-12 login-form-animate">

          {/* Mobile-only wordmark */}
          <p className="lg:hidden text-xs font-semibold text-[#94A3B8] uppercase tracking-widest mb-8">
            Wodooh · Spring 2026
          </p>

          <Card className="w-full max-w-md shadow-[0_4px_24px_rgba(0,0,0,0.07)]">
            <CardContent className="p-10">

              {/* Header */}
              <div className="mb-8">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#94A3B8] mb-2">
                  King Saud University
                </p>
                <h1 className="text-3xl font-black tracking-tight text-[#0F172A]">
                  Sign in
                </h1>
                <p className="mt-1.5 text-sm text-[#64748B] leading-relaxed">
                  Access your academic portal with university credentials.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5" noValidate>

                {/* Email / University ID */}
                <div className="space-y-1.5">
                  <label htmlFor="identifier" className="block text-xs font-semibold text-[#374151] uppercase tracking-wider">
                    Email or University ID
                  </label>
                  <input
                    id="identifier"
                    type="text"
                    placeholder="name@university.edu"
                    value={credential}
                    onChange={(e) => setCredential(e.target.value)}
                    onBlur={() => setCredentialTouched(true)}
                    disabled={isSubmitting}
                    autoComplete="username"
                    autoFocus
                    aria-describedby={credentialError ? "credential-error" : undefined}
                    aria-invalid={!!credentialError}
                    className={`${inputBase}${credentialError ? ` ${inputError}` : ""}`}
                  />
                  {credentialError && (
                    <p id="credential-error" role="alert" className="text-xs font-semibold text-[#EF4444]">
                      {credentialError}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label htmlFor="password" className="block text-xs font-semibold text-[#374151] uppercase tracking-wider">
                      Password
                    </label>
                    <a
                      href="#"
                      className="text-[11px] font-semibold text-[#1040C0] hover:text-[#0B2E8A] underline underline-offset-4 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1040C0] focus-visible:ring-offset-1"
                    >
                      Forgot password?
                    </a>
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onBlur={() => setPasswordTouched(true)}
                      disabled={isSubmitting}
                      autoComplete="current-password"
                      aria-describedby={passwordError ? "password-error" : undefined}
                      aria-invalid={!!passwordError}
                      className={`${inputBase} pr-16${passwordError ? ` ${inputError}` : ""}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      disabled={isSubmitting}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] hover:text-[#1040C0] transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1040C0] focus-visible:ring-offset-1"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  {passwordError && (
                    <p id="password-error" role="alert" className="text-xs font-semibold text-[#EF4444]">
                      {passwordError}
                    </p>
                  )}
                </div>

                {/* Server error */}
                {error && (() => {
                  const t = errorTheme(error.code);
                  return (
                    <div
                      role="alert"
                      className={`${t.bg} border ${t.border} rounded-xl px-4 py-3`}
                    >
                      <p className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${t.heading}`}>
                        {error.code.replace(/_/g, " ")}
                      </p>
                      <p className={`text-xs leading-relaxed ${t.body}`}>
                        {error.message}
                      </p>
                    </div>
                  );
                })()}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={!isFormValid}
                  className="w-full h-12 bg-[#1040C0] text-white text-sm font-semibold rounded-xl hover:bg-[#0B2E8A] active:bg-[#082070] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1040C0] focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Signing in…" : "Sign in"}
                </button>
              </form>

              {/* Footer */}
              <div className="mt-8 pt-6 border-t border-[#F1F5F9]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#CBD5E1]">
                  Privacy by Architecture
                </p>
                <p className="mt-1 text-xs text-[#94A3B8] leading-relaxed">
                  Identity is never stored or shared with external parties.
                </p>
              </div>

            </CardContent>
          </Card>

          <p className="mt-6 text-[10px] font-medium uppercase tracking-widest text-[#CBD5E1] text-center">
            © 2026 King Saud University · All Rights Reserved
          </p>
        </div>

      </main>
    </>
  );
}
