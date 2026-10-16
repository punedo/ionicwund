import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AuthResponse,
  MeResponse,
  User,
  MenuItem,
  TwoFactorRequiredResponse,
  SetupPasswordResponse,
} from '../models/auth.models';
import { SecureTokenService } from './secure-token.service';
import { DbService } from '../data/services/db.service';

const USER_KEY = 'iw_user';
const PERMISSIONS_KEY = 'iw_permissions';
const MENU_KEY = 'iw_menu';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiUrl = environment.apiUrl;

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private permissionsSubject = new BehaviorSubject<string[]>([]);
  private menuSubject = new BehaviorSubject<MenuItem[]>([]);

  readonly currentUser$ = this.currentUserSubject.asObservable();
  readonly permissions$ = this.permissionsSubject.asObservable();
  readonly menu$ = this.menuSubject.asObservable();

  constructor(
    private http: HttpClient,
    private secureToken: SecureTokenService,
    private db: DbService
  ) {}

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/auth/login`, { email, password })
      .pipe(
        tap((response) => {
          if (response.status === 'authenticated' && response.accessToken) {
            this.setTokens(response.accessToken, response.refreshToken || '');
            this.setAndPersistSession(response.user!, response.permissions || [], response.menu || []);
          }
        })
      );
  }

  verifyTwoFactor(challengeId: number, code: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/auth/2fa/verify`, { challengeId, code })
      .pipe(
        tap((response) => {
          if (response.status === 'authenticated' && response.accessToken) {
            this.setTokens(response.accessToken, response.refreshToken || '');
            this.setAndPersistSession(response.user!, response.permissions || [], response.menu || []);
          }
        })
      );
  }

  resendTwoFactor(email: string): Observable<TwoFactorRequiredResponse> {
    return this.http.post<TwoFactorRequiredResponse>(
      `${this.apiUrl}/auth/2fa/resend`,
      { email }
    );
  }

  refresh(): Observable<AuthResponse> {
    const refreshToken = this.getRefreshToken();
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/auth/refresh`, { refreshToken })
      .pipe(
        tap((response) => {
          if (response.status === 'authenticated' && response.accessToken) {
            this.setTokens(response.accessToken, response.refreshToken || '');
            this.setAndPersistSession(response.user!, response.permissions || [], response.menu || []);
          }
        })
      );
  }

  logout(): Observable<{ status: string; message: string }> {
    const refreshToken = this.getRefreshToken();
    return this.http
      .post<{ status: string; message: string }>(`${this.apiUrl}/auth/logout`, {
        refreshToken,
      })
      .pipe(
        tap(() => {
          this.clearAuth();
        })
      );
  }

  loadCurrentUser(): Observable<MeResponse> {
    return this.http
      .get<MeResponse>(`${this.apiUrl}/auth/me`)
      .pipe(
        tap((response) => {
          this.setAndPersistSession(response.user, response.permissions, response.menu);
        })
      );
  }

  setupPassword(newPassword: string): Observable<SetupPasswordResponse> {
    return this.http
      .post<SetupPasswordResponse>(`${this.apiUrl}/auth/setup-password`, {
        newPassword,
      })
      .pipe(
        tap((response) => {
          if (response.status === 'success' && response.user) {
            this.setAndPersistSession(response.user, this.getPermissions(), this.getMenu());
          }
        })
      );
  }

  updateProfile(payload: {
    firstName?: string | null;
    lastName?: string | null;
    email: string;
  }): Observable<{ status: string; user: User }> {
    return this.http
      .put<{ status: string; user: User }>(`${this.apiUrl}/auth/me`, payload)
      .pipe(
        tap((response) => {
          if (response.user) {
            this.setAndPersistSession(response.user, this.getPermissions(), this.getMenu());
          }
        })
      );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<{ status: string; user: User }> {
    return this.http.post<{ status: string; user: User }>(
      `${this.apiUrl}/auth/change-password`,
      { currentPassword, newPassword }
    );
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  getAccessToken(): string | null {
    return this.secureToken.getAccessToken();
  }

  getRefreshToken(): string | null {
    return this.secureToken.getRefreshToken();
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getPermissions(): string[] {
    return this.permissionsSubject.value;
  }

  getMenu(): MenuItem[] {
    return this.menuSubject.value;
  }

  private setTokens(accessToken: string, refreshToken: string): void {
    this.secureToken.setTokens(accessToken, refreshToken).catch((e) => console.error('[AuthService] setTokens error', e));
  }

  private setUser(user: User): void {
    this.currentUserSubject.next(user);
  }

  private setPermissions(permissions: string[]): void {
    this.permissionsSubject.next(permissions);
  }

  private setMenu(menu: MenuItem[]): void {
    this.menuSubject.next(menu);
  }

  clearAuth(): void {
    this.secureToken.clear().catch((e) => console.error('[AuthService] clearAuth error', e));
    this.clearStoredSession().catch((e) => console.error('[AuthService] clearStoredSession error', e));
    this.currentUserSubject.next(null);
    this.permissionsSubject.next([]);
    this.menuSubject.next([]);
  }

  async loadStoredSession(): Promise<void> {
    await this.db.init();
    const user = await this.getStoredItem<User>(USER_KEY);
    const permissions = await this.getStoredItem<string[]>(PERMISSIONS_KEY);
    const menu = await this.getStoredItem<MenuItem[]>(MENU_KEY);

    if (user) {
      this.setUser(user);
    }
    if (permissions) {
      this.setPermissions(permissions);
    }
    if (menu) {
      this.setMenu(menu);
    }
  }

  private setAndPersistSession(user: User, permissions: string[], menu: MenuItem[]): void {
    this.setUser(user);
    this.setPermissions(permissions);
    this.setMenu(menu);
    this.storeSessionData(user, permissions, menu).catch((e) =>
      console.error('[AuthService] storeSessionData error', e)
    );
  }

  private async storeSessionData(user: User, permissions: string[], menu: MenuItem[]): Promise<void> {
    const now = new Date().toISOString();
    const records = [
      { key: USER_KEY, value: JSON.stringify(user) },
      { key: PERMISSIONS_KEY, value: JSON.stringify(permissions) },
      { key: MENU_KEY, value: JSON.stringify(menu) },
    ];

    for (const record of records) {
      await this.db.run(
        'INSERT OR REPLACE INTO secureStore (key, value, updatedAt) VALUES (?, ?, ?)',
        [record.key, record.value, now],
        true
      );
    }
  }

  private async clearStoredSession(): Promise<void> {
    await this.db.run(
      'DELETE FROM secureStore WHERE key IN (?, ?, ?)',
      [USER_KEY, PERMISSIONS_KEY, MENU_KEY],
      true
    );
  }

  private async getStoredItem<T>(key: string): Promise<T | null> {
    const rows = await this.db.query<{ value: string }>('SELECT value FROM secureStore WHERE key = ?', [key]);
    const value = rows[0]?.value;
    if (!value) {
      return null;
    }
    try {
      return JSON.parse(value) as T;
    } catch (e) {
      console.error(`[AuthService] Failed to parse stored ${key}`, e);
      return null;
    }
  }
}
