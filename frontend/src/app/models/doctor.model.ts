export interface Doctor {
  id: number;
  name: string;
  type?: string;
  city?: string;
  phone?: string;
  email?: string;
  status?: string;
  createdAt?: string;
}

export interface DoctorCreateRequest {
  name: string;
  type?: string;
  city?: string;
  phone?: string;
  email?: string;
  status?: string;
}
