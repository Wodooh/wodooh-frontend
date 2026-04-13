// ─── Academic Hierarchy Types ─────────────────────────────────
export interface College {
  collegeID: string;
  collegeName: string;
}

export interface Department {
  departmentID: string;
  deptName: string;
  collegeId: string;
}

export interface Course {
  courseID: string;
  courseCode: string;
  courseName: string;
  departmentId: string;
}

export interface Section {
  sectionID: string;
  sectionNumber: string;
  courseId: string;
  instructorName: string;
  term: string;
}

// ─── Form Data ────────────────────────────────────────────────
export interface CourseSelection {
  courseId: string;
  sectionId: string;
}

export interface OnboardingFormData {
  fullName: string;
  studentId: string;
  collegeId: string;
  departmentId: string;
  courseSelections: CourseSelection[];
}

// ─── Error Codes ──────────────────────────────────────────────
export type OnboardingErrorCode =
  | "DUPLICATE_STUDENT_ID"
  | "INVALID_SECTION"
  | "MISSING_DEPARTMENT"
  | "INVALID_NAME"
  | "VALIDATION_ERROR"
  | "UNKNOWN_ERROR";

// ─── Response (discriminated union) ───────────────────────────
export interface OnboardingError {
  code: OnboardingErrorCode;
  message: string;
  field?: string;
}

export interface OnboardingSuccessData {
  studentId: string;
  fullName: string;
  status: "Pending Verification";
}

export type OnboardingResponse =
  | { success: true; data: OnboardingSuccessData }
  | { success: false; error: OnboardingError };

// ─── Analytics Events ─────────────────────────────────────────
export type OnboardingAnalyticsEvent =
  | "manual_onboarding_started"
  | "manual_onboarding_completed"
  | "manual_onboarding_abandoned";

// ══════════════════════════════════════════════════════════════
// ─── Instructor Onboarding Types ──────────────────────────────
// ══════════════════════════════════════════════════════════════

// ─── Form Data ────────────────────────────────────────────────
export interface InstructorOnboardingFormData {
  fullName: string;
  facultyId: string;
  collegeId: string;
  departmentId: string;
  courseSelections: CourseSelection[];
}

// ─── Error Codes ──────────────────────────────────────────────
export type InstructorOnboardingErrorCode =
  | "INVALID_FACULTY_ID"
  | "COURSE_ALREADY_ASSIGNED"
  | "MISSING_DEPARTMENT"
  | "VALIDATION_ERROR"
  | "UNKNOWN_ERROR";

// ─── Response (discriminated union) ───────────────────────────
export interface InstructorOnboardingError {
  code: InstructorOnboardingErrorCode;
  message: string;
  field?: string;
}

export interface InstructorOnboardingSuccessData {
  facultyId: string;
  fullName: string;
  status: "Pending Admin Approval";
  /** Faculty IDs that don't match known formats — admin will verify */
  flaggedFacultyId?: boolean;
  /** Course IDs already assigned to another instructor — flagged for admin */
  flaggedCourses?: string[];
}

export type InstructorOnboardingResponse =
  | { success: true; data: InstructorOnboardingSuccessData }
  | { success: false; error: InstructorOnboardingError };

// ─── Analytics Events ─────────────────────────────────────────
export type InstructorOnboardingAnalyticsEvent =
  | "instructor_onboarding_started"
  | "instructor_onboarding_submitted"
  | "instructor_onboarding_approved";
