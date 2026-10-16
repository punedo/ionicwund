import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { DbService } from '../data/services/db.service';

const ACCESS_KEY = 'iw_access_token';
const REFRESH_KEY = 'iw_refresh_token';

@Injectable({
  providedIn: 'root',
})
export class SecureTokenService {
  private accessTokenSubject = new BehaviorSubject<string | null>(null);
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  readonly accessToken$ = this.accessTokenSubject.asObservable();
  readonly refreshToken$ = this.refreshTokenSubject.asObservable();

  constructor(private db: DbService) {}

  async load(): Promise<void> {
    await this.db.init();
    const [access, refresh] = await Promise.all([
      this.getStored(ACCESS_KEY),
      this.getStored(REFRESH_KEY),
    ]);
    this.accessTokenSubject.next(access);
    this.refreshTokenSubject.next(refresh);
  }

  getAccessToken(): string | null {
    return this.accessTokenSubject.value;
  }

  getRefreshToken(): string | null {
    return this.refreshTokenSubject.value;
  }

  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    this.accessTokenSubject.next(accessToken);
    this.refreshTokenSubject.next(refreshToken);
    await this.store(ACCESS_KEY, accessToken);
    await this.store(REFRESH_KEY, refreshToken);
  }

  async clear(): Promise<void> {
    this.accessTokenSubject.next(null);
    this.refreshTokenSubject.next(null);
    await this.db.run('DELETE FROM secureStore WHERE key IN (?, ?)', [ACCESS_KEY, REFRESH_KEY], true);
  }

  private async getStored(key: string): Promise<string | null> {
    const rows = await this.db.query<{ value: string }>('SELECT value FROM secureStore WHERE key = ?', [key]);
    return rows[0]?.value ?? null;
  }

  private async store(key: string, value: string): Promise<void> {
    await this.db.run(
      'INSERT OR REPLACE INTO secureStore (key, value, updatedAt) VALUES (?, ?, ?)',
      [key, value, new Date().toISOString()],
      true
    );
  }
}
