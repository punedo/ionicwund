export interface Doctor {
  id: number;
  name: string;
  type?: string;
  city?: string;
  phone?: string;
  email?: string;
  status?: string;
  facilityId?: number | null;
  facility?: string | null;
  createdAt?: string;
}

export interface DoctorCreateRequest {
  name: string;
  type?: string;
  city?: string;
  phone?: string;
  email?: string;
  status?: string;
  facilityId?: number | null;
}
