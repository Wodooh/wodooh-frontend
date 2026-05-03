"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-provider";
import { AdminSidebar } from "@/components/admin/sidebar";
import { Toaster } from "@/components/ui/sonner";

/**
 * Self-contained admin shell. Per the discussion in step 1, the existing
 * dashboards (/dashboard, /dashboard/instructor, /dashboard/chairman) keep
 * their bespoke layouts; migrating them to a shared shell is its own piece
 * of work and shouldn't ride along with admin features.
 *
 * Role gate: admin only. Chairman is a separate role for academic
 * authority and will get its own /chairman section later — not the same
 * thing as system administration.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (user && user.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [loading, isAuthenticated, user, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner" />
      </div>
    );
  }
  if (!isAuthenticated || !user || user.role !== "admin") {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <AdminSidebar />
      <main className="flex-1 overflow-x-auto px-8 py-6">{children}</main>
      <Toaster />
    </div>
  );
}
