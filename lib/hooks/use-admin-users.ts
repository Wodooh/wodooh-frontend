"use client";

import { useCallback, useEffect, useState } from "react";
import apiClient from "../api/client";
import API_ENDPOINTS from "../api/endpoints";
import type {
  BulkChangeRoleRequest,
  BulkChangeRoleResponse,
  BulkSoftDeleteResponse,
  BulkUserIdsRequest,
  CreateUserRequest,
  CreateUserResponse,
  PasswordSetupResult,
  PatchUserRequest,
  PatchUserResponse,
} from "../types/admin-user.types";
import type {
  AdminUserResponse,
  UserResponse,
  UserRole,
} from "../types/user-doc.types";

interface UsersListParams {
  page?: number;
  limit?: number;
  role?: UserRole;
  query?: string;
  includeDeleted?: boolean;
}

interface UsersListResponse {
  users: UserResponse[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalUsers: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

/**
 * Backend returns the array under `data` and pagination under `pagination`
 * (separate top-level field), so we map it back to one object for callers.
 */
export function useAdminUsersList(params: UsersListParams = {}, deps: unknown[] = []) {
  const [data, setData] = useState<UsersListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (params.page !== undefined) qs.set("page", String(params.page));
      if (params.limit !== undefined) qs.set("limit", String(params.limit));
      if (params.role) qs.set("role", params.role);
      if (params.query) qs.set("query", params.query.toLowerCase());
      if (params.includeDeleted) qs.set("includeDeleted", "true");
      const url = qs.toString()
        ? `${API_ENDPOINTS.USERS}?${qs.toString()}`
        : API_ENDPOINTS.USERS;

      const res = await apiClient.get<UserResponse[]>(url);
      if (res.status !== "success" || !res.data) {
        throw new Error(res.message || "Failed to load users");
      }
      // Pagination is a sibling of data on the backend envelope.
      const envelope = res as unknown as {
        data: UserResponse[];
        pagination: UsersListResponse["pagination"];
      };
      setData({ users: envelope.data, pagination: envelope.pagination });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load users";
      setError(msg);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [
    params.page,
    params.limit,
    params.role,
    params.query,
    params.includeDeleted,
  ]);

  useEffect(() => {
    fetchList();
    // Allow callers to add bumpable deps (e.g. a refresh counter after a
    // mutation) without us prescribing a specific shape.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchList, ...deps]);

  return { data, loading, error, refetch: fetchList };
}

interface UseAdminUserResult {
  user: AdminUserResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAdminUser(userId: string | null): UseAdminUserResult {
  const [user, setUser] = useState<AdminUserResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOne = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<AdminUserResponse>(
        API_ENDPOINTS.USER_BY_ID(userId)
      );
      if (res.status !== "success" || !res.data) {
        throw new Error(res.message || "Failed to load user");
      }
      setUser(res.data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load user";
      setError(msg);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchOne();
  }, [fetchOne]);

  return { user, loading, error, refetch: fetchOne };
}

/** Mutation hooks. */
export function useCreateAdminUser() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const create = useCallback(async (body: CreateUserRequest) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post<CreateUserResponse>(
        API_ENDPOINTS.USERS,
        body
      );
      if (res.status !== "success" || !res.data) {
        throw new Error(res.message || "Create failed");
      }
      return res.data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Create failed";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  return { create, loading, error };
}

export function usePatchAdminUser() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const patch = useCallback(async (uid: string, body: PatchUserRequest) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.patch<PatchUserResponse>(
        API_ENDPOINTS.USER_BY_ID(uid),
        body
      );
      if (res.status !== "success" || !res.data) {
        throw new Error(res.message || "Update failed");
      }
      return res.data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Update failed";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  return { patch, loading, error };
}

/**
 * Manual GPA entry for a student. Sets gpaSource='manual' on the backend so a
 * later SIS sync won't clobber it. Returns the refreshed user (with gpa).
 */
export function useSetUserGpa() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setGpa = useCallback(async (uid: string, gpa: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.patch<AdminUserResponse>(
        API_ENDPOINTS.USER_GPA(uid),
        { gpa }
      );
      if (res.status !== "success" || !res.data) {
        throw new Error(res.message || "GPA update failed");
      }
      return res.data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "GPA update failed";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  return { setGpa, loading, error };
}

export function useSoftDeleteAdminUser() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const softDelete = useCallback(async (uid: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.delete<AdminUserResponse>(
        API_ENDPOINTS.USER_BY_ID(uid)
      );
      if (res.status !== "success" || !res.data) {
        throw new Error(res.message || "Delete failed");
      }
      return res.data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  return { softDelete, loading, error };
}

/**
 * Hard-delete is intentionally a separate hook calling a separate endpoint
 * (/permanent), mirroring the backend's two-step requirement. Callers MUST
 * use this only on already-soft-deleted users.
 */
export function useHardDeleteAdminUser() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hardDelete = useCallback(async (uid: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.delete<{ uid: string }>(
        API_ENDPOINTS.USER_PERMANENT(uid)
      );
      if (res.status !== "success" || !res.data) {
        throw new Error(res.message || "Permanent delete failed");
      }
      return res.data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Permanent delete failed";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  return { hardDelete, loading, error };
}

export function usePasswordReset() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resetPassword = useCallback(async (uid: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post<PasswordSetupResult>(
        API_ENDPOINTS.USER_PASSWORD_RESET(uid)
      );
      if (res.status !== "success" || !res.data) {
        throw new Error(res.message || "Password reset failed");
      }
      return res.data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Password reset failed";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  return { resetPassword, loading, error };
}

export function useBulkSoftDelete() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bulkSoftDelete = useCallback(
    async (body: BulkUserIdsRequest) => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.post<BulkSoftDeleteResponse>(
          API_ENDPOINTS.USERS_BULK_DELETE,
          body
        );
        if (res.status !== "success" || !res.data) {
          throw new Error(res.message || "Bulk delete failed");
        }
        return res.data;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Bulk delete failed";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );
  return { bulkSoftDelete, loading, error };
}

export function useBulkChangeRole() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bulkChangeRole = useCallback(async (body: BulkChangeRoleRequest) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post<BulkChangeRoleResponse>(
        API_ENDPOINTS.USERS_BULK_ROLE_CHANGE,
        body
      );
      if (res.status !== "success" || !res.data) {
        throw new Error(res.message || "Bulk role change failed");
      }
      return res.data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bulk role change failed";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  return { bulkChangeRole, loading, error };
}
