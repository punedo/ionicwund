import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, from, firstValueFrom } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import { Network } from '@capacitor/network';
import { environment } from '../../environments/environment';
import { Patient, PatientCreateRequest } from '../models/patient.model';
import { Repositories } from '../data/repository/repositories';
import { SyncManagerService } from './sync/sync-manager.service';
import { toLocalPatient, fromLocalPatient } from '../data/mappers';
import { LocalPatient } from '../data/local/local.models';
import { DoctorService } from './doctor.service';
import { FacilityService } from './facility.service';
import { DbService } from '../data/services/db.service';

@Injectable({
  providedIn: 'root',
})
export class PatientService {
  private readonly apiUrl = `${environment.apiUrl}/patients`;

  constructor(
    private http: HttpClient,
    private repos: Repositories,
    private sync: SyncManagerService,
    private doctorService: DoctorService,
    private facilityService: FacilityService,
    private db: DbService
  ) {}

  getPatients(): Observable<Patient[]> {
    console.log('[PatientService] getPatients called, apiUrl:', this.apiUrl);
    
    // Directly fetch from API in browser development
    console.log('[PatientService] Fetching from API:', this.apiUrl);
    return this.http.get<{ patients: Patient[] }>(this.apiUrl).pipe(
      tap((res) => {
        console.log('[PatientService] Raw HTTP response:', res);
      }),
      map((res) => {
        console.log('[PatientService] API response patients:', res.patients?.length);
        console.log('[PatientService] API response data:', res);
        const patients = res.patients ?? [];
        console.log('[PatientService] Returning patients:', patients);
        return patients;
      }),
      catchError((err) => {
        console.error('[PatientService] API fetch error:', err);
        // Fallback to local data on error
        return from(this.loadLocalPatients());
      })
    );
  }

  getPatient(id: number | string): Observable<Patient | null> {
    return from(this.loadLocalPatient(id)).pipe(
      switchMap((patient) => {
        if (patient) {
          return of(patient);
        }
        return from(Network.getStatus()).pipe(
          switchMap(async (status) => {
            if (!status.connected || typeof id === 'string') {
              return null;
            }
            try {
              const p = await firstValueFrom(this.http.get<Patient>(`${this.apiUrl}/${id}`));
              await this.upsertServerPatients([p]);
              return this.loadLocalPatient(id);
            } catch (e) {
              console.error('[PatientService] getPatient server fetch failed', e);
              return null;
            }
          })
        );
      })
    );
  }

  createPatient(request: PatientCreateRequest): Observable<Patient> {
    // Directly call API in browser development
    return this.http.post<Patient>(this.apiUrl, request).pipe(
      catchError((err) => {
        console.error('[PatientService] Failed to create patient:', err);
        throw err;
      })
    );
  }

  updatePatient(id: number | string, request: Partial<Patient>): Observable<Patient> {
    // Directly call API in browser development
    return this.http.put<Patient>(`${this.apiUrl}/${id}`, request).pipe(
      catchError((err) => {
        console.error('[PatientService] Failed to update patient:', err);
        throw err;
      })
    );
  }

