export interface Facility {
  id: number;
  name: string;
  type?: string;
  city?: string;
  patientCount?: number;
  careServices?: string[];
  status?: string;
  createdAt?: string;
}

export interface FacilityCreateRequest {
  name: string;
  type?: string;
  city?: string;
  status?: string;
}
