import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { finalize, timeout, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { LoadingService } from '../../services/loading.service';
import { PatientDashboardService } from '../../services/patient-dashboard.service';
import { PatientDashboard, ConsentItem } from '../../models/patient-dashboard.model';
import { AdminShellComponent } from '../../components/admin-shell/admin-shell.component';
import { MenuItem } from '../../models/auth.models';

interface DashboardStats {
  users: number;
  roles: number;
  permissions: number;
  menuItems: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon, AdminShellComponent],
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit {
  userName = '';
  userRoles: string[] = [];
  permissions: string[] = [];
  stats: DashboardStats = { users: 0, roles: 0, permissions: 0, menuItems: 0 };
  loading = true;
  isAdmin = false;
  isWoundExpert = false;
  isPatient = false;
  currentRoute = '';
  patientLoading = false;
  patientDashboard: PatientDashboard | null = null;
  menuItems: MenuItem[] = [];

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private router: Router,
    private loadingService: LoadingService,
    private patientDashboardService: PatientDashboardService
  ) {}

  ngOnInit(): void {
    this.loadingService.show('Dashboard wird geladen...');
    const user = this.authService.getCurrentUser();
    if (user) {
      this.userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
      this.userRoles = user.roles;
      this.isAdmin = user.roles.includes('ROLE_ADMIN');
      this.isWoundExpert = user.roles.includes('ROLE_PFLEGE');
      this.isPatient = user.roles.includes('ROLE_PATIENT');
    }
    this.permissions = this.authService.getPermissions();
    this.currentRoute = this.router.url;

    this.authService.menu$.subscribe((items) => {
      this.menuItems = items;
    });

    if (this.isPatient) {
      this.loadPatientDashboard();
    } else {
      this.loadStats();
    }
  }

  loadStats(): void {
    this.http.get<DashboardStats>(`${environment.apiUrl}/admin/stats`).pipe(
      timeout(5000),
      catchError(() => {
        console.warn('[DashboardPage] Stats request failed or timed out');
        return of({ users: 0, roles: 0, permissions: 0, menuItems: 0 });
      })
    ).subscribe({
      next: (data) => {
        this.stats = data;
        this.loading = false;
        this.loadingService.hide();
      },
      error: () => {
        this.loading = false;
        this.loadingService.hide();
      },
    });
  }

  navigate(route: string | null | undefined): void {
    if (!route) {
      return;
    }
    this.currentRoute = route;
    this.router.navigateByUrl(route);
  }

  isActive(route: string | null | undefined): boolean {
    if (!route || !this.currentRoute) {
      return false;
    }
    return this.currentRoute === route || this.currentRoute.startsWith(route + '/');
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

  loadPatientDashboard(): void {
    this.patientLoading = true;
    this.patientDashboardService.loadDashboard().pipe(
      timeout(8000),
      catchError(() => {
        console.warn('[DashboardPage] Timeout or error - using fallback data');
        return of(this.patientDashboardService.getFallbackDashboard());
      }),
      finalize(() => {
        this.patientLoading = false;
        this.loadingService.hide();
      })
    ).subscribe({
      next: (data) => {
        this.patientDashboard = data;
      },
    });
  }

  formatPatientAppointment(date: string, startTime: string): string {
    const d = new Date(date + 'T' + startTime);
    const weekdays = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    const weekday = weekdays[d.getDay()];
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const [h, m] = startTime.split(':');
    return `${weekday}. ${day}.${month}.${year}, ${h}:${m}`;
  }

  pendingConsentsCount(consents: ConsentItem[]): number {
    return consents.filter((c) => c.status === 'ausstehend').length;
  }

  firstPendingConsentTitle(consents: ConsentItem[]): string {
    return consents.find((c) => c.status === 'ausstehend')?.title ?? 'Keine ausstehenden Einwilligungen';
  }
}
