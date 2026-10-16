import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Repositories } from '../../data/repository/repositories';
import { DbService } from '../../data/services/db.service';
import { BaseLocalModel, LocalAppointment, LocalDoctor, LocalFacility, LocalInsuranceCompany, LocalOrder, LocalPatient, LocalProduct, LocalTerminWunsch, LocalWoundImage, LocalSyncMetadata } from '../../data/local/local.models';
import {
  SyncApiService,
  SyncChange,
  SyncPullChange,
  SyncResult,
} from './sync-api.service';
import {
  toLocalAppointment,
  toLocalDoctor,
  toLocalFacility,
  toLocalInsuranceCompany,
  toLocalOrder,
  toLocalPatient,
  toLocalProduct,
  toLocalTerminWunsch,
} from '../../data/mappers';

const ENTITY_TABLE_MAP: Record<string, keyof Repositories> = {
  patient: 'patients',
  wound_image: 'woundImages',
  appointment: 'appointments',
  order: 'orders',
  termin_wunsch: 'terminWuensche',
  facility: 'facilities',
  doctor: 'doctors',
  product: 'products',
  insurance_company: 'insuranceCompanies',
};

@Injectable({
  providedIn: 'root',
})
export class SyncManagerService {
  constructor(
    private api: SyncApiService,
    private repos: Repositories,
    private db: DbService
  ) {}

  async sync(): Promise<void> {
    await this.pull();
    const pushResult = await this.push();
    if (pushResult.pulledChanges?.length) {
      await this.applyPulledChanges(pushResult.pulledChanges);
    }
    await this.pull();
  }

  async pull(types?: string[]): Promise<number> {
    const lastPullId = await this.getLastPullId();
    const response = await firstValueFrom(this.api.pull(lastPullId, types));

    await this.applyPulledChanges(response.changes);

    if (response.lastId > lastPullId) {
      await this.setLastPullId(response.lastId);
    }

    await this.setMetadata('lastSyncAt', new Date().toISOString());
    return response.lastId;
  }

  async push(): Promise<{ pulledChanges: SyncPullChange[] }> {
    const changes = await this.collectPendingChanges();
    if (changes.length === 0) {
      const empty = await firstValueFrom(this.api.push({ clientId: await this.getClientId(), lastPulledId: await this.getLastPullId(), changes: [] }));
      await this.applyPulledChanges(empty.pulledChanges);
      if (empty.lastPulledId > (await this.getLastPullId())) {
        await this.setLastPullId(empty.lastPulledId);
      }
      return { pulledChanges: empty.pulledChanges };
    }

    const request = {
      clientId: await this.getClientId(),
      lastPulledId: await this.getLastPullId(),
      changes,
    };

    const response = await firstValueFrom(this.api.push(request));
    await this.applyPushResults(response.results, changes);
    await this.applyPulledChanges(response.pulledChanges);

    if (response.lastPulledId > (await this.getLastPullId())) {
      await this.setLastPullId(response.lastPulledId);
    }

    await this.setMetadata('lastPushAt', new Date().toISOString());
    return { pulledChanges: response.pulledChanges };
  }

  private async collectPendingChanges(): Promise<SyncChange[]> {
    const all: { entity: BaseLocalModel; table: string }[] = [];

    const add = async (table: keyof Repositories) => {
      const repo = this.repos[table] as any;
      const rows = await repo.findForPush();
      for (const r of rows as BaseLocalModel[]) {
        all.push({ entity: r, table: table as string });
      }
    };

    // Order matters: reference data and parents before children.
    await add('facilities');
    await add('doctors');
    await add('products');
    await add('insuranceCompanies');
    await add('patients');
    await add('appointments');
    await add('orders');
    await add('terminWuensche');
    await add('woundImages');

    return await Promise.all(all.map(async (item) => this.toSyncChange(item.entity, item.table)));
  }

