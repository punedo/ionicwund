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
} from '../models/auth.models';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiUrl = environment.apiUrl;
  private readonly tokenKey = 'iw_access_token';
  private readonly refreshTokenKey = 'iw_refresh_token';

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private permissionsSubject = new BehaviorSubject<string[]>([]);
  private menuSubject = new BehaviorSubject<MenuItem[]>([]);

  readonly currentUser$ = this.currentUserSubject.asObservable();
  readonly permissions$ = this.permissionsSubject.asObservable();
  readonly menu$ = this.menuSubject.asObservable();

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/auth/login`, { email, password })
      .pipe(
        tap((response) => {
          if (response.status === 'authenticated' && response.accessToken) {
            this.setTokens(response.accessToken, response.refreshToken || '');
            this.setUser(response.user!);
            this.setPermissions(response.permissions || []);
            this.setMenu(response.menu || []);
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
            this.setUser(response.user!);
            this.setPermissions(response.permissions || []);
            this.setMenu(response.menu || []);
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
            this.setUser(response.user!);
            this.setPermissions(response.permissions || []);
            this.setMenu(response.menu || []);
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
          this.setUser(response.user);
          this.setPermissions(response.permissions);
          this.setMenu(response.menu);
        })
      );
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
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
    localStorage.setItem(this.tokenKey, accessToken);
    localStorage.setItem(this.refreshTokenKey, refreshToken);
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
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    this.currentUserSubject.next(null);
    this.permissionsSubject.next([]);
    this.menuSubject.next([]);
  }
}
