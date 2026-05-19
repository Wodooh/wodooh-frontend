export interface Department {
  _id: string;
  name: string;
  code: string;
  description?: string;
  collegeId?: string | null;
  chairmanId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDepartmentRequest {
  name: string;
  code: string;
  description?: string;
  collegeId?: string | null;
}

export type UpdateDepartmentRequest = Partial<CreateDepartmentRequest>;
