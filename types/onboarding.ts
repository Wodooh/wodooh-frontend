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
