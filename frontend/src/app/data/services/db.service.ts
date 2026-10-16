import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { SqlJsAdapter } from './sql-js-adapter';

@Injectable({
  providedIn: 'root',
})
export class DbService {
  private sqlite = new SQLiteConnection(CapacitorSQLite);
  private db: SQLiteDBConnection | SqlJsAdapter | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInit();
    return this.initPromise;
  }

  private async doInit(): Promise<void> {
    if (Capacitor.getPlatform() === 'web') {
      // The jeep-sqlite web component frequently fails to register in the DOM,
      // so use sql.js directly in the browser for a reliable offline SQLite.
      this.db = new SqlJsAdapter();
      await this.db.init();
      await this.db.open();
      await this.createTables();
      return;
    }

    this.db = await this.sqlite.createConnection(
      'ionicwund',
      false,
      'no-encryption',
      1,
      false
    );

    await this.db.open();
    await this.createTables();
    return;
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }

  async query<T = any>(sql: string, values: any[] = []): Promise<T[]> {
    await this.init();
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    const result = await this.db.query(sql, values);
    return (result.values as T[]) ?? [];
  }

  async run(sql: string, values: any[] = [], transaction = true): Promise<number> {
    await this.init();
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    const result = await this.db.run(sql, values, transaction);
    return result.changes?.changes ?? 0;
  }

  async execute(statements: string | string[], transaction = true): Promise<void> {
    await this.init();
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    const sql = Array.isArray(statements) ? statements.join('\n') : statements;
    await this.db.execute(sql, transaction);
  }

  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    await this.init();
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    await this.db.beginTransaction();
    try {
      const result = await callback();
      await this.db.commitTransaction();
      return result;
    } catch (e) {
      await this.db.rollbackTransaction();
      throw e;
    }
  }

  async getCacheItem<T>(key: string): Promise<T | null> {
    const rows = await this.query<{ value: string }>('SELECT value FROM secureStore WHERE key = ?', [key]);
    const value = rows[0]?.value;
    if (!value) {
      return null;
    }
    try {
      return JSON.parse(value) as T;
    } catch (e) {
      console.error(`[DbService] Failed to parse cache item ${key}`, e);
      return null;
    }
  }

  async setCacheItem<T>(key: string, value: T): Promise<void> {
    await this.run(
      'INSERT OR REPLACE INTO secureStore (key, value, updatedAt) VALUES (?, ?, ?)',
      [key, JSON.stringify(value), new Date().toISOString()],
      true
    );
  }

  private async createTables(): Promise<void> {
    if (!this.db) return;

    const statements = [
      `CREATE TABLE IF NOT EXISTS patients (
        id TEXT PRIMARY KEY NOT NULL,
        serverId INTEGER,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        dateOfBirth TEXT,
        gender TEXT,
        street TEXT,
        houseNumber TEXT,
        zip TEXT,
        city TEXT,
        phone TEXT,
        insuranceNumber TEXT,
        insuranceType TEXT,
        insuranceCompany TEXT,
        insuranceClass TEXT,
        treatingDoctor TEXT,
        additionalService TEXT,
        responsibleCareService TEXT,
        responsibleWoundExpert TEXT,
        facility TEXT,
        woundType TEXT,
        score TEXT,
        responsible TEXT,
        lastDocumentedAt TEXT,
        status TEXT DEFAULT 'neu',
        syncStatus TEXT NOT NULL DEFAULT 'pending',
        syncVersion INTEGER DEFAULT 1,
        lastSyncTime TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        deletedAt TEXT,
        pendingOperation TEXT NOT NULL DEFAULT 'NONE'
      );`,
      `CREATE INDEX IF NOT EXISTS idx_patients_sync ON patients(syncStatus);`,
      `CREATE INDEX IF NOT EXISTS idx_patients_server ON patients(serverId);`,
      `CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(lastName, firstName);`,

      `CREATE TABLE IF NOT EXISTS appointments (
        id TEXT PRIMARY KEY NOT NULL,
        serverId INTEGER,
        patientId INTEGER,
        patientLocalId TEXT,
        patientName TEXT,
        date TEXT NOT NULL,
        startTime TEXT,
        endTime TEXT,
        serviceType TEXT,
        address TEXT,
        tour TEXT,
        repetition TEXT,
        status TEXT,
        recordedAt TEXT,
        syncStatus TEXT NOT NULL DEFAULT 'pending',
        syncVersion INTEGER DEFAULT 1,
        lastSyncTime TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        deletedAt TEXT,
        pendingOperation TEXT NOT NULL DEFAULT 'NONE'
      );`,
      `CREATE INDEX IF NOT EXISTS idx_appointments_sync ON appointments(syncStatus);`,
      `CREATE INDEX IF NOT EXISTS idx_appointments_server ON appointments(serverId);`,
      `CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patientId);`,

      `CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY NOT NULL,
        serverId INTEGER,
        patient TEXT,
        patientLocalId TEXT,
        orderNumber TEXT,
        orderDate TEXT,
        type TEXT NOT NULL,
        facility TEXT,
        livingArea TEXT,
        desiredDeliveryDate TEXT,
        items TEXT,
        status TEXT,
        syncStatus TEXT NOT NULL DEFAULT 'pending',
        syncVersion INTEGER DEFAULT 1,
        lastSyncTime TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        deletedAt TEXT,
        pendingOperation TEXT NOT NULL DEFAULT 'NONE'
      );`,
      `CREATE INDEX IF NOT EXISTS idx_orders_sync ON orders(syncStatus);`,
      `CREATE INDEX IF NOT EXISTS idx_orders_server ON orders(serverId);`,

      `CREATE TABLE IF NOT EXISTS doctors (
        id TEXT PRIMARY KEY NOT NULL,
        serverId INTEGER,
        name TEXT NOT NULL,
        type TEXT,
        city TEXT,
        phone TEXT,
        email TEXT,
        status TEXT,
        facilityId TEXT,
        facility TEXT,
        syncStatus TEXT NOT NULL DEFAULT 'pending',
        syncVersion INTEGER DEFAULT 1,
        lastSyncTime TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        deletedAt TEXT,
        pendingOperation TEXT NOT NULL DEFAULT 'NONE'
      );`,
      `CREATE INDEX IF NOT EXISTS idx_doctors_sync ON doctors(syncStatus);`,

      `CREATE TABLE IF NOT EXISTS facilities (
        id TEXT PRIMARY KEY NOT NULL,
        serverId INTEGER,
        name TEXT NOT NULL,
        type TEXT,
        city TEXT,
        status TEXT,
        patientCount INTEGER,
        careServices TEXT,
        syncStatus TEXT NOT NULL DEFAULT 'pending',
        syncVersion INTEGER DEFAULT 1,
        lastSyncTime TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        deletedAt TEXT,
        pendingOperation TEXT NOT NULL DEFAULT 'NONE'
      );`,
      `CREATE INDEX IF NOT EXISTS idx_facilities_sync ON facilities(syncStatus);`,

      `CREATE TABLE IF NOT EXISTS terminWuensche (
        id TEXT PRIMARY KEY NOT NULL,
        serverId INTEGER,
        patientId INTEGER,
        patientLocalId TEXT,
        patientName TEXT,
        preferredDate TEXT NOT NULL,
        preferredTime TEXT,
        notes TEXT,
        status TEXT,
        reviewedBy TEXT,
        reviewedAt TEXT,
        reviewNotes TEXT,
        convertedAppointmentId TEXT,
        syncStatus TEXT NOT NULL DEFAULT 'pending',
        syncVersion INTEGER DEFAULT 1,
        lastSyncTime TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        deletedAt TEXT,
        pendingOperation TEXT NOT NULL DEFAULT 'NONE'
      );`,
      `CREATE INDEX IF NOT EXISTS idx_terminWuensche_sync ON terminWuensche(syncStatus);`,

      `CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY NOT NULL,
        serverId INTEGER,
        name TEXT NOT NULL,
        unit TEXT,
        category TEXT,
        syncStatus TEXT NOT NULL DEFAULT 'pending',
        syncVersion INTEGER DEFAULT 1,
        lastSyncTime TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        deletedAt TEXT,
        pendingOperation TEXT NOT NULL DEFAULT 'NONE'
      );`,

      `CREATE TABLE IF NOT EXISTS insuranceCompanies (
        id TEXT PRIMARY KEY NOT NULL,
        serverId INTEGER,
        name TEXT NOT NULL,
        type TEXT,
        syncStatus TEXT NOT NULL DEFAULT 'pending',
        syncVersion INTEGER DEFAULT 1,
        lastSyncTime TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        deletedAt TEXT,
        pendingOperation TEXT NOT NULL DEFAULT 'NONE'
      );`,

      `CREATE TABLE IF NOT EXISTS woundImages (
        id TEXT PRIMARY KEY NOT NULL,
        serverId INTEGER,
        patientId TEXT,
        imageData TEXT,
        overlayData TEXT,
        originalFilename TEXT,
        predictionLabel TEXT,
        confidence REAL,
        detected INTEGER,
        routeLabel TEXT,
        routeConf REAL,
        wagnerLabel TEXT,
        wagnerConf REAL,
        epuapLabel TEXT,
        epuapConf REAL,
        ceapLabel TEXT,
        ceapConf REAL,
        localImageUri TEXT,
        serverImagePath TEXT,
        syncStatus TEXT NOT NULL DEFAULT 'pending',
        syncVersion INTEGER DEFAULT 1,
        lastSyncTime TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        deletedAt TEXT,
        pendingOperation TEXT NOT NULL DEFAULT 'NONE'
      );`,
      `CREATE INDEX IF NOT EXISTS idx_woundImages_patient ON woundImages(patientId);`,
      `CREATE INDEX IF NOT EXISTS idx_woundImages_sync ON woundImages(syncStatus);`,

      `CREATE TABLE IF NOT EXISTS syncQueue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tableName TEXT NOT NULL,
        entityId TEXT NOT NULL,
        action TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        retries INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL
      );`,
      `CREATE INDEX IF NOT EXISTS idx_syncQueue_status ON syncQueue(status);`,
      `CREATE INDEX IF NOT EXISTS idx_syncQueue_entity ON syncQueue(tableName, entityId);`,

      `CREATE TABLE IF NOT EXISTS offlineQueue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        method TEXT NOT NULL,
        url TEXT NOT NULL,
        headers TEXT,
        body TEXT,
        status TEXT NOT NULL DEFAULT 'PENDING',
        retries INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL
      );`,
      `CREATE INDEX IF NOT EXISTS idx_offlineQueue_status ON offlineQueue(status);`,

      `CREATE TABLE IF NOT EXISTS httpCache (
        key TEXT PRIMARY KEY NOT NULL,
        url TEXT NOT NULL,
        status INTEGER NOT NULL,
        statusText TEXT,
        headers TEXT,
        body TEXT NOT NULL,
        cachedAt TEXT NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS syncMetadata (
        tableName TEXT PRIMARY KEY NOT NULL,
        lastPullAt TEXT,
        lastPushAt TEXT,
        lastSyncAt TEXT,
        lastPullId INTEGER
      );`,

      `CREATE TABLE IF NOT EXISTS secureStore (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );`,
    ];

    await this.execute(statements, false);
  }
}
