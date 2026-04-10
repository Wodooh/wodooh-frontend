/**
 * Base API response types matching Wodooh Backend API
 */

export type ApiStatus = 'success' | 'error';

export interface ApiResponse<T = unknown> {
  status: ApiStatus;
  data?: T;
  message?: string;
  error?: string;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: Record<string, string[]>;
}

export type ApiErrorCode =
  | 'VALIDATION_FAILED'     // 422
  | 'UNAUTHORIZED'          // 401
  | 'FORBIDDEN'             // 403
  | 'NOT_FOUND'             // 404
  | 'CONFLICT'              // 409
  | 'DATABASE_ERROR'        // 503
  | 'INTERNAL_ERROR'        // 500
  | 'NETWORK_ERROR'         // No response
  | 'TIMEOUT'               // Request timeout
  | 'MAINTENANCE_MODE';     // 503

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalUsers: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  users: T;
  pagination: PaginationMeta;
}

/**
 * Error response format from backend
 */
export interface ErrorResponse {
  status: 'error';
  message: string;
  errors?: Record<string, string[]>;
}
