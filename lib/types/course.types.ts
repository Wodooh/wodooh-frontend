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