  private async toSyncChange(entity: BaseLocalModel, table: string): Promise<SyncChange> {
    const entityType = this.tableToEntityType(table);
    const operation = this.pendingOperationToSyncOp(entity.pendingOperation);
    const payload = await this.toServerPayload(entity, entityType);

    return {
      entityType,
      localId: entity.id,
      operation,
      version: entity.syncVersion ?? 1,
      payload,
    };
  }

  private pendingOperationToSyncOp(op: string): 'create' | 'update' | 'delete' {
    switch (op) {
      case 'CREATE':
        return 'create';
      case 'DELETE':
        return 'delete';
      case 'UPDATE':
      default:
        return 'update';
    }
  }

  private async toServerPayload(entity: BaseLocalModel, entityType: string): Promise<any> {
    const payload: any = { ...entity };

    // Strip local-only sync metadata.
    delete payload.id;
    delete payload.serverId;
    delete payload.syncStatus;
    delete payload.syncVersion;
    delete payload.lastSyncTime;
    delete payload.pendingOperation;
    delete payload.createdAt;
    delete payload.updatedAt;
    delete payload.deletedAt;

    switch (entityType) {
      case 'appointment': {
        const a = entity as LocalAppointment;
        delete payload.patientId;
        if (a.patientId) {
          payload.patientServerId = a.patientId;
        } else if (a.patientLocalId) {
          payload.patientLocalId = a.patientLocalId;
        }
        break;
      }
      case 'wound_image': {
        const w = entity as LocalWoundImage;
        delete payload.patientId;
        delete payload.patient;
        if (w.patientId) {
          const patient = await this.repos.patients.findById(w.patientId);
          if (patient?.serverId) {
            payload.patientServerId = patient.serverId;
          } else {
            payload.patientLocalId = w.patientId;
          }
        }
        break;
      }
      case 'order': {
        const o = entity as LocalOrder;
        delete payload.patientLocalId;
        if (o.patientLocalId) {
          const patient = await this.repos.patients.findById(o.patientLocalId);
          if (patient?.serverId) {
            payload.patientServerId = patient.serverId;
          } else {
            payload.patientLocalId = o.patientLocalId;
          }
        }
        break;
      }
      case 'termin_wunsch': {
        const t = entity as LocalTerminWunsch;
        delete payload.patientId;
        if (t.patientId) {
          payload.patientServerId = t.patientId;
        } else if (t.patientLocalId) {
          payload.patientLocalId = t.patientLocalId;
        }
        break;
      }
    }

    return payload;
  }

  private tableToEntityType(table: string): string {
    const map: Record<string, string> = {
      patients: 'patient',
      appointments: 'appointment',
      orders: 'order',
      doctors: 'doctor',
      facilities: 'facility',
      terminWuensche: 'termin_wunsch',
      products: 'product',
      insuranceCompanies: 'insurance_company',
      woundImages: 'wound_image',
    };
    return map[table] ?? table;
  }

  private async applyPulledChanges(changes: SyncPullChange[]): Promise<void> {
    const now = new Date().toISOString();

    for (const change of changes) {
      await this.applyPulledChange(change, now);
    }
  }

