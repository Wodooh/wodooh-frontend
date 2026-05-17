export type SessionStatus = "live" | "ended";

export interface SessionPopulated {
  _id: string;
  status: SessionStatus;
  startedAt: string;
  endedAt?: string;
  courseId: { _id: string; name: string; code: string } | string | null;
  sectionId?: { _id: string; sectionId: number } | string | null;
  instructorId: { _id: string; name: string; email: string } | string | null;
}

export interface StartSessionBody {
  courseId: string;
  sectionId?: string;
}

export interface SessionsQuery {
  courseId?: string;
  sectionId?: string;
  status?: SessionStatus;
  instructorId?: string;
}
