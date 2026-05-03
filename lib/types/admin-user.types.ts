import type { AdminUserResponse, UserDoc, UserRole } from "./user-doc.types";

/**
 * Wire shapes for the admin-only user-mutation endpoints. All request types
 * are derived from UserDoc via Pick to avoid drift.
 */
export type CreateUserRequest = Pick<UserDoc, "email" | "displayName" | "role">;

export interface CreateUserResponse {
  user: AdminUserResponse;
  setup: PasswordSetupResult;
}

export type PatchUserRequest = Partial<
  Pick<UserDoc, "email" | "displayName" | "role" | "active">
>;

export type PatchUserResponse = AdminUserResponse;

export interface PasswordSetupResult {
  link: string;
  emailSent: boolean;
}

export interface BulkUserIdsRequest {
  userIds: string[];
}

export interface BulkChangeRoleRequest extends BulkUserIdsRequest {
  role: UserRole;
}

export interface BulkOutcome<T> {
  succeeded: T[];
  failed: { id: string; reason: string }[];
}

export type BulkSoftDeleteResponse = BulkOutcome<string>;
export type BulkChangeRoleResponse = BulkOutcome<{ id: string; newRole: UserRole }>;