  private async applyPulledChange(change: SyncPullChange, now: string): Promise<void> {
    const table = ENTITY_TABLE_MAP[change.entityType];
    if (!table) return;

    const repo = this.repos[table] as any;
    let existing = await repo.findByServerId(change.entityId);
    if (!existing && change.clientUuid) {
      existing = await repo.findById(change.clientUuid);
    }

    const isDelete = change.operation === 'delete';
    const localId = existing?.id ?? this.generateId();

    let local: BaseLocalModel;

    switch (change.entityType) {
      case 'patient':
        local = this.patchBase(
          toLocalPatient(change.payload, existing as LocalPatient),
          change,
          localId,
          now,
          isDelete
        ) as BaseLocalModel;
        break;
      case 'appointment':
        local = this.patchBase(
          toLocalAppointment(change.payload, existing as LocalAppointment),
          change,
          localId,
          now,
          isDelete
        ) as BaseLocalModel;
        break;
      case 'order':
        local = this.patchBase(
          toLocalOrder(change.payload, existing as LocalOrder),
          change,
          localId,
          now,
          isDelete
        ) as BaseLocalModel;
        break;
      case 'doctor':
        local = this.patchBase(
          toLocalDoctor(change.payload, existing as LocalDoctor),
          change,
          localId,
          now,
          isDelete
        ) as BaseLocalModel;
        break;
      case 'facility':
        local = this.patchBase(
          toLocalFacility(change.payload, existing as LocalFacility),
          change,
          localId,
          now,
          isDelete
        ) as BaseLocalModel;
        break;
      case 'termin_wunsch':
        local = this.patchBase(
          toLocalTerminWunsch(change.payload, existing as LocalTerminWunsch),
          change,
          localId,
          now,
          isDelete
        ) as BaseLocalModel;
        break;
      case 'product':
        local = this.patchBase(
          toLocalProduct(change.payload, existing as LocalProduct),
          change,
          localId,
          now,
          isDelete
        ) as BaseLocalModel;
        break;
      case 'insurance_company':
        local = this.patchBase(
          toLocalInsuranceCompany(change.payload, existing as LocalInsuranceCompany),
          change,
          localId,
          now,
          isDelete
        ) as BaseLocalModel;
        break;
      case 'wound_image':
        local = await this.toLocalWoundImage(change.payload, existing as LocalWoundImage, change, localId, now, isDelete);
        break;
      default:
        return;
    }

    await repo.save(local);

    if (change.entityType === 'patient') {
      await this.rewriteChildPatientRefs(local as LocalPatient, now);
    }
  }

  private patchBase<T extends BaseLocalModel>(
    local: T,
    change: SyncPullChange,
    id: string,
    now: string,
    isDelete: boolean
  ): T {
    local.id = id;
    local.serverId = change.entityId;
    local.syncVersion = change.version;
    local.syncStatus = 'synced';
    local.pendingOperation = 'NONE';
    local.lastSyncTime = now;
    local.updatedAt = now;
    if (!local.createdAt) {
      local.createdAt = now;
    }
    local.deletedAt = isDelete ? now : (change.payload?.deletedAt ?? null);
    return local;
  }

  private async toLocalWoundImage(
    payload: any,
    existing: LocalWoundImage | undefined,
    change: SyncPullChange,
    id: string,
    now: string,
    isDelete: boolean
  ): Promise<LocalWoundImage> {
    const base = existing ?? ({
      id: '',
      serverId: null,
      patientId: null,
      imageData: undefined,
      overlayData: undefined,
      originalFilename: undefined,
      predictionLabel: undefined,
      confidence: undefined,
      detected: false,
      syncStatus: 'pending',
      syncVersion: 1,
      lastSyncTime: null,
      createdAt: '',
      updatedAt: '',
      deletedAt: null,
      pendingOperation: 'NONE',
    } as unknown as LocalWoundImage);

    const local: LocalWoundImage = {
      ...base,
      imageData: payload.imageData ?? base.imageData,
      overlayData: payload.overlayData ?? base.overlayData,
      originalFilename: payload.originalFilename ?? base.originalFilename,
      predictionLabel: payload.predictionLabel ?? base.predictionLabel,
      confidence: payload.confidence ?? base.confidence,
      detected: payload.detected ?? base.detected,
      routeLabel: payload.routeLabel ?? base.routeLabel,
      routeConf: payload.routeConf ?? base.routeConf,
      wagnerLabel: payload.wagnerLabel ?? base.wagnerLabel,
      wagnerConf: payload.wagnerConf ?? base.wagnerConf,
      epuapLabel: payload.epuapLabel ?? base.epuapLabel,
      epuapConf: payload.epuapConf ?? base.epuapConf,
      ceapLabel: payload.ceapLabel ?? base.ceapLabel,
      ceapConf: payload.ceapConf ?? base.ceapConf,
      serverImagePath: payload.imagePath ?? base.serverImagePath,
    };

    if (payload.patientId) {
      const patient = await this.repos.patients.findByServerId(payload.patientId);
      local.patientId = patient?.id ?? null;
    } else if (payload.patientLocalId) {
      const patient = await this.repos.patients.findById(payload.patientLocalId);
      local.patientId = patient?.id ?? null;
    } else if (payload.patient) {
      const name = payload.patient.trim().toLowerCase();
      const patients = await this.repos.patients.findActive();
      const matched = patients.find(
        (p: LocalPatient) =>
          `${(p.firstName ?? '').trim().toLowerCase()} ${(p.lastName ?? '').trim().toLowerCase()}`.trim() === name
      );
      local.patientId = matched?.id ?? null;
    }

    return this.patchBase(local, change, id, now, isDelete) as LocalWoundImage;
  }

