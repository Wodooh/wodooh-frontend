export interface Section {
  _id: string;
  code: string;
  courseId?: string;
  instructorId?: string;
  schedule?: string;
  room?: string;
  capacity?: number;
  createdAt: string;
  updatedAt: string;
}
