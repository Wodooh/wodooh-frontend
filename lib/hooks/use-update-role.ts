'use client';

import { useState, useCallback } from 'react';
import { UpdateRoleRequest, UpdateRoleResponse } from '../types/user.types';
import apiClient from '../api/client';
import API_ENDPOINTS from '../api/endpoints';

/**
 * Hook for updating user role (admin only)
 * Used to change a user's role: admin, instructor, student, chairman
 */
export const useUpdateRole = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<UpdateRoleResponse | null>(null);

  /**
   * Update user role
   */
  const updateRole = useCallback(async (userId: string, roleData: UpdateRoleRequest): Promise<UpdateRoleResponse> => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await apiClient.patch<UpdateRoleResponse>(
        API_ENDPOINTS.USER_ROLE(userId),
        roleData
      );

      if (response.status === 'success' && response.data) {
        setData(response.data);
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to update user role');
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to update user role';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    updateRole,
    loading,
    error,
    data,
    clearError,
  };
};

/**
 * Hook for promoting user to admin
 */
export const usePromoteToAdmin = () => {
  const { updateRole, loading, error, clearError } = useUpdateRole();

  const promoteToAdmin = useCallback(async (userId: string) => {
    return updateRole(userId, { role: 'admin' });
  }, [updateRole]);

  return {
    promoteToAdmin,
    loading,
    error,
    clearError,
  };
};

/**
 * Hook for demoting user from admin
 */
export const useDemoteFromAdmin = () => {
  const { updateRole, loading, error, clearError } = useUpdateRole();

  const demoteFromAdmin = useCallback(async (userId: string, newRole: 'instructor' | 'student' | 'chairman') => {
    return updateRole(userId, { role: newRole });
  }, [updateRole]);

  return {
    demoteFromAdmin,
    loading,
    error,
    clearError,
  };
};

export default useUpdateRole;
