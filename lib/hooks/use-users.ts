'use client';

import { useState, useEffect, useCallback } from 'react';
import { UsersQueryParams, UsersResponse, UserRole, UserSafe } from '../types/user.types';
import apiClient from '../api/client';
import API_ENDPOINTS from '../api/endpoints';

/**
 * Hook for fetching users (admin only)
 * Supports pagination, role filtering, and search
 */
export const useUsers = (params: UsersQueryParams = {}, options: { enabled?: boolean } = {}) => {
  const { enabled = true } = options;
  // Depend on primitive fields, not the params object — callers commonly
  // pass an inline `{ ... }` literal, which would otherwise re-trigger the
  // fetch effect every render and cause "Maximum update depth exceeded".
  const { page, limit, role, query } = params;

  const [data, setData] = useState<UsersResponse | null>(null);
  const [users, setUsers] = useState<UsersResponse['users']>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildQueryString = useCallback((queryParams: UsersQueryParams): string => {
    const searchParams = new URLSearchParams();

    if (queryParams.page !== undefined) {
      searchParams.append('page', queryParams.page.toString());
    }
    if (queryParams.limit !== undefined) {
      searchParams.append('limit', queryParams.limit.toString());
    }
    if (queryParams.role) {
      searchParams.append('role', queryParams.role);
    }
    if (queryParams.query) {
      searchParams.append('query', queryParams.query.toLowerCase()); // Backend stores in lowercase
    }

    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
  }, []);

  const fetchUsers = useCallback(async (queryParams?: UsersQueryParams): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const effective = queryParams ?? { page, limit, role, query };
      const queryString = buildQueryString(effective);
      // Backend shape: { status, message, data: UserSafe[], pagination: PaginationMeta }
      // Reshape into the nested UsersResponse the rest of the app expects.
      const response = await apiClient.get<UserSafe[]>(`${API_ENDPOINTS.USERS}${queryString}`);

      if (response.status === 'success' && Array.isArray(response.data)) {
        const usersList = response.data;
        const reshaped: UsersResponse = {
          users: usersList,
          pagination: response.pagination ?? {
            currentPage: 1,
            totalPages: 1,
            totalUsers: usersList.length,
            hasNextPage: false,
            hasPrevPage: false,
          },
        };
        setData(reshaped);
        setUsers(usersList);
      } else {
        throw new Error(response.message || 'Failed to fetch users');
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to fetch users';
      setError(errorMessage);
      setData(null);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, role, query, buildQueryString]);

  const refetch = useCallback((newParams?: UsersQueryParams) => {
    fetchUsers(newParams);
  }, [fetchUsers]);

  useEffect(() => {
    if (enabled) {
      fetchUsers();
    }
  }, [enabled, fetchUsers]);

  const pagination = data?.pagination;

  const nextPage = useCallback(() => {
    if (pagination?.hasNextPage) {
      fetchUsers({ page: (page || 1) + 1, limit, role, query });
    }
  }, [pagination, page, limit, role, query, fetchUsers]);

  const prevPage = useCallback(() => {
    if (pagination?.hasPrevPage) {
      fetchUsers({ page: (page || 1) - 1, limit, role, query });
    }
  }, [pagination, page, limit, role, query, fetchUsers]);

  const goToPage = useCallback((nextPageNum: number) => {
    fetchUsers({ page: nextPageNum, limit, role, query });
  }, [limit, role, query, fetchUsers]);

  return {
    data,
    users,
    loading,
    error,
    pagination,
    refetch,
    nextPage,
    prevPage,
    goToPage,
  };
};

/**
 * Hook for filtering users by role
 */
export const useUsersByRole = (role: UserRole, params: Omit<UsersQueryParams, 'role'> = {}) => {
  return useUsers({ ...params, role });
};

/**
 * Hook for searching users
 */
export const useUserSearch = (query: string, params: Omit<UsersQueryParams, 'query'> = {}) => {
  return useUsers({ ...params, query });
};

export default useUsers;
