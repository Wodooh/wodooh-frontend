import type {
  College,
  Department,
  Course,
  Section,
  InstructorOnboardingFormData,
  InstructorOnboardingResponse,
  InstructorOnboardingAnalyticsEvent,
} from "@/types/onboarding";

// ─── Constants ────────────────────────────────────────────────
const SIMULATED_DELAY_MS = 500;

// ─── Mock Academic Data (shared hierarchy) ────────────────────
const MOCK_COLLEGES: College[] = [
  { collegeID: "col-1", collegeName: "College of Computer Science & Engineering" },
  { collegeID: "col-2", collegeName: "College of Engineering" },
  { collegeID: "col-3", collegeName: "College of Business Administration" },
  { collegeID: "col-4", collegeName: "College of Science" },
];

const MOCK_DEPARTMENTS: Department[] = [
  // Computer Science & Engineering
  { departmentID: "dept-1", deptName: "Software Engineering",  collegeId: "col-1" },
  { departmentID: "dept-2", deptName: "Computer Science",       collegeId: "col-1" },
  { departmentID: "dept-3", deptName: "Information Systems",    collegeId: "col-1" },
  // Engineering
  { departmentID: "dept-4", deptName: "Electrical Engineering", collegeId: "col-2" },
  { departmentID: "dept-5", deptName: "Mechanical Engineering", collegeId: "col-2" },
  // Business → intentionally empty to test missing-dept edge case
  // Science
  { departmentID: "dept-6", deptName: "Mathematics",            collegeId: "col-4" },
  { departmentID: "dept-7", deptName: "Physics",                collegeId: "col-4" },
];

const MOCK_COURSES: Course[] = [
  // Software Engineering
  { courseID: "crs-1",  courseCode: "SWE206", courseName: "Introduction to Software Engineering",   departmentId: "dept-1" },
  { courseID: "crs-2",  courseCode: "SWE316", courseName: "Software Design & Architecture",          departmentId: "dept-1" },
  { courseID: "crs-3",  courseCode: "SWE497", courseName: "Graduation Project I",                    departmentId: "dept-1" },
  // Computer Science
  { courseID: "crs-4",  courseCode: "CSC215", courseName: "Data Structures & Algorithms",            departmentId: "dept-2" },
  { courseID: "crs-5",  courseCode: "CSC340", courseName: "Operating Systems",                       departmentId: "dept-2" },
  // Information Systems
  { courseID: "crs-6",  courseCode: "ISE251", courseName: "Database Management Systems",             departmentId: "dept-3" },
  // Electrical Engineering
  { courseID: "crs-7",  courseCode: "EE201",  courseName: "Circuit Analysis",                        departmentId: "dept-4" },
  // Mechanical Engineering
  { courseID: "crs-8",  courseCode: "ME101",  courseName: "Statics",                                 departmentId: "dept-5" },
  // Mathematics
  { courseID: "crs-9",  courseCode: "MATH201",courseName: "Calculus I",                              departmentId: "dept-6" },
  // Physics
  { courseID: "crs-10", courseCode: "PHYS101",courseName: "General Physics",                         departmentId: "dept-7" },
];

const MOCK_SECTIONS: Section[] = [
  { sectionID: "sec-1",  sectionNumber: "Section A", courseId: "crs-1",  instructorName: "Dr. Sarah Hassan",   term: "Spring 2026" },
  { sectionID: "sec-2",  sectionNumber: "Section B", courseId: "crs-1",  instructorName: "Dr. Omar Ali",       term: "Spring 2026" },
  { sectionID: "sec-3",  sectionNumber: "Section A", courseId: "crs-2",  instructorName: "Dr. Khalid Nasser",  term: "Spring 2026" },
  { sectionID: "sec-4",  sectionNumber: "Section A", courseId: "crs-3",  instructorName: "Prof. Ahmad Saleh",  term: "Spring 2026" },
  { sectionID: "sec-5",  sectionNumber: "Section A", courseId: "crs-4",  instructorName: "Dr. Fatima Khan",   term: "Spring 2026" },
  { sectionID: "sec-6",  sectionNumber: "Section B", courseId: "crs-4",  instructorName: "Dr. Yusuf Ahmed",   term: "Spring 2026" },
  { sectionID: "sec-7",  sectionNumber: "Section A", courseId: "crs-5",  instructorName: "Dr. Mona Rashid",   term: "Spring 2026" },
  { sectionID: "sec-8",  sectionNumber: "Section A", courseId: "crs-6",  instructorName: "Dr. Layla Ibrahim",  term: "Spring 2026" },
  { sectionID: "sec-9",  sectionNumber: "Section A", courseId: "crs-7",  instructorName: "Dr. Tariq Mansour", term: "Spring 2026" },
  { sectionID: "sec-10", sectionNumber: "Section A", courseId: "crs-8",  instructorName: "Dr. Huda Faisal",   term: "Spring 2026" },
  { sectionID: "sec-11", sectionNumber: "Section A", courseId: "crs-9",  instructorName: "Dr. Nadia Al-Harbi",term: "Spring 2026" },
  { sectionID: "sec-12", sectionNumber: "Section B", courseId: "crs-9",  instructorName: "Dr. Sami Darwish",  term: "Spring 2026" },
  { sectionID: "sec-13", sectionNumber: "Section A", courseId: "crs-10", instructorName: "Dr. Rami Qasim",    term: "Spring 2026" },
];

// ─── Pre-assigned courses (edge case: already taken) ──────────
// These courses are already assigned to an instructor in the system.
const ALREADY_ASSIGNED_COURSES = new Set(["crs-2", "crs-5"]);

