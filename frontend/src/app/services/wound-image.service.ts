import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, from } from 'rxjs';
import { catchError, switchMap, map } from 'rxjs/operators';
import { Network } from '@capacitor/network';
import { environment } from '../../environments/environment';
import { WoundImage } from '../models/wound-image.model';
import { WoundPrediction } from '../models/wound-prediction.model';
import { Repositories } from '../data/repository/repositories';
import { SyncManagerService } from './sync/sync-manager.service';
import { toLocalWoundImage, fromLocalWoundImage } from '../data/mappers';

@Injectable({
  providedIn: 'root',
})
export class WoundImageService {
  private readonly apiUrl = `${environment.apiUrl}/patients`;

  constructor(
    private http: HttpClient,
    private repos: Repositories,
    private sync: SyncManagerService
  ) {}

  getWoundImages(patientId: number | string): Observable<WoundImage[]> {
    const local$ = from(this.loadLocalWoundImages(patientId));

    return local$.pipe(
      switchMap((images) =>
        from(Network.getStatus()).pipe(
          switchMap((status) => {
            if (!status.connected) {
              return of(images);
            }

            const numericId = typeof patientId === 'number' ? patientId : undefined;
            if (!numericId) {
              return of(images);
            }

            return this.http
              .get<{ woundImages: WoundImage[] }>(`${this.apiUrl}/${numericId}/wound-images`)
              .pipe(
                switchMap((res) => from(this.upsertServerWoundImages(res.woundImages ?? [], numericId))),
                switchMap(() => from(this.loadLocalWoundImages(patientId))),
                catchError(() => of(images))
              );
          })
        )
      )
    );
  }

  saveWoundImage(
    patientId: number | string,
    file: File,
    prediction: WoundPrediction
  ): Observable<WoundImage | null> {
    return from(this.saveLocalWoundImage(patientId, file, prediction));
  }

  private async loadLocalWoundImages(patientId: number | string): Promise<WoundImage[]> {
    const localPatientId = await this.resolveLocalPatientId(patientId);
    if (!localPatientId) {
      return [];
    }

    const images = await this.repos.woundImages.findActive([
      { field: 'patientId', value: localPatientId },
    ]);
    return images
      .map(fromLocalWoundImage)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  private async upsertServerWoundImages(images: WoundImage[], patientId: number): Promise<void> {
    const localPatientId = await this.resolveLocalPatientId(patientId);
    if (!localPatientId) {
      return;
    }

    const now = new Date().toISOString();
    for (const w of images) {
      const existing = w.id ? await this.repos.woundImages.findByServerId(w.id) : null;
      const local = toLocalWoundImage(w, localPatientId, existing ?? undefined);
      if (!existing && !local.id) {
        local.id = this.generateId();
      }
      local.serverId = w.id;
      local.syncStatus = 'synced';
      local.pendingOperation = 'NONE';
      local.lastSyncTime = now;
      local.createdAt = w.createdAt ?? now;
      local.updatedAt = w.createdAt ?? now;
      local.deletedAt = null;
      await this.repos.woundImages.save(local);
    }
  }

  private async saveLocalWoundImage(
    patientId: number | string,
    file: File,
    prediction: WoundPrediction
  ): Promise<WoundImage | null> {
    const localPatientId = await this.resolveLocalPatientId(patientId);
    if (!localPatientId) {
      throw new Error(`[WoundImageService] Cannot resolve local patient id for ${patientId}`);
    }

    const imageData = await this.fileToBase64(file);
    const now = new Date().toISOString();

    const w: WoundImage = {
      id: 0,
      clientUuid: this.generateId(),
      imageData,
      overlayData: prediction.overlay || null,
      originalFilename: file.name,
      predictionLabel: prediction.label ?? null,
      confidence: prediction.confidence ?? null,
      detected: prediction.detected ?? false,
      routeLabel: prediction.route_label ?? null,
      routeConf: prediction.route_conf ?? null,
      wagnerLabel: prediction.wagner_label ?? null,
      wagnerConf: prediction.wagner_conf ?? null,
      epuapLabel: prediction.epuap_label ?? null,
      epuapConf: prediction.epuap_conf ?? null,
      ceapLabel: prediction.ceap_label ?? null,
      ceapConf: prediction.ceap_conf ?? null,
      createdAt: now,
    };

    const local = toLocalWoundImage(w, localPatientId, undefined);
    local.id = w.clientUuid as string;
    local.syncStatus = 'pending';
    local.pendingOperation = 'CREATE';
    local.createdAt = now;
    local.updatedAt = now;
    await this.repos.woundImages.save(local);

    this.triggerSync();
    return fromLocalWoundImage(local);
  }

  private async resolveLocalPatientId(patientId: number | string): Promise<string | null> {
    if (typeof patientId === 'string') {
      const p = await this.repos.patients.findById(patientId);
      return p ? p.id : null;
    }

    const p = await this.repos.patients.findByServerId(patientId);
    return p ? p.id : null;
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  private triggerSync(): void {
    Network.getStatus()
      .then((status) => {
        if (status.connected) {
          this.sync.sync().catch((e) => console.error('[WoundImageService] sync error', e));
        }
      })
      .catch((e) => console.error('[WoundImageService] network check error', e));
  }

  private generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
