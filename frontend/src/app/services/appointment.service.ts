import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, from } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { Network } from '@capacitor/network';
import { environment } from '../../environments/environment';
import { Repositories } from '../data/repository/repositories';
import { SyncManagerService } from './sync/sync-manager.service';
import { toLocalAppointment, fromLocalAppointment } from '../data/mappers';
import { LocalAppointment } from '../data/local/local.models';

export interface Appointment {
  id: number;
  clientUuid?: string;
  patientId: number;
  patientLocalId?: string;
  patientName: string;
  date: string;
  startTime: string;
  endTime: string;
  serviceType: string;
  address?: string;
  tour?: string;
  repetition: string;
  status: string;
  recordedAt?: string;
  createdAt: string;
}

export interface Certificate {
  id: number;
  patientName: string;
  date: string;
  serviceType: string;
  recording: string;
  status: 'Offen' | 'Vollständig';
}

export interface AppointmentCreateRequest {
  patientId: number;
  patientLocalId?: string;
  patientName?: string;
  date: string;
  startTime: string;
  endTime: string;
  serviceType: string;
  address?: string;
  tour?: string;
  repetition?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AppointmentService {
  private readonly apiUrl = `${environment.apiUrl}/appointments`;

  constructor(
    private http: HttpClient,
    private repos: Repositories,
    private sync: SyncManagerService
  ) {}

  getAppointments(weekStart?: string): Observable<Appointment[]> {
    const local$ = from(this.loadLocalAppointments(weekStart));

    return local$.pipe(
      switchMap((appointments) =>
        from(Network.getStatus()).pipe(
          switchMap((status) => {
            if (!status.connected) {
              return of(appointments);
            }

            const url = weekStart ? `${this.apiUrl}?weekStart=${weekStart}` : this.apiUrl;
            return this.http.get<any>(url).pipe(
              switchMap((res) => from(this.upsertServerAppointments(Array.isArray(res) ? res : (res.appointments ?? [])))),
              switchMap(() => from(this.loadLocalAppointments(weekStart))),
              catchError(() => of(appointments))
            );
          })
        )
      )
    );
  }

  getAppointmentsByPatient(patientId: number | string): Observable<Appointment[]> {
    return from(this.loadAppointmentsByPatient(patientId));
  }

  createAppointment(request: AppointmentCreateRequest): Observable<Appointment> {
    return from(this.createLocalAppointment(request));
  }

  updateAppointment(id: number | string, request: Partial<AppointmentCreateRequest>): Observable<Appointment> {
    return from(this.updateLocalAppointment(id, request));
  }

  deleteAppointment(id: number | string): Observable<void> {
    return from(this.deleteLocalAppointment(id));
  }

  recordTime(id: number | string): Observable<Appointment> {
    return from(this.recordLocalTime(id));
  }

  getCertificates(weekStart?: string): Observable<Certificate[]> {
    return this.getAppointments(weekStart).pipe(
      map((appointments) =>
        appointments
          .filter((a) => a.recordedAt || a.status === 'durchgeführt')
          .map((a) => ({
            id: a.id,
            patientName: a.patientName,
            date: this.formatDate(a.date),
            serviceType: `${this.getDurationMinutes(a.startTime, a.endTime)} Min ${a.serviceType} ambulant`,
            recording: a.recordedAt ? 'Hochgeladen' : '—',
            status: a.recordedAt ? 'Vollständig' : 'Offen',
          }))
      )
    );
  }

  private async loadLocalAppointments(weekStart?: string): Promise<Appointment[]> {
    const appointments = await this.repos.appointments.findActive();
    return appointments
      .map(fromLocalAppointment)
      .filter((a) => {
        if (!weekStart) {
          return true;
        }
        const start = new Date(weekStart);
        const end = new Date(start);
        end.setDate(end.getDate() + 7);
        const date = new Date(a.date);
        return date >= start && date < end;
      })
      .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
  }

  private async loadAppointmentsByPatient(patientId: number | string): Promise<Appointment[]> {
    const all = await this.repos.appointments.findActive();
    let filtered: LocalAppointment[];

    if (typeof patientId === 'string') {
      filtered = all.filter((a) => a.patientLocalId === patientId);
    } else {
      filtered = all.filter((a) => a.patientId === patientId);
    }

    return filtered
      .map(fromLocalAppointment)
      .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
  }

  private async upsertServerAppointments(appointments: Appointment[]): Promise<void> {
    const now = new Date().toISOString();

    for (const a of appointments) {
      const existing = a.id ? await this.repos.appointments.findByServerId(a.id) : null;
      const local = toLocalAppointment(a, existing ?? undefined);
      if (!existing && !local.id) {
        local.id = this.generateId();
      }
      local.serverId = a.id;
      local.syncStatus = 'synced';
      local.pendingOperation = 'NONE';
      local.lastSyncTime = now;
      local.updatedAt = a.createdAt ?? now;
      local.createdAt = a.createdAt ?? now;
      local.deletedAt = null;
      await this.repos.appointments.save(local);
    }
  }

  private async createLocalAppointment(request: AppointmentCreateRequest): Promise<Appointment> {
    const now = new Date().toISOString();

    if (!request.patientName) {
      const patient = await this.resolvePatient(request.patientId, request.patientLocalId);
      request.patientName = patient ? `${patient.lastName}, ${patient.firstName}` : '';
    }

    const local = toLocalAppointment(request, undefined);
    local.id = this.generateId();
    local.syncStatus = 'pending';
    local.pendingOperation = 'CREATE';
    local.createdAt = now;
    local.updatedAt = now;
    local.status = local.status || 'geplant';
    await this.repos.appointments.save(local);

    this.triggerSync();
    return fromLocalAppointment(local);
  }

  private async updateLocalAppointment(id: number | string, request: Partial<AppointmentCreateRequest>): Promise<Appointment> {
    const now = new Date().toISOString();
    let existing: LocalAppointment | null = null;

    if (typeof id === 'string') {
      existing = await this.repos.appointments.findById(id);
    } else if (id > 0) {
      existing = await this.repos.appointments.findByServerId(id);
    }

    if (!existing) {
      throw new Error(`[AppointmentService] Appointment not found: ${id}`);
    }

    const local = toLocalAppointment(request as any, existing);
    local.id = existing.id;
    local.serverId = existing.serverId;
    local.syncVersion = existing.syncVersion;
    local.syncStatus = 'pending';
    local.pendingOperation = 'UPDATE';
    local.createdAt = existing.createdAt;
    local.updatedAt = now;
    await this.repos.appointments.save(local);

    this.triggerSync();
    return fromLocalAppointment(local);
  }

  private async deleteLocalAppointment(id: number | string): Promise<void> {
    let existing: LocalAppointment | null = null;

    if (typeof id === 'string') {
      existing = await this.repos.appointments.findById(id);
    } else if (id > 0) {
      existing = await this.repos.appointments.findByServerId(id);
    }

    if (!existing) {
      return;
    }

    await this.repos.appointments.softDelete(existing.id, new Date().toISOString());
    this.triggerSync();
  }

  private async recordLocalTime(id: number | string): Promise<Appointment> {
    let existing: LocalAppointment | null = null;

    if (typeof id === 'string') {
      existing = await this.repos.appointments.findById(id);
    } else if (id > 0) {
      existing = await this.repos.appointments.findByServerId(id);
    }

    if (!existing) {
      throw new Error(`[AppointmentService] Appointment not found: ${id}`);
    }

    const now = new Date().toISOString();
    const local = { ...existing };
    local.recordedAt = now;
    local.status = 'durchgeführt';
    local.updatedAt = now;
    local.syncStatus = 'pending';
    local.pendingOperation = 'UPDATE';
    await this.repos.appointments.save(local);

    this.triggerSync();
    return fromLocalAppointment(local);
  }

  private async resolvePatient(patientId?: number, patientLocalId?: string): Promise<{ firstName: string; lastName: string } | null> {
    if (patientLocalId) {
      const p = await this.repos.patients.findById(patientLocalId);
      return p ? { firstName: p.firstName, lastName: p.lastName } : null;
    }
    if (patientId) {
      const p = await this.repos.patients.findByServerId(patientId);
      return p ? { firstName: p.firstName, lastName: p.lastName } : null;
    }
    return null;
  }

  private triggerSync(): void {
    Network.getStatus()
      .then((status) => {
        if (status.connected) {
          this.sync.sync().catch((e) => console.error('[AppointmentService] sync error', e));
        }
      })
      .catch((e) => console.error('[AppointmentService] network check error', e));
  }

  private generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private getDurationMinutes(start: string, end: string): number {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    return (endH * 60 + endM) - (startH * 60 + startM);
  }
}
