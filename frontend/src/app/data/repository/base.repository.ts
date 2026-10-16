import { DbService } from '../services/db.service';
import { BaseLocalModel, SyncStatus } from '../local/local.models';

export type FilterOperator = '=' | '<>' | '>' | '<' | '>=' | '<=' | 'LIKE';

export interface Filter {
  field: string;
  op?: FilterOperator;
  value: any;
}

export class BaseRepository<T extends BaseLocalModel> {
  constructor(
    protected db: DbService,
    protected table: string,
    protected columns: string[],
    protected jsonColumns: string[] = []
  ) {}

  async findAll(filter?: Filter[], orderBy = 'updatedAt DESC'): Promise<T[]> {
    let sql = `SELECT * FROM ${this.table}`;
    const values: any[] = [];

    if (filter && filter.length > 0) {
      const where = filter.map((f, i) => {
        values.push(f.value);
        return `${f.field} ${f.op ?? '='} ?`;
      });
      sql += ` WHERE ${where.join(' AND ')}`;
    }

    if (orderBy) {
      sql += ` ORDER BY ${orderBy}`;
    }

    const rows = await this.db.query<any>(sql, values);
    return rows.map((r) => this.mapRow(r));
  }

  async findActive(filter?: Filter[]): Promise<T[]> {
    const base: Filter[] = [{ field: 'deletedAt', op: '=', value: null }];
    return this.findAll(filter ? [...base, ...filter] : base);
  }

  async findById(id: string): Promise<T | null> {
    const rows = await this.db.query<any>(`SELECT * FROM ${this.table} WHERE id = ?`, [id]);
    return rows.length ? this.mapRow(rows[0]) : null;
  }

  async findByField(field: string, value: any): Promise<T | null> {
    const rows = await this.db.query<any>(`SELECT * FROM ${this.table} WHERE ${field} = ? AND deletedAt IS NULL`, [value]);
    return rows.length ? this.mapRow(rows[0]) : null;
  }

  async findByServerId(serverId: number): Promise<T | null> {
    const rows = await this.db.query<any>(`SELECT * FROM ${this.table} WHERE serverId = ? AND deletedAt IS NULL`, [serverId]);
    return rows.length ? this.mapRow(rows[0]) : null;
  }

  async findPending(): Promise<T[]> {
    return this.findAll([
      { field: 'syncStatus', op: '=', value: 'pending' },
      { field: 'deletedAt', op: '=', value: null },
    ]);
  }

  async findForPush(): Promise<T[]> {
    return this.findAll([
      { field: 'pendingOperation', op: '<>', value: 'NONE' },
      { field: 'deletedAt', op: '=', value: null },
    ], 'updatedAt ASC');
  }

  async save(entity: T): Promise<void> {
    const values = this.toRow(entity);
    const placeholders = values.map(() => '?').join(',');
    const sql = `INSERT OR REPLACE INTO ${this.table} (${this.columns.join(',')}) VALUES (${placeholders})`;
    await this.db.run(sql, values, true);
  }

  async saveMany(entities: T[]): Promise<void> {
    await this.db.transaction(async () => {
      for (const e of entities) {
        await this.save(e);
      }
    });
  }

  async markPending(id: string, operation: 'CREATE' | 'UPDATE' | 'DELETE', updatedAt: string): Promise<void> {
    await this.db.run(
      `UPDATE ${this.table} SET pendingOperation = ?, syncStatus = 'pending', updatedAt = ? WHERE id = ?`,
      [operation, updatedAt, id],
      true
    );
  }

  async markSynced(
    id: string,
    serverId: number | null,
    version: number,
    lastSyncTime: string,
    operation: 'NONE' = 'NONE'
  ): Promise<void> {
    await this.db.run(
      `UPDATE ${this.table} SET serverId = ?, syncVersion = ?, lastSyncTime = ?, syncStatus = 'synced', pendingOperation = ? WHERE id = ?`,
      [serverId, version, lastSyncTime, operation, id],
      true
    );
  }

  async setSyncStatus(id: string, status: SyncStatus): Promise<void> {
    await this.db.run(
      `UPDATE ${this.table} SET syncStatus = ? WHERE id = ?`,
      [status, id],
      true
    );
  }

  async softDelete(id: string, deletedAt: string): Promise<void> {
    await this.db.run(
      `UPDATE ${this.table} SET deletedAt = ?, updatedAt = ?, pendingOperation = 'DELETE', syncStatus = 'pending' WHERE id = ?`,
      [deletedAt, deletedAt, id],
      true
    );
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.run(`DELETE FROM ${this.table} WHERE id = ?`, [id], true);
  }

  protected mapRow(row: any): T {
    const mapped: any = { ...row };

    for (const col of this.jsonColumns) {
      if (typeof mapped[col] === 'string') {
        try {
          mapped[col] = JSON.parse(mapped[col]);
        } catch {
          mapped[col] = null;
        }
      }
    }

    // Convert SQLite integer booleans back to JS booleans for known columns.
    if ('detected' in mapped) {
      mapped.detected = !!mapped.detected;
    }

    return mapped as T;
  }

  protected toRow(entity: T): any[] {
    return this.columns.map((col) => {
      let v = (entity as any)[col];

      if (v === undefined || v === null) {
        if (col === 'syncVersion') return 1;
        if (col === 'syncStatus') return 'pending';
        if (col === 'pendingOperation') return 'NONE';
        if (col === 'deletedAt' || col === 'lastSyncTime') return null;
        return null;
      }

      if (typeof v === 'boolean') {
        return v ? 1 : 0;
      }

      if (Array.isArray(v)) {
        return JSON.stringify(v);
      }

      if (col === 'detected' && typeof v === 'number') {
        return v ? 1 : 0;
      }

      return v;
    });
  }
}
