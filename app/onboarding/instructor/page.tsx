"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type {
  College,
  Department,
  Course,
  Section,
  CourseSelection,
} from "@/types/onboarding";
import {
  InstructorOnboardingService,
  isValidInstructorName,
  isValidFacultyId,
  isKnownFacultyIdFormat,
  trackInstructorOnboardingEvent,
} from "@/services/instructorOnboardingService";

// ─── Steps ────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Personal Info" },
  { id: 2, label: "Academic Info" },
  { id: 3, label: "Confirm" },
];

// ─── Course name lookup helper (stored outside component for perf) ──
function getCourseName(courses: Course[], id: string) {
  const c = courses.find((c) => c.courseID === id);
  return c ? `${c.courseCode} — ${c.courseName}` : id;
}
function getSectionLabel(sectionsMap: Record<string, Section[]>, courseId: string, sectionId: string) {
  const sec = sectionsMap[courseId]?.find((s) => s.sectionID === sectionId);
  return sec ? `${sec.sectionNumber} (${sec.instructorName})` : sectionId;
}

export default function InstructorOnboardingPage() {
  const router = useRouter();
  const hasTrackedStart = useRef(false);

  // ── Step state ─────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(1);

  // ── Personal info ──────────────────────────────────────────
  const [fullName, setFullName] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [facultyIdTouched, setFacultyIdTouched] = useState(false);

  // ── Academic info ──────────────────────────────────────────
  const [colleges, setColleges] = useState<College[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [sectionsMap, setSectionsMap] = useState<Record<string, Section[]>>({});

  const [selectedCollege, setSelectedCollege] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [courseSelections, setCourseSelections] = useState<CourseSelection[]>([]);

  const [loadingColleges, setLoadingColleges] = useState(false);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingSections, setLoadingSections] = useState<string | null>(null);
  const [noDepartments, setNoDepartments] = useState(false);

  // ── Submission ─────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<{
    facultyId: string;
    fullName: string;
    flaggedFacultyId?: boolean;
    flaggedCourses?: string[];
  } | null>(null);

  // ── Analytics: track start ─────────────────────────────────
  useEffect(() => {
    if (!hasTrackedStart.current) {
      trackInstructorOnboardingEvent("instructor_onboarding_started");
      hasTrackedStart.current = true;
    }
  }, []);

  // ── Analytics: track approved on success screen ────────────
  useEffect(() => {
    if (submitSuccess) {
      trackInstructorOnboardingEvent("instructor_onboarding_approved", {
        facultyId: submitSuccess.facultyId,
      });
      // Persist pending status for dashboard limited-access banner
      localStorage.setItem(
        "wodooh_instructor_onboarding",
        JSON.stringify({ status: "pending", facultyId: submitSuccess.facultyId })
      );
    }
  }, [submitSuccess]);

  // ── Load colleges on step 2 ────────────────────────────────
  useEffect(() => {
    if (currentStep === 2 && colleges.length === 0) {
      setLoadingColleges(true);
      InstructorOnboardingService.getColleges()
        .then(setColleges)
        .finally(() => setLoadingColleges(false));
    }
  }, [currentStep, colleges.length]);

  // ── Load departments when college changes ──────────────────
  const handleCollegeChange = useCallback(async (collegeId: string) => {
    setSelectedCollege(collegeId);
    setSelectedDepartment("");
    setDepartments([]);
    setCourses([]);
    setSectionsMap({});
    setCourseSelections([]);
    setNoDepartments(false);
    if (!collegeId) return;
    setLoadingDepartments(true);
    try {
      const depts = await InstructorOnboardingService.getDepartments(collegeId);
      setDepartments(depts);
      if (depts.length === 0) setNoDepartments(true);
    } finally {
      setLoadingDepartments(false);
    }
  }, []);

  // ── Load courses when department changes ───────────────────
  const handleDepartmentChange = useCallback(async (deptId: string) => {
    setSelectedDepartment(deptId);
    setCourses([]);
    setSectionsMap({});
    setCourseSelections([]);
    if (!deptId) return;
    setLoadingCourses(true);
    try {
      const crs = await InstructorOnboardingService.getCourses(deptId);
      setCourses(crs);
    } finally {
      setLoadingCourses(false);
    }
  }, []);

  // ── Load sections for a course ─────────────────────────────
  const loadSections = useCallback(
    async (courseId: string) => {
      if (sectionsMap[courseId]) return;
      setLoadingSections(courseId);
      try {
        const secs = await InstructorOnboardingService.getSections(courseId);
        setSectionsMap((prev) => ({ ...prev, [courseId]: secs }));
      } finally {
        setLoadingSections(null);
      }
    },
    [sectionsMap]
  );

  // ── Handle course toggle ──────────────────────────────────
  const handleCourseToggle = useCallback(
    (courseId: string) => {
      setCourseSelections((prev) => {
        const exists = prev.find((cs) => cs.courseId === courseId);
        if (exists) return prev.filter((cs) => cs.courseId !== courseId);
        loadSections(courseId);
        return [...prev, { courseId, sectionId: "" }];
      });
    },
    [loadSections]
  );

  // ── Handle section select ─────────────────────────────────
  const handleSectionSelect = useCallback(
    (courseId: string, sectionId: string) => {
      setCourseSelections((prev) =>
        prev.map((cs) => (cs.courseId === courseId ? { ...cs, sectionId } : cs))
      );
    },
    []
  );

  // ── Validation ─────────────────────────────────────────────
  const nameError =
    nameTouched && !fullName.trim()
      ? "Full name is required."
      : nameTouched && !isValidInstructorName(fullName)
        ? "Name may only contain Arabic/English letters, spaces, hyphens, and apostrophes."
        : null;

  const facultyIdError =
    facultyIdTouched && !facultyId.trim()
      ? "Faculty ID is required."
      : facultyIdTouched && !isValidFacultyId(facultyId)
        ? "Faculty ID must be 3–20 alphanumeric characters."
        : null;

  const facultyIdWarning =
    facultyIdTouched && isValidFacultyId(facultyId) && !isKnownFacultyIdFormat(facultyId)
      ? "Unrecognised Faculty ID format — your submission will proceed and an admin will verify your ID."
      : null;

  const isStep1Valid =
    isValidInstructorName(fullName) && isValidFacultyId(facultyId);

  const allSectionsSelected = courseSelections.every((cs) => cs.sectionId);
  const isStep2Valid =
    !!selectedCollege &&
    !!selectedDepartment &&
    courseSelections.length > 0 &&
    allSectionsSelected;

  // ── Handle submit ──────────────────────────────────────────
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const response = await InstructorOnboardingService.submitInstructorOnboarding({
        fullName: fullName.trim(),
        facultyId: facultyId.trim(),
        collegeId: selectedCollege,
        departmentId: selectedDepartment,
        courseSelections,
      });
      if (response.success) {
        setSubmitSuccess({
          facultyId: response.data.facultyId,
          fullName: response.data.fullName,
          flaggedFacultyId: response.data.flaggedFacultyId,
          flaggedCourses: response.data.flaggedCourses,
        });
      } else {
        setSubmitError(response.error.message);
      }
    } catch {
      setSubmitError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Lookup helpers ─────────────────────────────────────────
  const getCollegeName = (id: string) =>
    colleges.find((c) => c.collegeID === id)?.collegeName ?? id;
  const getDepartmentName = (id: string) =>
    departments.find((d) => d.departmentID === id)?.deptName ?? id;

  // ── Success screen ─────────────────────────────────────────
  if (submitSuccess) {
    return (
      <div className="onboarding-page">
        <div className="login-bg-orb login-bg-orb-1" />
        <div className="login-bg-orb login-bg-orb-2" />
        <div className="login-bg-orb login-bg-orb-3" />

        <main className="onboarding-container">
          <div className="onboarding-card onboarding-success-card">
            {/* Animated checkmark */}
            <div className="onboarding-success-icon">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="3" />
                <path
                  d="M20 32l8 8 16-16"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="onboarding-check-path"
                />
              </svg>
            </div>

            <h1 className="onboarding-success-title">Application Submitted!</h1>
            <p className="onboarding-success-text">
              Thank you, <strong>{submitSuccess.fullName}</strong>. Your instructor profile
              has been submitted and is now under review.
            </p>

            {/* Pending Admin Approval badge */}
            <div className="onboarding-status-badge" id="instructor-pending-badge">
              <span className="onboarding-status-dot" />
              Pending Admin Approval
            </div>

            {/* Admin notified message */}
            <div className="instructor-admin-notified">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 1.333A6.667 6.667 0 1 0 8 14.667 6.667 6.667 0 0 0 8 1.333zm0 3.334v4m0 2.666h.007"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>
                The system administrator has been notified and will review your application.
                You will receive confirmation at your university email.
              </span>
            </div>

            {/* Flagged Faculty ID warning */}
            {submitSuccess.flaggedFacultyId && (
              <div className="instructor-flag-badge" id="flag-faculty-id">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M7 1.167L1.167 12.833h11.666L7 1.167z"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinejoin="round"
                  />
                  <path d="M7 5.833v2.334M7 10h.008" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                <span>
                  Faculty ID <strong>{submitSuccess.facultyId}</strong> will be verified by admin — your application is still accepted.
                </span>
              </div>
            )}

            {/* Flagged courses */}
            {submitSuccess.flaggedCourses && submitSuccess.flaggedCourses.length > 0 && (
              <div className="instructor-flag-badge" id="flag-courses">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M7 1.167L1.167 12.833h11.666L7 1.167z"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinejoin="round"
                  />
                  <path d="M7 5.833v2.334M7 10h.008" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                <span>
                  {submitSuccess.flaggedCourses.length === 1 ? "1 course is" : `${submitSuccess.flaggedCourses.length} courses are`} already assigned to another instructor and{" "}
                  <strong>flagged for admin review</strong>.
                </span>
              </div>
            )}

            <p className="onboarding-success-subtext">
              During review you will have <strong>limited access</strong>. Full access to lecture
              management tools will be unlocked once your profile is approved.
            </p>

            <button
              className="onboarding-button onboarding-button-primary"
              onClick={() => router.push("/login")}
              id="instructor-onboarding-go-to-login"
              style={{ width: "100%" }}
            >
              Go to Login
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────
  return (
    <div className="onboarding-page">
      <div className="login-bg-orb login-bg-orb-1" />
      <div className="login-bg-orb login-bg-orb-2" />
      <div className="login-bg-orb login-bg-orb-3" />

      <main className="onboarding-container">
        <div className="onboarding-card">
          {/* Logo / Brand */}
          <div className="onboarding-brand">
            <div className="login-logo-img">
              <img src="/logo.png" alt="WODOOH Logo" className="h-16 w-auto object-contain" />
            </div>
            <h1 className="onboarding-title">Instructor Onboarding</h1>
            <p className="onboarding-subtitle">
              Set up your instructor profile to manage lecture sessions
            </p>
          </div>

          {/* Progress bar */}
          <div
            className="onboarding-progress"
            role="progressbar"
            aria-valuenow={currentStep}
            aria-valuemin={1}
            aria-valuemax={3}
          >
            {STEPS.map((step) => (
              <div
                key={step.id}
                className={`onboarding-progress-step ${
                  step.id === currentStep
                    ? "onboarding-progress-active"
                    : step.id < currentStep
                      ? "onboarding-progress-done"
                      : ""
                }`}
              >
                <div className="onboarding-progress-circle">
                  {step.id < currentStep ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M3 7l3 3 5-5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    step.id
                  )}
                </div>
                <span className="onboarding-progress-label">{step.label}</span>
              </div>
            ))}
            <div className="onboarding-progress-bar">
              <div
                className="onboarding-progress-fill"
                style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
              />
            </div>
          </div>

          {/* Global error */}
          {submitError && (
            <div className="onboarding-error" role="alert" id="instructor-onboarding-error">
              <span className="onboarding-error-icon">⚠️</span>
              <p className="onboarding-error-text">{submitError}</p>
            </div>
          )}

          {/* ── Step 1: Personal Info ─────────────────────── */}
          {currentStep === 1 && (
            <div className="onboarding-step" key="step-1">
              <div className="onboarding-step-header">
                <h2 className="onboarding-step-title">Personal Information</h2>
                <p className="onboarding-step-desc">
                  Enter your name and Faculty ID as they appear in university records
                </p>
              </div>

              <div className="onboarding-fields">
                {/* Full Name */}
                <div className="onboarding-field">
                  <label htmlFor="instructor-name" className="onboarding-label">
                    Full Name <span className="onboarding-label-hint">(Arabic or English)</span>
                  </label>
                  <div className={`onboarding-input-wrapper ${nameError ? "onboarding-input-error" : ""}`}>
                    <svg className="onboarding-input-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path
                        d="M10 10a3.333 3.333 0 100-6.667A3.333 3.333 0 0010 10zM3.333 16.667c0-2.761 2.985-5 6.667-5s6.667 2.239 6.667 5"
                        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                      />
                    </svg>
                    <input
                      id="instructor-name"
                      type="text"
                      placeholder="د. أحمد الراشد / Dr. Ahmed Al-Rashid"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      onBlur={() => setNameTouched(true)}
                      autoFocus
                      dir="auto"
                      aria-describedby={nameError ? "instructor-name-error" : undefined}
                      aria-invalid={!!nameError}
                    />
                  </div>
                  {nameError && (
                    <p id="instructor-name-error" className="onboarding-field-error">{nameError}</p>
                  )}
                </div>

                {/* Faculty ID */}
                <div className="onboarding-field">
                  <label htmlFor="instructor-faculty-id" className="onboarding-label">
                    Faculty ID
                  </label>
                  <div className={`onboarding-input-wrapper ${facultyIdError ? "onboarding-input-error" : ""}`}>
                    <svg className="onboarding-input-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <rect x="3.333" y="2.5" width="13.333" height="15" rx="2" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M7.5 7.5h5M7.5 10.833h5M7.5 14.167h3.333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <input
                      id="instructor-faculty-id"
                      type="text"
                      placeholder="e.g. f12345 or dr9876"
                      value={facultyId}
                      onChange={(e) => setFacultyId(e.target.value)}
                      onBlur={() => setFacultyIdTouched(true)}
                      aria-describedby={facultyIdError ? "instructor-faculty-id-error" : undefined}
                      aria-invalid={!!facultyIdError}
                    />
                  </div>
                  {facultyIdError && (
                    <p id="instructor-faculty-id-error" className="onboarding-field-error">{facultyIdError}</p>
                  )}
                  {/* Warning for unrecognised format (not an error — just info) */}
                  {!facultyIdError && facultyIdWarning && (
                    <div className="instructor-id-warning" id="instructor-faculty-id-warning">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M7 1.167L1.167 12.833h11.666L7 1.167z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                        <path d="M7 5.833v2.334M7 10h.008" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                      </svg>
                      <span>{facultyIdWarning}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="onboarding-actions">
                <button
                  className="onboarding-button onboarding-button-secondary"
                  onClick={() => router.push("/login")}
                  type="button"
                  id="instructor-onboarding-back"
                >
                  Back to Login
                </button>
                <button
                  className="onboarding-button onboarding-button-primary"
                  disabled={!isStep1Valid}
                  onClick={() => setCurrentStep(2)}
                  type="button"
                  id="instructor-onboarding-next-1"
                >
                  Next Step
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3.333 8h9.334M8.667 4L12.667 8l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Academic Info ─────────────────────── */}
          {currentStep === 2 && (
            <div className="onboarding-step" key="step-2">
              <div className="onboarding-step-header">
                <h2 className="onboarding-step-title">Academic Information</h2>
                <p className="onboarding-step-desc">
                  Select your college, department, and the courses you will be teaching
                </p>
              </div>

              <div className="onboarding-fields">
                {/* College */}
                <div className="onboarding-field">
                  <label htmlFor="instructor-college" className="onboarding-label">College</label>
                  <div className="onboarding-select-wrapper">
                    <select
                      id="instructor-college"
                      className="onboarding-select"
                      value={selectedCollege}
                      onChange={(e) => handleCollegeChange(e.target.value)}
                      disabled={loadingColleges}
                    >
                      <option value="">
                        {loadingColleges ? "Loading colleges…" : "Select your college"}
                      </option>
                      {colleges.map((col) => (
                        <option key={col.collegeID} value={col.collegeID}>
                          {col.collegeName}
                        </option>
                      ))}
                    </select>
                    <svg className="onboarding-select-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>

                {/* Department */}
                <div className="onboarding-field">
                  <label htmlFor="instructor-department" className="onboarding-label">Department</label>
                  <div className="onboarding-select-wrapper">
                    <select
                      id="instructor-department"
                      className="onboarding-select"
                      value={selectedDepartment}
                      onChange={(e) => handleDepartmentChange(e.target.value)}
                      disabled={!selectedCollege || loadingDepartments || noDepartments}
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
                      {departments.map((dept) => (
                        <option key={dept.departmentID} value={dept.departmentID}>
                          {dept.deptName}
                        </option>
                      ))}
                    </select>
                    <svg className="onboarding-select-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  {/* Edge case: missing department */}
                  {noDepartments && (
                    <div className="onboarding-admin-contact" role="alert" id="no-departments-message">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M8 5v3M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      <span>
                        No departments found for this college. Please contact the system administrator at{" "}
                        <strong>admin@university.edu.sa</strong> for assistance.
                      </span>
                    </div>
                  )}
                </div>

                {/* Courses */}
                {selectedDepartment && !loadingCourses && courses.length > 0 && (
                  <div className="onboarding-field">
                    <label className="onboarding-label">Courses &amp; Sections</label>
                    <div className="onboarding-courses-list">
                      {courses.map((course) => {
                        const isSelected = courseSelections.some((cs) => cs.courseId === course.courseID);
                        const selection = courseSelections.find((cs) => cs.courseId === course.courseID);
                        const sections = sectionsMap[course.courseID] || [];
                        const isLoadingSections = loadingSections === course.courseID;

                        return (
                          <div
                            key={course.courseID}
                            className={`onboarding-course-item ${isSelected ? "onboarding-course-selected" : ""}`}
                          >
                            <button
                              type="button"
                              className="onboarding-course-toggle"
                              onClick={() => handleCourseToggle(course.courseID)}
                              id={`instructor-course-toggle-${course.courseID}`}
                            >
                              <div className={`onboarding-checkbox ${isSelected ? "onboarding-checkbox-checked" : ""}`}>
                                {isSelected && (
                                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                    <path d="M2.5 6l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                              </div>
                              <div className="onboarding-course-info">
                                <span className="onboarding-course-code">{course.courseCode}</span>
                                <span className="onboarding-course-name">{course.courseName}</span>
                              </div>
                            </button>

                            {isSelected && (
                              <div className="onboarding-section-select">
                                {isLoadingSections ? (
                                  <div className="onboarding-section-loading">
                                    <div className="spinner spinner-small" />
                                    <span>Loading sections…</span>
                                  </div>
                                ) : sections.length > 0 ? (
                                  <div className="onboarding-select-wrapper onboarding-section-dropdown">
                                    <select
                                      className="onboarding-select"
                                      value={selection?.sectionId || ""}
                                      onChange={(e) => handleSectionSelect(course.courseID, e.target.value)}
                                      id={`instructor-section-select-${course.courseID}`}
                                    >
                                      <option value="">Select section</option>
                                      {sections.map((sec) => (
                                        <option key={sec.sectionID} value={sec.sectionID}>
                                          {sec.sectionNumber} — {sec.instructorName} ({sec.term})
                                        </option>
                                      ))}
                                    </select>
                                    <svg className="onboarding-select-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  </div>
                                ) : (
                                  <p className="onboarding-field-error">No sections available for this course.</p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedDepartment && loadingCourses && (
                  <div className="onboarding-loading-state">
                    <div className="spinner" />
                    <span>Loading courses…</span>
                  </div>
                )}
              </div>

              <div className="onboarding-actions">
                <button
                  className="onboarding-button onboarding-button-secondary"
                  onClick={() => setCurrentStep(1)}
                  type="button"
                  id="instructor-onboarding-prev-2"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M12.667 8H3.333M7.333 4L3.333 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Previous
                </button>
                <button
                  className="onboarding-button onboarding-button-primary"
                  disabled={!isStep2Valid}
                  onClick={() => setCurrentStep(3)}
                  type="button"
                  id="instructor-onboarding-next-2"
                >
                  Review &amp; Confirm
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3.333 8h9.334M8.667 4L12.667 8l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Confirm ───────────────────────────── */}
          {currentStep === 3 && (
            <div className="onboarding-step" key="step-3">
              <div className="onboarding-step-header">
                <h2 className="onboarding-step-title">Review &amp; Confirm</h2>
                <p className="onboarding-step-desc">
                  Please verify all information below before submitting
                </p>
              </div>

              {/* Unrecognised Faculty ID note in confirm step */}
              {isValidFacultyId(facultyId) && !isKnownFacultyIdFormat(facultyId) && (
                <div className="instructor-id-warning" style={{ marginBottom: "16px" }} id="confirm-faculty-id-note">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1.167L1.167 12.833h11.666L7 1.167z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                    <path d="M7 5.833v2.334M7 10h.008" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                  <span>
                    Your Faculty ID <strong>{facultyId}</strong> format is unrecognised and will be verified by admin after submission. Your application will still be accepted.
                  </span>
                </div>
              )}

              <div className="onboarding-summary">
                {/* Personal Info */}
                <div className="onboarding-summary-section">
                  <h3 className="onboarding-summary-heading">Personal Information</h3>
                  <div className="onboarding-summary-grid">
                    <div className="onboarding-summary-item">
                      <span className="onboarding-summary-label">Full Name</span>
                      <span className="onboarding-summary-value">{fullName}</span>
                    </div>
                    <div className="onboarding-summary-item">
                      <span className="onboarding-summary-label">Faculty ID</span>
                      <span className="onboarding-summary-value">{facultyId}</span>
                    </div>
                  </div>
                </div>

                {/* Academic Info */}
                <div className="onboarding-summary-section">
                  <h3 className="onboarding-summary-heading">Academic Information</h3>
                  <div className="onboarding-summary-grid">
                    <div className="onboarding-summary-item">
                      <span className="onboarding-summary-label">College</span>
                      <span className="onboarding-summary-value">{getCollegeName(selectedCollege)}</span>
                    </div>
                    <div className="onboarding-summary-item">
                      <span className="onboarding-summary-label">Department</span>
                      <span className="onboarding-summary-value">{getDepartmentName(selectedDepartment)}</span>
                    </div>
                  </div>
                </div>

                {/* Course Selections */}
                <div className="onboarding-summary-section">
                  <h3 className="onboarding-summary-heading">
                    Selected Courses ({courseSelections.length})
                  </h3>
                  <div className="onboarding-summary-courses">
                    {courseSelections.map((cs) => (
                      <div key={cs.courseId} className="onboarding-summary-course">
                        <span className="onboarding-summary-course-name">
                          {getCourseName(courses, cs.courseId)}
                        </span>
                        <span className="onboarding-summary-course-section">
                          {getSectionLabel(sectionsMap, cs.courseId, cs.sectionId)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="onboarding-actions">
                <button
                  className="onboarding-button onboarding-button-secondary"
                  onClick={() => setCurrentStep(2)}
                  type="button"
                  disabled={isSubmitting}
                  id="instructor-onboarding-prev-3"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M12.667 8H3.333M7.333 4L3.333 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Edit Information
                </button>
                <button
                  className="onboarding-button onboarding-button-primary"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  type="button"
                  id="instructor-onboarding-submit"
                >
                  {isSubmitting ? (
                    <>
                      <div className="spinner spinner-small" />
                      <span>Submitting…</span>
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8l4 4 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>Submit for Approval</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Footer */}
          <p className="onboarding-footer">
            Already have an account?{" "}
            <a href="/login" className="onboarding-footer-link">
              Sign in here
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
