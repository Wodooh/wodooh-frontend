import { handleApiError, handleNetworkError } from './error-handler';
import { ApiResponse, ApiError } from '../types/api.types';

/**
 * API Client configuration
 */
const DEFAULT_TIMEOUT = 30000; // 30 seconds

/**
 * Request configuration options
 */
export interface ApiRequestOptions extends RequestInit {
  timeout?: number;
  skipAuth?: boolean;
}

/**
 * API Client for Wodooh Backend
 * Handles:
 * - Automatic JWT injection via Authorization header
 * - Request/response interceptors
 * - Error standardization
 * - Timeout handling
 * - Maintenance mode detection
 */
class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
  }

  /**
   * Set authentication token
   */
  setToken(token: string | null): void {
    this.token = token;
  }

  /**
   * Get current authentication token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Build full URL for an endpoint
   */
  private buildUrl(endpoint: string): string {
    const trimmedBaseUrl = this.baseUrl.replace(/\/$/, '');
    const trimmedEndpoint = endpoint.replace(/^\//, '');
    return `${trimmedBaseUrl}/${trimmedEndpoint}`;
  }

  /**
   * Build request headers with optional JWT
   */
  private buildHeaders(options: ApiRequestOptions): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

    // Add JWT token if available and not skipped
    if (this.token && !options.skipAuth) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  /**
   * Create AbortController with timeout
   */
  private createAbortController(timeout?: number): AbortController | null {
    if (timeout === 0 || timeout === undefined) {
      return null;
    }

    const controller = new AbortController();
    const timeoutMs = timeout || DEFAULT_TIMEOUT;

    setTimeout(() => controller.abort(), timeoutMs);
    return controller;
  }

  /**
   * Process response before returning
   */
  private async processResponse<T>(response: Response): Promise<ApiResponse<T>> {
    if (!response.ok) {
      await handleApiError(response);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }

    return { status: 'success' } as ApiResponse<T>;
  }

  /**
   * Generic request method
   */
  private async request<T>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = this.buildUrl(endpoint);
      const headers = this.buildHeaders(options);
      const controller = this.createAbortController(options.timeout);

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller?.signal,
      });

      return await this.processResponse<T>(response);
    } catch (error) {
      return handleNetworkError(error);
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'GET',
    });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: unknown, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: unknown, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, data?: unknown, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
  }
}

// Create and export singleton instance
const apiClient = new ApiClient();

export { ApiClient };
export default apiClient;
