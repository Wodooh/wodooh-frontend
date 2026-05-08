import { JwtToken } from '../types/auth.types';

/**
 * JWT Token expiration time (matches backend JWT_EXPIRES_IN)
 * Backend: 1 hour = 3600000 ms
 */
const TOKEN_EXPIRATION_MS = 60 * 60 * 1000; // 1 hour
const TOKEN_STORAGE_KEY = 'wodooh_auth_token';

/**
 * JWT Token Manager for Wodooh Frontend
 * Handles:
 * - Token storage (localStorage)
 * - Token parsing and validation
 * - Token expiration checking (1h from backend)
 * - Logout/clear tokens
 *
 * Note: Backend doesn't have refresh tokens yet (planned feature).
 * Tokens expire after 1h and require re-login.
 */

/**
 * Store JWT token in localStorage
 */
export const setToken = (token: string): void => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch (error) {
    console.error('Failed to store token:', error);
  }
};

/**
 * Get JWT token from localStorage
 */
export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;

  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to retrieve token:', error);
    return null;
  }
};

/**
 * Remove JWT token from localStorage
 */
export const removeToken = (): void => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to remove token:', error);
  }
};

/**
 * Clear all auth data
 */
export const clearAuth = (): void => {
  removeToken();
};

/**
 * Parse JWT token without verification
 * Note: This is for client-side parsing only. Verification is done by the backend.
 */
export const parseToken = (token: string): JwtToken | null => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload) as JwtToken;
  } catch (error) {
    console.error('Failed to parse token:', error);
    return null;
  }
};

/**
 * Check if token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  const payload = parseToken(token);

  if (!payload) {
    return true;
  }

  const now = Date.now() / 1000; // Convert to seconds
  const expirationBuffer = 5 * 60; // 5 minute buffer

  return payload.exp < (now + expirationBuffer);
};

/**
 * Get time until token expires (in milliseconds)
 */
export const getTimeUntilExpiry = (token: string): number => {
  const payload = parseToken(token);

  if (!payload) {
    return 0;
  }

  const now = Date.now();
  const expiryTime = payload.exp * 1000;
  const timeUntilExpiry = expiryTime - now;

  return Math.max(0, timeUntilExpiry);
};

/**
 * Check if stored token is valid (exists and not expired)
 */
export const isTokenValid = (): boolean => {
  const token = getToken();

  if (!token) {
    return false;
  }

  return !isTokenExpired(token);
};

/**
 * Get user data from token
 */
export const getUserFromToken = (): {
  userId: string;
  email: string;
  name: string;
  role: string;
} | null => {
  const token = getToken();

  if (!token || isTokenExpired(token)) {
    return null;
  }

  const payload = parseToken(token);

  if (!payload || !payload.name || !payload.role) {
    return null;
  }

  return {
    userId: payload.userId,
    email: payload.email,
    name: payload.name,
    role: payload.role,
  };
};

/**
 * Sync token with API client
 */
export const syncTokenWithClient = (client: any): void => {
  const token = getToken();
  if (client && typeof client.setToken === 'function') {
    client.setToken(token);
  }
};

/**
 * Refresh token status (placeholder for future implementation)
 * Backend doesn't have refresh tokens yet
 */
export const shouldRefreshToken = (): boolean => {
  const token = getToken();

  if (!token) {
    return false;
  }

  const timeUntilExpiry = getTimeUntilExpiry(token);
  const refreshThreshold = 10 * 60 * 1000; // 10 minutes

  return timeUntilExpiry < refreshThreshold;
};

export default {
  setToken,
  getToken,
  removeToken,
  clearAuth,
  parseToken,
  isTokenExpired,
  getTimeUntilExpiry,
  isTokenValid,
  getUserFromToken,
  syncTokenWithClient,
  shouldRefreshToken,
};
