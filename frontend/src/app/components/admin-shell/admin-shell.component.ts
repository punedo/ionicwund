import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { IonContent, IonIcon } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { LoadingService } from '../../services/loading.service';
import { MenuItem } from '../../models/auth.models';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  templateUrl: './admin-shell.component.html',
  styleUrls: ['./admin-shell.component.scss'],
})
export class AdminShellComponent implements OnInit {
  @Input() pageTitle = '';

  isAdmin = false;
  isWoundExpert = false;
  isPatient = false;
  currentRoute = '';
  menuItems: MenuItem[] = [];

  constructor(
    private authService: AuthService,
    private loadingService: LoadingService,
    private router: Router
  ) {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentRoute = event.urlAfterRedirects;
      });
  }

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.isAdmin = !!user && user.roles.includes('ROLE_ADMIN');
    this.isWoundExpert = !!user && user.roles.includes('ROLE_PFLEGE');
    this.isPatient = !!user && user.roles.includes('ROLE_PATIENT');

    this.authService.menu$.subscribe((items) => {
      this.menuItems = items;
    });
  }


  isActive(route: string | null | undefined): boolean {
    if (!route || !this.currentRoute) {
      return false;
    }
    return this.currentRoute === route || this.currentRoute.startsWith(route + '/');
  }

  navigate(route: string | null | undefined): void {
    if (!route) {
      return;
    }
    this.router.navigateByUrl(route);
  }

  logout(): void {
    this.loadingService.show('Abmelden...');
    this.authService.logout().subscribe({
      next: () => {
        this.loadingService.hide();
        this.authService.clearAuth();
        this.router.navigate(['/login']);
      },
      error: () => {
        this.loadingService.hide();
        this.authService.clearAuth();
        this.router.navigate(['/login']);
      },
    });
  }
}
