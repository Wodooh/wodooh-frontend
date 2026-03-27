// ─── User Roles ───────────────────────────────────────────────
export enum UserRole {
  STUDENT = "student",
  INSTRUCTOR = "instructor",
  CHAIRMAN = "chairman",
}

// ─── User Model ───────────────────────────────────────────────
export interface User {
  email: string;
  name: string;
  role: UserRole;
  token: string;
}

// ─── Auth Error Codes ─────────────────────────────────────────
export type AuthErrorCode =
  | "INVALID_CREDENTIALS"
  | "SSO_UNAVAILABLE"
  | "RATE_LIMITED"
  | "NO_ROLE"
  | "NON_UNIVERSITY_EMAIL"
  | "UNKNOWN_ERROR";

// ─── Auth Error ───────────────────────────────────────────────
export interface AuthError {
  code: AuthErrorCode;
  message: string;
  lockoutMinutes?: number; // present when code === "RATE_LIMITED"
}

// ─── Login Response (discriminated union) ─────────────────────
export type LoginResponse =
  | { success: true; user: User }
  | { success: false; error: AuthError };

// ─── Analytics Event Names ────────────────────────────────────
export type AnalyticsEvent =
  | "login_attempt"
  | "login_success"
  | "login_failure"
  | "session_timeout"
  | "manual_onboarding_started"
  | "manual_onboarding_completed"
  | "manual_onboarding_abandoned";
