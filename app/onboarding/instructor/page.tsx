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
import "../../nexus.css";

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

// ─── Style constants ──────────────────────────────────────────
const ZERO = {} as const;

const PRIMARY_BTN = "nx-btn nx-btn-primary";

const GHOST_BTN = "nx-btn nx-btn-ghost";

const INPUT_CLS =
  "w-full px-3 py-2 text-sm bg-[var(--nx-bg-elev)] text-[var(--nx-fg)] border border-[var(--nx-border-strong)] rounded-md focus-visible:outline-none focus-visible:border-[var(--nx-accent)] disabled:opacity-50 disabled:cursor-not-allowed";

const SELECT_CLS = "nx-select w-full disabled:opacity-50 disabled:cursor-not-allowed";

const LABEL_CLS = "nx-field-label";

// ─── CourseCodeChip ───────────────────────────────────────────
function CourseCodeChip({ code }: { code: string }) {
  return <span className="nx-version-pill">{code}</span>;
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

  // ── Theme bootstrapping ────────────────────────────────────
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
  const getCourse = (id: string) => courses.find((c) => c.courseID === id);
  const getSection = (courseId: string, sectionId: string) =>
    sectionsMap[courseId]?.find((s) => s.sectionID === sectionId);

  // ── Step category label helper ─────────────────────────────
  const stepCategory = (n: number) => {
    const total = String(STEPS.length).padStart(2, "0");
    const num = String(n).padStart(2, "0");
    const label = n === 1 ? "IDENTITY" : n === 2 ? "AFFILIATION" : "REVIEW";
    return `STEP ${num} / ${total} · ${label}`;
  };

  // ── Success screen ─────────────────────────────────────────
  if (submitSuccess) {
    return (
      <main style={{minHeight:"100vh",background:"var(--nx-bg)",color:"var(--nx-fg)",fontFamily:"Inter,system-ui,sans-serif",padding:"0 16px"}}>
        <p className="text-xs text-neutral-400 max-w-2xl mx-auto pt-8 uppercase tracking-widest">
          WODOOH · Faculty Registry · Spring 2026
        </p>
        <section
          style={ZERO}
          className="border-4 border-[#121212] bg-[#F0F0F0] shadow-[8px_8px_0px_0px_#121212] p-8 max-w-2xl mx-auto my-8"
        >
          {/* Card header */}
          <header className="border-b-4 border-[#121212] pb-6 mb-6">
            <p className="text-xs uppercase tracking-widest text-neutral-500">
              WODOOH · Faculty Registry
            </p>
            <h1 className="text-4xl font-black tracking-tight mt-1 text-[#121212] uppercase">
              Application Submitted
            </h1>
            <p className="text-xs uppercase tracking-widest text-neutral-500 mt-2">
              Vol. 2026 · Faculty Registry
            </p>
          </header>

          {/* Thank-you banner */}
          <div
            style={ZERO}
            className="border-4 border-[#F0C020] bg-[#FFFAE0] text-[#121212] p-6 mb-6 shadow-[4px_4px_0px_0px_#121212]"
            role="status"
          >
            <div className="flex items-start gap-4">
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                aria-hidden="true"
                className="shrink-0"
              >
                <path
                  d="M6 16l6 6 14-14"
                  stroke="#F0C020"
                  strokeWidth="3"
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                />
              </svg>
              <div className="flex-1">
                <p className="font-black uppercase tracking-widest text-xs mb-2">
                  Faculty Profile Recorded
                </p>
                <p className="text-base leading-relaxed">
                  Thank you,{" "}
                  <strong className="font-black">{submitSuccess.fullName}</strong>.
                  Your faculty profile has been submitted for administrative review.
                </p>
              </div>
            </div>
          </div>

          {/* Faculty ID & Status table */}
          <dl className="border-4 border-[#121212] divide-y-4 divide-[#121212] mb-6">
            <div className="flex">
              <dt className="font-black uppercase tracking-widest text-xs text-neutral-600 w-44 px-4 py-3 border-r-4 border-[#121212] bg-[#E8E8E8] shrink-0">
                Faculty ID
              </dt>
              <dd className="text-sm px-4 py-3 flex-1 font-mono">
                {submitSuccess.facultyId}
              </dd>
            </div>
            <div className="flex">
              <dt className="font-black uppercase tracking-widest text-xs text-neutral-600 w-44 px-4 py-3 border-r-4 border-[#121212] bg-[#E8E8E8] shrink-0">
                Status
              </dt>
              <dd className="px-4 py-3 flex-1">
                <span
                  style={ZERO}
                  role="status"
                  className="instructor-pending-badge border-4 border-[#F0C020] bg-[#FFFAE0] text-[#121212] text-xs px-2 py-0.5 uppercase tracking-wide font-black"
                >
                  Pending Review
                </span>
              </dd>
            </div>
          </dl>

          {/* Admin notification info box */}
          <div
            style={ZERO}
            className="instructor-admin-notified border-4 border-[#1040C0] bg-[#EFF6FF] text-[#1040C0] p-4 flex gap-3 items-start mb-4"
            role="status"
          >
            <span aria-hidden="true" className="text-xs shrink-0 font-black">[i]</span>
            <span className="text-xs leading-relaxed">
              The system administrator has been notified and will review your application.
              You will receive confirmation at your university email.
            </span>
          </div>

          {/* Flagged Faculty ID warning */}
          {submitSuccess.flaggedFacultyId && (
            <div
              style={ZERO}
              id="flag-faculty-id"
              role="status"
              className="instructor-flag-badge border-4 border-[#F0C020] bg-[#FFFAE0] text-[#121212] p-4 flex gap-3 items-start mb-4"
            >
              <span aria-hidden="true" className="text-xs shrink-0 font-black">[!]</span>
              <span className="text-sm leading-relaxed">
                Faculty ID{" "}
                <strong className="font-mono font-black">{submitSuccess.facultyId}</strong>{" "}
                will be verified by admin — your application is still accepted.
              </span>
            </div>
          )}

          {/* Flagged courses */}
          {submitSuccess.flaggedCourses && submitSuccess.flaggedCourses.length > 0 && (
            <div
              style={ZERO}
              id="flag-courses"
              role="status"
              className="instructor-flag-badge border-4 border-[#F0C020] bg-[#FFFAE0] text-[#121212] p-4 flex gap-3 items-start mb-4"
            >
              <span aria-hidden="true" className="text-xs shrink-0 font-black">[!]</span>
              <span className="text-sm leading-relaxed">
                {submitSuccess.flaggedCourses.length === 1
                  ? "1 course is"
                  : `${submitSuccess.flaggedCourses.length} courses are`}{" "}
                already assigned to another instructor and{" "}
                <strong className="font-black">flagged for admin review</strong>.
              </span>
            </div>
          )}

          <p className="text-sm text-[#121212] leading-relaxed mb-6">
            During review you will have{" "}
            <strong className="font-black">limited access</strong>. Full
            access to lecture management tools will be unlocked once your profile is
            approved.
          </p>

          <div className="flex justify-end pt-4 border-t-4 border-[#121212]">
            <button
              type="button"
              style={ZERO}
              className={PRIMARY_BTN}
              onClick={() => router.push("/login")}
              id="instructor-onboarding-go-to-login"
            >
              Go to Login
            </button>
          </div>
        </section>
      </main>
    );
  }

  // ── Main render ────────────────────────────────────────────
  return (
    <main style={{minHeight:"100vh",background:"var(--nx-bg)",color:"var(--nx-fg)",fontFamily:"Inter,system-ui,sans-serif",padding:"0 16px"}}>
      {/* Editorial top strip */}
      <p className="text-xs text-neutral-400 max-w-2xl mx-auto pt-8 uppercase tracking-widest">
        WODOOH · Faculty Registry · Spring 2026
      </p>

      <section
        style={ZERO}
        className="border-4 border-[#121212] bg-[#F0F0F0] shadow-[8px_8px_0px_0px_#121212] p-8 max-w-2xl mx-auto my-8"
      >
        {/* ── Card Header ──────────────────────────────────── */}
        <header className="border-b-4 border-[#121212] pb-6 mb-6">
          <p className="text-xs uppercase tracking-widest text-neutral-500">
            WODOOH · Faculty Registry
          </p>
          <h1 className="text-4xl font-black tracking-tight mt-1 text-[#121212] uppercase">
            Faculty Onboarding
          </h1>
          <p className="text-xs uppercase tracking-widest text-neutral-500 mt-2">
            Vol. 2026 · Faculty Registry
          </p>
        </header>

        {/* ── Stepper ─────────────────────────────────────── */}
        <nav
          aria-label="Onboarding progress"
          className="mb-8"
          role="progressbar"
          aria-valuenow={currentStep}
          aria-valuemin={1}
          aria-valuemax={3}
        >
          <ol className="flex items-start justify-between relative" role="list">
            {STEPS.map((step, idx) => {
              const isActive = step.id === currentStep;
              const isDone = step.id < currentStep;
              const boxClass = isActive
                ? "bg-[#F0C020] border-[#F0C020] text-[#121212] shadow-[4px_4px_0px_0px_#121212]"
                : isDone
                  ? "bg-[#121212] text-[#F0F0F0] border-[#121212]"
                  : "bg-[#F0F0F0] text-neutral-400 border-[#121212]";
              return (
                <li
                  key={step.id}
                  className="flex-1 flex flex-col items-center relative"
                  aria-current={isActive ? "step" : undefined}
                >
                  {idx > 0 && (
                    <span
                      aria-hidden="true"
                      className="absolute top-5 right-1/2 w-full border-t-4 border-[#121212]"
                    />
                  )}
                  <span
                    style={ZERO}
                    className={`relative z-10 w-10 h-10 border-4 flex items-center justify-center font-mono text-sm font-black ${boxClass}`}
                  >
                    {isDone ? (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M3 7l3 3 5-5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="square"
                        />
                      </svg>
                    ) : (
                      String(step.id).padStart(2, "0")
                    )}
                  </span>
                  <span
                    className={`text-xs uppercase tracking-widest mt-2 text-center font-black ${
                      isActive
                        ? "text-[#F0C020]"
                        : isDone
                          ? "text-[#121212]"
                          : "text-neutral-400"
                    }`}
                  >
                    {step.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* ── Global error ──────────────────────────────────── */}
        {submitError && (
          <div
            style={ZERO}
            className="border-4 border-[#D02020] bg-[#FEE2E2] text-[#D02020] p-4 mb-6 flex items-start gap-3"
            role="alert"
            id="instructor-onboarding-error"
          >
            <span
              className="text-xs uppercase tracking-widest font-black shrink-0"
              aria-hidden="true"
            >
              Error
            </span>
            <p className="text-sm leading-relaxed flex-1">{submitError}</p>
          </div>
        )}

        {/* ── Step 1: Personal Info ─────────────────────────── */}
        {currentStep === 1 && (
          <form
            key="step-1"
            onSubmit={(e) => {
              e.preventDefault();
              if (isStep1Valid) setCurrentStep(2);
            }}
            noValidate
          >
            <div className="mb-6">
              <p className="text-xs uppercase tracking-widest text-neutral-500 mb-2">
                {stepCategory(1)}
              </p>
              <h2 className="text-2xl font-black text-[#121212] uppercase">
                Personal Information
              </h2>
              <p className="text-sm text-neutral-700 leading-relaxed mt-2">
                Enter your name and Faculty ID as they appear in university records.
              </p>
            </div>

            <fieldset className="space-y-6 mb-8 border-0 p-0 m-0">
              <legend className="sr-only">Personal information</legend>

              {/* Full Name */}
              <div>
                <label htmlFor="instructor-name" className={LABEL_CLS}>
                  Full Name{" "}
                  <span className="normal-case tracking-normal text-neutral-400 font-normal">
                    (Arabic or English)
                  </span>
                </label>
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
                  className={`${INPUT_CLS}${nameError ? " border-[#D02020]" : ""}`}
                  style={ZERO}
                />
                {nameError && (
                  <p
                    id="instructor-name-error"
                    className="text-xs text-[#D02020] mt-2 uppercase tracking-wide font-black"
                    role="alert"
                  >
                    <span className="font-black">Error:</span> {nameError}
                  </p>
                )}
              </div>

              {/* Faculty ID */}
              <div>
                <label htmlFor="instructor-faculty-id" className={LABEL_CLS}>
                  Faculty ID
                </label>
                <input
                  id="instructor-faculty-id"
                  type="text"
                  placeholder="e.g. f12345 or dr9876"
                  value={facultyId}
                  onChange={(e) => setFacultyId(e.target.value)}
                  onBlur={() => setFacultyIdTouched(true)}
                  aria-describedby={
                    facultyIdError
                      ? "instructor-faculty-id-error"
                      : facultyIdWarning
                        ? "instructor-faculty-id-warning"
                        : undefined
                  }
                  aria-invalid={!!facultyIdError}
                  className={`${INPUT_CLS}${facultyIdError ? " border-[#D02020]" : ""}`}
                  style={ZERO}
                />
                {facultyIdError && (
                  <p
                    id="instructor-faculty-id-error"
                    className="text-xs text-[#D02020] mt-2 uppercase tracking-wide font-black"
                    role="alert"
                  >
                    <span className="font-black">Error:</span> {facultyIdError}
                  </p>
                )}
                {!facultyIdError && facultyIdWarning && (
                  <div
                    id="instructor-faculty-id-warning"
                    style={ZERO}
                    className="instructor-id-warning border-4 border-[#F0C020] bg-[#FFFAE0] text-[#121212] p-4 flex gap-3 items-start mt-3"
                    role="status"
                  >
                    <span aria-hidden="true" className="text-xs shrink-0 font-black">[!]</span>
                    <span className="text-sm leading-relaxed">{facultyIdWarning}</span>
                  </div>
                )}
              </div>
            </fieldset>

            <div className="flex items-center justify-between pt-4 border-t-4 border-[#121212]">
              <button
                type="button"
                style={ZERO}
                className={GHOST_BTN}
                onClick={() => router.push("/login")}
                id="instructor-onboarding-back"
              >
                ← Back to Login
              </button>
              <button
                type="submit"
                style={ZERO}
                className={PRIMARY_BTN}
                disabled={!isStep1Valid}
                id="instructor-onboarding-next-1"
              >
                Next Step →
              </button>
            </div>
          </form>
        )}

        {/* ── Step 2: Academic Info ─────────────────────────── */}
        {currentStep === 2 && (
          <form
            key="step-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (isStep2Valid) setCurrentStep(3);
            }}
            noValidate
          >
            <div className="mb-6">
              <p className="text-xs uppercase tracking-widest text-neutral-500 mb-2">
                {stepCategory(2)}
              </p>
              <h2 className="text-2xl font-black text-[#121212] uppercase">
                Academic Information
              </h2>
              <p className="text-sm text-neutral-700 leading-relaxed mt-2">
                Select your college, department, and the courses you will be teaching.
              </p>
            </div>

            <fieldset className="space-y-6 mb-8 border-0 p-0 m-0">
              <legend className="sr-only">Academic affiliation</legend>

              {/* College */}
              <div>
                <label htmlFor="instructor-college" className={LABEL_CLS}>
                  College
                </label>
                <select
                  id="instructor-college"
                  value={selectedCollege}
                  onChange={(e) => handleCollegeChange(e.target.value)}
                  disabled={loadingColleges}
                  className={SELECT_CLS}
                  style={ZERO}
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
              </div>

              {/* Department */}
              <div>
                <label htmlFor="instructor-department" className={LABEL_CLS}>
                  Department
                </label>
                <select
                  id="instructor-department"
                  value={selectedDepartment}
                  onChange={(e) => handleDepartmentChange(e.target.value)}
                  disabled={!selectedCollege || loadingDepartments || noDepartments}
                  className={SELECT_CLS}
                  style={ZERO}
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

                {noDepartments && (
                  <div
                    id="no-departments-message"
                    style={ZERO}
                    className="border-4 border-[#D02020] bg-[#FEE2E2] text-[#D02020] p-4 mt-3 flex items-start gap-3"
                    role="alert"
                  >
                    <span className="text-xs uppercase tracking-widest font-black shrink-0">
                      Notice
                    </span>
                    <p className="text-sm leading-relaxed flex-1">
                      No departments found for this college. Please contact the system
                      administrator at{" "}
                      <span className="font-mono normal-case">
                        admin@university.edu.sa
                      </span>{" "}
                      for assistance.
                    </p>
                  </div>
                )}
              </div>

              {/* Courses */}
              {selectedDepartment && loadingCourses && (
                <p className="text-xs uppercase tracking-widest text-neutral-500 py-4">
                  Loading courses…
                </p>
              )}

              {selectedDepartment && !loadingCourses && courses.length > 0 && (
                <div>
                  <p className={`${LABEL_CLS} mb-3`} id="instructor-courses-section-label">
                    Courses &amp; Sections
                  </p>
                  <ul
                    role="list"
                    aria-labelledby="instructor-courses-section-label"
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
                      const isLoadingSections = loadingSections === course.courseID;
                      const sectionInputId = `instructor-section-select-${course.courseID}`;

                      return (
                        <li
                          key={course.courseID}
                          style={ZERO}
                          className={
                            isSelected
                              ? "border-4 border-[#F0C020] shadow-[4px_4px_0px_0px_#F0C020] bg-[#FFFAE0] transition-colors duration-200"
                              : "border-4 border-[#121212] bg-[#F0F0F0] transition-colors duration-200"
                          }
                        >
                          <button
                            type="button"
                            onClick={() => handleCourseToggle(course.courseID)}
                            id={`instructor-course-toggle-${course.courseID}`}
                            aria-pressed={isSelected}
                            style={ZERO}
                            className="w-full text-left p-3 flex items-start gap-3 min-h-[44px] hover:bg-neutral-100 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0C020] focus-visible:ring-offset-2"
                          >
                            <span
                              style={ZERO}
                              aria-hidden="true"
                              className={`w-5 h-5 border-4 border-[#121212] shrink-0 mt-0.5 flex items-center justify-center ${
                                isSelected
                                  ? "bg-[#F0C020] text-[#121212]"
                                  : "bg-[#F0F0F0]"
                              }`}
                            >
                              {isSelected && (
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                  <path
                                    d="M2.5 6l2.5 2.5 4.5-4.5"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="square"
                                  />
                                </svg>
                              )}
                            </span>
                            <span className="flex-1 flex flex-wrap items-center gap-2">
                              <CourseCodeChip code={course.courseCode} />
                              <span className="text-base font-black text-[#121212]">
                                {course.courseName}
                              </span>
                            </span>
                          </button>

                          {/* Section dropdown (cascading) */}
                          {isSelected && (
                            <div className="border-t-4 border-[#121212] p-3 bg-[#F5F5F5]">
                              <label
                                htmlFor={sectionInputId}
                                className={LABEL_CLS}
                              >
                                Section ·{" "}
                                <span className="normal-case tracking-normal font-normal">
                                  {course.courseCode}
                                </span>
                              </label>
                              {isLoadingSections ? (
                                <p className="text-xs uppercase tracking-widest text-neutral-500 py-2">
                                  Loading sections…
                                </p>
                              ) : sections.length > 0 ? (
                                <select
                                  id={sectionInputId}
                                  value={selection?.sectionId || ""}
                                  onChange={(e) =>
                                    handleSectionSelect(course.courseID, e.target.value)
                                  }
                                  className={SELECT_CLS}
                                  style={ZERO}
                                >
                                  <option value="">Select section</option>
                                  {sections.map((sec) => (
                                    <option key={sec.sectionID} value={sec.sectionID}>
                                      {sec.sectionNumber} — {sec.instructorName} (
                                      {sec.term})
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <p
                                  className="text-xs text-[#D02020] mt-1 uppercase tracking-wide font-black"
                                  role="alert"
                                >
                                  <span className="font-black">Notice:</span>{" "}
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

            <div className="flex items-center justify-between pt-4 border-t-4 border-[#121212]">
              <button
                type="button"
                style={ZERO}
                className={GHOST_BTN}
                onClick={() => setCurrentStep(1)}
                id="instructor-onboarding-prev-2"
              >
                ← Previous
              </button>
              <button
                type="submit"
                style={ZERO}
                className={PRIMARY_BTN}
                disabled={!isStep2Valid}
                id="instructor-onboarding-next-2"
              >
                Review &amp; Confirm →
              </button>
            </div>
          </form>
        )}

        {/* ── Step 3: Confirm ───────────────────────────────── */}
        {currentStep === 3 && (
          <form
            key="step-3"
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            noValidate
          >
            <div className="mb-6">
              <p className="text-xs uppercase tracking-widest text-neutral-500 mb-2">
                {stepCategory(3)}
              </p>
              <h2 className="text-2xl font-black text-[#121212] uppercase">
                Review &amp; Confirm
              </h2>
              <p className="text-sm text-neutral-700 leading-relaxed mt-2">
                Please verify all information below before submitting.
              </p>
            </div>

            {/* Unrecognised Faculty ID note */}
            {isValidFacultyId(facultyId) && !isKnownFacultyIdFormat(facultyId) && (
              <div
                id="confirm-faculty-id-note"
                style={ZERO}
                role="status"
                className="instructor-id-warning border-4 border-[#F0C020] bg-[#FFFAE0] text-[#121212] p-4 flex gap-3 items-start mb-6"
              >
                <span aria-hidden="true" className="text-xs shrink-0 font-black">[!]</span>
                <span className="text-sm leading-relaxed">
                  Your Faculty ID{" "}
                  <strong className="font-mono font-black">{facultyId}</strong> format is
                  unrecognised and will be verified by admin after submission. Your
                  application will still be accepted.
                </span>
              </div>
            )}

            <div className="space-y-6">
              {/* Personal Info */}
              <section>
                <h3 className="font-black uppercase tracking-widest text-xs text-neutral-600 border-b-4 border-[#121212] pb-2 mb-3">
                  Personal Information
                </h3>
                <dl className="border-4 border-[#121212] divide-y-4 divide-[#121212]">
                  <div className="flex">
                    <dt className="font-black uppercase tracking-widest text-xs text-neutral-600 w-44 px-4 py-3 border-r-4 border-[#121212] bg-[#E8E8E8] shrink-0">
                      Full Name
                    </dt>
                    <dd className="text-sm px-4 py-3 flex-1">
                      {fullName}
                    </dd>
                  </div>
                  <div className="flex">
                    <dt className="font-black uppercase tracking-widest text-xs text-neutral-600 w-44 px-4 py-3 border-r-4 border-[#121212] bg-[#E8E8E8] shrink-0">
                      Faculty ID
                    </dt>
                    <dd className="font-mono text-sm px-4 py-3 flex-1">
                      {facultyId}
                    </dd>
                  </div>
                </dl>
              </section>

              {/* Academic Info */}
              <section>
                <h3 className="font-black uppercase tracking-widest text-xs text-neutral-600 border-b-4 border-[#121212] pb-2 mb-3">
                  Academic Information
                </h3>
                <dl className="border-4 border-[#121212] divide-y-4 divide-[#121212]">
                  <div className="flex">
                    <dt className="font-black uppercase tracking-widest text-xs text-neutral-600 w-44 px-4 py-3 border-r-4 border-[#121212] bg-[#E8E8E8] shrink-0">
                      College
                    </dt>
                    <dd className="text-sm px-4 py-3 flex-1">
                      {getCollegeName(selectedCollege)}
                    </dd>
                  </div>
                  <div className="flex">
                    <dt className="font-black uppercase tracking-widest text-xs text-neutral-600 w-44 px-4 py-3 border-r-4 border-[#121212] bg-[#E8E8E8] shrink-0">
                      Department
                    </dt>
                    <dd className="text-sm px-4 py-3 flex-1">
                      {getDepartmentName(selectedDepartment)}
                    </dd>
                  </div>
                </dl>
              </section>

              {/* Course Selections */}
              <section>
                <h3 className="font-black uppercase tracking-widest text-xs text-neutral-600 border-b-4 border-[#121212] pb-2 mb-3 flex items-baseline justify-between">
                  <span>Selected Courses</span>
                  <span className="font-mono text-xs">
                    {String(courseSelections.length).padStart(2, "0")} TOTAL
                  </span>
                </h3>
                <table
                  style={ZERO}
                  className="w-full border-collapse border-4 border-[#121212] font-mono text-sm"
                >
                  <thead>
                    <tr className="bg-[#121212] text-[#F0F0F0]">
                      <th
                        scope="col"
                        className="border-4 border-[#333] px-3 py-2 text-left text-xs uppercase tracking-widest font-black"
                      >
                        Code
                      </th>
                      <th
                        scope="col"
                        className="border-4 border-[#333] px-3 py-2 text-left text-xs uppercase tracking-widest font-black"
                      >
                        Course
                      </th>
                      <th
                        scope="col"
                        className="border-4 border-[#333] px-3 py-2 text-left text-xs uppercase tracking-widest font-black"
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
                          <td className="border border-[#E5E5E0] px-3 py-2 align-top">
                            {course ? (
                              <CourseCodeChip code={course.courseCode} />
                            ) : (
                              <span className="font-mono">{cs.courseId}</span>
                            )}
                          </td>
                          <td className="border border-[#E5E5E0] px-3 py-2">
                            {course?.courseName ?? getCourseName(courses, cs.courseId)}
                          </td>
                          <td className="border border-[#E5E5E0] px-3 py-2 font-mono">
                            {section
                              ? `${section.sectionNumber} · ${section.instructorName}`
                              : getSectionLabel(sectionsMap, cs.courseId, cs.sectionId)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            </div>

            <div className="flex items-center justify-between mt-8 pt-4 border-t-4 border-[#121212]">
              <button
                type="button"
                style={ZERO}
                className={GHOST_BTN}
                onClick={() => setCurrentStep(2)}
                disabled={isSubmitting}
                id="instructor-onboarding-prev-3"
              >
                ← Edit Information
              </button>
              <button
                type="submit"
                style={ZERO}
                className={PRIMARY_BTN}
                disabled={isSubmitting}
                id="instructor-onboarding-submit"
              >
                {isSubmitting ? (
                  <span>Submitting…</span>
                ) : (
                  <>
                    <span>Submit for Approval</span>
                    <span aria-hidden="true" className="font-mono">✓</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ── Footer ─────────────────────────────────────────── */}
        <footer className="mt-8 pt-6 border-t-4 border-[#121212] text-center">
          <p className="text-xs uppercase tracking-widest text-neutral-500">
            Already have an account?{" "}
            <a
              href="/login"
              className="text-[#F0C020] font-black hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0C020] focus-visible:ring-offset-2"
            >
              Sign in here
            </a>
          </p>
        </footer>
      </section>
    </main>
  );
}
