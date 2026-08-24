import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AdminShellComponent } from '../../components/admin-shell/admin-shell.component';
import {
  DataTableComponent,
  TableColumn,
  TableHeaderAction,
  TableRowAction,
} from '../../components/data-table/data-table.component';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface BackendUser {
  id: number;
  email: string;
  roles: string[];
  firstName: string | null;
  lastName: string | null;
  isActive: boolean;
  twoFactorEnabled: boolean;
  twoFactorRequired: boolean;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  qualification: string;
  organization: string;
  status: 'aktiv' | 'eingeladen' | 'inaktiv';
}

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, AdminShellComponent, DataTableComponent],
  templateUrl: './user-list.page.html',
  styleUrls: ['./user-list.page.scss'],
})
export class UserListPage implements OnInit {
  users: User[] = [];
  loading = false;

  private roleDisplayMap: Record<string, string> = {
    'ROLE_ADMIN': 'Admin',
    'ROLE_DOCTOR': 'Arztpraxis/Klinik',
    'ROLE_NURSE': 'Pflegedienst/Wundexperte',
    'ROLE_PROVIDER': 'Homecare/Anbieter',
    'ROLE_USER': 'Nutzer',
  };

  columns: TableColumn<User>[] = [
    {
      key: 'name',
      label: 'NAME',
      sortable: true,
      width: '200px',
      format: (u) => `${u.lastName}, ${u.firstName}`,
    },
    {
      key: 'email',
      label: 'E-MAIL',
      sortable: true,
      width: '220px',
    },
    {
      key: 'role',
      label: 'ROLLE',
      sortable: true,
      width: '180px',
    },
    {
      key: 'organization',
      label: 'ORGANISATION',
      sortable: true,
      width: '180px',
    },
    {
      key: 'status',
      label: 'STATUS',
      type: 'badge',
      sortable: true,
      width: '120px',
      cssClass: (u) => `status-${u.status}`,
    },
  ];

  headerActions: TableHeaderAction[] = [
    { label: 'Exportieren', icon: 'download-outline', cssClass: 'secondary' },
    {
      label: '+ Nutzer einladen',
      icon: 'add-outline',
      cssClass: 'primary',
      onClick: () => this.router.navigate(['/admin/users/invite']),
    },
  ];

  rowActions: TableRowAction<User>[] = [
    {
      label: 'Bearbeiten',
      icon: 'create-outline',
      onClick: (user) => this.onEdit(user),
    },
  ];

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.http.get<{ users: BackendUser[] }>(`${environment.apiUrl}/admin/users`).subscribe({
      next: (res) => {
        this.users = (res.users ?? []).map((u) => this.mapUser(u));
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  private mapUser(u: BackendUser): User {
    const symfonyRole = u.roles.find((r) => r !== 'ROLE_USER') ?? 'ROLE_USER';
    let status: User['status'] = 'inaktiv';
    if (!u.emailVerified) {
      status = 'eingeladen';
    } else if (u.isActive) {
      status = 'aktiv';
    }
    return {
      id: u.id,
      firstName: u.firstName ?? '—',
      lastName: u.lastName ?? '—',
      email: u.email,
      role: this.roleDisplayMap[symfonyRole] ?? symfonyRole,
      qualification: '—',
      organization: '—',
      status,
    };
  }

  onEdit(user: User): void {
    console.log('Edit user:', user);
    // TODO: Navigate to edit page
  }
}
