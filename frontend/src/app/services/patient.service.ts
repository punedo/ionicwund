import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Patient, PatientCreateRequest } from '../models/patient.model';

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
    return of([
      'Dr. med. S. Roth - Hausarztpraxis Roth',
      'Dr. med. A. Schmidt - Praxis Schmidt',
      'Dr. med. K. Klein - Klinik Berlin',
      'Dr. med. J. Kaiser - Homecare Süd',
    ]);
  }

  getCareServices(): Observable<string[]> {
    return of([
      'R. Meier - Pflegedienst Nord',
      'J. Kaiser - Homecare Süd',
      'Pflegedienst Berlin-Mitte',
    ]);
  }

  getWoundExperts(): Observable<string[]> {
    return of(['Homecare Süd', 'Wundexperte Nord', 'Wundexpertise Berlin']);
  }

  getFacilities(): Observable<string[]> {
    return of([
      '— ambulant, keine Einrichtung —',
      'Pflegeheim Nord',
      'Seniorenresidenz Süd',
      'Klinik Berlin',
    ]);
  }

  getInsuranceCompanies(): Observable<string[]> {
    return of([
      'AOK Nordost',
      'Techniker Krankenkasse',
      'Barmer',
      'AXA Krankenversicherung',
    ]);
  }

  getInsuranceClasses(): Observable<string[]> {
    return of(['Kostenvoranschlag (Wartefall)', 'Behandlungskosten', 'Keine']);
  }

  getAdditionalServices(): Observable<string[]> {
    return of([
      'Zusatzangebotlich (100%, min. 5€ / max. 10€-Vereinbarung)',
      'Befreiungsbescheinigung hinterlegt',
      'Keine',
    ]);
  }

  getWoundTypes(): Observable<string[]> {
    return of([
      'Diabetisches Fußsyndrom',
      'Ulcus cruris varicosum',
      'Dekubital-Sakral',
      'Dekubital-Trochanter',
      'Postoperativ',
    ]);
  }
}
