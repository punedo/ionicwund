export type PatientStatus = 'Beobachtung' | 'kritisch' | 'neu';
export type InsuranceType = 'GKV' | 'PKV';
export type Gender = 'weiblich' | 'männlich' | 'divers';

export interface Patient {
  id: number;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: Gender;
  street?: string;
  houseNumber?: string;
  zip?: string;
  city?: string;
  phone?: string;
  insuranceNumber?: string;
  insuranceType?: InsuranceType;
  insuranceCompany?: string;
  insuranceClass?: string;
  treatingDoctor?: string;
  additionalService?: string;
  responsibleCareService?: string;
  responsibleWoundExpert?: string;
  facility?: string;
  woundType?: string;
  score?: string;
  responsible?: string[];
  lastDocumentedAt?: string;
  status?: PatientStatus;
  createdAt?: string;
}

export interface PatientCreateRequest {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: Gender;
  street?: string;
  houseNumber?: string;
  zip?: string;
  city?: string;
  phone?: string;
  insuranceNumber?: string;
  insuranceType: InsuranceType;
  insuranceCompany?: string;
  insuranceClass?: string;
  treatingDoctor?: string;
  additionalService?: string;
  responsibleCareService?: string;
  responsibleWoundExpert?: string;
  facility?: string;
  woundType?: string;
  score?: string;
}
