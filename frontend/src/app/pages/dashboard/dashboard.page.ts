import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { LoadingService } from '../../services/loading.service';

interface DashboardStats {
  users: number;
  roles: number;
  permissions: number;
  menuItems: number;
}

interface NavItem {
  label: string;
  icon: string;
  route: string;
  active?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
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
  currentRoute = '';

  adminNavSections: NavSection[] = [
    {
      title: 'NAVIGATION',
      items: [
        { label: 'Dashboard', icon: 'square', route: '/dashboard' },
        { label: 'Patientenübersicht', icon: 'reorder-three-outline', route: '/patients' },
      ],
    },
    {
      title: 'VERSORGUNG',
      items: [
        { label: 'Versorgungsplanung', icon: 'bandage-outline', route: '/woundcare' },
      ],
    },
    {
      title: 'ABRECHNUNG & REZEPTE',
      items: [
        { label: 'Abrechnung', icon: 'cash-outline', route: '/billing' },
        { label: 'Kassen & Vertragsmanagement', icon: 'grid-outline', route: '/contracts' },
        { label: 'Rezeptübersicht', icon: 'receipt-outline', route: '/prescriptions' },
        { label: 'Bestellübersicht', icon: 'cube-outline', route: '/orders' },
      ],
    },
    {
      title: 'VERWALTUNG',
      items: [
        { label: 'Wundformulare', icon: 'document-text-outline', route: '/documents' },
        { label: 'Hausarztanbindung', icon: 'medkit-outline', route: '/doctor-link' },
        { label: 'Nutzer & Rollen', icon: 'settings-outline', route: '/admin/users' },
      ],
    },
  ];

  userNavSections: NavSection[] = [
    {
      title: 'NAVIGATION',
      items: [
        { label: 'Dashboard', icon: 'square', route: '/dashboard' },
      ],
    },
  ];

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private router: Router,
    private loadingService: LoadingService
  ) {}

  ngOnInit(): void {
    this.loadingService.show('Dashboard wird geladen...');
    const user = this.authService.getCurrentUser();
    if (user) {
      this.userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
      this.userRoles = user.roles;
      this.isAdmin = user.roles.includes('ROLE_ADMIN');
    }
    this.permissions = this.authService.getPermissions();
    this.currentRoute = this.router.url;
    this.loadStats();
  }

  loadStats(): void {
    this.http.get<DashboardStats>(`${environment.apiUrl}/admin/stats`).subscribe({
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

  navigate(route: string): void {
    this.currentRoute = route;
    this.router.navigateByUrl(route);
  }

  logout(): void {
    this.loadingService.show('Abmelden...');
    this.authService.logout().subscribe({
      next: () => {
        this.authService.clearAuth();
        this.router.navigate(['/login']);
      },
      error: () => {
        this.authService.clearAuth();
        this.router.navigate(['/login']);
      },
    });
  }

  get navSections(): NavSection[] {
    return this.isAdmin ? this.adminNavSections : this.userNavSections;
  }
}
