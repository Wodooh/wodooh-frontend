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

export interface Alert {
  _id: string;
  type: "ABSENCE_25" | "HIGH_ACTIVITY";
  studentId?: string;
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
