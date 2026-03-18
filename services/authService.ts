import {
  type LoginResponse,
  type User,
  type AnalyticsEvent,
  UserRole,
} from "@/types/auth";

// ─── Constants ────────────────────────────────────────────────
const UNIVERSITY_EMAIL_PATTERNS = [".edu", ".edu.sa"];
const MAX_FAILED_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 2 * 60 * 1000; // 2 minutes
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const SIMULATED_DELAY_MS = 500;
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

// ─── In-memory rate-limit tracking ───────────────────────────
interface FailedAttempt {
  timestamp: number;
}

let failedAttempts: FailedAttempt[] = [];
let lockoutUntil: number | null = null;

// ─── Mock user database ──────────────────────────────────────
// Keys: university email OR university username (no @)
const MOCK_USERS: Record<string, { password: string; user: Omit<User, "token"> | null }> = {
  // Email-based logins
  "student@university.edu.sa": {
    password: "password123",
    user: {
      email: "student@university.edu.sa",
      name: "Ahmed Al-Rashid",
      role: UserRole.STUDENT,
    },
  },
  "instructor@university.edu.sa": {
    password: "password123",
    user: {
      email: "instructor@university.edu.sa",
      name: "Dr. Sarah Hassan",
      role: UserRole.INSTRUCTOR,
    },
  },
  "chairman@university.edu.sa": {
    password: "password123",
    user: {
      email: "chairman@university.edu.sa",
      name: "Prof. Khalid Al-Fahad",
      role: UserRole.CHAIRMAN,
    },
  },
  "norole@university.edu.sa": {
    password: "password123",
    user: null, // user exists in university system, but no WODOOH role
  },
  "ssodown@university.edu.sa": {
    password: "password123",
    user: {
      email: "ssodown@university.edu.sa",
      name: "SSO Test User",
      role: UserRole.STUDENT,
    },
  },
  // Username-based logins (university ID / portal username)
  "s12345": {
    password: "password123",
    user: {
      email: "s12345@university.edu.sa",
      name: "Ahmed Al-Rashid",
      role: UserRole.STUDENT,
    },
  },
  "dr.sarah": {
    password: "password123",
    user: {
      email: "instructor@university.edu.sa",
      name: "Dr. Sarah Hassan",
      role: UserRole.INSTRUCTOR,
    },
  },
  "norole_user": {
    password: "password123",
    user: null,
  },
  "ssodown_user": {
    password: "password123",
    user: {
      email: "ssodown@university.edu.sa",
      name: "SSO Test User",
      role: UserRole.STUDENT,
    },
  },
};

// ─── Helper: simulate network delay ─────────────────────────
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Helper: generate mock JWT ───────────────────────────────
function generateMockToken(): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({
      sub: Math.random().toString(36).slice(2),
      iat: Date.now(),
      exp: Date.now() + SESSION_TIMEOUT_MS,
    })
  );
  const signature = btoa(Math.random().toString(36).slice(2));
  return `${header}.${payload}.${signature}`;
}

// ─── Helper: check university email or username ──────────────
// A valid credential is either:
//   - A university email (ends with .edu / .edu.sa)
//   - A university username (no @ symbol, alphanumeric with dots/underscores/hyphens)
function isUniversityCredential(credential: string): boolean {
  const lc = credential.toLowerCase();
  if (lc.includes("@")) {
    // Looks like an email — must end with a university domain
    return UNIVERSITY_EMAIL_PATTERNS.some((pattern) => lc.endsWith(pattern));
  }
  // Looks like a username — allow alphanumeric, dots, underscores, hyphens
  return /^[a-z0-9._-]+$/.test(lc) && lc.length >= 2;
}

// ─── Helper: check rate limit ────────────────────────────────
function isRateLimited(): boolean {
  if (lockoutUntil && Date.now() < lockoutUntil) {
    return true;
  }
  if (lockoutUntil && Date.now() >= lockoutUntil) {
    lockoutUntil = null;
    failedAttempts = [];
  }

  const windowStart = Date.now() - RATE_LIMIT_WINDOW_MS;
  failedAttempts = failedAttempts.filter((a) => a.timestamp > windowStart);

  return failedAttempts.length >= MAX_FAILED_ATTEMPTS;
}

