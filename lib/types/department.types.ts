export interface Department {
  _id: string;
  name: string;
  code: string;
  description?: string;
  color?: string;
  headOfDepartment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDepartmentRequest {
  name: string;
  code: string;
  description?: string;
  color?: string;
  headOfDepartment?: string;
}

export type UpdateDepartmentRequest = Partial<CreateDepartmentRequest>;
