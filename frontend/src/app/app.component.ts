import { Component, OnInit, signal } from '@angular/core';
import { Router, NavigationCancel, NavigationEnd, NavigationError, NavigationStart } from '@angular/router';
import { finalize, timeout } from 'rxjs/operators';
import { IonApp, IonRouterOutlet } from '@ionic/angular';
import { AuthService } from './services/auth.service';
import { LoadingService } from './services/loading.service';
import { ThemeService } from './services/theme.service';
import { SecureTokenService } from './services/secure-token.service';
import { DbService } from './data/services/db.service';
import { SyncManagerService } from './services/sync/sync-manager.service';
import { Network } from '@capacitor/network';
import { LoadingOverlayComponent } from './components/loading-overlay/loading-overlay.component';
import { ThemeToggleComponent } from './components/theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: true,
  imports: [
    IonApp,
    IonRouterOutlet,
    LoadingOverlayComponent,
    ThemeToggleComponent,
  ],
  styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnInit {
  isAuthenticated = signal(false);
  private isFirstNavigation = true;
  private routeLoadStart = 0;
  private hideTimeout?: ReturnType<typeof setTimeout>;

  constructor(
    private authService: AuthService,
    private router: Router,
    private loadingService: LoadingService,
    private themeService: ThemeService,
    private secureToken: SecureTokenService,
    private db: DbService,
    private syncManager: SyncManagerService
  ) {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.updateAuthState();
      }
      this.handleRouteLoading(event);
    });
  }

  async ngOnInit(): Promise<void> {
    this.loadingService.show('Initializing...');

    try {
      await this.db.init();
      await this.secureToken.load();
      await this.authService.loadStoredSession();
      this.setupNetworkSync();
    } catch (e) {
      console.error('[AppComponent] init error', e);
    }

    if (this.authService.isAuthenticated()) {
      const status = await Network.getStatus();

      if (!status.connected) {
        this.loadingService.hide();
        console.log('[AppComponent] Offline, skipping loadCurrentUser to keep stored auth.');
      } else {
        this.authService.loadCurrentUser().pipe(
          timeout(8000),
          finalize(() => this.loadingService.hide())
        ).subscribe({
          next: () => {
            if (this.authService.getCurrentUser()?.mustChangePassword) {
              this.router.navigate(['/login']);
            }
          },
          error: (err) => {
            console.warn('[AppComponent] loadCurrentUser failed', err);
            this.loadingService.hide();
            // Network errors/timeouts should keep the stored token so the
            // app works offline. If the token was actually invalid, the
            // authInterceptor will clear it and we redirect to login.
            if (!this.authService.isAuthenticated()) {
              this.router.navigate(['/login']);
            }
          },
        });
      }
    } else {
      this.loadingService.hide();
    }

    this.updateAuthState();
  }

  private setupNetworkSync(): void {
    Network.addListener('networkStatusChange', (status) => {
      if (status.connected) {
        this.syncManager.sync().catch((e) => console.error('[AppComponent] auto sync error', e));
      }
    });
  }

  private updateAuthState(): void {
    this.isAuthenticated.set(this.authService.isAuthenticated());
  }

  private handleRouteLoading(event: unknown): void {
    if (event instanceof NavigationStart) {
      if (this.isFirstNavigation) {
        return;
      }
      this.showRouteLoader();
      return;
    }

    if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError) {
      if (this.isFirstNavigation) {
        this.isFirstNavigation = false;
        return;
      }
      this.hideRouteLoader();
    }
  }

  private showRouteLoader(): void {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }
    this.loadingService.showRouteLoading();
    this.routeLoadStart = Date.now();
  }

  private hideRouteLoader(): void {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }
    const elapsed = Date.now() - this.routeLoadStart;
    const remaining = 1000 - elapsed;
    if (remaining > 0) {
      this.hideTimeout = setTimeout(() => this.loadingService.hideRouteLoading(), remaining);
    } else {
      this.loadingService.hideRouteLoading();
    }
  }
}
