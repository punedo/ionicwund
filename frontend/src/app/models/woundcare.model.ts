import { Patient } from './patient.model';

export interface CarePlanRow {
  patientId: number;
  patientName: string;
  category: string;
  orderNumber: string;
  period: string;
  status: string;
  changeRequest: string;
  patient?: Patient;
}
