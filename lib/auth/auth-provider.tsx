'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
   * Initialize auth state from stored token
   */
  useEffect(() => {
    const initAuth = () => {
      const token = getToken();

      if (token && isTokenValid()) {
        const userData = getUserFromToken();

        if (userData) {
          apiClient.setToken(token);
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
          return;
        }
      }

      // Invalid or no token
      clearAuth();
      apiClient.setToken(null);
      setState({
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
      });
    };

    initAuth();
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

  const value: AuthContextType = {
    ...state,
    login,
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

  if (loading) {
    return fallback || <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    // In a real app, you'd redirect to login page
    return fallback || <div>Redirecting to login...</div>;
  }

  if (allowedRoles && !hasRole(allowedRoles)) {
    return fallback || <div>Access denied</div>;
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
