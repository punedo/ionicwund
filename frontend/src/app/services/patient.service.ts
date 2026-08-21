import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Patient, PatientCreateRequest } from '../models/patient.model';

@Injectable({
  providedIn: 'root',
})
export class PatientService {
  private patients: Patient[] = [
    {
      id: 1,
      firstName: 'Maria',
      lastName: 'Fischer',
      dateOfBirth: '1954-01-12',
      gender: 'weiblich',
      street: 'Hauptstraße',
      houseNumber: '12',
      zip: '14501',
      city: 'Falkensee',
      phone: '030 123456',
      insuranceNumber: 'A123456789',
      insuranceType: 'GKV',
      insuranceCompany: 'AOK Nordost',
      insuranceClass: 'AOK Nordost',
      treatingDoctor: 'Dr. med. S. Roth - Hausarztpraxis Roth',
      additionalService: 'Zusatzangebotlich (100%, min. 5€ / max. 10€-Vereinbarung)',
      responsibleCareService: 'R. Meier - Pflegedienst Nord',
      responsibleWoundExpert: 'Homecare Süd',
      facility: '— ambulant, keine Einrichtung —',
      woundType: 'Diabetisches Fußsyndrom',
      score: 'Wagner 2 / Armstrong A',
      responsible: ['R. Meier - Pflegedienst Nord', 'Homecare Süd'],
      lastDocumentedAt: 'vor 1 Tag',
      status: 'Beobachtung',
      createdAt: new Date().toISOString(),
    },
    {
      id: 2,
      firstName: 'Turan',
      lastName: 'Yilmaz',
      dateOfBirth: '1968-03-08',
      gender: 'männlich',
      street: 'Musterweg',
      houseNumber: '5',
      zip: '10115',
      city: 'Berlin',
      phone: '030 987654',
      insuranceNumber: 'B987654321',
      insuranceType: 'GKV',
      insuranceCompany: 'Techniker Krankenkasse',
      insuranceClass: 'Techniker Krankenkasse',
      treatingDoctor: 'Dr. med. A. Schmidt - Praxis Schmidt',
      additionalService: 'Befreiungsbescheinigung hinterlegt',
      responsibleCareService: 'J. Kaiser - Homecare Süd',
      responsibleWoundExpert: 'CLAP Co.',
      facility: '— ambulant, keine Einrichtung —',
      woundType: 'Ulcus cruris varicosum',
      score: 'CEAP C6',
      responsible: ['J. Kaiser - Homecare Süd', 'CLAP Co.'],
      lastDocumentedAt: 'vor 3 Tagen',
      status: 'kritisch',
      createdAt: new Date().toISOString(),
    },
    {
      id: 3,
      firstName: 'Anna',
      lastName: 'Berger',
      dateOfBirth: '1977-07-22',
      gender: 'weiblich',
      street: 'Lindenallee',
      houseNumber: '42',
      zip: '14059',
      city: 'Berlin',
      phone: '030 456789',
      insuranceNumber: 'C456789123',
      insuranceType: 'PKV',
      insuranceCompany: 'AXA Krankenversicherung',
      insuranceClass: 'AXA Krankenversicherung',
      treatingDoctor: 'Dr. med. K. Klein - Klinik Berlin',
      additionalService: 'Zusatzangebotlich (100%, min. 5€ / max. 10€-Vereinbarung)',
      responsibleCareService: 'R. Meier - Pflegedienst Nord',
      responsibleWoundExpert: 'Homecare Süd',
      facility: 'Pflegeheim Nord',
      woundType: 'Dekubital-Sakral',
      score: 'EPUAP Kat. 2',
      responsible: ['R. Meier - Pflegedienst Nord', 'Homecare Süd'],
      lastDocumentedAt: 'heute',
      status: 'neu',
      createdAt: new Date().toISOString(),
    },
    {
      id: 4,
      firstName: 'Jan',
      lastName: 'Novak',
      dateOfBirth: '1949-11-05',
      gender: 'männlich',
      street: 'Birkenstraße',
      houseNumber: '7',
      zip: '14057',
      city: 'Berlin',
      phone: '030 111222',
      insuranceNumber: 'D111222333',
      insuranceType: 'GKV',
      insuranceCompany: 'Barmer',
      insuranceClass: 'Barmer',
      treatingDoctor: 'Dr. med. J. Kaiser - Homecare Süd',
      additionalService: 'Befreiungsbescheinigung hinterlegt',
      responsibleCareService: 'J. Kaiser - Homecare Süd',
      responsibleWoundExpert: 'Homecare Süd',
      facility: '— ambulant, keine Einrichtung —',
      woundType: 'Diabetisches Fußsyndrom',
      score: 'Wagner 1 / Armstrong A',
      responsible: ['J. Kaiser - Homecare Süd', 'Homecare Süd'],
      lastDocumentedAt: 'vor 5 Tagen',
      status: 'neu',
      createdAt: new Date().toISOString(),
    },
  ];

  getPatients(): Observable<Patient[]> {
    return of([...this.patients]).pipe(delay(200));
  }

  createPatient(request: PatientCreateRequest): Observable<Patient> {
    const newPatient: Patient = {
      id: this.nextId(),
      ...request,
      responsible: [request.responsibleCareService ?? '', request.responsibleWoundExpert ?? ''].filter(Boolean),
      lastDocumentedAt: 'heute',
      status: 'neu',
      createdAt: new Date().toISOString(),
    };
    this.patients = [newPatient, ...this.patients];
    return of(newPatient).pipe(delay(200));
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

  private nextId(): number {
    return this.patients.length > 0
      ? Math.max(...this.patients.map((p) => p.id)) + 1
      : 1;
  }
}
