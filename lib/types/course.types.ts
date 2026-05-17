export interface Course {
  _id: string;
  name: string;
  code: string;
  description?: string;
  departmentId?: string;
  instructorId?: string;
  capacity?: number;
  credits?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCourseRequest {
  name: string;
  code: string;
  description?: string;
  departmentId?: string;
  instructorId?: string;
  capacity?: number;
  credits?: number;
}

export type UpdateCourseRequest = Partial<CreateCourseRequest>;

// ─── Section ──────────────────────────────────────────────────────────────
// sectionId is a human-readable 5-digit number: dept-index × 10000 + 1..9999
// e.g. dept #1 → 10001–19999, dept #2 → 20001–29999
export interface SectionInstructor {
  _id: string;
  name: string;
  email: string;
}

export interface Section {
  _id: string;
  sectionId: number;
  courseId: string;
  instructorId?: string | SectionInstructor; // populated by backend
  capacity?: number;
  enrolledCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSectionRequest {
  sectionId?: number;
  capacity?: number;
  instructorId?: string;
}

export type UpdateSectionRequest = Partial<Omit<CreateSectionRequest, 'sectionId'>>;