  deletePatient(id: number | string): Observable<void> {
    // Directly call API in browser development
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError((err) => {
        console.error('[PatientService] Failed to delete patient:', err);
        throw err;
      })
    );
  }

  getDoctors(): Observable<string[]> {
    return this.doctorService.getDoctors().pipe(
      map((doctors) => doctors.map((d) => d.name)),
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
    // Directly fetch from API in browser development
    return this.http
      .get<{ users: { fullName: string }[] }>(`${environment.apiUrl}/users?role=ROLE_PFLEGE`)
      .pipe(
        map((res) => (res.users ?? []).map((u) => u.fullName)),
        catchError((err) => {
          console.error('[PatientService] Failed to load wound experts:', err);
          return of([]);
        })
      );
  }

  getFacilities(): Observable<string[]> {
    return this.facilityService.getFacilities().pipe(
      map((facilities) => facilities.map((f) => f.name)),
      catchError((err) => {
        console.error('[PatientService] getFacilities error:', err);
        return of([]);
      })
    );
  }

  getInsuranceCompanies(type?: string): Observable<string[]> {
    // Directly fetch from API in browser development
    const url = type
      ? `${environment.apiUrl}/insurance-companies?type=${type}`
      : `${environment.apiUrl}/insurance-companies`;
    return this.http
      .get<{ companies: { name: string }[] }>(url)
      .pipe(
        map((res) => (res.companies ?? []).map((c) => c.name)),
        catchError((err) => {
          console.error('[PatientService] Failed to load insurance companies:', err);
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
    // Directly fetch from API in browser development
    return this.http
      .get<{ values: string[] }>(`${environment.apiUrl}/reference-data/values?category=${category}`)
      .pipe(
        map((res) => res.values ?? []),
        catchError((err) => {
          console.error(`[PatientService] Failed to load reference data for ${category}:`, err);
          return of([]);
        })
      );
  }

  private async getCachedStringList(key: string): Promise<string[] | null> {
    await this.db.init();
    const rows = await this.db.query<{ value: string }>('SELECT value FROM secureStore WHERE key = ?', [key]);
    const value = rows[0]?.value;
    if (!value) {
      return null;
    }
    try {
      return JSON.parse(value) as string[];
    } catch (e) {
      console.error(`[PatientService] Failed to parse cached ${key}`, e);
      return null;
    }
  }

  private async setCachedStringList(key: string, values: string[]): Promise<void> {
    await this.db.init();
    await this.db.run(
      'INSERT OR REPLACE INTO secureStore (key, value, updatedAt) VALUES (?, ?, ?)',
      [key, JSON.stringify(values), new Date().toISOString()],
      true
    );
  }

  private async loadLocalPatients(): Promise<Patient[]> {
    const patients = await this.repos.patients.findActive();
    return patients
      .map(fromLocalPatient)
      .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));
  }

  private async loadLocalPatient(id: number | string): Promise<Patient | null> {
    let local: LocalPatient | null = null;
    if (typeof id === 'string') {
      local = await this.repos.patients.findById(id);
    } else if (id > 0) {
      local = await this.repos.patients.findByServerId(id);
    }
    return local ? fromLocalPatient(local) : null;
  }

  private async upsertServerPatients(patients: Patient[]): Promise<void> {
    const now = new Date().toISOString();

    for (const p of patients) {
      const existing = p.id ? await this.repos.patients.findByServerId(p.id) : null;
      const local = toLocalPatient(p, existing ?? undefined);
      if (!existing && !local.id) {
        local.id = this.generateId();
      }
      local.serverId = p.id;
      local.syncStatus = 'synced';
      local.pendingOperation = 'NONE';
      local.lastSyncTime = now;
      local.updatedAt = p.updatedAt ?? now;
      local.createdAt = p.createdAt ?? now;
      local.deletedAt = null;
      await this.repos.patients.save(local);
    }
  }

  private async createLocalPatient(request: PatientCreateRequest): Promise<Patient> {
    const now = new Date().toISOString();
    const local = toLocalPatient(request, undefined);
    local.id = this.generateId();
    local.syncStatus = 'pending';
    local.pendingOperation = 'CREATE';
    local.createdAt = now;
    local.updatedAt = now;
    await this.repos.patients.save(local);

    this.triggerSync();
    return fromLocalPatient(local);
  }

  private async updateLocalPatient(id: number | string, request: Partial<Patient>): Promise<Patient> {
    const now = new Date().toISOString();
    let existing: LocalPatient | null = null;

    if (typeof id === 'string') {
      existing = await this.repos.patients.findById(id);
    } else if (id > 0) {
      existing = await this.repos.patients.findByServerId(id);
    }

    if (!existing && request.clientUuid) {
      existing = await this.repos.patients.findById(request.clientUuid);
    }

    if (!existing) {
      throw new Error(`[PatientService] Patient not found: ${id}`);
    }

    const local = toLocalPatient(request as any, existing);
    local.id = existing.id;
    local.serverId = existing.serverId;
    local.syncVersion = existing.syncVersion;
    local.syncStatus = 'pending';
    local.pendingOperation = 'UPDATE';
    local.createdAt = existing.createdAt;
    local.updatedAt = now;
    await this.repos.patients.save(local);

    this.triggerSync();
    return fromLocalPatient(local);
  }

  private async deleteLocalPatient(id: number | string): Promise<void> {
    let existing: LocalPatient | null = null;

    if (typeof id === 'string') {
      existing = await this.repos.patients.findById(id);
    } else if (id > 0) {
      existing = await this.repos.patients.findByServerId(id);
    }

    if (!existing) {
      return;
    }

    await this.repos.patients.softDelete(existing.id, new Date().toISOString());
    this.triggerSync();
  }

  private triggerSync(): void {
    Network.getStatus()
      .then((status) => {
        if (status.connected) {
          this.sync.sync().catch((e) => console.error('[PatientService] sync error', e));
        }
      })
      .catch((e) => console.error('[PatientService] network check error', e));
  }

  private generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
