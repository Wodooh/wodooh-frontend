import { PaginatedResponse } from './api.types';

/**
 * User model types matching Wodooh Backend API
 * Backend stores all text data in lowercase
 */

export type UserRole = 'admin' | 'instructor' | 'student' | 'chairman';

export interface User {
  _id: string;
  email: string;
  name: string;
  password: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface UserSafe {
  _id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

/**
 * Query parameters for fetching users
 */
export interface UsersQueryParams {
  page?: number;
  limit?: number;
  role?: UserRole;
  query?: string;
}

/**
 * Response from GET /admin/users
 */
export interface UsersResponse {
  users: UserSafe[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalUsers: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

/**
 * Request body for PATCH /admin/users/:userId/role
 */
export interface UpdateRoleRequest {
  role: UserRole;
}

/**
 * Response from PATCH /admin/users/:userId/role
 */
export interface UpdateRoleResponse {
  user: UserSafe;
  message: string;
}
