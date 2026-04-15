"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-provider";

// ─── Locked feature card ──────────────────────────────────────
function LockedCard({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="dashboard-stat-card instructor-locked-card">
      <div className="instructor-locked-overlay">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M14.167 8.333V6.667a4.167 4.167 0 00-8.334 0v1.666M6.833 16.667h6.334c1.4 0 2.1 0 2.635-.273a2.5 2.5 0 001.093-1.093c.272-.535.272-1.235.272-2.635v-1.332c0-1.4 0-2.1-.272-2.635a2.5 2.5 0 00-1.093-1.093c-.535-.273-1.235-.273-2.635-.273H6.833c-1.4 0-2.1 0-2.635.273a2.5 2.5 0 00-1.093 1.093c-.272.535-.272 1.235-.272 2.635v1.332c0 1.4 0 2.1.272 2.635a2.5 2.5 0 001.093 1.093c.535.273 1.235.273 2.635.273z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>Locked</span>
      </div>
      <div className="dashboard-stat-icon" style={{ opacity: 0.4 }}>{icon}</div>
      <h3 style={{ opacity: 0.4 }}>{title}</h3>
      <p className="dashboard-stat-value" style={{ opacity: 0.3 }}>—</p>
      <p className="dashboard-stat-label">Requires approval</p>
    </div>
  );
}

export default function InstructorDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: isLoading, logout } = useAuth();

  // ── Check for pending onboarding status (set by instructor
  //    onboarding wizard after submission) ───────────────────
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (user && user.role !== "instructor") {
      router.replace("/dashboard");
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("wodooh_instructor_onboarding");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.status === "pending") setIsPending(true);
      }
    } catch {
      // ignore
    }
  }, []);

  if (isLoading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-loader">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) return null;

  return (
    <div className="dashboard-page">
      <div className="dashboard-bg-orb dashboard-bg-orb-1" />
      <div className="dashboard-bg-orb dashboard-bg-orb-2" />

      {/* ── Header ──────────────────────────────────────── */}
      <header className="dashboard-header">
        <div className="dashboard-header-brand">
          <img
            src="/logo.png"
            alt="WODOOH Logo"
            className="h-8 w-auto object-contain"
          />
          <span className="dashboard-role-badge dashboard-role-instructor">
            Instructor
          </span>
          {isPending && (
            <span className="instructor-pending-pill" id="pending-pill-badge">
              <span className="onboarding-status-dot" style={{ width: 6, height: 6 }} />
              Pending Approval
            </span>
          )}
        </div>
        <div className="dashboard-header-user">
          <div className="dashboard-avatar dashboard-avatar-instructor">
            {user.name
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .slice(0, 2)}
          </div>
          <div className="dashboard-user-info">
            <span className="dashboard-user-name">{user.name}</span>
            <span className="dashboard-user-role">Instructor</span>
          </div>
          <button
            id="logout-button-instructor"
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
        {/* ── Pending Approval Banner (AC-4 limited access) ── */}
        {isPending && (
          <div className="instructor-pending-banner" role="alert" id="instructor-pending-banner">
            <div className="instructor-pending-banner-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
                <path d="M12 8v4.5l2.5 2.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="instructor-pending-banner-body">
              <div className="instructor-pending-banner-title">
                Your profile is pending admin approval
              </div>
              <p className="instructor-pending-banner-text">
                You have <strong>read-only access</strong> until your instructor profile is verified.
                Lecture management, attendance tracking, and grading tools will unlock once
                an administrator approves your application.
              </p>
              <div className="instructor-pending-features">
                {["Create Lecture Sessions", "Manage Attendance", "Grade Submissions", "Export Reports"].map(
                  (feat) => (
                    <span key={feat} className="instructor-pending-feature-chip">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path
                          d="M9.5 4.5V3.5a3.5 3.5 0 00-7 0v1M3.5 10h5c.933 0 1.4 0 1.757-.182a1.667 1.667 0 00.729-.73C11 8.731 11 8.265 11 7.333V6.667c0-.933 0-1.4-.182-1.757a1.667 1.667 0 00-.729-.729C9.731 4 9.265 4 8.333 4H3.667c-.933 0-1.4 0-1.757.181a1.667 1.667 0 00-.729.73C1 5.267 1 5.733 1 6.667v.666c0 .934 0 1.4.181 1.758a1.667 1.667 0 00.73.729C2.267 10 2.733 10 3.5 10z"
                          stroke="currentColor"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      {feat}
                    </span>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Welcome card ─────────────────────────────────── */}
        <div className="dashboard-welcome-card">
          <h1 className="dashboard-welcome-title">
            Welcome, {user.name}! 🎓
          </h1>
          <p className="dashboard-welcome-text">
            You&apos;re signed in as <strong>{user.email}</strong>.{" "}
            {isPending
              ? "Your application is under review. You can explore the dashboard in read-only mode."
              : "This is your instructor dashboard. Course management tools will be available in upcoming sprints."}
          </p>
        </div>

        {/* ── Stat cards — locked when pending, active when approved ── */}
        <div className="dashboard-grid">
          {isPending ? (
            <>
              <LockedCard icon="📖" title="My Courses" />
              <LockedCard icon="👨‍🎓" title="Students" />
              <LockedCard icon="📋" title="Grading" />
            </>
          ) : (
            <>
              <div className="dashboard-stat-card">
                <div className="dashboard-stat-icon">📖</div>
                <h3>My Courses</h3>
                <p className="dashboard-stat-value">—</p>
                <p className="dashboard-stat-label">Coming soon</p>
              </div>
              <div className="dashboard-stat-card">
                <div className="dashboard-stat-icon">👨‍🎓</div>
                <h3>Students</h3>
                <p className="dashboard-stat-value">—</p>
                <p className="dashboard-stat-label">Coming soon</p>
              </div>
              <div className="dashboard-stat-card">
                <div className="dashboard-stat-icon">📋</div>
                <h3>Grading</h3>
                <p className="dashboard-stat-value">—</p>
                <p className="dashboard-stat-label">Coming soon</p>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
