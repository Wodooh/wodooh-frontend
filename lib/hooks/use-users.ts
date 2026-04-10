'use client';

import { useState, useEffect, useCallback } from 'react';
import { UsersQueryParams, UsersResponse, UserRole } from '../types/user.types';
import apiClient from '../api/client';
import API_ENDPOINTS from '../api/endpoints';

/**
 * Hook for fetching users (admin only)
 * Supports pagination, role filtering, and search
 */
export const useUsers = (params: UsersQueryParams = {}, options: { enabled?: boolean } = {}) => {
  const { enabled = true } = options;

  const [data, setData] = useState<UsersResponse | null>(null);
  const [users, setUsers] = useState<UsersResponse['users']>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Build query string from params
   */
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

  /**
   * Fetch users
   */
  const fetchUsers = useCallback(async (queryParams?: UsersQueryParams): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const queryString = buildQueryString(queryParams || params);
      const response = await apiClient.get<UsersResponse>(`${API_ENDPOINTS.USERS}${queryString}`);

      if (response.status === 'success' && response.data) {
        setData(response.data);
        setUsers(response.data.users);
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
  }, [params, buildQueryString]);

  /**
   * Refetch users with same or new params
   */
  const refetch = useCallback((newParams?: UsersQueryParams) => {
    fetchUsers(newParams);
  }, [fetchUsers]);

  /**
   * Fetch users on mount
   */
  useEffect(() => {
    if (enabled) {
      fetchUsers();
    }
  }, [enabled, fetchUsers]);

  /**
   * Pagination helpers
   */
  const pagination = data?.pagination;

  const nextPage = useCallback(() => {
    if (pagination?.hasNextPage) {
      fetchUsers({ ...params, page: (params.page || 1) + 1 });
    }
  }, [pagination, params, fetchUsers]);

  const prevPage = useCallback(() => {
    if (pagination?.hasPrevPage) {
      fetchUsers({ ...params, page: (params.page || 1) - 1 });
    }
  }, [pagination, params, fetchUsers]);

  const goToPage = useCallback((page: number) => {
    fetchUsers({ ...params, page });
  }, [params, fetchUsers]);

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
