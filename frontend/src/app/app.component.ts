import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import {
  IonApp,
  IonSplitPane,
  IonRouterOutlet,
  IonMenu,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonIcon,
  IonLabel,
  IonMenuToggle,
  IonAvatar,
  IonNote,
} from '@ionic/angular';
import { AuthService } from './services/auth.service';
import { MenuItem } from './models/auth.models';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: true,
  imports: [
    CommonModule,
    IonApp,
    IonSplitPane,
    IonRouterOutlet,
    IonMenu,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonIcon,
    IonLabel,
    IonMenuToggle,
    IonAvatar,
    IonNote,
  ],
  styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnInit {
  menuItems: MenuItem[] = [];
  userName = '';
  userEmail = '';
  selectedRoute = '';
  isAuthenticated = signal(false);
  showSidebar = computed(() => this.isAuthenticated());

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.selectedRoute = event.urlAfterRedirects;
      this.updateAuthState();
    });
  }

  ngOnInit(): void {
    this.authService.menu$.subscribe((items) => {
      this.menuItems = items;
    });

    this.authService.currentUser$.subscribe((user) => {
      if (user) {
        this.userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
        this.userEmail = user.email;
      }
      this.updateAuthState();
    });

    if (this.authService.isAuthenticated()) {
      this.authService.loadCurrentUser().subscribe({
        error: () => {
          this.authService.clearAuth();
        },
      });
    }

    this.updateAuthState();
  }

  private updateAuthState(): void {
    this.isAuthenticated.set(this.authService.isAuthenticated());
  }

  navigate(route: string | null | undefined): void {
    if (route) {
      this.router.navigate([route]);
    }
  }

  isActive(route: string | null | undefined): boolean {
    if (!route || !this.selectedRoute) {
      return false;
    }
    return this.selectedRoute === route || this.selectedRoute.startsWith(route + '/');
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.authService.clearAuth();
        this.isAuthenticated.set(false);
        this.router.navigate(['/login']);
      },
      error: () => {
        this.authService.clearAuth();
        this.isAuthenticated.set(false);
        this.router.navigate(['/login']);
      },
    });
  }
}
