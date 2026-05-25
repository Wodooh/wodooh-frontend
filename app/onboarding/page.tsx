"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-provider";
import apiClient from "@/lib/api/client";
import API_ENDPOINTS from "@/lib/api/endpoints";
import { usePublicColleges } from "@/lib/hooks/use-public-colleges";
import { usePublicDepartments } from "@/lib/hooks/use-public-departments";
import { usePublicCourses } from "@/lib/hooks/use-public-courses";
import type { Section } from "@/lib/types/course.types";
import type { CourseSelection } from "@/types/onboarding";
import { isValidName, trackOnboardingEvent } from "@/services/onboardingService";
import "../nexus.css";
import "../login/login.css";
import "./onboarding.css";

type OnboardingRole = "student" | "instructor";

// ── Icons ─────────────────────────────────────────────────────

const Icon = ({ size = 14, children }: { size?: number; children: React.ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

const Eye = ({ size = 16 }: { size?: number }) => (
  <Icon size={size}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);

const EyeOff = ({ size = 16 }: { size?: number }) => (
  <Icon size={size}>
    <path d="M3 3l18 18" />
    <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
    <path d="M9.9 4.24A10 10 0 0 1 12 4c6.5 0 10 7 10 7a18 18 0 0 1-3.16 4.19M6.61 6.6A18 18 0 0 0 2 11s3 6.5 9.5 7a10 10 0 0 0 4-1" />
  </Icon>
);

const Sun = ({ size = 16 }: { size?: number }) => (
  <Icon size={size}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </Icon>
);

const Moon = ({ size = 16 }: { size?: number }) => (
  <Icon size={size}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
  </Icon>
);

const Check = ({ size = 14 }: { size?: number }) => (
  <Icon size={size}>
    <path d="M20 6 9 17l-5-5" />
  </Icon>
);

const PersonIcon = ({ size = 14 }: { size?: number }) => (
  <Icon size={size}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </Icon>
);

const PodiumIcon = ({ size = 14 }: { size?: number }) => (
  <Icon size={size}>
    <circle cx="12" cy="5" r="2.6" />
    <path d="M9 9.5h6l-1 4h-4z" />
    <path d="M7 21h10" />
    <path d="M12 13.5V21" />
  </Icon>
);

const SearchIcon = ({ size = 14 }: { size?: number }) => (
  <Icon size={size}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </Icon>
);

// ── Theme (mirrors login page) ───────────────────────────────

function useTheme() {
  const [theme, setThemeState] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("wodooh.theme") : null;
    const resolved = stored === "dark" || stored === "light"
      ? stored
      : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.dataset.nxTheme = resolved;
    document.documentElement.dataset.nxDensity = "compact";
    // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
    setThemeState(resolved);
  }, []);

  const setTheme = (t: "light" | "dark") => {
    setThemeState(t);
    document.documentElement.dataset.nxTheme = t;
    localStorage.setItem("wodooh.theme", t);
  };

  return { theme, setTheme };
}

// ── Stepper ──────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Account" },
  { id: 2, label: "Academic" },
  { id: 3, label: "Review" },
] as const;

