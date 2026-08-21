import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { IonMenu, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonIcon, IonLabel, IonMenuToggle, IonAvatar, IonNote } from '@ionic/angular';
import { MenuItem } from '../../models/auth.models';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dynamic-menu',
  standalone: true,
  imports: [CommonModule, IonMenu, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonIcon, IonLabel, IonMenuToggle, IonAvatar, IonNote],
  templateUrl: './dynamic-menu.component.html',
  styleUrls: ['./dynamic-menu.component.scss'],
})
export class DynamicMenuComponent implements OnInit {
  @Input() menuId = 'main-menu';
  @Input() contentId = 'main-content';

  menuItems: MenuItem[] = [];
  userName = '';
  userEmail = '';
  selectedRoute = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.selectedRoute = event.urlAfterRedirects;
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
    });
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
        this.router.navigate(['/login']);
      },
      error: () => {
        this.authService.clearAuth();
        this.router.navigate(['/login']);
      },
    });
  }
}
