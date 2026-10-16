import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, from } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { Network } from '@capacitor/network';
import { environment } from '../../environments/environment';
import { Repositories } from '../data/repository/repositories';
import { SyncManagerService } from './sync/sync-manager.service';
import { toLocalTerminWunsch, fromLocalTerminWunsch } from '../data/mappers';
import { LocalTerminWunsch } from '../data/local/local.models';

export interface TerminWunsch {
  id: number;
  clientUuid?: string;
  patientId: number;
  patientLocalId?: string;
  patientName: string;
  preferredDate: string;
  preferredTime: string;
  notes: string | null;
  status: 'ausstehend' | 'angenommen' | 'abgelehnt';
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
  convertedAppointmentId: number | null;
}

export interface TerminWunschRequest {
  patientId: number;
  patientLocalId?: string;
  patientName?: string;
  preferredDate: string;
  preferredTime: string;
  notes?: string;
}

@Injectable({
  providedIn: 'root',
})
export class TerminWunschService {
  private readonly apiUrl = `${environment.apiUrl}/termin-wuensche`;

  constructor(
    private http: HttpClient,
    private repos: Repositories,
    private sync: SyncManagerService
  ) {}

  getTerminWuensche(): Observable<TerminWunsch[]> {
    const local$ = from(this.loadLocalWuensche());

    return local$.pipe(
      switchMap((wuensche) =>
        from(Network.getStatus()).pipe(
          switchMap((status) => {
            if (!status.connected) {
              return of(wuensche);
            }

            return this.http.get<{ wuensche: TerminWunsch[] }>(this.apiUrl).pipe(
              switchMap((res) => from(this.upsertServerWuensche(res.wuensche ?? []))),
              switchMap(() => from(this.loadLocalWuensche())),
              catchError(() => of(wuensche))
            );
          })
        )
      )
    );
  }

  createTerminWunsch(request: TerminWunschRequest): Observable<TerminWunsch> {
    return from(this.createLocalWunsch(request));
  }

  acceptTerminWunsch(id: number | string): Observable<TerminWunsch> {
    return from(this.updateStatus(id, 'angenommen'));
  }

  rejectTerminWunsch(id: number | string, reviewNotes?: string): Observable<TerminWunsch> {
    return from(this.updateStatus(id, 'abgelehnt', reviewNotes));
  }

  private async loadLocalWuensche(): Promise<TerminWunsch[]> {
    const wuensche = await this.repos.terminWuensche.findActive();
    return wuensche
      .map(fromLocalTerminWunsch)
      .sort((a, b) => a.preferredDate.localeCompare(b.preferredDate) || a.preferredTime.localeCompare(b.preferredTime));
  }

  private async upsertServerWuensche(wuensche: TerminWunsch[]): Promise<void> {
    const now = new Date().toISOString();

    for (const w of wuensche) {
      const existing = w.id ? await this.repos.terminWuensche.findByServerId(w.id) : null;
      const local = toLocalTerminWunsch(w, existing ?? undefined);
      if (!existing && !local.id) {
        local.id = this.generateId();
      }
      local.serverId = w.id;
      local.syncStatus = 'synced';
      local.pendingOperation = 'NONE';
      local.lastSyncTime = now;
      local.updatedAt = w.createdAt ?? now;
      local.createdAt = w.createdAt ?? now;
      local.deletedAt = null;
      await this.repos.terminWuensche.save(local);
    }
  }

  private async createLocalWunsch(request: TerminWunschRequest): Promise<TerminWunsch> {
    const now = new Date().toISOString();

    if (!request.patientName) {
      const patient = await this.resolvePatient(request.patientId, request.patientLocalId);
      request.patientName = patient ? `${patient.lastName}, ${patient.firstName}` : '';
    }

    const local = toLocalTerminWunsch(request as any, undefined);
    local.id = this.generateId();
    local.syncStatus = 'pending';
    local.pendingOperation = 'CREATE';
    local.createdAt = now;
    local.updatedAt = now;
    local.status = 'ausstehend';
    await this.repos.terminWuensche.save(local);

    this.triggerSync();
    return fromLocalTerminWunsch(local);
  }

  private async updateStatus(
    id: number | string,
    status: 'angenommen' | 'abgelehnt',
    reviewNotes?: string
  ): Promise<TerminWunsch> {
    let existing: LocalTerminWunsch | null = null;

    if (typeof id === 'string') {
      existing = await this.repos.terminWuensche.findById(id);
    } else if (id > 0) {
      existing = await this.repos.terminWuensche.findByServerId(id);
    }

    if (!existing) {
      throw new Error(`[TerminWunschService] Wunsch not found: ${id}`);
    }

    const now = new Date().toISOString();
    const local = { ...existing };
    local.status = status;
    if (reviewNotes) {
      local.reviewNotes = reviewNotes;
    }
    local.reviewedAt = now;
    local.updatedAt = now;
    local.syncStatus = 'pending';
    local.pendingOperation = 'UPDATE';
    await this.repos.terminWuensche.save(local);

    this.triggerSync();
    return fromLocalTerminWunsch(local);
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
          this.sync.sync().catch((e) => console.error('[TerminWunschService] sync error', e));
        }
      })
      .catch((e) => console.error('[TerminWunschService] network check error', e));
  }

  private generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
