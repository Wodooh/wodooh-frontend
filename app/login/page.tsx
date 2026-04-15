"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-provider";
import type { LoginCredentials } from "@/lib/types/auth.types";

import { PageShell } from "@/components/ui/page-shell";
import { BrandMark } from "@/components/ui/brand-mark";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrustCue } from "@/components/ui/trust-cue";

export default function LoginPage() {
  const router = useRouter();
  const { login, user, isAuthenticated, loading: authLoading } = useAuth();

  const [credential, setCredential] = useState("");
  const [password, setPassword] = useState("");
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
  const isValidCredentialFormat = (val: string): boolean => {
    if (!val.trim()) return false;
    if (val.includes("@")) {
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
    isValidCredentialFormat(credential) && password && !isSubmitting;

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
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      setError({
        code: error?.code || "UNKNOWN_ERROR",
        message:
          error?.message || "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <PageShell footer={false}>
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-wd-primary border-t-transparent" />
      </PageShell>
    );
  }

  // Already authenticated — redirect happening
  if (isAuthenticated) {
    return null;
  }

  return (
    <PageShell>
      <div className="w-full max-w-md space-y-12">
        {/* Branding */}
        <BrandMark size="lg" tagline />

        {/* Login Card */}
        <Card>
          <CardContent className="space-y-8">
            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              <div className="space-y-4">
                {/* Email / University ID */}
                <div className="space-y-2">
                  <Label htmlFor="identifier">Email or University ID</Label>
                  <Input
                    id="identifier"
                    type="text"
                    placeholder="e.g. name@university.edu"
                    value={credential}
                    onChange={(e) => setCredential(e.target.value)}
                    onBlur={() => setCredentialTouched(true)}
                    disabled={isSubmitting}
                    autoComplete="username"
                    autoFocus
                    aria-describedby={
                      credentialError ? "credential-error" : undefined
                    }
                    aria-invalid={!!credentialError}
                  />
                  {credentialError && (
                    <p
                      id="credential-error"
                      className="text-xs text-red-600 mt-1"
                    >
                      {credentialError}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="password">Password</Label>
                    <a
                      className="text-[11px] text-wd-muted-text hover:text-wd-primary underline underline-offset-4 transition-colors"
                      href="#"
                    >
                      Forgot password?
                    </a>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setPasswordTouched(true)}
                    disabled={isSubmitting}
                    autoComplete="current-password"
                    aria-describedby={
                      passwordError ? "password-error" : undefined
                    }
                    aria-invalid={!!passwordError}
                  />
                  {passwordError && (
                    <p
                      id="password-error"
                      className="text-xs text-red-600 mt-1"
                    >
                      {passwordError}
                    </p>
                  )}
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div
                  className="rounded-wd-small bg-red-50 border border-red-200 p-3 text-sm text-red-700"
                  role="alert"
                >
                  {error.message}
                </div>
              )}

              {/* Submit */}
              <Button
                variant="wodoh-primary"
                size="wodoh"
                type="submit"
                className="w-full"
                disabled={!isFormValid}
              >
                {isSubmitting ? "Signing In\u2026" : "Sign In"}
              </Button>
            </form>

            {/* Trust cue */}
            <TrustCue icon="lock" title="Privacy by Architecture">
              Your identity is never stored or shared with external parties.
              Session-based encryption is active.
            </TrustCue>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
