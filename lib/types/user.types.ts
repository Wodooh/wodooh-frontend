import type { UserDoc, UserResponse } from './user-doc.types';

export type { UserRole, UserDoc, UserResponse, AdminUserResponse } from './user-doc.types';

/**
 * User model types matching Wodooh Backend API.
 * Backend stores all text data in lowercase.
 *
 * UserSafe is now derived from the canonical UserDoc — adding/renaming a
 * field on UserDoc surfaces here automatically. The phantom `password`
 * field that previously lived on a `User` type was deleted; no readers
 * existed anywhere in the frontend (verified by grep).
 */
export type UserSafe = UserResponse;

/**
 * Query parameters for fetching users.
 */
export interface UsersQueryParams {
  page?: number;
  limit?: number;
  role?: UserDoc['role'];
  query?: string;
  includeDeleted?: boolean;
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
  role: UserDoc['role'];
}

/**
 * Response from PATCH /admin/users/:userId/role
 */
export interface UpdateRoleResponse {
  user: UserSafe;
  message: string;
}
