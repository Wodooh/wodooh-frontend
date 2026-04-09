import type {
  College,
  Department,
  Course,
  Section,
  OnboardingFormData,
  OnboardingResponse,
  OnboardingAnalyticsEvent,
} from "@/types/onboarding";

// ─── Constants ────────────────────────────────────────────────
const SIMULATED_DELAY_MS = 500;

// ─── Mock Academic Data ───────────────────────────────────────
const MOCK_COLLEGES: College[] = [
  { collegeID: "col-1", collegeName: "College of Computer Science & Engineering" },
  { collegeID: "col-2", collegeName: "College of Engineering" },
  { collegeID: "col-3", collegeName: "College of Business Administration" },
  { collegeID: "col-4", collegeName: "College of Science" },
];

const MOCK_DEPARTMENTS: Department[] = [
  // Computer Science & Engineering
  { departmentID: "dept-1", deptName: "Software Engineering", collegeId: "col-1" },
  { departmentID: "dept-2", deptName: "Computer Science", collegeId: "col-1" },
  { departmentID: "dept-3", deptName: "Information Systems", collegeId: "col-1" },
  // Engineering
  { departmentID: "dept-4", deptName: "Electrical Engineering", collegeId: "col-2" },
  { departmentID: "dept-5", deptName: "Mechanical Engineering", collegeId: "col-2" },
  // Business (none — will test "missing department" edge case)
  // Science
  { departmentID: "dept-6", deptName: "Mathematics", collegeId: "col-4" },
  { departmentID: "dept-7", deptName: "Physics", collegeId: "col-4" },
];

const MOCK_COURSES: Course[] = [
  // Software Engineering
  { courseID: "crs-1", courseCode: "SWE206", courseName: "Introduction to Software Engineering", departmentId: "dept-1" },
  { courseID: "crs-2", courseCode: "SWE316", courseName: "Software Design & Architecture", departmentId: "dept-1" },
  { courseID: "crs-3", courseCode: "SWE497", courseName: "Graduation Project I", departmentId: "dept-1" },
  // Computer Science
  { courseID: "crs-4", courseCode: "CSC215", courseName: "Data Structures & Algorithms", departmentId: "dept-2" },
  { courseID: "crs-5", courseCode: "CSC340", courseName: "Operating Systems", departmentId: "dept-2" },
  // Information Systems
  { courseID: "crs-6", courseCode: "ISE251", courseName: "Database Management Systems", departmentId: "dept-3" },
  // Electrical Engineering
  { courseID: "crs-7", courseCode: "EE201", courseName: "Circuit Analysis", departmentId: "dept-4" },
  // Mechanical Engineering
  { courseID: "crs-8", courseCode: "ME101", courseName: "Statics", departmentId: "dept-5" },
  // Mathematics
  { courseID: "crs-9", courseCode: "MATH201", courseName: "Calculus I", departmentId: "dept-6" },
  // Physics
  { courseID: "crs-10", courseCode: "PHYS101", courseName: "General Physics", departmentId: "dept-7" },
];

const MOCK_SECTIONS: Section[] = [
  // SWE206
  { sectionID: "sec-1", sectionNumber: "Section A", courseId: "crs-1", instructorName: "Dr. Sarah Hassan", term: "Spring 2026" },
  { sectionID: "sec-2", sectionNumber: "Section B", courseId: "crs-1", instructorName: "Dr. Omar Ali", term: "Spring 2026" },
  // SWE316
  { sectionID: "sec-3", sectionNumber: "Section A", courseId: "crs-2", instructorName: "Dr. Khalid Nasser", term: "Spring 2026" },
  // SWE497
  { sectionID: "sec-4", sectionNumber: "Section A", courseId: "crs-3", instructorName: "Prof. Ahmad Saleh", term: "Spring 2026" },
  // CSC215
  { sectionID: "sec-5", sectionNumber: "Section A", courseId: "crs-4", instructorName: "Dr. Fatima Khan", term: "Spring 2026" },
  { sectionID: "sec-6", sectionNumber: "Section B", courseId: "crs-4", instructorName: "Dr. Yusuf Ahmed", term: "Spring 2026" },
  // CSC340
  { sectionID: "sec-7", sectionNumber: "Section A", courseId: "crs-5", instructorName: "Dr. Mona Rashid", term: "Spring 2026" },
  // ISE251
  { sectionID: "sec-8", sectionNumber: "Section A", courseId: "crs-6", instructorName: "Dr. Layla Ibrahim", term: "Spring 2026" },
  // EE201
  { sectionID: "sec-9", sectionNumber: "Section A", courseId: "crs-7", instructorName: "Dr. Tariq Mansour", term: "Spring 2026" },
  // ME101
  { sectionID: "sec-10", sectionNumber: "Section A", courseId: "crs-8", instructorName: "Dr. Huda Faisal", term: "Spring 2026" },
  // MATH201
  { sectionID: "sec-11", sectionNumber: "Section A", courseId: "crs-9", instructorName: "Dr. Nadia Al-Harbi", term: "Spring 2026" },
  { sectionID: "sec-12", sectionNumber: "Section B", courseId: "crs-9", instructorName: "Dr. Sami Darwish", term: "Spring 2026" },
  // PHYS101
  { sectionID: "sec-13", sectionNumber: "Section A", courseId: "crs-10", instructorName: "Dr. Rami Qasim", term: "Spring 2026" },
];

