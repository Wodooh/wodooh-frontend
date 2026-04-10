import { ApiResponse } from './api.types';
import { UserRole } from './user.types';

// Re-export UserRole for convenience
export type { UserRole } from './user.types';

/**
 * Authentication types matching Wodooh Backend API
 */

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface AuthToken {
  token: string;
}

export interface LoginResponse extends ApiResponse<AuthToken> {
  user?: {
    _id: string;
    email: string;
    name: string;
    role: UserRole;
  };
}

export interface SignupResponse extends ApiResponse<AuthToken> {
  user?: {
    _id: string;
    email: string;
    name: string;
    role: UserRole;
  };
}

export interface AuthState {
  user: {
    _id: string;
    email: string;
    name: string;
    role: UserRole;
  } | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
}

export interface JwtToken {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  iat: number;  // Issued at
  exp: number;  // Expiration
}
