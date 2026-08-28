import { Component, OnInit, signal } from '@angular/core';
import { Router, NavigationCancel, NavigationEnd, NavigationError, NavigationStart } from '@angular/router';
import { finalize, timeout } from 'rxjs/operators';
import { IonApp, IonRouterOutlet } from '@ionic/angular';
import { AuthService } from './services/auth.service';
import { LoadingService } from './services/loading.service';
import { LoadingOverlayComponent } from './components/loading-overlay/loading-overlay.component';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: true,
  imports: [
    IonApp,
    IonRouterOutlet,
    LoadingOverlayComponent,
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
    private loadingService: LoadingService
  ) {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.updateAuthState();
      }
      this.handleRouteLoading(event);
    });
  }

  ngOnInit(): void {
    this.loadingService.show('Initializing...');

    if (this.authService.isAuthenticated()) {
      this.authService.loadCurrentUser().pipe(
        timeout(8000),
        finalize(() => this.loadingService.hide())
      ).subscribe({
        next: () => {
          if (this.authService.getCurrentUser()?.mustChangePassword) {
            this.router.navigate(['/login']);
          }
        },
        error: () => {
          this.authService.clearAuth();
          this.router.navigate(['/login']);
        },
      });
    } else {
      this.loadingService.hide();
    }

    this.updateAuthState();
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
