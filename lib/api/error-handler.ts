import { ApiError, ApiErrorCode, ErrorResponse } from '../types/api.types';

/**
 * Unified error handling for Wodooh Backend API
 * Handles backend error codes: 422, 401, 403, 404, 409, 503
 */

export class ApiErrorHandler extends Error implements ApiError {
  message: string;
  status?: number;
  code?: ApiErrorCode;
  details?: Record<string, string[]>;

  constructor(message: string, code: ApiErrorCode, status?: number, details?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.message = message;
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/**
 * Classify HTTP status code to error code
 */
const getStatusErrorCode = (status: number): ApiErrorCode => {
  switch (status) {
    case 422:
      return 'VALIDATION_FAILED';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 503:
      return 'DATABASE_ERROR';
    case 500:
      return 'INTERNAL_ERROR';
    default:
      return 'NETWORK_ERROR';
  }
};

/**
 * Get user-friendly error message based on error code
 */
const getErrorMessage = (code: ApiErrorCode, responseMessage?: string): string => {
  if (responseMessage) {
    return responseMessage;
  }

  switch (code) {
    case 'VALIDATION_FAILED':
      return 'Please check your input and try again.';
    case 'UNAUTHORIZED':
      return 'Invalid credentials. Please log in again.';
    case 'FORBIDDEN':
      return 'You do not have permission to perform this action.';
    case 'NOT_FOUND':
      return 'The requested resource was not found.';
    case 'CONFLICT':
      return 'A conflict occurred. This resource may already exist.';
    case 'DATABASE_ERROR':
      return 'Database connection failed. Please try again later.';
    case 'INTERNAL_ERROR':
      return 'An internal server error occurred. Please try again later.';
    case 'NETWORK_ERROR':
      return 'Network error. Please check your connection and try again.';
    case 'TIMEOUT':
      return 'Request timeout. Please try again.';
    case 'MAINTENANCE_MODE':
      return 'The service is currently under maintenance. Please try again later.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
};

/**
 * Handle fetch response and convert to ApiError if needed
 */
export const handleApiError = async (response: Response): Promise<never> => {
  const status = response.status;
  const code = getStatusErrorCode(status);

  let message = getErrorMessage(code);
  let details: Record<string, string[]> | undefined;

  try {
    const data: ErrorResponse = await response.json();

    if (data.message) {
      message = data.message;
    }

    if (data.errors) {
      details = data.errors;
    }
  } catch {
    // If parsing fails, use default message
  }

  throw new ApiErrorHandler(message, code, status, details);
};

/**
 * Handle network errors (no response)
 */
export const handleNetworkError = (error: unknown): never => {
  if (error instanceof ApiErrorHandler) {
    throw error;
  }

  if (error instanceof TypeError && error.message.includes('fetch')) {
    throw new ApiErrorHandler(
      'Network error. Please check your connection and try again.',
      'NETWORK_ERROR'
    );
  }

  if (error instanceof Error && error.name === 'AbortError') {
    throw new ApiErrorHandler(
      'Request timeout. Please try again.',
      'TIMEOUT'
    );
  }

  throw new ApiErrorHandler(
    error instanceof Error ? error.message : 'An unexpected error occurred.',
    'NETWORK_ERROR'
  );
};

/**
 * Check if error is authentication-related
 */
export const isAuthError = (error: unknown): boolean => {
  return error instanceof ApiErrorHandler && error.code === 'UNAUTHORIZED';
};

/**
 * Check if error is validation-related
 */
export const isValidationError = (error: unknown): boolean => {
  return error instanceof ApiErrorHandler && error.code === 'VALIDATION_FAILED';
};

/**
 * Check if error is maintenance mode
 */
export const isMaintenanceError = (error: unknown): boolean => {
  return error instanceof ApiErrorHandler &&
    (error.code === 'DATABASE_ERROR' || error.code === 'MAINTENANCE_MODE');
};

/**
 * Extract field-level validation errors
 */
export const getFieldErrors = (error: unknown): Record<string, string[]> => {
  if (error instanceof ApiErrorHandler && error.details) {
    return error.details;
  }
  return {};
};

export default {
  handleApiError,
  handleNetworkError,
  isAuthError,
  isValidationError,
  isMaintenanceError,
  getFieldErrors,
};
