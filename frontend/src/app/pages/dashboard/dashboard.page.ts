import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonMenuButton, IonGrid, IonRow, IonCol } from '@ionic/angular';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';

interface DashboardStats {
  users: number;
  roles: number;
  permissions: number;
  menuItems: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonMenuButton, IonGrid, IonRow, IonCol],
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

  constructor(
    private authService: AuthService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
      this.userRoles = user.roles;
      this.isAdmin = user.roles.includes('ROLE_ADMIN');
    }
    this.permissions = this.authService.getPermissions();
    this.loadStats();
  }

  loadStats(): void {
    this.http.get<DashboardStats>(`${environment.apiUrl}/admin/stats`).subscribe({
      next: (data) => {
        this.stats = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }
}
