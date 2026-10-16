import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth.service';

export interface SyncChange {
  entityType: string;
  localId: string;
  operation: 'create' | 'update' | 'delete';
  version: number;
  payload: any;
}

export interface SyncPushRequest {
  clientId: string;
  lastPulledId?: number;
  changes: SyncChange[];
}

export interface SyncResult {
  localId: string;
  serverId: number | null;
  status: string;
  version: number;
  conflictData: any;
  message: string | null;
}

export interface SyncPullChange {
  id: number;
  entityType: string;
  entityId: number;
  clientUuid: string;
  operation: string;
  version: number;
  payload: any;
  createdAt: string;
}

export interface SyncPushResponse {
  results: SyncResult[];
  pulledChanges: SyncPullChange[];
  lastPulledId: number;
}

export interface SyncPullResponse {
  lastId: number;
  changes: SyncPullChange[];
}

@Injectable({
  providedIn: 'root',
})
export class SyncApiService {
  private readonly apiUrl = `${environment.apiUrl}/sync`;

  constructor(
    private http: HttpClient,
    private auth: AuthService
  ) {}

  push(request: SyncPushRequest): Observable<SyncPushResponse> {
    return this.http.post<SyncPushResponse>(`${this.apiUrl}/push`, request);
  }

  pull(lastId: number, types?: string[]): Observable<SyncPullResponse> {
    const params: any = { lastId };
    if (types && types.length) {
      params.types = types.join(',');
    }
    return this.http.get<SyncPullResponse>(`${this.apiUrl}/pull`, { params });
  }
}
