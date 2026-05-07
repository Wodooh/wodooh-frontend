'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth/auth-provider';

const ROLE_CLASSES = ['student', 'faculty', 'chairman', 'admin'];

export function RoleBodyClass() {
  const { user } = useAuth();

  useEffect(() => {
    const body = document.body;
    body.classList.remove(...ROLE_CLASSES);

    if (!user?.role) return;

    const cls = user.role === 'instructor' ? 'faculty' : user.role;
    body.classList.add(cls);
  }, [user?.role]);

  return null;
}
