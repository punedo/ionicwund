/* eslint-disable @typescript-eslint/no-explicit-any */
import initSqlJs from 'sql.js';

const DB_OBJECT_STORE = 'db';
const DB_KEY = 'ionicwund';
const SAVE_DEBOUNCE_MS = 800;

interface SqliteResult {
  changes: { changes: number };
}

export class SqlJsAdapter {
  private SQL!: any;
  private db!: any;
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;

  async init(): Promise<void> {
    this.SQL = await initSqlJs({
      locateFile: (file: string) => {
        const base = document.baseURI || `${location.protocol}//${location.host}/`;
        return new URL(`assets/${file}`, base).href;
      },
    });

    const saved = await this.loadFromIndexedDB();
    if (saved) {
      this.db = new this.SQL.Database(new Uint8Array(saved));
    } else {
      this.db = new this.SQL.Database();
    }
  }

  async open(): Promise<void> {
    // The database is already open once init() resolves.
    return;
  }

  async close(): Promise<void> {
    this.flushSave();
    this.db = null;
  }

  async query<T = any>(sql: string, values: any[] = []): Promise<{ values: T[] }> {
    const stmt = this.db.prepare(sql);
    try {
      stmt.bind(values ?? []);
      const rows: T[] = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject() as T);
      }
      return { values: rows };
    } finally {
      stmt.free();
    }
  }

  async run(sql: string, values: any[] = [], _transaction = true): Promise<SqliteResult> {
    this.db.run(sql, values ?? []);
    const changes = this.db.getRowsModified() as number;
    this.scheduleSave();
    return { changes: { changes } };
  }

  async execute(statements: string | string[], _transaction = true): Promise<SqliteResult> {
    const sql = Array.isArray(statements) ? statements.join('\n') : statements;
    this.db.exec(sql);
    const changes = this.db.getRowsModified() as number;
    this.scheduleSave();
    return { changes: { changes } };
  }

  async beginTransaction(): Promise<SqliteResult> {
    this.db.run('BEGIN');
    return { changes: { changes: 0 } };
  }

  async commitTransaction(): Promise<SqliteResult> {
    this.db.run('COMMIT');
    this.flushSave();
    return { changes: { changes: 0 } };
  }

  async rollbackTransaction(): Promise<SqliteResult> {
    this.db.run('ROLLBACK');
    return { changes: { changes: 0 } };
  }

  async isTable(table: string): Promise<boolean> {
    const { values } = await this.query<{ count: number }>(
      `SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name=?`,
      [table]
    );
    return (values[0]?.count ?? 0) > 0;
  }

  async isDBOpen(): Promise<boolean> {
    return !!this.db;
  }

  async isDBExists(): Promise<boolean> {
    return !!(await this.loadFromIndexedDB());
  }

  async deleteDatabase(): Promise<void> {
    await this.clearIndexedDB();
    this.db = null;
  }

  export(): Uint8Array {
    return this.db.export() as Uint8Array;
  }

  private scheduleSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => this.flushSave(), SAVE_DEBOUNCE_MS);
  }

  private flushSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    this.saveToIndexedDB(this.export()).catch((e) =>
      console.error('[SqlJsAdapter] IndexedDB save failed', e)
    );
  }

  private openIndexedDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_KEY, 1);
      req.onupgradeneeded = () => {
        const database = req.result;
        if (!database.objectStoreNames.contains(DB_OBJECT_STORE)) {
          database.createObjectStore(DB_OBJECT_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  private async loadFromIndexedDB(): Promise<ArrayBuffer | null> {
    const database = await this.openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(DB_OBJECT_STORE, 'readonly');
      const store = tx.objectStore(DB_OBJECT_STORE);
      const req = store.get(DB_KEY);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  }

  private async saveToIndexedDB(data: Uint8Array): Promise<void> {
    const database = await this.openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(DB_OBJECT_STORE, 'readwrite');
      const store = tx.objectStore(DB_OBJECT_STORE);
      const req = store.put(data, DB_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  private async clearIndexedDB(): Promise<void> {
    const database = await this.openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(DB_OBJECT_STORE, 'readwrite');
      const store = tx.objectStore(DB_OBJECT_STORE);
      const req = store.delete(DB_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}
