'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AuthState, LoginCredentials, SignupData, UserRole } from '../types/auth.types';
import apiClient from '../api/client';
import {
  setToken,
  getToken,
  removeToken,
  clearAuth,
  isTokenValid,
  getUserFromToken,
} from './jwt-manager';
import API_ENDPOINTS from '../api/endpoints';

/**
 * Auth Context interface
 */
interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  loginWithToken: (token: string, user: { _id: string; email: string; name: string; role: UserRole }) => void;
  signup: (data: SignupData) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  hasRole: (role: UserRole | UserRole[]) => boolean;
}

/**
 * Create Auth Context
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Initial auth state
 */
const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
};

/**
 * Auth Provider Props
 */
interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Auth Provider Component
 * Manages authentication state across the application
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, setState] = useState<AuthState>(initialState);

  /**
   * Initialize auth state from stored token. Hydrate immediately from the JWT
   * payload so the UI doesn't flash, then verify against `/auth/me` so a role
   * change or user deletion that happened after the token was minted is
   * picked up on next page load.
   */
  useEffect(() => {
    let cancelled = false;

    const initAuth = async () => {
      const token = getToken();
      const userData = token && isTokenValid() ? getUserFromToken() : null;

      if (!token || !userData) {
        clearAuth();
        apiClient.setToken(null);
        if (!cancelled) {
          setState({
            user: null,
            token: null,
            isAuthenticated: false,
            loading: false,
          });
        }
        return;
      }

      apiClient.setToken(token);
      if (!cancelled) {
        setState({
          user: {
            _id: userData.userId,
            email: userData.email,
            name: userData.name,
            role: userData.role as UserRole,
          },
          token,
          isAuthenticated: true,
          loading: false,
        });
      }

      try {
        const res = await apiClient.get<{
          user: { _id: string; email: string; name: string; role: UserRole };
        }>(API_ENDPOINTS.AUTH_ME);
        if (cancelled) return;
        if (res.status === 'success' && res.data?.user) {
          const fresh = res.data.user;
          setState(prev =>
            prev.token === token
              ? {
                  ...prev,
                  user: {
                    _id: fresh._id,
                    email: fresh.email,
                    name: fresh.name,
                    role: fresh.role,
                  },
                }
              : prev,
          );
        }
      } catch (err: unknown) {
        if (cancelled) return;
        // 403 = JWT verify failed server-side (expired or signed with the wrong secret).
        // 404 = backend's `/auth/me` couldn't find the user — they were deleted.
        // 401 shouldn't happen here (we set the token) but treat it the same.
        // Network errors / 503 are kept on JWT-decoded state — don't log the
        // user out for a transient backend issue.
        const status = (err as { status?: number })?.status;
        if (status === 401 || status === 403 || status === 404) {
          clearAuth();
          apiClient.setToken(null);
          setState({
            user: null,
            token: null,
            isAuthenticated: false,
            loading: false,
          });
        }
      }
    };

    initAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Login user with email and password
   */
  const login = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    setState(prev => ({ ...prev, loading: true }));

    try {
      // Normalize email to lowercase (backend stores in lowercase)
      const normalizedCredentials = {
        ...credentials,
        email: credentials.email.toLowerCase(),
      };

      const response = await apiClient.post<{ token: string; user: any }>(
        API_ENDPOINTS.LOGIN,
        normalizedCredentials
      );

      if (response.status === 'success' && response.data?.token) {
        const { token, user } = response.data;

        // Store token
        setToken(token);
        apiClient.setToken(token);

        setState({
          user: user ? {
            _id: user._id,
            email: user.email,
            name: user.name,
            role: user.role as UserRole,
          } : null,
          token,
          isAuthenticated: true,
          loading: false,
        });
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error) {
      setState(prev => ({ ...prev, loading: false }));
      throw error;
    }
  }, []);

  /**
   * Signup new user
   */
  const signup = useCallback(async (data: SignupData): Promise<void> => {
    setState(prev => ({ ...prev, loading: true }));

    try {
      // Normalize email and name to lowercase (backend stores in lowercase)
      const normalizedData = {
        ...data,
        email: data.email.toLowerCase(),
        name: data.name.toLowerCase(),
      };

      const response = await apiClient.post<{ token: string; user: any }>(
        API_ENDPOINTS.SIGNUP,
        normalizedData
      );

      if (response.status === 'success' && response.data?.token) {
        const { token, user } = response.data;

        // Store token
        setToken(token);
        apiClient.setToken(token);

        setState({
          user: user ? {
            _id: user._id,
            email: user.email,
            name: user.name,
            role: user.role as UserRole,
          } : null,
          token,
          isAuthenticated: true,
          loading: false,
        });
      } else {
        throw new Error(response.message || 'Signup failed');
      }
    } catch (error) {
      setState(prev => ({ ...prev, loading: false }));
      throw error;
    }
  }, []);

  /**
   * Logout user
   */
  const logout = useCallback(() => {
    clearAuth();
    apiClient.setToken(null);
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
    });
  }, []);

  /**
   * Refresh token (placeholder for future implementation)
   * Backend doesn't have refresh tokens yet
   */
  const refreshToken = useCallback(async (): Promise<void> => {
    // TODO: Implement when backend adds refresh token endpoint
    console.warn('Refresh token not implemented yet. Backend does not support refresh tokens.');
    throw new Error('Refresh tokens not supported');
  }, []);

  /**
   * Check if user has specific role(s)
   */
  const hasRole = useCallback((role: UserRole | UserRole[]): boolean => {
    if (!state.user) return false;

    if (Array.isArray(role)) {
      return role.includes(state.user.role);
    }

    return state.user.role === role;
  }, [state.user]);

  const loginWithToken = useCallback((token: string, user: { _id: string; email: string; name: string; role: UserRole }) => {
    setToken(token);
    apiClient.setToken(token);
    setState({
      user: { _id: user._id, email: user.email, name: user.name, role: user.role },
      token,
      isAuthenticated: true,
      loading: false,
    });
  }, []);

  const value: AuthContextType = {
    ...state,
    login,
    loginWithToken,
    signup,
    logout,
    refreshToken,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Hook to use auth context
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};

/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 */
export const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
  allowedRoles?: UserRole | UserRole[];
}> = ({ children, fallback, allowedRoles }) => {
  const { isAuthenticated, hasRole, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return fallback || null;
  }

  if (!isAuthenticated) {
    return null;
  }

  if (allowedRoles && !hasRole(allowedRoles)) {
    return fallback || null;
  }

  return <>{children}</>;
};

/**
 * Admin Route Component
 * Only renders for admin users
 */
export const AdminRoute: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback,
}) => {
  return (
    <ProtectedRoute allowedRoles="admin" fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
};

export default AuthProvider;
