/**
 * Local SQLite entity models used by the offline-first layer.
 *
 * Every entity extends BaseLocalModel and carries:
 *   - id            local UUID (primary key)
 *   - serverId      server-assigned integer id after sync
 *   - syncStatus    pending | synced | failed
 *   - lastSyncTime  ISO 8601 timestamp of the last successful sync
 *   - createdAt     local creation timestamp
 *   - updatedAt     local update timestamp
 *   - deletedAt     soft-delete timestamp
 *   - pendingOperation NONE | CREATE | UPDATE | DELETE
 */

export type SyncStatus = 'pending' | 'synced' | 'failed';
export type PendingOperation = 'NONE' | 'CREATE' | 'UPDATE' | 'DELETE';

export interface BaseLocalModel {
  id: string;
  serverId: number | null;
  syncStatus: SyncStatus;
  syncVersion?: number;
  lastSyncTime: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  pendingOperation: PendingOperation;
}

export interface LocalPatient extends BaseLocalModel {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: string;
  street?: string;
  houseNumber?: string;
  zip?: string;
  city?: string;
  phone?: string;
  insuranceNumber?: string;
  insuranceType?: string;
  insuranceCompany?: string;
  insuranceClass?: string;
  treatingDoctor?: string;
  additionalService?: string;
  responsibleCareService?: string;
  responsibleWoundExpert?: string;
  facility?: string;
  woundType?: string;
  score?: string;
  responsible?: string[];
  lastDocumentedAt?: string;
  status?: string;
}

export interface LocalAppointment extends BaseLocalModel {
  patientId: number | null;
  patientLocalId?: string | null;
  patientName?: string;
  date: string;
  startTime: string;
  endTime: string;
  serviceType: string;
  address?: string;
  tour?: string;
  repetition?: string;
  status?: string;
  recordedAt?: string;
}

export interface LocalOrder extends BaseLocalModel {
  orderNumber?: string;
  orderDate?: string;
  type: string;
  facility?: string;
  livingArea?: string;
  patient?: string;
  patientLocalId?: string | null;
  desiredDeliveryDate?: string;
  items: string; // JSON string
  status?: string;
}

export interface LocalDoctor extends BaseLocalModel {
  name: string;
  type?: string;
  city?: string;
  phone?: string;
  email?: string;
  status?: string;
  facilityId?: string;
  facility?: string;
}

export interface LocalFacility extends BaseLocalModel {
  name: string;
  type?: string;
  city?: string;
  status?: string;
  patientCount?: number | null;
  careServices?: string[];
}

export interface LocalTerminWunsch extends BaseLocalModel {
  patientId?: number | null;
  patientLocalId?: string | null;
  patientName?: string;
  preferredDate: string;
  preferredTime?: string;
  notes?: string;
  status?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  convertedAppointmentId?: string;
}

export interface LocalProduct extends BaseLocalModel {
  name: string;
  unit?: string;
  category?: string;
}

export interface LocalInsuranceCompany extends BaseLocalModel {
  name: string;
  type?: string;
}

export interface LocalWoundImage extends BaseLocalModel {
  patientId: string | null; // local patient id
  imageData?: string; // base64
  overlayData?: string;
  originalFilename?: string;
  predictionLabel?: string;
  confidence?: number;
  detected?: boolean;
  routeLabel?: string;
  routeConf?: number;
  wagnerLabel?: string;
  wagnerConf?: number;
  epuapLabel?: string;
  epuapConf?: number;
  ceapLabel?: string;
  ceapConf?: number;
  localImageUri?: string;
  serverImagePath?: string;
}

export interface LocalSyncQueue {
  id?: number;
  tableName: string;
  entityId: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  payload: string;
  status: 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';
  retries: number;
  createdAt: string;
}

export interface LocalOfflineQueue {
  id?: number;
  method: string;
  url: string;
  headers?: string;
  body?: string;
  status: 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';
  retries: number;
  createdAt: string;
}

export interface LocalHttpCache {
  key: string;
  url: string;
  status: number;
  statusText?: string;
  headers?: string;
  body: string;
  cachedAt: string;
}

export interface LocalSyncMetadata {
  tableName: string;
  lastPullAt?: string | null;
  lastPushAt?: string | null;
  lastSyncAt?: string | null;
  lastPullId?: number | null;
}
