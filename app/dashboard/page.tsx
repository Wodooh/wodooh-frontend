"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types/auth";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
      return;
    }
    // Redirect role-specific users to their dashboards
    if (user) {
      if (user.role === UserRole.INSTRUCTOR) {
        router.replace("/dashboard/instructor");
      } else if (user.role === UserRole.CHAIRMAN) {
        router.replace("/dashboard/chairman");
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-loader">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-bg-orb dashboard-bg-orb-1" />
      <div className="dashboard-bg-orb dashboard-bg-orb-2" />

      <header className="dashboard-header">
        <div className="dashboard-header-brand">
          <img
            src="/logo.png"
            alt="WODOOH Logo"
            className="h-8 w-auto object-contain"
          />
        </div>
        <div className="dashboard-header-user">
          <div className="dashboard-avatar">
            {user.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)}
          </div>
          <div className="dashboard-user-info">
            <span className="dashboard-user-name">{user.name}</span>
            <span className="dashboard-user-role">Student</span>
          </div>
          <button
            id="logout-button"
            className="dashboard-logout-btn"
            onClick={logout}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M13.333 14.167L17.5 10m0 0l-4.167-4.167M17.5 10H7.5M7.5 2.5H6.333c-1.4 0-2.1 0-2.635.272A2.5 2.5 0 002.605 3.866C2.333 4.4 2.333 5.1 2.333 6.5v7c0 1.4 0 2.1.272 2.635a2.5 2.5 0 001.093 1.093c.535.272 1.235.272 2.635.272H7.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Sign Out
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-welcome-card">
          <h1 className="dashboard-welcome-title">
            Welcome back, {user.name.split(" ")[0]}! 👋
          </h1>
          <p className="dashboard-welcome-text">
            You&apos;re signed in as <strong>{user.email}</strong>. This is your
            student dashboard. Content will be added in upcoming sprints.
          </p>
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon">📚</div>
            <h3>My Courses</h3>
            <p className="dashboard-stat-value">—</p>
            <p className="dashboard-stat-label">Coming soon</p>
          </div>
          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon">📝</div>
            <h3>Assignments</h3>
            <p className="dashboard-stat-value">—</p>
            <p className="dashboard-stat-label">Coming soon</p>
          </div>
          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon">📊</div>
            <h3>Grades</h3>
            <p className="dashboard-stat-value">—</p>
            <p className="dashboard-stat-label">Coming soon</p>
          </div>
        </div>
      </main>
    </div>
  );
}
