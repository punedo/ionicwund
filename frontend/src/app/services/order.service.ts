import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, from, firstValueFrom } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { Network } from '@capacitor/network';
import { environment } from '../../environments/environment';
import { Order, OrderCreateRequest } from '../models/order.model';
import { Repositories } from '../data/repository/repositories';
import { SyncManagerService } from './sync/sync-manager.service';
import { PatientService } from './patient.service';
import { toLocalOrder, fromLocalOrder } from '../data/mappers';
import { LocalOrder, LocalFacility, LocalProduct } from '../data/local/local.models';

export interface ProductOption {
  name: string;
  unit: string;
}

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private readonly apiUrl = `${environment.apiUrl}/orders`;

  constructor(
    private http: HttpClient,
    private repos: Repositories,
    private sync: SyncManagerService,
    private patientService: PatientService
  ) {}

  getOrders(): Observable<Order[]> {
    const local$ = from(this.loadLocalOrders());

    return local$.pipe(
      switchMap((orders) =>
        from(Network.getStatus()).pipe(
          switchMap((status) => {
            if (!status.connected) {
              return of(orders);
            }

            return this.http.get<{ orders: Order[] }>(this.apiUrl).pipe(
              switchMap((res) => from(this.upsertServerOrders(res.orders ?? []))),
              switchMap(() => from(this.loadLocalOrders())),
              catchError(() => of(orders))
            );
          })
        )
      )
    );
  }

  createOrder(request: OrderCreateRequest): Observable<Order> {
    // Directly call API in browser development
    return this.http.post<Order>(this.apiUrl, request).pipe(
      catchError((err) => {
        console.error('[OrderService] Failed to create order:', err);
        throw err;
      })
    );
  }

  getFacilities(): Observable<string[]> {
    const local$ = from(this.loadLocalFacilityNames());

    return local$.pipe(
      switchMap((names) =>
        from(Network.getStatus()).pipe(
          switchMap((status) => {
            if (!status.connected) {
              return of(names);
            }

            return this.http.get<{ facilities: { name: string }[] }>(`${environment.apiUrl}/facilities`).pipe(
              switchMap((res) => from(this.upsertServerFacilities(res.facilities ?? []))),
              switchMap(() => from(this.loadLocalFacilityNames())),
              catchError(() => of(names))
            );
          })
        )
      )
    );
  }

  getPatients(): Observable<string[]> {
    return this.patientService.getPatients().pipe(
      map((patients) =>
        patients.map((p) => `${p.lastName}, ${p.firstName}`)
      ),
      catchError(() => of([]))
    );
  }

  getProducts(): Observable<ProductOption[]> {
    const local$ = from(this.loadLocalProducts());

    return local$.pipe(
      switchMap((products) =>
        from(Network.getStatus()).pipe(
          switchMap((status) => {
            if (!status.connected) {
              return of(products);
            }

            return this.http.get<{ products: ProductOption[] }>(`${environment.apiUrl}/products`).pipe(
              switchMap((res) => from(this.upsertServerProducts(res.products ?? []))),
              switchMap(() => from(this.loadLocalProducts())),
              catchError(() => of(products))
            );
          })
        )
      )
    );
  }

  private async loadLocalOrders(): Promise<Order[]> {
    const orders = await this.repos.orders.findActive();
    return orders
      .map(fromLocalOrder)
      .sort((a, b) => (b.orderNumber ?? '').localeCompare(a.orderNumber ?? '') || (a.createdAt ?? '').localeCompare(b.createdAt ?? ''));
  }

  private async upsertServerOrders(orders: Order[]): Promise<void> {
    const now = new Date().toISOString();

    for (const o of orders) {
      const existing = o.id ? await this.repos.orders.findByServerId(o.id) : null;
      const local = toLocalOrder(o, existing ?? undefined);
      if (!existing && !local.id) {
        local.id = this.generateId();
      }
      local.serverId = o.id;
      local.syncStatus = 'synced';
      local.pendingOperation = 'NONE';
      local.lastSyncTime = now;
      local.updatedAt = o.createdAt ?? now;
      local.createdAt = o.createdAt ?? now;
      local.deletedAt = null;
      await this.repos.orders.save(local);
    }
  }

  private async createLocalOrder(request: OrderCreateRequest): Promise<Order> {
    const now = new Date().toISOString();
    const local = toLocalOrder(request, undefined);
    local.id = this.generateId();
    local.syncStatus = 'pending';
    local.pendingOperation = 'CREATE';
    local.createdAt = now;
    local.updatedAt = now;

    if (request.patient) {
      const patients = await this.repos.patients.findActive();
      const name = request.patient.trim().toLowerCase();
      const matched = patients.find(
        (p) => `${p.lastName}, ${p.firstName}`.trim().toLowerCase() === name
      );
      if (matched) {
        local.patientLocalId = matched.id;
      }
    }

    await this.repos.orders.save(local);

    this.triggerSync();
    return fromLocalOrder(local);
  }

  private async loadLocalFacilityNames(): Promise<string[]> {
    const facilities = await this.repos.facilities.findActive();
    return facilities.map((f) => f.name).sort();
  }

  private async upsertServerFacilities(facilities: { name: string }[]): Promise<void> {
    const now = new Date().toISOString();

    for (const f of facilities) {
      const existing = await this.repos.facilities.findByField('name', f.name);
      if (existing) {
        continue;
      }
      const local: LocalFacility = {
        id: this.generateId(),
        serverId: null,
        name: f.name,
        type: undefined,
        city: undefined,
        status: undefined,
        patientCount: null,
        careServices: [] as string[],
        syncStatus: 'synced',
        syncVersion: 1,
        pendingOperation: 'NONE',
        lastSyncTime: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      await this.repos.facilities.save(local);
    }
  }

  private async loadLocalProducts(): Promise<ProductOption[]> {
    const products = await this.repos.products.findActive();
    return products.map((p) => ({ name: p.name, unit: p.unit ?? '' }));
  }

  private async upsertServerProducts(products: ProductOption[]): Promise<void> {
    const now = new Date().toISOString();

    for (const p of products) {
      const existing = await this.repos.products.findByField('name', p.name);
      if (existing) {
        continue;
      }
      const local: LocalProduct = {
        id: this.generateId(),
        serverId: null,
        name: p.name,
        unit: p.unit,
        category: undefined,
        syncStatus: 'synced',
        syncVersion: 1,
        pendingOperation: 'NONE',
        lastSyncTime: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      await this.repos.products.save(local);
    }
  }

  private triggerSync(): void {
    Network.getStatus()
      .then((status) => {
        if (status.connected) {
          this.sync.sync().catch((e) => console.error('[OrderService] sync error', e));
        }
      })
      .catch((e) => console.error('[OrderService] network check error', e));
  }

  private generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
