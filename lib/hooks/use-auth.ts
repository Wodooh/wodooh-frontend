'use client';

import { useState, useCallback } from 'react';
import { useAuth as useAuthContext } from '../auth/auth-provider';
import { LoginCredentials, SignupData } from '../types/auth.types';
import apiClient from '../api/client';
import API_ENDPOINTS from '../api/endpoints';

/**
 * Hook for authentication operations
 * Provides login, logout, and signup functionality
 */
export const useAuth = () => {
  const authContext = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Login with email and password
   */
  const login = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    setLoading(true);
    setError(null);

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

        // Store token and update auth state
        localStorage.setItem('wodooh_auth_token', token);
        apiClient.setToken(token);

        authContext.login(credentials);
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Login failed. Please try again.';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [authContext]);

  /**
   * Signup new user
   */
  const signup = useCallback(async (data: SignupData): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      // Normalize email and name to lowercase (backend stores in lowercase).
      // `data.role` (optional, "student" | "instructor") flows through ...data
      // so the backend can promote new accounts to instructor at signup time.
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

        // Store token and update auth state
        localStorage.setItem('wodooh_auth_token', token);
        apiClient.setToken(token);

        await authContext.signup(data);
      } else {
        throw new Error(response.message || 'Signup failed');
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Signup failed. Please try again.';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [authContext]);

  /**
   * Logout user
   */
  const logout = useCallback(() => {
    localStorage.removeItem('wodooh_auth_token');
    apiClient.setToken(null);
    authContext.logout();
    setError(null);
  }, [authContext]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    ...authContext,
    login,
    signup,
    logout: logout,
    clearError,
    loading,
    error,
  };
};

export default useAuth;
