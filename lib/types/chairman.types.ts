export interface ChairmanDepartment {
  _id: string;
  name: string;
  code: string;
  description?: string;
  chairmanId?: string;
  collegeId?: string | { _id: string; name: string; code: string };
  createdAt: string;
  updatedAt: string;
}

export interface ChairmanCounts {
  courseCount: number;
  sectionCount: number;
  instructorCount: number;
  studentCount: number;
  liveSessionCount: number;
}

export interface ChairmanMe {
  department: ChairmanDepartment;
  counts: ChairmanCounts;
}

export interface ChairmanCourseRow {
  _id: string;
  name: string;
  code: string;
  description?: string;
  credits?: number;
  departmentId?: string;
  sectionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChairmanCourseSection {
  _id: string;
  sectionId: number;
  courseId: string;
  instructorId?: {
    _id: string;
    name: string;
    email: string;
  } | null;
  studentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChairmanCourseAnonymousStudent {
  anonymousCourseId: string;
  sectionCount: number;
}

export interface ChairmanStudentsByCourse {
  courseId: string;
  courseCode: string;
  courseName: string;
  studentCount: number;
  students: ChairmanCourseAnonymousStudent[];
}

export interface ChairmanCourseDetail {
  course: ChairmanCourseRow;
  sections: ChairmanCourseSection[];
  students: ChairmanCourseAnonymousStudent[];
}

export interface ChairmanInstructor {
  _id: string;
  name: string;
  email: string;
  assignedSectionCount: number;
}

export interface ChairmanSession {
  _id: string;
  status: "live" | "ended";
  startedAt: string;
  endedAt?: string;
  courseId: { _id: string; name: string; code: string } | string;
  sectionId?: { _id: string; sectionId: number } | string;
  instructorId?: { _id: string; name: string; email: string } | string;
}

export interface SessionReport {
  sessionId: string;
  questionCount: number;
  openedCount: number;
  /** Student explicitly confirmed resolved. */
  resolvedCount: number;
  /** Defaulted to resolved by the end-of-session sweep — student never responded. */
  autoResolvedCount: number;
  /** Student explicitly marked unresolved. */
  unresolvedCount: number;
  reactionCounts: {
    TooFast: number;
    TooSlow: number;
    Understood: number;
    NotClear: number;
  };
  participantCount: number;
}

export interface CourseCorrelationRow {
  /** Opaque per-course pseudonym — no real identity. */
  anonymousCourseId: string;
  /** Fraction in [0,1], or null when no sessions have been held. */
  attendancePct: number | null;
  /** Questions + reactions contributed across the course's held sessions. */
  engagementCount: number;
  /** Cumulative GPA on the 5.0 scale, or null when none is on record. */
  gpa: number | null;
  attendedSessions: number;
  absentSessions: number;
  excusedAbsences: number;
  unexcusedAbsences: number;
}

export interface CourseCorrelation {
  courseId: string;
  totalSessions: number;
  studentCount: number;
  /** Students with a GPA on record — denominator for the GPA-pair coefficients. */
  gpaStudentCount: number;
  /** Attendance × engagement Pearson coefficient in [-1,1], or null (insufficient data / zero variance). */
  coefficient: number | null;
  /** Attendance × GPA Pearson coefficient, computed only over rows that have a GPA. */
  coefficientAttendanceGpa: number | null;
  /** Engagement × GPA Pearson coefficient, computed only over rows that have a GPA. */
  coefficientEngagementGpa: number | null;
  rows: CourseCorrelationRow[];
}

export interface Alert {
  _id: string;
  type: "ABSENCE_25" | "HIGH_ACTIVITY";
  anonymousCourseId?: string;
  sectionId?: { _id: string; sectionId: number } | string;
  courseId?: { _id: string; name: string; code: string } | string;
  departmentId: string;
  message: string;
  isSeed?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DeanonymizeRequest {
  anonymousCourseId: string;
  justification: string;
}

export interface DeanonymizeResponse {
  studentId: string;
  name: string;
  email: string;
  auditEntryId: string;
}

export interface AuditLogEntry {
  _id: string;
  action: string;
  actorId: string;
  actorEmail: string;
  targetType: string;
  targetId?: string;
  details?: {
    anonymousCourseId?: string;
    courseId?: string;
    courseCode?: string;
    justification?: string;
  };
  createdAt: string;
  updatedAt: string;
}
