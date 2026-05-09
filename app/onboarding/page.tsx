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
  OnboardingService,
  isValidName,
  isValidStudentId,
  trackOnboardingEvent,
} from "@/services/onboardingService";
import "../nexus.css";

// ─── Steps ────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Personal" },
  { id: 2, label: "Academic" },
  { id: 3, label: "Confirm" },
];

const ZERO_RADIUS = {} as const;

const PRIMARY_BTN = "nx-btn nx-btn-primary";

const GHOST_BTN = "nx-btn nx-btn-ghost";

const INPUT_CLASSES =
  "w-full px-3 py-2 text-sm bg-[var(--nx-bg-elev)] text-[var(--nx-fg)] border border-[var(--nx-border-strong)] rounded-md focus-visible:outline-none focus-visible:border-[var(--nx-accent)] disabled:opacity-50 disabled:cursor-not-allowed";

const SELECT_CLASSES = "nx-select w-full disabled:opacity-50 disabled:cursor-not-allowed";

const LABEL_CLASSES = "nx-field-label";

// ─── CourseCodeChip ───────────────────────────────────────────
function CourseCodeChip({ code }: { code: string }) {
  return <span className="nx-version-pill">{code}</span>;
}

// ─── Stepper ──────────────────────────────────────────────────
function Stepper({ currentStep }: { currentStep: number }) {
  return (
    <nav aria-label="Onboarding progress" className="mb-8" role="navigation">
      <ol className="flex items-start justify-between relative" role="list">
        {STEPS.map((step, idx) => {
          const isActive = step.id === currentStep;
          const isDone = step.id < currentStep;

          const dotStyle: React.CSSProperties = {
            width: 32,
            height: 32,
            borderRadius: 999,
            display: "grid",
            placeItems: "center",
            fontSize: 12,
            fontWeight: 600,
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            border: "1px solid",
            background: isActive
              ? "var(--nx-accent)"
              : isDone
                ? "var(--nx-fg)"
                : "var(--nx-bg-elev)",
            color: isActive || isDone ? "white" : "var(--nx-fg-muted)",
            borderColor: isActive
              ? "var(--nx-accent)"
              : isDone
                ? "var(--nx-fg)"
                : "var(--nx-border-strong)",
            position: "relative",
            zIndex: 1,
          };

          return (
            <li
              key={step.id}
              className="flex-1 flex flex-col items-center relative"
              aria-current={isActive ? "step" : undefined}
            >
              {idx > 0 && (
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: 16,
                    right: "50%",
                    width: "100%",
                    borderTop: `1px solid ${isDone ? "var(--nx-fg)" : "var(--nx-border)"}`,
                  }}
                />
              )}

              <span style={dotStyle}>
                {isDone ? (
                  <svg width="14" height="14" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                    <path d="M3.5 9l3.5 3.5 7-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  String(step.id).padStart(2, "0")
                )}
              </span>

              <span
                style={{
                  marginTop: 8,
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  textAlign: "center",
                  color: isActive
                    ? "var(--nx-accent)"
                    : isDone
                      ? "var(--nx-fg)"
                      : "var(--nx-fg-subtle)",
                }}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ─── StepHeader ───────────────────────────────────────────────
function StepHeader({
  step,
  title,
  description,
}: {
  step: number;
  title: string;
  description: string;
}) {
  const total = String(STEPS.length).padStart(2, "0");
  const num = String(step).padStart(2, "0");
  const label = step === 1 ? "Personal" : step === 2 ? "Academic" : "Confirmation";

  return (
    <div className="mb-6">
      <p
        style={{
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--nx-fg-subtle)",
          margin: "0 0 6px",
        }}
      >
        Step {num} / {total} · {label}
      </p>
      <h2 className="nx-page-title" style={{ fontSize: 22 }}>{title}</h2>
      <p className="nx-page-sub" style={{ marginTop: 6 }}>{description}</p>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const hasTrackedStart = useRef(false);

  // ── Step state ─────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(1);

  // ── Personal info ──────────────────────────────────────────
  const [fullName, setFullName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [studentIdTouched, setStudentIdTouched] = useState(false);
  const [duplicateIdError, setDuplicateIdError] = useState<string | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

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
    studentId: string;
    fullName: string;
  } | null>(null);

  // ── Theme bootstrapping (so onboarding inherits the user's theme choice)
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("wodooh.theme") : null;
    const resolved = stored === "light" || stored === "dark"
      ? stored
      : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.dataset.nxTheme = resolved;
    document.documentElement.dataset.nxDensity = "compact";
  }, []);

  // ── Analytics: track start ─────────────────────────────────
  useEffect(() => {
    if (!hasTrackedStart.current) {
      trackOnboardingEvent("manual_onboarding_started");
      hasTrackedStart.current = true;
    }
  }, []);

  // ── Analytics: track abandon on unmount ────────────────────
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!submitSuccess) {
        trackOnboardingEvent("manual_onboarding_abandoned", {
          step: currentStep,
        });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (!submitSuccess) {
        trackOnboardingEvent("manual_onboarding_abandoned", {
          step: currentStep,
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitSuccess]);

  // ── Load colleges on step 2 ────────────────────────────────
  useEffect(() => {
    if (currentStep === 2 && colleges.length === 0) {
      setLoadingColleges(true);
      OnboardingService.getColleges()
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
      const depts = await OnboardingService.getDepartments(collegeId);
      setDepartments(depts);
      if (depts.length === 0) {
        setNoDepartments(true);
      }
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
      const crs = await OnboardingService.getCourses(deptId);
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
        const secs = await OnboardingService.getSections(courseId);
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
        if (exists) {
          return prev.filter((cs) => cs.courseId !== courseId);
        }
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
        prev.map((cs) =>
          cs.courseId === courseId ? { ...cs, sectionId } : cs
        )
      );
    },
    []
  );

  // ── Duplicate ID check ─────────────────────────────────────
  const checkDuplicate = useCallback(async (id: string) => {
    if (!isValidStudentId(id)) return;

    setCheckingDuplicate(true);
    try {
      const isDuplicate = await OnboardingService.checkDuplicateStudentId(id);
      if (isDuplicate) {
        setDuplicateIdError(
          "This Student ID is already registered. Please contact your department administrator."
        );
      } else {
        setDuplicateIdError(null);
      }
    } finally {
      setCheckingDuplicate(false);
    }
  }, []);

  // ── Validation ─────────────────────────────────────────────
  const nameError =
    nameTouched && !fullName.trim()
      ? "Full name is required."
      : nameTouched && !isValidName(fullName)
        ? "Name may only contain Arabic/English letters, spaces, hyphens, and apostrophes."
        : null;

  const studentIdError =
    studentIdTouched && !studentId.trim()
      ? "Student ID is required."
      : studentIdTouched && !isValidStudentId(studentId)
        ? "Student ID must be 3–15 alphanumeric characters."
        : duplicateIdError;

  const isStep1Valid =
    isValidName(fullName) &&
    isValidStudentId(studentId) &&
    !duplicateIdError &&
    !checkingDuplicate;

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
      const response = await OnboardingService.submitOnboarding({
        fullName: fullName.trim(),
        studentId: studentId.trim(),
        collegeId: selectedCollege,
        departmentId: selectedDepartment,
        courseSelections,
      });

      if (response.success) {
        setSubmitSuccess({
          studentId: response.data.studentId,
          fullName: response.data.fullName,
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
  const getCourse = (id: string) => courses.find((c) => c.courseID === id);
  const getSection = (courseId: string, sectionId: string) =>
    sectionsMap[courseId]?.find((s) => s.sectionID === sectionId);

  // ── Success screen ─────────────────────────────────────────
  if (submitSuccess) {
    return (
      <div style={{minHeight:"100vh",background:"var(--nx-bg)",color:"var(--nx-fg)",fontFamily:"Inter,system-ui,sans-serif"}}>
        <main className="min-h-screen px-4 py-8">
          {/* Editorial strip */}
          <p className="text-xs text-neutral-400 max-w-2xl mx-auto pb-6 uppercase ">
            WODOOH · Office of the Registrar · Spring 2026
          </p>

          <section
                        className="border border-[var(--nx-border)] bg-[var(--nx-bg-sub)] max-w-2xl mx-auto "
          >
            {/* Page header band */}
            <header className="border-b border-[var(--nx-border)] px-8 py-6">
              <p className="text-xs uppercase  text-neutral-500">
                WODOOH
              </p>
              <h1 className="text-4xl font-bold  mt-1">
                Welcome
              </h1>
              <p className="text-xs uppercase  text-neutral-500 mt-2">
                Vol. 2026 · Spring Semester
              </p>
            </header>

            <div className="px-8 py-8">
              {/* Large celebratory checkmark */}
              <div
                                className="border border-[var(--nx-accent)] bg-[var(--nx-accent-soft)] flex flex-col items-center justify-center py-10 mb-8 "
                role="status"
              >
                <div
                                    className="w-20 h-20 border border-[var(--nx-accent)] bg-[var(--nx-accent-soft)] flex items-center justify-center mb-4"
                  aria-hidden="true"
                >
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 40 40"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M8 20l7.5 7.5L32 12"
                      stroke="#1040C0"
                      strokeWidth="3.5"
                      strokeLinecap="square"
                      strokeLinejoin="miter"
                    />
                  </svg>
                </div>
                <p className="font-bold uppercase  text-xs text-[var(--nx-accent)] mb-2">
                  Registration Complete
                </p>
                <p className="text-xl font-bold text-[var(--nx-accent)] text-center">
                  Welcome, {submitSuccess.fullName}
                </p>
                <p className="text-sm text-[var(--nx-accent)] mt-2 text-center">
                  You can now participate in lectures.
                </p>
              </div>

              {/* Confirmation ID — prominent display */}
              <div
                                className="border border-[var(--nx-border)] bg-[var(--nx-fg)] text-white px-6 py-4 flex items-center justify-between mb-8"
              >
                <span className="text-xs uppercase  text-neutral-400">
                  Confirmation ID
                </span>
                <span className="font-mono text-xl font-bold ">
                  {submitSuccess.studentId}
                </span>
              </div>

              {/* Details review table */}
              <dl className="border-collapse border border-[var(--nx-border)] divide-y divide-[var(--nx-fg)] mb-8">
                <div className="flex">
                  <dt className="font-bold uppercase  text-xs text-neutral-600 w-44 px-4 py-3 border-r border-[var(--nx-border)] bg-[var(--nx-bg-sub)]">
                    Full Name
                  </dt>
                  <dd className="text-sm px-4 py-3 flex-1">
                    {submitSuccess.fullName}
                  </dd>
                </div>
                <div className="flex">
                  <dt className="font-bold uppercase  text-xs text-neutral-600 w-44 px-4 py-3 border-r border-[var(--nx-border)] bg-[var(--nx-bg-sub)]">
                    Account Status
                  </dt>
                  <dd className="px-4 py-3 flex-1">
                    <span
                                            className="uppercase font-semibold text-xs px-2 py-0.5 border-[3px] border-[var(--nx-warning)] bg-[var(--nx-warning-soft)] text-[var(--nx-fg)]"
                      role="status"
                    >
                      Pending Verification
                    </span>
                  </dd>
                </div>
              </dl>

              <p className="text-sm text-neutral-700 leading-relaxed mb-8">
                Your account is active and you can start participating in lectures
                right away. Your status will automatically update to{" "}
                <strong>Verified</strong> once the university system syncs your
                enrollment data.
              </p>

              <div className="flex justify-end pt-6 border-t border-[var(--nx-border)]">
                <button
                  type="button"
                                    className={PRIMARY_BTN}
                  onClick={() => router.push("/login")}
                  id="onboarding-go-to-login"
                >
                  Continue to Login
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────
  return (
    <div style={{minHeight:"100vh",background:"var(--nx-bg)",color:"var(--nx-fg)",fontFamily:"Inter,system-ui,sans-serif"}}>
      <main className="min-h-screen px-4 py-8">
        {/* Editorial strip */}
        <p className="text-xs text-neutral-400 max-w-2xl mx-auto pb-6 uppercase ">
          WODOOH · Office of the Registrar · Spring 2026
        </p>

        <section
                    className="border border-[var(--nx-border)] bg-[var(--nx-bg-sub)] max-w-2xl mx-auto "
        >
          {/* ── Page header band ─────────────────────────────── */}
          <header className="border-b border-[var(--nx-border)] px-8 py-6">
            <p className="text-xs uppercase  text-neutral-500">
              WODOOH
            </p>
            <h1 className="text-4xl font-bold  mt-1">
              Student Onboarding
            </h1>
            <p className="text-xs uppercase  text-neutral-500 mt-2">
              Vol. 2026 · Spring Semester
            </p>
          </header>

          <div className="px-8 pt-8 pb-6">
            {/* ── Stepper ────────────────────────────────────── */}
            <Stepper currentStep={currentStep} />

            {/* ── Submission Error ───────────────────────────── */}
            {submitError && (
              <div
                                className="border border-[var(--nx-danger)] bg-[var(--nx-danger-soft)] text-[var(--nx-danger)] p-4 mb-6 flex items-start gap-3 "
                role="alert"
                id="onboarding-error-message"
              >
                <span
                  className="text-xs uppercase  font-bold shrink-0"
                  aria-hidden="true"
                >
                  Error
                </span>
                <p className="text-sm leading-relaxed flex-1">
                  {submitError}
                </p>
              </div>
            )}

            {/* ── Step 1: Personal Info ───────────────────────── */}
            {currentStep === 1 && (
              <form
                key="step-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (isStep1Valid) setCurrentStep(2);
                }}
              >
                <StepHeader
                  step={1}
                  title="Personal Information"
                  description="Enter your name and student ID as they appear in university records."
                />

                <fieldset className="space-y-6 mb-8 border-0 p-0">
                  <legend className="sr-only">Personal Information</legend>

                  {/* Full Name */}
                  <div>
                    <label htmlFor="onboarding-name" className={LABEL_CLASSES}>
                      Full Name{" "}
                      <span className="font-mono normal-case tracking-normal text-neutral-500 font-normal">
                        (Arabic or English)
                      </span>
                    </label>
                    <input
                      id="onboarding-name"
                      type="text"
                      placeholder="Ahmed Al-Rashid"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      onBlur={() => setNameTouched(true)}
                      autoFocus
                      dir="auto"
                                            className={`${INPUT_CLASSES} focus-visible:ring-0 ${
                        nameError ? "border-[var(--nx-danger)]" : ""
                      }`}
                      aria-describedby={nameError ? "name-error" : undefined}
                      aria-invalid={!!nameError}
                    />
                    {nameError && (
                      <p
                        id="name-error"
                        className="text-xs text-[var(--nx-danger)] mt-2 uppercase  font-bold"
                        role="alert"
                      >
                        <span className="font-semibold">Error:</span> {nameError}
                      </p>
                    )}
                  </div>

                  {/* Student ID */}
                  <div>
                    <label
                      htmlFor="onboarding-student-id"
                      className={LABEL_CLASSES}
                    >
                      Student ID
                    </label>
                    <input
                      id="onboarding-student-id"
                      type="text"
                      placeholder="s201234"
                      value={studentId}
                      onChange={(e) => {
                        setStudentId(e.target.value);
                        setDuplicateIdError(null);
                      }}
                      onBlur={() => {
                        setStudentIdTouched(true);
                        if (isValidStudentId(studentId)) {
                          checkDuplicate(studentId);
                        }
                      }}
                                            className={`${INPUT_CLASSES} ${
                        studentIdError ? "border-[var(--nx-danger)]" : ""
                      }`}
                      aria-describedby={
                        studentIdError ? "student-id-error" : undefined
                      }
                      aria-invalid={!!studentIdError}
                    />
                    {checkingDuplicate && (
                      <p className="text-xs text-neutral-500 mt-2 uppercase ">
                        Checking availability…
                      </p>
                    )}
                    {studentIdError && (
                      <p
                        id="student-id-error"
                        className="text-xs text-[var(--nx-danger)] mt-2 uppercase  font-bold"
                        role="alert"
                      >
                        <span className="font-semibold">Error:</span>{" "}
                        {studentIdError}
                      </p>
                    )}
                  </div>
                </fieldset>

                <div className="flex justify-between items-center pt-4 border-t border-[var(--nx-border)]">
                  <button
                    type="button"
                                        className={GHOST_BTN}
                    onClick={() => router.push("/login")}
                    id="onboarding-back-to-login"
                  >
                    ← Back to Login
                  </button>
                  <button
                    type="submit"
                                        className={PRIMARY_BTN}
                    disabled={!isStep1Valid}
                    id="onboarding-next-step-1"
                  >
                    Next Step →
                  </button>
                </div>
              </form>
            )}

            {/* ── Step 2: Academic Info ───────────────────────── */}
            {currentStep === 2 && (
              <form
                key="step-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (isStep2Valid) setCurrentStep(3);
                }}
              >
                <StepHeader
                  step={2}
                  title="Academic Information"
                  description="Select your college, department, and the courses you are enrolling in this semester."
                />

                <fieldset className="space-y-6 mb-8 border-0 p-0">
                  <legend className="sr-only">Academic Information</legend>

                  {/* College */}
                  <div>
                    <label
                      htmlFor="onboarding-college"
                      className={LABEL_CLASSES}
                    >
                      College
                    </label>
                    <select
                      id="onboarding-college"
                      value={selectedCollege}
                      onChange={(e) => handleCollegeChange(e.target.value)}
                      disabled={loadingColleges}
                                            className={SELECT_CLASSES}
                    >
                      <option value="">
                        {loadingColleges
                          ? "Loading colleges…"
                          : "Select your college"}
                      </option>
                      {colleges.map((col) => (
                        <option key={col.collegeID} value={col.collegeID}>
                          {col.collegeName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Department */}
                  <div>
                    <label
                      htmlFor="onboarding-department"
                      className={LABEL_CLASSES}
                    >
                      Department
                    </label>
                    <select
                      id="onboarding-department"
                      value={selectedDepartment}
                      onChange={(e) => handleDepartmentChange(e.target.value)}
                      disabled={
                        !selectedCollege || loadingDepartments || noDepartments
                      }
                                            className={SELECT_CLASSES}
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
                        <option
                          key={dept.departmentID}
                          value={dept.departmentID}
                        >
                          {dept.deptName}
                        </option>
                      ))}
                    </select>
                    {noDepartments && (
                      <div
                                                className="border border-[var(--nx-warning)] bg-[var(--nx-warning-soft)] text-[var(--nx-fg)] p-4 mt-3 flex items-start gap-3 "
                        role="alert"
                      >
                        <span className="text-xs uppercase  font-semibold shrink-0">
                          Notice
                        </span>
                        <p className="text-sm leading-relaxed flex-1">
                          No departments found for this college. Please contact
                          the system administrator at{" "}
                          <span className="font-mono">
                            admin@university.edu.sa
                          </span>
                          .
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Courses */}
                  {selectedDepartment && loadingCourses && (
                    <p className="text-xs uppercase  text-neutral-500 py-4">
                      Loading courses…
                    </p>
                  )}

                  {selectedDepartment &&
                    !loadingCourses &&
                    courses.length > 0 && (
                      <div>
                        <p
                          className={`${LABEL_CLASSES} mb-3`}
                          id="courses-section-label"
                        >
                          Courses & Sections
                        </p>
                        <ul
                          role="list"
                          aria-labelledby="courses-section-label"
                          className="space-y-3"
                        >
                          {courses.map((course) => {
                            const isSelected = courseSelections.some(
                              (cs) => cs.courseId === course.courseID
                            );
                            const selection = courseSelections.find(
                              (cs) => cs.courseId === course.courseID
                            );
                            const sections = sectionsMap[course.courseID] || [];
                            const isLoadingSections =
                              loadingSections === course.courseID;

                            return (
                              <li
                                key={course.courseID}
                                                                className={`hard-shadow-hover transition-all duration-150 ${
                                  isSelected
                                    ? "border border-[var(--nx-accent)] bg-[var(--nx-accent-soft)]"
                                    : "border border-[var(--nx-border)] bg-[var(--nx-bg-sub)]"
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleCourseToggle(course.courseID)
                                  }
                                  id={`course-toggle-${course.courseID}`}
                                  aria-pressed={isSelected}
                                                                    className="w-full text-left p-4 flex items-start gap-3 min-h-[44px] hover:bg-neutral-100 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nx-accent)] focus-visible:ring-offset-2"
                                >
                                  {/* Checkbox indicator */}
                                  <span
                                                                        className={`w-5 h-5 border border-[var(--nx-border)] shrink-0 mt-0.5 flex items-center justify-center ${
                                      isSelected
                                        ? "bg-[var(--nx-accent)] border-[var(--nx-accent)] text-white"
                                        : "bg-[var(--nx-bg-sub)]"
                                    }`}
                                    aria-hidden="true"
                                  >
                                    {isSelected && (
                                      <svg
                                        width="12"
                                        height="12"
                                        viewBox="0 0 12 12"
                                        fill="none"
                                      >
                                        <path
                                          d="M2.5 6l2.5 2.5 4.5-4.5"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          strokeLinecap="square"
                                        />
                                      </svg>
                                    )}
                                  </span>

                                  {/* Course info */}
                                  <span className="flex-1 flex flex-wrap items-center gap-2">
                                    <CourseCodeChip code={course.courseCode} />
                                    <span className="text-base font-semibold">
                                      {course.courseName}
                                    </span>
                                  </span>
                                </button>

                                {/* Section dropdown (cascading) */}
                                {isSelected && (
                                  <div className="border-t border-[var(--nx-accent)] p-4 bg-[var(--nx-accent-soft)]">
                                    <label
                                      htmlFor={`section-select-${course.courseID}`}
                                      className={LABEL_CLASSES}
                                    >
                                      Section ·{" "}
                                      <span className="font-mono normal-case tracking-normal font-normal">
                                        {course.courseCode}
                                      </span>
                                    </label>
                                    {isLoadingSections ? (
                                      <p className="text-xs uppercase  text-neutral-500 py-2">
                                        Loading sections…
                                      </p>
                                    ) : sections.length > 0 ? (
                                      <select
                                        id={`section-select-${course.courseID}`}
                                        value={selection?.sectionId || ""}
                                        onChange={(e) =>
                                          handleSectionSelect(
                                            course.courseID,
                                            e.target.value
                                          )
                                        }
                                                                                className={SELECT_CLASSES}
                                      >
                                        <option value="">Select section</option>
                                        {sections.map((sec) => (
                                          <option
                                            key={sec.sectionID}
                                            value={sec.sectionID}
                                          >
                                            {sec.sectionNumber} —{" "}
                                            {sec.instructorName} ({sec.term})
                                          </option>
                                        ))}
                                      </select>
                                    ) : (
                                      <p
                                        className="text-xs text-[var(--nx-danger)] mt-1 uppercase  font-bold"
                                        role="alert"
                                      >
                                        <span className="font-semibold">
                                          Notice:
                                        </span>{" "}
                                        No sections available for this course.
                                      </p>
                                    )}
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                </fieldset>

                <div className="flex justify-between items-center pt-4 border-t border-[var(--nx-border)]">
                  <button
                    type="button"
                                        className={GHOST_BTN}
                    onClick={() => setCurrentStep(1)}
                    id="onboarding-prev-step-2"
                  >
                    ← Previous
                  </button>
                  <button
                    type="submit"
                                        className={PRIMARY_BTN}
                    disabled={!isStep2Valid}
                    id="onboarding-next-step-2"
                  >
                    Review & Confirm →
                  </button>
                </div>
              </form>
            )}

            {/* ── Step 3: Confirm ─────────────────────────────── */}
            {currentStep === 3 && (
              <form
                key="step-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!isSubmitting) handleSubmit();
                }}
              >
                <StepHeader
                  step={3}
                  title="Review & Confirm"
                  description="Please verify all information below before submitting your registration."
                />

                {/* Personal */}
                <section className="mb-6">
                  <h3 className="font-bold uppercase  text-xs text-neutral-600 border-b border-[var(--nx-border)] pb-2 mb-3">
                    Personal Information
                  </h3>
                  <dl className="border-collapse border border-[var(--nx-border)] divide-y divide-[var(--nx-fg)]">
                    <div className="flex">
                      <dt className="font-bold uppercase  text-xs text-neutral-600 w-44 px-4 py-3 border-r border-[var(--nx-border)] bg-[var(--nx-bg-sub)]">
                        Full Name
                      </dt>
                      <dd className="text-sm px-4 py-3 flex-1">
                        {fullName}
                      </dd>
                    </div>
                    <div className="flex">
                      <dt className="font-bold uppercase  text-xs text-neutral-600 w-44 px-4 py-3 border-r border-[var(--nx-border)] bg-[var(--nx-bg-sub)]">
                        Student ID
                      </dt>
                      <dd className="font-mono text-sm px-4 py-3 flex-1">
                        {studentId}
                      </dd>
                    </div>
                  </dl>
                </section>

                {/* Academic */}
                <section className="mb-6">
                  <h3 className="font-bold uppercase  text-xs text-neutral-600 border-b border-[var(--nx-border)] pb-2 mb-3">
                    Academic Information
                  </h3>
                  <dl className="border-collapse border border-[var(--nx-border)] divide-y divide-[var(--nx-fg)]">
                    <div className="flex">
                      <dt className="font-bold uppercase  text-xs text-neutral-600 w-44 px-4 py-3 border-r border-[var(--nx-border)] bg-[var(--nx-bg-sub)]">
                        College
                      </dt>
                      <dd className="text-sm px-4 py-3 flex-1">
                        {getCollegeName(selectedCollege)}
                      </dd>
                    </div>
                    <div className="flex">
                      <dt className="font-bold uppercase  text-xs text-neutral-600 w-44 px-4 py-3 border-r border-[var(--nx-border)] bg-[var(--nx-bg-sub)]">
                        Department
                      </dt>
                      <dd className="text-sm px-4 py-3 flex-1">
                        {getDepartmentName(selectedDepartment)}
                      </dd>
                    </div>
                  </dl>
                </section>

                {/* Courses */}
                <section className="mb-8">
                  <h3 className="font-bold uppercase  text-xs text-neutral-600 border-b border-[var(--nx-border)] pb-2 mb-3 flex items-baseline justify-between">
                    <span>Selected Courses</span>
                    <span className="font-mono text-xs">
                      {String(courseSelections.length).padStart(2, "0")} TOTAL
                    </span>
                  </h3>
                  <table
                                        className="w-full border-collapse border border-[var(--nx-border)] font-mono text-sm"
                  >
                    <thead>
                      <tr className="bg-[var(--nx-fg)] text-white">
                        <th
                          scope="col"
                          className="border-2 border-[var(--nx-border)] px-3 py-2 text-left text-xs uppercase  font-bold"
                        >
                          Code
                        </th>
                        <th
                          scope="col"
                          className="border-2 border-[var(--nx-border)] px-3 py-2 text-left text-xs uppercase  font-bold"
                        >
                          Course
                        </th>
                        <th
                          scope="col"
                          className="border-2 border-[var(--nx-border)] px-3 py-2 text-left text-xs uppercase  font-bold"
                        >
                          Section
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {courseSelections.map((cs) => {
                        const course = getCourse(cs.courseId);
                        const section = getSection(cs.courseId, cs.sectionId);
                        return (
                          <tr
                            key={cs.courseId}
                            className="hover:bg-neutral-100 transition-colors duration-150"
                          >
                            <td className="border-2 border-[var(--nx-border)] px-3 py-2 align-top">
                              {course ? (
                                <CourseCodeChip code={course.courseCode} />
                              ) : (
                                <span className="font-mono">{cs.courseId}</span>
                              )}
                            </td>
                            <td className="border-2 border-[var(--nx-border)] px-3 py-2">
                              {course?.courseName ?? cs.courseId}
                            </td>
                            <td className="border-2 border-[var(--nx-border)] px-3 py-2 font-mono">
                              {section
                                ? `${section.sectionNumber} · ${section.instructorName}`
                                : cs.sectionId}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </section>

                <div className="flex justify-between items-center pt-4 border-t border-[var(--nx-border)]">
                  <button
                    type="button"
                                        className={GHOST_BTN}
                    onClick={() => setCurrentStep(2)}
                    disabled={isSubmitting}
                    id="onboarding-prev-step-3"
                  >
                    ← Edit Information
                  </button>
                  <button
                    type="submit"
                                        className={PRIMARY_BTN}
                    disabled={isSubmitting}
                    id="onboarding-submit"
                  >
                    {isSubmitting ? "Submitting…" : "Complete Registration"}
                  </button>
                </div>
              </form>
            )}

            {/* Footer */}
            <p className="text-xs uppercase  text-neutral-500 mt-8 pt-4 border-t border-[var(--nx-border)] text-center">
              Already have an account?{" "}
              <a
                href="/login"
                className="text-[var(--nx-accent)] font-bold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nx-accent)] focus-visible:ring-offset-2"
              >
                Sign in
              </a>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
