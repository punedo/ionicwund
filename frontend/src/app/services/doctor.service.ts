import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, from } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { Network } from '@capacitor/network';
import { environment } from '../../environments/environment';
import { Doctor, DoctorCreateRequest } from '../models/doctor.model';
import { Repositories } from '../data/repository/repositories';
import { SyncManagerService } from './sync/sync-manager.service';
import { toLocalDoctor, fromLocalDoctor } from '../data/mappers';
import { LocalDoctor } from '../data/local/local.models';

@Injectable({
  providedIn: 'root',
})
export class DoctorService {
  private readonly apiUrl = `${environment.apiUrl}/doctors`;

  constructor(
    private http: HttpClient,
    private repos: Repositories,
    private sync: SyncManagerService
  ) {}

  getDoctors(): Observable<Doctor[]> {
    // Directly fetch from API in browser development
    return this.http.get<any>(this.apiUrl).pipe(
      map((res) => Array.isArray(res) ? res : (res.doctors ?? [])),
      catchError((err) => {
        console.error('[DoctorService] Failed to load doctors:', err);
        return of([]);
      })
    );
  }

  getDoctor(id: number | string): Observable<Doctor | null> {
    return from(this.loadDoctor(id));
  }

  createDoctor(request: DoctorCreateRequest): Observable<Doctor> {
    // Directly call API in browser development
    return this.http.post<Doctor>(this.apiUrl, request).pipe(
      catchError((err) => {
        console.error('[DoctorService] Failed to create doctor:', err);
        throw err;
      })
    );
  }

  updateDoctor(id: number | string, request: DoctorCreateRequest): Observable<Doctor> {
    // Directly call API in browser development
    return this.http.put<Doctor>(`${this.apiUrl}/${id}`, request).pipe(
      catchError((err) => {
        console.error('[DoctorService] Failed to update doctor:', err);
        throw err;
      })
    );
  }

  deleteDoctor(id: number | string): Observable<void> {
    // Directly call API in browser development
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError((err) => {
        console.error('[DoctorService] Failed to delete doctor:', err);
        throw err;
      })
    );
  }

  private async loadLocalDoctors(): Promise<Doctor[]> {
    const doctors = await this.repos.doctors.findActive();
    return doctors
      .map(fromLocalDoctor)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private async loadDoctor(id: number | string): Promise<Doctor | null> {
    let local: LocalDoctor | null = null;

    if (typeof id === 'string') {
      local = await this.repos.doctors.findById(id);
    } else if (id > 0) {
      local = await this.repos.doctors.findByServerId(id);
    }

    return local ? fromLocalDoctor(local) : null;
  }

  private async upsertServerDoctors(doctors: Doctor[]): Promise<void> {
    const now = new Date().toISOString();

    for (const d of doctors) {
      const existing = d.id ? await this.repos.doctors.findByServerId(d.id) : null;
      const local = toLocalDoctor(d, existing ?? undefined);
      if (!existing && !local.id) {
        local.id = this.generateId();
      }
      local.serverId = d.id;
      local.syncStatus = 'synced';
      local.pendingOperation = 'NONE';
      local.lastSyncTime = now;
      local.createdAt = d.createdAt ?? now;
      local.updatedAt = d.createdAt ?? now;
      local.deletedAt = null;
      await this.repos.doctors.save(local);
    }
  }

  private async createLocalDoctor(request: DoctorCreateRequest): Promise<Doctor> {
    const now = new Date().toISOString();
    const local = toLocalDoctor(request as any, undefined);
    local.id = this.generateId();
    local.syncStatus = 'pending';
    local.pendingOperation = 'CREATE';
    local.createdAt = now;
    local.updatedAt = now;
    if (request.facilityId) {
      local.facilityId = String(request.facilityId);
    }
    await this.repos.doctors.save(local);

    this.triggerSync();
    return fromLocalDoctor(local);
  }

  private async updateLocalDoctor(id: number | string, request: DoctorCreateRequest): Promise<Doctor> {
    let existing: LocalDoctor | null = null;

    if (typeof id === 'string') {
      existing = await this.repos.doctors.findById(id);
    } else if (id > 0) {
      existing = await this.repos.doctors.findByServerId(id);
    }

    if (!existing) {
      throw new Error(`[DoctorService] Doctor not found: ${id}`);
    }

    const now = new Date().toISOString();
    const local = toLocalDoctor(request as any, existing);
    local.id = existing.id;
    local.serverId = existing.serverId;
    local.syncVersion = existing.syncVersion;
    local.syncStatus = 'pending';
    local.pendingOperation = 'UPDATE';
    local.createdAt = existing.createdAt;
    local.updatedAt = now;
    if (request.facilityId) {
      local.facilityId = String(request.facilityId);
    }
    await this.repos.doctors.save(local);

    this.triggerSync();
    return fromLocalDoctor(local);
  }

  private async deleteLocalDoctor(id: number | string): Promise<void> {
    let existing: LocalDoctor | null = null;

    if (typeof id === 'string') {
      existing = await this.repos.doctors.findById(id);
    } else if (id > 0) {
      existing = await this.repos.doctors.findByServerId(id);
    }

    if (!existing) {
      return;
    }

    await this.repos.doctors.softDelete(existing.id, new Date().toISOString());
    this.triggerSync();
  }

  private triggerSync(): void {
    Network.getStatus()
      .then((status) => {
        if (status.connected) {
          this.sync.sync().catch((e) => console.error('[DoctorService] sync error', e));
        }
      })
      .catch((e) => console.error('[DoctorService] network check error', e));
  }

  private generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
