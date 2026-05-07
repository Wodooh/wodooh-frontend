// DEAD CODE — stranded prototype, not wired into app/. The production auth
// path uses lib/auth/auth-provider.tsx (imported by app/layout.tsx and every
// dashboard). Schedule for removal. No tracking ticket yet — see the
// type-reconciliation pass that introduced this comment.
// Risk if left: autocomplete on `UserRole` from this file's `types/auth.ts`
// returns an enum without `admin`/`student`, and the wrong import compiles
// silently.
"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import type { User, LoginResponse } from "@/types/auth";
import { AuthService, trackAnalyticsEvent } from "@/services/authService";

// ─── Context shape ───────────────────────────────────────────
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<LoginResponse>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Storage keys ────────────────────────────────────────────
const STORAGE_KEY_USER = "wodooh_user";
const STORAGE_KEY_LAST_ACTIVITY = "wodooh_last_activity";

// ─── Activity events to track for session timeout ───────────
const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
  "click",
] as const;

// ─── Provider ────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activityTimestampRef = useRef<number>(Date.now());

  // ── Logout function ──────────────────────────────────────
  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY_USER);
    localStorage.removeItem(STORAGE_KEY_LAST_ACTIVITY);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // ── Session timeout handler ──────────────────────────────
  const handleSessionTimeout = useCallback(() => {
    trackAnalyticsEvent("session_timeout", {
      email: user?.email,
      lastActivity: new Date(activityTimestampRef.current).toISOString(),
    });
    logout();
    // Redirect will be handled by the middleware / route protection
  }, [user?.email, logout]);

  // ── Reset inactivity timer ───────────────────────────────
  const resetInactivityTimer = useCallback(() => {
    const now = Date.now();
    activityTimestampRef.current = now;
    localStorage.setItem(STORAGE_KEY_LAST_ACTIVITY, now.toString());

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(
      handleSessionTimeout,
      AuthService.getSessionTimeoutMs()
    );
  }, [handleSessionTimeout]);

  // ── Activity listener setup ──────────────────────────────
  useEffect(() => {
    if (!user) return;

    const handleActivity = () => {
      resetInactivityTimer();
    };

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Start the initial timer
    resetInactivityTimer();

    return () => {
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [user, resetInactivityTimer]);

  // ── Restore session on mount ─────────────────────────────
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedUser = localStorage.getItem(STORAGE_KEY_USER);
        const lastActivity = localStorage.getItem(STORAGE_KEY_LAST_ACTIVITY);

        if (storedUser && lastActivity) {
          const parsedUser: User = JSON.parse(storedUser);
          const elapsed = Date.now() - parseInt(lastActivity, 10);

          // AC-4: If inactive for more than 30 minutes, require re-auth
          if (elapsed > AuthService.getSessionTimeoutMs()) {
            trackAnalyticsEvent("session_timeout", {
              email: parsedUser.email,
            });
            localStorage.removeItem(STORAGE_KEY_USER);
            localStorage.removeItem(STORAGE_KEY_LAST_ACTIVITY);
          } else {
            // Validate token is still structurally valid
            const isValid = await AuthService.validateSession(parsedUser.token);
            if (isValid) {
              setUser(parsedUser);
            } else {
              localStorage.removeItem(STORAGE_KEY_USER);
              localStorage.removeItem(STORAGE_KEY_LAST_ACTIVITY);
            }
          }
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY_USER);
        localStorage.removeItem(STORAGE_KEY_LAST_ACTIVITY);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  // ── Login function ───────────────────────────────────────
  const login = useCallback(
    async (email: string, password: string): Promise<LoginResponse> => {
      const response = await AuthService.login(email, password);

      if (response.success) {
        setUser(response.user);
        // NOTE: In production, the token should be stored in an HTTP-only
        // cookie set by the server. For this frontend-only mock, we use
        // localStorage to persist the session.
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(response.user));
        localStorage.setItem(
          STORAGE_KEY_LAST_ACTIVITY,
          Date.now().toString()
        );
      }

      return response;
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