  private async rewriteChildPatientRefs(patient: LocalPatient, now: string): Promise<void> {
    if (!patient.serverId) return;

    await this.db.run(
      `UPDATE appointments SET patientId = ?, updatedAt = ? WHERE patientLocalId = ?`,
      [patient.serverId, now, patient.id],
      true
    );
    await this.db.run(
      `UPDATE terminWuensche SET patientId = ?, updatedAt = ? WHERE patientLocalId = ?`,
      [patient.serverId, now, patient.id],
      true
    );
  }

  private async applyPushResults(results: SyncResult[], changes: SyncChange[]): Promise<void> {
    const now = new Date().toISOString();

    for (const result of results) {
      const original = changes.find((c) => c.localId === result.localId);
      if (!original) continue;

      const table = ENTITY_TABLE_MAP[original.entityType] as keyof Repositories;
      const repo = this.repos[table] as any;

      if (result.status === 'ok') {
        await repo.markSynced(
          result.localId,
          result.serverId,
          result.version,
          now
        );

        if (original.entityType === 'patient' && result.serverId) {
          await this.rewriteChildPatientRefs(
            { id: result.localId, serverId: result.serverId } as LocalPatient,
            now
          );
        }
      } else if (result.status === 'conflict' && result.conflictData) {
        await repo.setSyncStatus(result.localId, 'failed');
      } else {
        await repo.setSyncStatus(result.localId, 'failed');
      }
    }
  }

  private async getClientId(): Promise<string> {
    const meta = await this.getMetadata('__device');
    if (meta?.lastPullAt) {
      return meta.lastPullAt;
    }
    const id = this.generateId();
    await this.db.run(
      `INSERT OR REPLACE INTO syncMetadata (tableName, lastPullAt) VALUES (?, ?)`,
      ['__device', id],
      true
    );
    return id;
  }

  private async getLastPullId(): Promise<number> {
    const meta = await this.getMetadata('__sync');
    return meta?.lastPullId ?? 0;
  }

  private async setLastPullId(id: number): Promise<void> {
    await this.db.run(
      `INSERT OR REPLACE INTO syncMetadata (tableName, lastPullId, lastSyncAt) VALUES (?, ?, ?)`,
      ['__sync', id, new Date().toISOString()],
      true
    );
  }

  private async getMetadata(tableName: string): Promise<LocalSyncMetadata | null> {
    const rows = await this.db.query<LocalSyncMetadata>(
      `SELECT * FROM syncMetadata WHERE tableName = ?`,
      [tableName]
    );
    return rows[0] ?? null;
  }

  private generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private async setMetadata(key: 'lastPullAt' | 'lastPushAt' | 'lastSyncAt', value: string): Promise<void> {
    const existing = await this.getMetadata('__sync');
    const current = existing ?? { tableName: '__sync' } as LocalSyncMetadata;
    (current as any)[key] = value;
    await this.db.run(
      `INSERT OR REPLACE INTO syncMetadata (tableName, lastPullAt, lastPushAt, lastSyncAt, lastPullId) VALUES (?, ?, ?, ?, ?)`,
      [current.tableName, current.lastPullAt ?? null, current.lastPushAt ?? null, current.lastSyncAt ?? null, current.lastPullId ?? null],
      true
    );
  }
}
