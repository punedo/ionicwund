import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Patient, PatientCreateRequest } from '../models/patient.model';
import { Doctor } from '../models/doctor.model';
import { Facility } from '../models/facility.model';

@Injectable({
  providedIn: 'root',
})
export class PatientService {
  private readonly apiUrl = `${environment.apiUrl}/patients`;

  constructor(private http: HttpClient) {}

  getPatients(): Observable<Patient[]> {
    return this.http.get<{ patients: Patient[] }>(this.apiUrl).pipe(
      map((res) => res.patients ?? []),
      catchError((err) => {
        console.error('[PatientService] getPatients error:', err);
        return of([]);
      })
    );
  }

  getPatient(id: number): Observable<Patient> {
    return this.http.get<Patient>(`${this.apiUrl}/${id}`);
  }

  createPatient(request: PatientCreateRequest): Observable<Patient> {
    return this.http.post<Patient>(this.apiUrl, request);
  }

  updatePatient(id: number, request: PatientCreateRequest): Observable<Patient> {
    return this.http.put<Patient>(`${this.apiUrl}/${id}`, request);
  }

  deletePatient(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getDoctors(): Observable<string[]> {
    return this.http.get<{ doctors: Doctor[] }>(`${environment.apiUrl}/doctors`).pipe(
      map((res) => (res.doctors ?? []).map((d) => d.name)),
      catchError((err) => {
        console.error('[PatientService] getDoctors error:', err);
        return of([]);
      })
    );
  }

  getCareServices(): Observable<string[]> {
    return this.getReferenceDataValues('care_service');
  }

  getWoundExperts(): Observable<string[]> {
    return this.getReferenceDataValues('wound_expert');
  }

  getFacilities(): Observable<string[]> {
    return this.http.get<{ facilities: Facility[] }>(`${environment.apiUrl}/facilities`).pipe(
      map((res) => (res.facilities ?? []).map((f) => f.name)),
      catchError((err) => {
        console.error('[PatientService] getFacilities error:', err);
        return of([]);
      })
    );
  }

  getInsuranceCompanies(type?: string): Observable<string[]> {
    const url = type ? `${environment.apiUrl}/insurance-companies?type=${type}` : `${environment.apiUrl}/insurance-companies`;
    return this.http.get<{ companies: { id: number; name: string; type: string }[] }>(url).pipe(
      map((res) => (res.companies ?? []).map((c) => c.name)),
      catchError((err) => {
        console.error('[PatientService] getInsuranceCompanies error:', err);
        return of([]);
      })
    );
  }

  getInsuranceClasses(): Observable<string[]> {
    return this.getReferenceDataValues('insurance_class');
  }

  getAdditionalServices(): Observable<string[]> {
    return this.getReferenceDataValues('additional_service');
  }

  getWoundTypes(): Observable<string[]> {
    return this.getReferenceDataValues('wound_type');
  }

  getGenders(): Observable<string[]> {
    return this.getReferenceDataValues('gender');
  }

  getInsuranceTypes(): Observable<string[]> {
    return this.getReferenceDataValues('insurance_type');
  }

  private getReferenceDataValues(category: string): Observable<string[]> {
    return this.http.get<{ values: string[] }>(`${environment.apiUrl}/reference-data/values?category=${category}`).pipe(
      map((res) => res.values ?? []),
      catchError((err) => {
        console.error(`[PatientService] getReferenceDataValues(${category}) error:`, err);
        return of([]);
      })
    );
  }
}
