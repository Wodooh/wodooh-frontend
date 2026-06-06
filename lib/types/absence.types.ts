/**
 * Wire shapes for the admin manual-absence endpoints
 * (/admin/users/:userId/absences). Absences are keyed by (student, course) and
 * feed the chairman's Attendance × Engagement × GPA correlation report.
 */
export interface AbsenceRecord {
  _id: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  excused: number;
  unexcused: number;
  total: number;
  /** Provenance: 'manual' entries survive a later SIS sync (override wins). */
  source: "manual" | "sync" | null;
  sisId: string | null;
  updatedAt: string;
}

export interface UpsertAbsenceRequest {
  courseId: string;
  excused: number;
  unexcused: number;
}