// Simulate already-registered student IDs (for duplicate check — AC-5)
const EXISTING_STUDENT_IDS = new Set(["s12345", "s99999", "s11111"]);

// ─── Helper: simulate network delay ─────────────────────────
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Name Validation ─────────────────────────────────────────
// Supports Arabic Unicode block + Latin letters + spaces, hyphens, apostrophes
const VALID_NAME_REGEX = /^[\u0600-\u06FFa-zA-Z\s'\-]+$/;

export function isValidName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= 100 && VALID_NAME_REGEX.test(trimmed);
}

// Student ID: alphanumeric, 3-15 chars
const VALID_STUDENT_ID_REGEX = /^[a-zA-Z0-9]{3,15}$/;

export function isValidStudentId(id: string): boolean {
  return VALID_STUDENT_ID_REGEX.test(id.trim());
}

// ─── Analytics Stub ──────────────────────────────────────────
export function trackOnboardingEvent(
  event: OnboardingAnalyticsEvent,
  data?: Record<string, unknown>
): void {
  console.log(`[Analytics] ${event}`, data ?? "");
}

// ─── Onboarding Service ─────────────────────────────────────
export const OnboardingService = {
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

  /** Checks if a student ID is already registered. */
  async checkDuplicateStudentId(studentId: string): Promise<boolean> {
    await delay(300);
    return EXISTING_STUDENT_IDS.has(studentId.toLowerCase().trim());
  },

  /** Submits the onboarding form and creates a "Pending Verification" profile. */
  async submitOnboarding(formData: OnboardingFormData): Promise<OnboardingResponse> {
    await delay(SIMULATED_DELAY_MS);

    // Validate name
    if (!isValidName(formData.fullName)) {
      return {
        success: false,
        error: {
          code: "INVALID_NAME",
          message: "Name must contain only Arabic letters, English letters, spaces, hyphens, or apostrophes.",
          field: "fullName",
        },
      };
    }

    // Validate student ID format
    if (!isValidStudentId(formData.studentId)) {
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Student ID must be 3-15 alphanumeric characters.",
          field: "studentId",
        },
      };
    }

    // Check duplicate student ID (AC-5)
    if (EXISTING_STUDENT_IDS.has(formData.studentId.toLowerCase().trim())) {
      return {
        success: false,
        error: {
          code: "DUPLICATE_STUDENT_ID",
          message: "This Student ID is already registered in the system. If this is your ID, please contact your department administrator.",
          field: "studentId",
        },
      };
    }

    // Validate college selection
    if (!formData.collegeId) {
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Please select a college.",
          field: "collegeId",
        },
      };
    }

    // Validate department exists (edge case: missing department)
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

    // Validate at least one course selection
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

    // Validate each course has a valid section
    for (const cs of formData.courseSelections) {
      const section = MOCK_SECTIONS.find(
        (s) => s.sectionID === cs.sectionId && s.courseId === cs.courseId
      );
      if (!section) {
        return {
          success: false,
          error: {
            code: "INVALID_SECTION",
            message: `Invalid section selected for course ${cs.courseId}. Please select a valid section.`,
            field: "courseSelections",
          },
        };
      }
    }

    // Success — register the student ID to prevent future duplicates
    EXISTING_STUDENT_IDS.add(formData.studentId.toLowerCase().trim());

    trackOnboardingEvent("manual_onboarding_completed", {
      studentId: formData.studentId,
      courseCount: formData.courseSelections.length,
    });

    return {
      success: true,
      data: {
        studentId: formData.studentId,
        fullName: formData.fullName.trim(),
        status: "Pending Verification",
      },
    };
  },
};