// ─── Known Faculty ID prefixes ────────────────────────────────
// IDs starting with "f" or "dr" are considered well-formed.
// Any other format is allowed but flagged for admin verification.
const KNOWN_FACULTY_ID_REGEX = /^(f|dr)[a-zA-Z0-9]{2,18}$/i;

// ─── Helper: simulate network delay ─────────────────────────
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Validation helpers ───────────────────────────────────────
const VALID_NAME_REGEX = /^[\u0600-\u06FFa-zA-Z\s'\\-]+$/;

export function isValidInstructorName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= 100 && VALID_NAME_REGEX.test(trimmed);
}

/** Faculty ID: 3-20 alphanumeric chars. Always allowed; unknown formats are flagged for admin. */
export function isValidFacultyId(id: string): boolean {
  return /^[a-zA-Z0-9]{3,20}$/.test(id.trim());
}

/** Returns true if the faculty ID matches the university's known prefixes. */
export function isKnownFacultyIdFormat(id: string): boolean {
  return KNOWN_FACULTY_ID_REGEX.test(id.trim());
}

// ─── Analytics Stub ──────────────────────────────────────────
export function trackInstructorOnboardingEvent(
  event: InstructorOnboardingAnalyticsEvent,
  data?: Record<string, unknown>
): void {
  console.log(`[Analytics] ${event}`, data ?? "");
}

// ─── Instructor Onboarding Service ──────────────────────────
export const InstructorOnboardingService = {
  /** Returns all colleges. */
  async getColleges(): Promise<College[]> {
    await delay(SIMULATED_DELAY_MS);
    return [...MOCK_COLLEGES];
  },

  /** Returns departments for a given college. */
  async getDepartments(collegeId: string): Promise<Department[]> {
    await delay(SIMULATED_DELAY_MS);
    return MOCK_DEPARTMENTS.filter((d) => d.collegeId === collegeId);
  },

  /** Returns courses for a given department. */
  async getCourses(departmentId: string): Promise<Course[]> {
    await delay(SIMULATED_DELAY_MS);
    return MOCK_COURSES.filter((c) => c.departmentId === departmentId);
  },

  /** Returns sections for a given course. */
  async getSections(courseId: string): Promise<Section[]> {
    await delay(SIMULATED_DELAY_MS);
    return MOCK_SECTIONS.filter((s) => s.courseId === courseId);
  },

  /**
   * Checks which of the provided course IDs are already assigned.
   * Returns the subset that are flagged.
   */
  async checkAlreadyAssignedCourses(courseIds: string[]): Promise<string[]> {
    await delay(300);
    return courseIds.filter((id) => ALREADY_ASSIGNED_COURSES.has(id));
  },

  /**
   * Submits the instructor onboarding form.
   * Always returns "Pending Admin Approval".
   * Flags unrecognised faculty IDs and already-assigned courses in the response.
   */
  async submitInstructorOnboarding(
    formData: InstructorOnboardingFormData
  ): Promise<InstructorOnboardingResponse> {
    await delay(SIMULATED_DELAY_MS);

    // Validate name
    if (!isValidInstructorName(formData.fullName)) {
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Name must contain only Arabic/English letters, spaces, hyphens, or apostrophes.",
          field: "fullName",
        },
      };
    }

    // Validate faculty ID format
    if (!isValidFacultyId(formData.facultyId)) {
      return {
        success: false,
        error: {
          code: "INVALID_FACULTY_ID",
          message: "Faculty ID must be 3–20 alphanumeric characters.",
          field: "facultyId",
        },
      };
    }

    // Validate college selection
    if (!formData.collegeId) {
      return {
        success: false,
        error: {
          code: "MISSING_DEPARTMENT",
          message: "Please select a college.",
          field: "collegeId",
        },
      };
    }

    // Validate department selection
    if (!formData.departmentId) {
      return {
        success: false,
        error: {
          code: "MISSING_DEPARTMENT",
          message: "No department selected. If your department is not listed, please contact the system administrator.",
          field: "departmentId",
        },
      };
    }

    // Validate at least one course
    if (!formData.courseSelections.length) {
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Please select at least one course and section.",
          field: "courseSelections",
        },
      };
    }

    // Validate sections exist
    for (const cs of formData.courseSelections) {
      const section = MOCK_SECTIONS.find(
        (s) => s.sectionID === cs.sectionId && s.courseId === cs.courseId
      );
      if (!section) {
        return {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: `Invalid section selected for course ${cs.courseId}.`,
            field: "courseSelections",
          },
        };
      }
    }

    // Edge case: which courses are already assigned (flag for admin, don't block)
    const courseIds = formData.courseSelections.map((cs) => cs.courseId);
    const flaggedCourses = courseIds.filter((id) => ALREADY_ASSIGNED_COURSES.has(id));

    // Edge case: unknown faculty ID format (flag for admin, don't block)
    const flaggedFacultyId = !isKnownFacultyIdFormat(formData.facultyId);

    trackInstructorOnboardingEvent("instructor_onboarding_submitted", {
      facultyId: formData.facultyId,
      courseCount: formData.courseSelections.length,
      flaggedCourses,
      flaggedFacultyId,
    });

    return {
      success: true,
      data: {
        facultyId: formData.facultyId,
        fullName: formData.fullName.trim(),
        status: "Pending Admin Approval",
        flaggedFacultyId: flaggedFacultyId || undefined,
        flaggedCourses: flaggedCourses.length ? flaggedCourses : undefined,
      },
    };
  },
};
