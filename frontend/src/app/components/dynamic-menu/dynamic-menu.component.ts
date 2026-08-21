import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonMenu, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonIcon, IonLabel, IonMenuToggle } from '@ionic/angular';
import { MenuItem } from '../../models/auth.models';
import { AuthService } from '../../services/auth.service';
import { AuthorizationService } from '../../services/authorization.service';

@Component({
  selector: 'app-dynamic-menu',
  standalone: true,
  imports: [CommonModule, IonMenu, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonIcon, IonLabel, IonMenuToggle],
  templateUrl: './dynamic-menu.component.html',
  styleUrls: ['./dynamic-menu.component.scss'],
})
export class DynamicMenuComponent implements OnInit {
  @Input() menuId = 'main-menu';
  @Input() contentId = 'main-content';

  menuItems: MenuItem[] = [];
  userName = '';
  userEmail = '';

  constructor(
    private authService: AuthService,
    private authorizationService: AuthorizationService,
    private router: Router
  ) {}

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