function Stepper({ currentStep }: { currentStep: number }) {
  return (
    <nav className="nx-stepper" aria-label="Onboarding progress">
      {STEPS.map((step, idx) => {
        const isActive = step.id === currentStep;
        const isDone = step.id < currentStep;
        const dotClass = `nx-stepper-dot${isActive ? " is-active" : ""}${isDone ? " is-done" : ""}`;
        const labelClass = `nx-stepper-label${isActive ? " is-active" : ""}${isDone ? " is-done" : ""}`;
        return (
          <React.Fragment key={step.id}>
            <div className="nx-stepper-item" aria-current={isActive ? "step" : undefined}>
              <span className={dotClass} aria-hidden="true">
                {isDone ? <Check size={12} /> : step.id}
              </span>
              <span className={labelClass}>{step.label}</span>
            </div>
            {idx < STEPS.length - 1 && (
              <span className={`nx-stepper-line${isDone ? " is-done" : ""}`} aria-hidden="true" />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

// ── Helpers ──────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PW_MIN = 8;

function parseRole(value: string | null): OnboardingRole {
  return value === "instructor" ? "instructor" : "student";
}

function instructorNameOf(s: Section): string {
  if (!s.instructorId) return "TBA";
  if (typeof s.instructorId === "string") return "TBA";
  return s.instructorId.name;
}

// ── Page ─────────────────────────────────────────────────────

export default function OnboardingPage() {
  return (
    <Suspense fallback={<main className="nx-login-shell"><div className="nx-login-main"><span className="nx-spin" /></div></main>}>
      <OnboardingPageInner />
    </Suspense>
  );
}

function OnboardingPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signup, isAuthenticated, user, loading: authLoading } = useAuth();
  const { theme, setTheme } = useTheme();
  const hasTrackedStart = useRef(false);

  // ── Role (Student / Instructor) ──────────────────────────
  const [role, setRole] = useState<OnboardingRole>(() => parseRole(searchParams.get("role")));

  // Animation key — bumped on role change so the content cross-fades.
  const [contentKey, setContentKey] = useState(0);

  const switchRole = (next: OnboardingRole) => {
    if (next === role) return;
    setRole(next);
    setContentKey((k) => k + 1);
    setSubmitError(null);
    // Reset every academic selection so data picked under one role can never
    // be carried into a signup under a different role.
    setSelectedCollege("");
    setSelectedDepartment("");
    setCourseSelections([]);
    setSectionsMap({});
    setCourseSearch("");
    const params = new URLSearchParams(searchParams.toString());
    if (next === "instructor") params.set("role", "instructor");
    else params.delete("role");
    const qs = params.toString();
    router.replace(qs ? `/onboarding?${qs}` : "/onboarding");
  };

  // ── Step state ────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // ── Account fields ────────────────────────────────────────
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [accountTouched, setAccountTouched] = useState<{ name?: boolean; email?: boolean; pw?: boolean; confirm?: boolean }>({});
  const [accountErrors, setAccountErrors] = useState<{ name?: string; email?: string; pw?: string; confirm?: string }>({});

  // ── Academic selections ───────────────────────────────────
  const [selectedCollege, setSelectedCollege] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [courseSelections, setCourseSelections] = useState<CourseSelection[]>([]);
  const [courseSearch, setCourseSearch] = useState("");

  // Sections are fetched on demand (one course at a time) and cached by courseId.
  const [sectionsMap, setSectionsMap] = useState<Record<string, Section[]>>({});
  const [loadingSections, setLoadingSections] = useState<string | null>(null);

  // ── Real data ─────────────────────────────────────────────
  // Fetch whenever an ID is selected so the lists stay available on the Review
  // step too (needed to resolve names from IDs).
  //
  // Course scope is role-dependent:
  //   • student    → all courses across every department/college
  //   • instructor → all courses in the selected college only
  // We still gate the fetch on the user having picked a department, so the
  // course list doesn't appear before the prerequisite steps are done.
  const { colleges, loading: loadingColleges, error: collegesError } = usePublicColleges();
  const { departments, loading: loadingDepartments, error: departmentsError } =
    usePublicDepartments(selectedCollege || undefined);
  const { courses, loading: loadingCourses, error: coursesError } = usePublicCourses(
    role === "instructor"
      ? {
          collegeId: selectedCollege || undefined,
          forInstructor: true,
          enabled: !!selectedDepartment && !!selectedCollege,
        }
      : { enabled: !!selectedDepartment }
  );

  const noDepartments =
    !!selectedCollege && !loadingDepartments && !departmentsError && departments.length === 0;

  // ── Submission state ──────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<{ name: string; email: string } | null>(null);

  // ── Redirect if already signed in ─────────────────────────
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const r = user?.role;
      const path =
        r === "admin" ? "/admin/dashboard"
        : r === "chairman" ? "/chairman/dashboard"
        : r === "instructor" ? "/instructor/dashboard"
        : "/student/dashboard";
      router.replace(path);
    }
  }, [authLoading, isAuthenticated, user, router]);

  // ── Track start once ──────────────────────────────────────
  useEffect(() => {
    if (!hasTrackedStart.current) {
      trackOnboardingEvent("manual_onboarding_started");
      hasTrackedStart.current = true;
    }
  }, []);

  // ── Cascading resets when the user changes college/department ──
  const handleCollegeChange = useCallback((collegeId: string) => {
    setSelectedCollege(collegeId);
    setSelectedDepartment("");
    setCourseSelections([]);
    setSectionsMap({});
    setCourseSearch("");
  }, []);

  const handleDepartmentChange = useCallback((deptId: string) => {
    setSelectedDepartment(deptId);
    setCourseSelections([]);
    setSectionsMap({});
    setCourseSearch("");
  }, []);

  // ── Load sections for a course on demand ─────────────────
  const loadSections = useCallback(async (courseId: string) => {
    if (sectionsMap[courseId]) return;
    setLoadingSections(courseId);
    try {
      const base = API_ENDPOINTS.PUBLIC_COURSE_SECTIONS(courseId);
      const url = role === "instructor" ? `${base}?forInstructor=true` : base;
      const res = await apiClient.get<Section[]>(url);
      const list = res.status === "success" && Array.isArray(res.data) ? res.data : [];
      setSectionsMap((prev) => ({ ...prev, [courseId]: list }));
    } catch {
      setSectionsMap((prev) => ({ ...prev, [courseId]: [] }));
    } finally {
      setLoadingSections(null);
    }
  }, [sectionsMap, role]);

  const handleCourseToggle = useCallback((courseId: string) => {
    setCourseSelections((prev) => {
      const exists = prev.find((cs) => cs.courseId === courseId);
      if (exists) return prev.filter((cs) => cs.courseId !== courseId);
      loadSections(courseId);
      return [...prev, { courseId, sectionId: "" }];
    });
  }, [loadSections]);

  const handleSectionSelect = useCallback((courseId: string, sectionId: string) => {
    setCourseSelections((prev) =>
      prev.map((cs) => (cs.courseId === courseId ? { ...cs, sectionId } : cs))
    );
  }, []);

  // ── Search filter on courses (name OR code, case-insensitive) ──
  const filteredCourses = useMemo(() => {
    const q = courseSearch.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter((c) =>
      c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [courses, courseSearch]);

  // ── Validation ───────────────────────────────────────────
  const validateAccount = (): boolean => {
    const errs: { name?: string; email?: string; pw?: string; confirm?: string } = {};
    if (!fullName.trim()) errs.name = "Full name is required.";
    else if (!isValidName(fullName)) errs.name = "Name may only contain letters, spaces, hyphens, and apostrophes.";

    if (!email.trim()) errs.email = "Email is required.";
    else if (!EMAIL_RE.test(email.trim())) errs.email = "Enter a valid email.";

    if (!password) errs.pw = "Password is required.";
    else if (password.length < PW_MIN) errs.pw = `Password must be at least ${PW_MIN} characters.`;

    if (!confirmPw) errs.confirm = "Please confirm your password.";
    else if (confirmPw !== password) errs.confirm = "Passwords don't match.";

    setAccountErrors(errs);
    setAccountTouched({ name: true, email: true, pw: true, confirm: true });

    return Object.keys(errs).length === 0;
  };

  const allSectionsSelected = courseSelections.every((cs) => cs.sectionId);
  const isStep2Valid =
    !!selectedCollege && !!selectedDepartment && courseSelections.length > 0 && allSectionsSelected;

  // ── Submit: create the account via /auth/signup ───────────
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await signup({
        name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        departmentId: selectedDepartment || undefined,
        sectionIds: courseSelections.map((cs) => cs.sectionId).filter(Boolean),
      });

      trackOnboardingEvent("manual_onboarding_completed", {
        role,
        courseCount: courseSelections.length,
      });

      setSubmitSuccess({ name: fullName.trim(), email: email.trim().toLowerCase() });
      const dashboard = role === "instructor" ? "/instructor/dashboard" : "/student/dashboard";
      setTimeout(() => router.replace(dashboard), 1500);
    } catch (err: unknown) {
      const e = err as { message?: string; statusCode?: number };
      if (e?.statusCode === 409) {
        setSubmitError("An account with this email already exists. Try signing in instead.");
      } else {
        setSubmitError(e?.message || "Could not create your account. Please try again.");
      }
      setIsSubmitting(false);
    }
  };

  // ── Lookup helpers for review ─────────────────────────────
  const getCollegeName = (id: string) => colleges.find((c) => c._id === id)?.name ?? id;
  const getDepartmentName = (id: string) => departments.find((d) => d._id === id)?.name ?? id;
  const getCourse = (id: string) => courses.find((c) => c._id === id);
  const getSection = (courseId: string, sectionId: string) =>
    sectionsMap[courseId]?.find((s) => s._id === sectionId);

  if (authLoading) {
    return (
      <main className="nx-login-shell">
        <div className="nx-login-main"><span className="nx-spin" /></div>
      </main>
    );
  }
  if (isAuthenticated) return null;

  // ── Success view ──────────────────────────────────────────
  if (submitSuccess) {
    const successDashboard = role === "instructor" ? "/instructor/dashboard" : "/student/dashboard";
    return (
      <main className="nx-login-shell" data-onboarding-role={role}>
        <div className="nx-login-topbar">
          <button
            className="nx-icon-btn"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun /> : <Moon />}
          </button>
        </div>
        <div className="nx-login-main">
          <div className="nx-onboarding-card">
            <div className="nx-login-head">
              <div className="nx-success-icon" aria-hidden="true"><Check size={28} /></div>
              <h1 className="nx-login-title" style={{ marginTop: 16 }}>Account created</h1>
              <p className="nx-login-sub">
                Welcome, {submitSuccess.name}. Redirecting to your {role} dashboard…
              </p>
            </div>
            <div className="nx-onboarding-body">
              <button
                type="button"
                className="nx-btn nx-btn-primary nx-login-submit"
                onClick={() => router.replace(successDashboard)}
              >
                Continue to dashboard
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ── Main render ───────────────────────────────────────────
  const titleByRole = role === "instructor" ? "Create your instructor account" : "Create your student account";
  const subByRole = role === "instructor"
    ? "Apply for teaching access — set up your profile and assigned courses"
    : "Set up your profile to access courses and lectures";

  return (
    <main className="nx-login-shell" data-onboarding-role={role}>
      <div className="nx-login-topbar">
        <button
          className="nx-icon-btn"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          title="Toggle theme"
        >
          {theme === "dark" ? <Sun /> : <Moon />}
        </button>
      </div>

      <div className="nx-login-main">
        <div className="nx-onboarding-card">
          <div className="nx-login-head">
            <div className="nx-login-logo">W</div>
            <h1 className="nx-login-title">{titleByRole}</h1>
            <p className="nx-login-sub">{subByRole}</p>
          </div>

          {/* Role toggle — only on Step 1. The choice is locked once the
              user advances so they can't fill one role's data and submit
              under another. */}
          {currentStep === 1 && (
            <div
              className="nx-role-toggle"
              role="tablist"
              aria-label="Choose account type"
            >
              <span
                className={`nx-role-toggle-thumb${role === "instructor" ? " is-instructor" : ""}`}
                aria-hidden="true"
              />
              <button
                type="button"
                role="tab"
                aria-selected={role === "student"}
                className={`nx-role-toggle-btn${role === "student" ? " is-active" : ""}`}
                onClick={() => switchRole("student")}
              >
                <PersonIcon /> Student
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={role === "instructor"}
                className={`nx-role-toggle-btn${role === "instructor" ? " is-active" : ""}`}
                onClick={() => switchRole("instructor")}
              >
                <PodiumIcon /> Instructor
              </button>
            </div>
          )}

          <Stepper currentStep={currentStep} />

          <div className="nx-onboarding-body nx-role-content" key={`${role}-${contentKey}`}>
            {submitError && (
              <div className="nx-login-error" role="alert">
                <span>{submitError}</span>
              </div>
            )}

            {/* ── Step 1: Account ─────────────────────────── */}
            {currentStep === 1 && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (validateAccount()) setCurrentStep(2);
                }}
                style={{ display: "contents" }}
              >
                <p className="nx-step-eyebrow">Step 1 of 3</p>
                <h2 className="nx-step-title">Account details</h2>
                <p className="nx-step-sub">You&apos;ll use these credentials to sign in.</p>

                <div className="nx-login-field">
                  <label htmlFor="ob-name" className="nx-field-label">Full name</label>
                  <div className={`nx-login-input-wrap${accountErrors.name && accountTouched.name ? " has-error" : ""}`}>
                    <input
                      id="ob-name"
                      className="nx-login-input"
                      type="text"
                      placeholder="Ahmed Al-Rashid"
                      value={fullName}
                      onChange={(e) => { setFullName(e.target.value); setAccountErrors(p => ({ ...p, name: undefined })); }}
                      onBlur={() => setAccountTouched(p => ({ ...p, name: true }))}
                      autoFocus
                      dir="auto"
                    />
                  </div>
                  {accountTouched.name && accountErrors.name && (
                    <span className="nx-login-helper is-error">{accountErrors.name}</span>
                  )}
                </div>

                <div className="nx-login-field">
                  <label htmlFor="ob-email" className="nx-field-label">Email</label>
                  <div className={`nx-login-input-wrap${accountErrors.email && accountTouched.email ? " has-error" : ""}`}>
                    <input
                      id="ob-email"
                      className="nx-login-input"
                      type="email"
                      placeholder="you@university.edu.sa"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setAccountErrors(p => ({ ...p, email: undefined })); }}
                      onBlur={() => setAccountTouched(p => ({ ...p, email: true }))}
                      autoComplete="email"
                    />
                  </div>
                  {accountTouched.email && accountErrors.email && (
                    <span className="nx-login-helper is-error">{accountErrors.email}</span>
                  )}
                </div>

                <div className="nx-login-field">
                  <label htmlFor="ob-pw" className="nx-field-label">Password</label>
                  <div className={`nx-login-input-wrap${accountErrors.pw && accountTouched.pw ? " has-error" : ""}`}>
                    <input
                      id="ob-pw"
                      className="nx-login-input"
                      type={showPw ? "text" : "password"}
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setAccountErrors(p => ({ ...p, pw: undefined })); }}
                      onBlur={() => setAccountTouched(p => ({ ...p, pw: true }))}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="nx-login-pw-toggle"
                      onClick={() => setShowPw(s => !s)}
                      aria-label={showPw ? "Hide password" : "Show password"}
                    >
                      {showPw ? <EyeOff /> : <Eye />}
                    </button>
                  </div>
                  {accountTouched.pw && accountErrors.pw && (
                    <span className="nx-login-helper is-error">{accountErrors.pw}</span>
                  )}
                </div>

                <div className="nx-login-field">
                  <label htmlFor="ob-confirm" className="nx-field-label">Confirm password</label>
                  <div className={`nx-login-input-wrap${accountErrors.confirm && accountTouched.confirm ? " has-error" : ""}`}>
                    <input
                      id="ob-confirm"
                      className="nx-login-input"
                      type={showPw ? "text" : "password"}
                      placeholder="Re-type your password"
                      value={confirmPw}
                      onChange={(e) => { setConfirmPw(e.target.value); setAccountErrors(p => ({ ...p, confirm: undefined })); }}
                      onBlur={() => setAccountTouched(p => ({ ...p, confirm: true }))}
                      autoComplete="new-password"
                    />
                  </div>
                  {accountTouched.confirm && accountErrors.confirm && (
                    <span className="nx-login-helper is-error">{accountErrors.confirm}</span>
                  )}
                </div>

                <div className="nx-step-nav">
                  <button type="button" className="nx-btn nx-btn-ghost" onClick={() => router.push("/login")}>
                    Cancel
                  </button>
                  <button type="submit" className="nx-btn nx-btn-primary">Continue</button>
                </div>
              </form>
            )}

            {/* ── Step 2: Academic ────────────────────────── */}
            {currentStep === 2 && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (isStep2Valid) setCurrentStep(3);
                }}
                style={{ display: "contents" }}
              >
                <p className="nx-step-eyebrow">Step 2 of 3</p>
                <h2 className="nx-step-title">Academic information</h2>
                <p className="nx-step-sub">
                  {role === "instructor"
                    ? "Pick your college, department, and the courses you'll be teaching."
                    : "Pick your college, department, and the courses you're enrolling in."}
                </p>

                {collegesError && (
                  <span className="nx-login-helper is-error">{collegesError}</span>
                )}

                <div className="nx-login-field">
                  <label htmlFor="ob-college" className="nx-field-label">College</label>
                  <select
                    id="ob-college"
                    className="nx-select"
                    value={selectedCollege}
                    onChange={(e) => handleCollegeChange(e.target.value)}
                    disabled={loadingColleges}
                    style={{ width: "100%" }}
                  >
                    <option value="">{loadingColleges ? "Loading colleges…" : "Select your college"}</option>
                    {colleges.map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="nx-login-field">
                  <label htmlFor="ob-dept" className="nx-field-label">Department</label>
                  <select
                    id="ob-dept"
                    className="nx-select"
                    value={selectedDepartment}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    disabled={!selectedCollege || loadingDepartments || noDepartments}
                    style={{ width: "100%" }}
                  >
                    <option value="">
                      {loadingDepartments
                        ? "Loading departments…"
                        : !selectedCollege
                          ? "Select a college first"
                          : noDepartments
                            ? "No departments available"
                            : "Select your department"}
                    </option>
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                  </select>
                  {departmentsError && (
                    <span className="nx-login-helper is-error">{departmentsError}</span>
                  )}
                  {noDepartments && (
                    <span className="nx-login-helper">
                      No departments listed for this college. Please contact your administrator.
                    </span>
                  )}
                </div>

                {selectedDepartment && loadingCourses && (
                  <span className="nx-login-helper">Loading courses…</span>
                )}

                {selectedDepartment && coursesError && !loadingCourses && (
                  <span className="nx-login-helper is-error">{coursesError}</span>
                )}

                {selectedDepartment && !loadingCourses && courses.length > 0 && (
                  <div className="nx-login-field">
                    <label htmlFor="ob-course-search" className="nx-field-label">
                      Courses &amp; sections
                    </label>

                    <div className="nx-login-input-wrap" style={{ marginBottom: 8 }}>
                      <span
                        aria-hidden="true"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "0 8px 0 10px",
                          color: "var(--nx-text-muted, currentColor)",
                          opacity: 0.7,
                        }}
                      >
                        <SearchIcon size={14} />
                      </span>
                      <input
                        id="ob-course-search"
                        className="nx-login-input"
                        type="search"
                        placeholder="Search courses by name or code…"
                        value={courseSearch}
                        onChange={(e) => setCourseSearch(e.target.value)}
                        aria-label="Search courses by name or code"
                      />
                    </div>

                    {filteredCourses.length === 0 ? (
                      <span className="nx-login-helper">
                        No courses match &quot;{courseSearch}&quot;.
                      </span>
                    ) : (
                      <ul className="nx-course-list">
                        {filteredCourses.map((course) => {
                          const sel = courseSelections.find((cs) => cs.courseId === course._id);
                          const isSelected = !!sel;
                          const sections = sectionsMap[course._id] ?? [];
                          const isLoadingSections = loadingSections === course._id;

                          return (
                            <li key={course._id} className={`nx-course-item${isSelected ? " is-selected" : ""}`}>
                              <button
                                type="button"
                                className="nx-course-toggle"
                                onClick={() => handleCourseToggle(course._id)}
                                aria-pressed={isSelected}
                              >
                                <span className="nx-course-checkbox" aria-hidden="true">
                                  {isSelected && <Check size={12} />}
                                </span>
                                <span className="nx-course-info">
                                  <span className="nx-course-code">{course.code}</span>
                                  <span className="nx-course-name">{course.name}</span>
                                </span>
                              </button>
                              {isSelected && (
                                <div className="nx-course-section">
                                  {isLoadingSections ? (
                                    <span className="nx-login-helper">Loading sections…</span>
                                  ) : sections.length > 0 ? (
                                    <select
                                      className="nx-select"
                                      value={sel?.sectionId ?? ""}
                                      onChange={(e) => handleSectionSelect(course._id, e.target.value)}
                                      style={{ width: "100%" }}
                                    >
                                      <option value="">Select section</option>
                                      {sections.map((s) => (
                                        <option key={s._id} value={s._id}>
                                          {s.sectionId} — {instructorNameOf(s)}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span className="nx-login-helper is-error">No sections available.</span>
                                  )}
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}

                <div className="nx-step-nav">
                  <button type="button" className="nx-btn nx-btn-ghost" onClick={() => setCurrentStep(1)}>
                    Back
                  </button>
                  <button type="submit" className="nx-btn nx-btn-primary" disabled={!isStep2Valid}>
                    Review
                  </button>
                </div>
              </form>
            )}

            {/* ── Step 3: Review ──────────────────────────── */}
            {currentStep === 3 && (
              <form
                onSubmit={(e) => { e.preventDefault(); if (!isSubmitting) handleSubmit(); }}
                style={{ display: "contents" }}
              >
                <p className="nx-step-eyebrow">Step 3 of 3</p>
                <h2 className="nx-step-title">Review &amp; confirm</h2>
                <p className="nx-step-sub">Verify your details before we create your account.</p>

                <section className="nx-review-section">
                  <p className="nx-review-heading">Account · {role === "instructor" ? "Instructor" : "Student"}</p>
                  <div className="nx-review-row">
                    <span className="nx-review-key">Full name</span>
                    <span className="nx-review-val">{fullName.trim()}</span>
                  </div>
                  <div className="nx-review-row">
                    <span className="nx-review-key">Email</span>
                    <span className="nx-review-val">{email.trim().toLowerCase()}</span>
                  </div>
                </section>

                <section className="nx-review-section">
                  <p className="nx-review-heading">Academic</p>
                  <div className="nx-review-row">
                    <span className="nx-review-key">College</span>
                    <span className="nx-review-val">{getCollegeName(selectedCollege)}</span>
                  </div>
                  <div className="nx-review-row">
                    <span className="nx-review-key">Department</span>
                    <span className="nx-review-val">{getDepartmentName(selectedDepartment)}</span>
                  </div>
                </section>

                <section className="nx-review-section">
                  <p className="nx-review-heading">Selected courses ({courseSelections.length})</p>
                  {courseSelections.map((cs) => {
                    const course = getCourse(cs.courseId);
                    const section = getSection(cs.courseId, cs.sectionId);
                    return (
                      <div key={cs.courseId} className="nx-review-row">
                        <span className="nx-review-key">
                          <span className="nx-course-code" style={{ marginRight: 8 }}>{course?.code ?? cs.courseId}</span>
                          {course?.name ?? ""}
                        </span>
                        <span className="nx-review-val">
                          {section ? `${section.sectionId} · ${instructorNameOf(section)}` : cs.sectionId}
                        </span>
                      </div>
                    );
                  })}
                </section>

                <div className="nx-step-nav">
                  <button type="button" className="nx-btn nx-btn-ghost" onClick={() => setCurrentStep(2)} disabled={isSubmitting}>
                    Back
                  </button>
                  <button type="submit" className="nx-btn nx-btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? <><span className="nx-spin" /> Creating account…</> : "Create account"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        <p className="nx-login-meta">
          Already have an account? <a href="/login">Sign in</a>
        </p>
      </div>

      <footer className="nx-login-foot">
        <a href="#">Terms</a>
        <a href="#">Privacy</a>
        <a href="#">Support</a>
      </footer>
    </main>
  );
}