function recordFailedAttempt(): void {
  failedAttempts.push({ timestamp: Date.now() });

  const windowStart = Date.now() - RATE_LIMIT_WINDOW_MS;
  const recentAttempts = failedAttempts.filter((a) => a.timestamp > windowStart);

  if (recentAttempts.length >= MAX_FAILED_ATTEMPTS) {
    lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
  }
}

// ─── Analytics Stub ──────────────────────────────────────────
export function trackAnalyticsEvent(
  event: AnalyticsEvent,
  data?: Record<string, unknown>
): void {
  // In production, this would send to an analytics service.
  // For now, we log to the console.
  console.log(`[Analytics] ${event}`, data ?? "");
}

// ─── Auth Service ────────────────────────────────────────────
export const AuthService = {
  /**
   * Attempts to log in a user with their university credentials.
   * This mock simulates all edge cases defined in the user story.
   *
   * To swap in real API calls, replace the body of this function
   * with a fetch call to your backend's /api/auth/login endpoint.
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    await delay(SIMULATED_DELAY_MS);

    trackAnalyticsEvent("login_attempt", { email });

    // Edge Case: Non-university email or username
    if (!isUniversityCredential(email)) {
      trackAnalyticsEvent("login_failure", { email, reason: "non_university_email" });
      return {
        success: false,
        error: {
          code: "NON_UNIVERSITY_EMAIL",
          message: "Please use your university email or username to log in.",
        },
      };
    }

    // Edge Case: Rate limiting
    if (isRateLimited()) {
      trackAnalyticsEvent("login_failure", { email, reason: "rate_limited" });
      return {
        success: false,
        error: {
          code: "RATE_LIMITED",
          message:
            "Too many failed login attempts. Your account has been temporarily locked for 15 minutes.",
          lockoutMinutes: 15,
        },
      };
    }

    // AC-3: SSO unavailable (triggered by special email/username)
    if (
      email.toLowerCase() === "ssodown@university.edu.sa" ||
      email.toLowerCase() === "ssodown_user"
    ) {
      trackAnalyticsEvent("login_failure", { email, reason: "sso_unavailable" });
      return {
        success: false,
        error: {
          code: "SSO_UNAVAILABLE",
          message:
            "University login is temporarily down. Please try again in a few minutes or contact IT support.",
        },
      };
    }

    // Look up mock user
    const entry = MOCK_USERS[email.toLowerCase()];

    // AC-2: Invalid credentials (user not found OR wrong password)
    if (!entry || entry.password !== password) {
      recordFailedAttempt();
      trackAnalyticsEvent("login_failure", { email, reason: "invalid_credentials" });
      return {
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Incorrect email/username or password. Please try again.",
        },
      };
    }

    // Edge Case: No role assigned
    if (entry.user === null) {
      trackAnalyticsEvent("login_failure", { email, reason: "no_role" });
      return {
        success: false,
        error: {
          code: "NO_ROLE",
          message:
            "Your account has not been set up yet. Please contact your department administrator.",
        },
      };
    }

    // AC-1 & AC-5: Success → return user with token
    const token = generateMockToken();
    const user: User = { ...entry.user, token };

    // Reset failed attempts on success
    failedAttempts = [];
    lockoutUntil = null;

    trackAnalyticsEvent("login_success", { email, role: user.role });

    return { success: true, user };
  },

  /**
   * Validates whether a stored session token is still valid.
   * In production, this would verify the JWT with the backend.
   */
  async validateSession(token: string): Promise<boolean> {
    await delay(100);
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return false;
      const payload = JSON.parse(atob(parts[1]));
      return payload.exp > Date.now();
    } catch {
      return false;
    }
  },

  /** Returns the session timeout duration. */
  getSessionTimeoutMs(): number {
    return SESSION_TIMEOUT_MS;
  },
};
