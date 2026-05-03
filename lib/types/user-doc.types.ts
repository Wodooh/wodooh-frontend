/**
 * Frontend mirror of the backend's UserDoc canonical shape.
 *
 * IMPORTANT: this is the SOURCE OF TRUTH for the admin dashboard.
 * Every other frontend user type (UserSafe, AdminUserDoc, etc.) must derive
 * from UserDoc via Pick/Omit so renaming a field on the backend that you
 * mirror here breaks the build instead of silently rendering the wrong UI.
 *
 * Wire boundary differences vs the backend type:
 *   - Timestamps are ISO `string` (not Firestore Timestamp / JS Date).
 *     The backend's `utils/userMapper.ts:toUserResponse` converts Date →
 *     ISO via `.toISOString()` before sending.
 *   - displayName: case-permissive in this type. Existing on-disk data is
 *     lowercased due to legacy writers; that is being addressed separately.
 *   - email: lowercased on every backend write path.
 */
export const USER_ROLES = ["admin", "instructor", "student", "chairman"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface UserDoc {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  sectionIds: string[];
  courseIds: string[];
  searchTokens: string[];
  isSeed: boolean;
  active: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Public wire shape — what `GET /admin/users` returns. Backwards-compatible
 * with the existing `useUsers` hook: `_id` and `name` are legacy aliases for
 * `uid` and `displayName`.
 */
export type UserResponse =
  Pick<UserDoc, "uid" | "email" | "role" | "active" | "deletedAt"> & {
    _id: string;
    name: string;
    createdAt: string | null;
    updatedAt: string | null;
  };

/**
 * Wire shape for the admin dashboard at /admin. Adds operational fields.
 */
export interface AdminUserResponse extends UserResponse {
  displayName: string;
  sectionIds: string[];
  courseIds: string[];
  isSeed: boolean;
  searchTokens: string[];
}
