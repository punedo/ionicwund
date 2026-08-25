export interface PatientProfile {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  woundType?: string;
  score?: string;
  woundArea?: string;
  woundTrend?: string;
  responsibleCareService?: string;
  responsibleWoundExpert?: string;
}

export interface PatientAppointment {
  id: number;
  date: string;
  startTime: string;
  endTime?: string;
  serviceType: string;
  provider: string;
  address?: string;
}

export interface ConsentItem {
  id: number;
  title: string;
  status: 'unterschrieben' | 'ausstehend';
}

export interface PatientDocument {
  id: number;
  name: string;
  category: string;
  date: string;
  status: 'Angenommen' | 'In Prüfung';
}

export interface CarePlan {
  nextVisitDate?: string;
  interval: string;
  material: string;
  startedAt?: string;
  estimatedEndDate?: string;
  progressPercent: number;
}

export interface PatientDashboard {
  profile: PatientProfile;
  nextAppointment: PatientAppointment | null;
  wound: PatientProfile;
  openConsents: ConsentItem[];
  documents: PatientDocument[];
  banner: string | null;
  carePlan: CarePlan;
}
