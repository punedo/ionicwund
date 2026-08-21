import { Component, OnInit, signal } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
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

  constructor(
    private authService: AuthService,
    private router: Router,
    private loadingService: LoadingService
  ) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updateAuthState();
    });
  }

  ngOnInit(): void {
    this.loadingService.show('Initializing...');

    if (this.authService.isAuthenticated()) {
      this.authService.loadCurrentUser().subscribe({
        next: () => {
          this.loadingService.hide();
        },
        error: () => {
          this.loadingService.hide();
          this.authService.clearAuth();
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
}
