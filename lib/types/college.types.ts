export interface College {
  _id: string;
  name: string;
  code: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCollegeRequest {
  name: string;
  code: string;
  description?: string;
}

export type UpdateCollegeRequest = Partial<CreateCollegeRequest>;
