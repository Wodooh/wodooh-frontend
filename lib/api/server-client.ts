/**
 * Server-side fetch utilities for Next.js Server Components
 * Handles:
 * - Fetch with server-side cookies/headers
 * - Server-side authentication
 * - Pass session data to client components
 */

import { cookies, headers } from 'next/headers';
import { ApiResponse } from '../types/api.types';

/**
 * Server API client configuration
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/**
 * Get authentication token from cookies
 * This is useful when you want to pass JWT from server to client
 */
export async function getServerToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('wodooh_auth_token');
    return token?.value || null;
  } catch (error) {
    console.error('Failed to get server token:', error);
    return null;
  }
}

/**
 * Get user agent and other headers
 */
export async function getServerHeaders(): Promise<HeadersInit> {
  try {
    const headersList = await headers();
    return {
      'User-Agent': headersList.get('user-agent') || '',
      'X-Forwarded-For': headersList.get('x-forwarded-for') || '',
    };
  } catch (error) {
    console.error('Failed to get server headers:', error);
    return {};
  }
}

/**
 * Build request headers for server-side fetch
 */
async function buildServerHeaders(
  customHeaders: HeadersInit = {},
  includeAuth: boolean = true
): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders as Record<string, string>,
  };

  // Add auth token if available and requested
  if (includeAuth) {
    const token = await getServerToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  // Add user agent
  const userAgent = await getServerHeaders();
  if ((userAgent as Record<string, string>)['User-Agent']) {
    headers['User-Agent'] = (userAgent as Record<string, string>)['User-Agent'];
  }

  return headers;
}

/**
 * Server-side fetch utility
 */
export async function serverFetch<T>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    headers?: HeadersInit;
    body?: unknown;
    cache?: RequestCache;
    next?: NextFetchRequestConfig;
    includeAuth?: boolean;
  } = {}
): Promise<ApiResponse<T>> {
  const {
    method = 'GET',
    headers: customHeaders = {},
    body,
    cache,
    next,
    includeAuth = true,
  } = options;

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const fetchOptions: RequestInit = {
    method,
    headers: await buildServerHeaders(customHeaders, includeAuth),
    cache,
    next,
  };

  if (body && method !== 'GET') {
    fetchOptions.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      return {
        status: 'error',
        message: errorData.message || response.statusText,
        error: errorData.error,
      };
    }

    const data = await response.json().catch(() => null);
    return {
      status: 'success',
      data,
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Server fetch failed',
    };
  }
}

/**
 * Server-side GET request
 */
export async function serverGet<T>(
  endpoint: string,
  options: Omit<Parameters<typeof serverFetch>[1], 'method'> = {}
): Promise<ApiResponse<T>> {
  return serverFetch<T>(endpoint, { ...options, method: 'GET' });
}

/**
 * Server-side POST request
 */
export async function serverPost<T>(
  endpoint: string,
  body: unknown,
  options: Omit<Parameters<typeof serverFetch>[1], 'method' | 'body'> = {}
): Promise<ApiResponse<T>> {
  return serverFetch<T>(endpoint, { ...options, method: 'POST', body });
}

/**
 * Server-side PATCH request
 */
export async function serverPatch<T>(
  endpoint: string,
  body: unknown,
  options: Omit<Parameters<typeof serverFetch>[1], 'method' | 'body'> = {}
): Promise<ApiResponse<T>> {
  return serverFetch<T>(endpoint, { ...options, method: 'PATCH', body });
}

/**
 * Server-side PUT request
 */
export async function serverPut<T>(
  endpoint: string,
  body: unknown,
  options: Omit<Parameters<typeof serverFetch>[1], 'method' | 'body'> = {}
): Promise<ApiResponse<T>> {
  return serverFetch<T>(endpoint, { ...options, method: 'PUT', body });
}

/**
 * Server-side DELETE request
 */
export async function serverDelete<T>(
  endpoint: string,
  options: Omit<Parameters<typeof serverFetch>[1], 'method' | 'body'> = {}
): Promise<ApiResponse<T>> {
  return serverFetch<T>(endpoint, { ...options, method: 'DELETE' });
}

/**
 * Get authenticated user from server side
 * Useful for Server Components that need user context
 */
export async function getServerUser() {
  const token = await getServerToken();

  if (!token) {
    return null;
  }

  try {
    // Parse token without verification (verification is done by backend)
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    const payload = JSON.parse(jsonPayload);

    return {
      userId: payload.userId,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };
  } catch (error) {
    console.error('Failed to parse server user token:', error);
    return null;
  }
}

/**
 * Check if user has required role on server side
 */
export async function hasServerRole(requiredRole: string | string[]): Promise<boolean> {
  const user = await getServerUser();

  if (!user) {
    return false;
  }

  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(user.role);
  }

  return user.role === requiredRole;
}

/**
 * Server-side authenticated route checker
 * Returns user if authenticated, null otherwise
 */
export async function requireServerAuth() {
  const user = await getServerUser();

  if (!user) {
    return null;
  }

  return user;
}

/**
 * Server-side admin route checker
 * Returns user if admin, null otherwise
 */
export async function requireServerAdmin() {
  const user = await getServerUser();

  if (!user || user.role !== 'admin') {
    return null;
  }

  return user;
}

/**
 * Set authentication cookie (server-side action)
 * This would be called from a Server Action after successful login
 */
export async function setAuthCookie(token: string): Promise<void> {
  'use server';

  try {
    const cookieStore = await cookies();
    cookieStore.set('wodooh_auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60, // 1 hour
      path: '/',
    });
  } catch (error) {
    console.error('Failed to set auth cookie:', error);
  }
}

/**
 * Clear authentication cookie (server-side action)
 */
export async function clearAuthCookie(): Promise<void> {
  'use server';

  try {
    const cookieStore = await cookies();
    cookieStore.delete('wodooh_auth_token');
  } catch (error) {
    console.error('Failed to clear auth cookie:', error);
  }
}

export default {
  serverFetch,
  serverGet,
  serverPost,
  serverPatch,
  serverPut,
  serverDelete,
  getServerToken,
  getServerUser,
  hasServerRole,
  requireServerAuth,
  requireServerAdmin,
  setAuthCookie,
  clearAuthCookie,
};
