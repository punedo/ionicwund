import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, from } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { Network } from '@capacitor/network';
import { environment } from '../../environments/environment';
import { Facility, FacilityCreateRequest } from '../models/facility.model';
import { Repositories } from '../data/repository/repositories';
import { SyncManagerService } from './sync/sync-manager.service';
import { toLocalFacility, fromLocalFacility } from '../data/mappers';
import { LocalFacility } from '../data/local/local.models';

@Injectable({
  providedIn: 'root',
})
export class FacilityService {
  private readonly apiUrl = `${environment.apiUrl}/facilities`;

  constructor(
    private http: HttpClient,
    private repos: Repositories,
    private sync: SyncManagerService
  ) {}

  getFacilities(): Observable<Facility[]> {
    const local$ = from(this.loadLocalFacilities());

    return local$.pipe(
      switchMap((facilities) =>
        from(Network.getStatus()).pipe(
          switchMap((status) => {
            if (!status.connected) {
              return of(facilities);
            }

            return this.http.get<any>(this.apiUrl).pipe(
              switchMap((res) =>
                from(this.upsertServerFacilities(Array.isArray(res) ? res : (res.facilities ?? [])))
              ),
              switchMap(() => from(this.loadLocalFacilities())),
              catchError(() => of(facilities))
            );
          })
        )
      )
    );
  }

  getFacility(id: number | string): Observable<Facility | null> {
    return from(this.loadFacility(id));
  }

  createFacility(request: FacilityCreateRequest): Observable<Facility> {
    return from(this.createLocalFacility(request));
  }

  updateFacility(id: number | string, request: FacilityCreateRequest): Observable<Facility> {
    return from(this.updateLocalFacility(id, request));
  }

  deleteFacility(id: number | string): Observable<void> {
    return from(this.deleteLocalFacility(id));
  }

  private async loadLocalFacilities(): Promise<Facility[]> {
    const facilities = await this.repos.facilities.findActive();
    return facilities
      .map(fromLocalFacility)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private async loadFacility(id: number | string): Promise<Facility | null> {
    let local: LocalFacility | null = null;

    if (typeof id === 'string') {
      local = await this.repos.facilities.findById(id);
    } else if (id > 0) {
      local = await this.repos.facilities.findByServerId(id);
    }

    return local ? fromLocalFacility(local) : null;
  }

  private async upsertServerFacilities(facilities: Facility[]): Promise<void> {
    const now = new Date().toISOString();

    for (const f of facilities) {
      const existing = f.id ? await this.repos.facilities.findByServerId(f.id) : null;
      const local = toLocalFacility(f, existing ?? undefined);
      if (!existing && !local.id) {
        local.id = this.generateId();
      }
      local.serverId = f.id;
      local.syncStatus = 'synced';
      local.pendingOperation = 'NONE';
      local.lastSyncTime = now;
      local.createdAt = f.createdAt ?? now;
      local.updatedAt = f.createdAt ?? now;
      local.deletedAt = null;
      await this.repos.facilities.save(local);
    }
  }

  private async createLocalFacility(request: FacilityCreateRequest): Promise<Facility> {
    const now = new Date().toISOString();
    const local = toLocalFacility(request as any, undefined);
    local.id = this.generateId();
    local.syncStatus = 'pending';
    local.pendingOperation = 'CREATE';
    local.createdAt = now;
    local.updatedAt = now;
    await this.repos.facilities.save(local);

    this.triggerSync();
    return fromLocalFacility(local);
  }

  private async updateLocalFacility(id: number | string, request: FacilityCreateRequest): Promise<Facility> {
    let existing: LocalFacility | null = null;

    if (typeof id === 'string') {
      existing = await this.repos.facilities.findById(id);
    } else if (id > 0) {
      existing = await this.repos.facilities.findByServerId(id);
    }

    if (!existing) {
      throw new Error(`[FacilityService] Facility not found: ${id}`);
    }

    const now = new Date().toISOString();
    const local = toLocalFacility(request as any, existing);
    local.id = existing.id;
    local.serverId = existing.serverId;
    local.syncVersion = existing.syncVersion;
    local.syncStatus = 'pending';
    local.pendingOperation = 'UPDATE';
    local.createdAt = existing.createdAt;
    local.updatedAt = now;
    await this.repos.facilities.save(local);

    this.triggerSync();
    return fromLocalFacility(local);
  }

  private async deleteLocalFacility(id: number | string): Promise<void> {
    let existing: LocalFacility | null = null;

    if (typeof id === 'string') {
      existing = await this.repos.facilities.findById(id);
    } else if (id > 0) {
      existing = await this.repos.facilities.findByServerId(id);
    }

    if (!existing) {
      return;
    }

    await this.repos.facilities.softDelete(existing.id, new Date().toISOString());
    this.triggerSync();
  }

  private triggerSync(): void {
    Network.getStatus()
      .then((status) => {
        if (status.connected) {
          this.sync.sync().catch((e) => console.error('[FacilityService] sync error', e));
        }
      })
      .catch((e) => console.error('[FacilityService] network check error', e));
  }

  private generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
