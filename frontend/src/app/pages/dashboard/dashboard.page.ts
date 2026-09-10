import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { IonContent, IonFooter, IonIcon, IonToolbar } from '@ionic/angular';
import { finalize, timeout, catchError, of, take, filter, forkJoin } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { AuthorizationService } from '../../services/authorization.service';
import { LoadingService } from '../../services/loading.service';
import { PatientDashboardService } from '../../services/patient-dashboard.service';
import { PatientDashboard, ConsentItem } from '../../models/patient-dashboard.model';
import { AdminShellComponent } from '../../components/admin-shell/admin-shell.component';
import { MenuItem, User } from '../../models/auth.models';
import { PatientService } from '../../services/patient.service';
import { TaskService, Task } from '../../services/task.service';
import { EscalationService, Escalation } from '../../services/escalation.service';
import { AppointmentService, Appointment } from '../../services/appointment.service';
import { Patient } from '../../models/patient.model';

interface DashboardStats {
  users: number;
  roles: number;
  permissions: number;
  menuItems: number;
}

interface QuickAction {
  label: string;
  route: string;
  permissions: string[];
  primary?: boolean;
}

interface PflegeKpiCard {
  key: string;
  title: string;
  permission: string;
  route: string;
  linkLabel: string;
  value: number | string;
  sub: string;
  accent?: 'orange' | 'teal' | 'blue';
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, IonContent, IonFooter, IonIcon, IonToolbar, AdminShellComponent],
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
  expandedItemIds = new Set<string>();

  pflegeLoading = false;
  pflegePatients: Patient[] = [];
  pflegeTasks: Task[] = [];
  pflegeEscalations: Escalation[] = [];
  pflegeAppointments: Appointment[] = [];

  private readonly pflegeQuickActions: QuickAction[] = [
    { label: 'Wunddoku erfassen', route: '/woundcare', permissions: ['woundcare.edit', 'woundcare.view'], primary: true },
    { label: 'Patient anlegen', route: '/patients/create', permissions: ['patients.create'] },
    { label: 'Termin anlegen', route: '/appointments/create', permissions: ['appointments.create'] },
    { label: 'Zeit erfassen', route: '/appointments', permissions: ['appointments.view'] },
    { label: 'Material bestellen', route: '/orders/create', permissions: ['orders.view'] },
  ];

  constructor(
    private authService: AuthService,
    private authorizationService: AuthorizationService,
    private http: HttpClient,
    private router: Router,
    private loadingService: LoadingService,
    private patientDashboardService: PatientDashboardService,
    private patientService: PatientService,
    private taskService: TaskService,
    private escalationService: EscalationService,
    private appointmentService: AppointmentService
  ) {}

  ngOnInit(): void {
    this.loadingService.show('Dashboard wird geladen...');
    this.currentRoute = this.router.url;

    this.authService.menu$.subscribe((items) => {
      this.menuItems = items;
      this.expandActive();
    });

    const user = this.authService.getCurrentUser();
    if (user) {
      this.initDashboard(user);
      return;
    }

    // On a fresh page load the user may not be hydrated yet (AppComponent
    // calls /auth/me asynchronously). Wait for the first non-null emission
    // instead of falling through to the admin stats view.
    this.authService.currentUser$.pipe(
      filter((loadedUser): loadedUser is User => loadedUser !== null),
      take(1),
      timeout(8000),
      catchError(() => {
        console.warn('[DashboardPage] Timed out waiting for current user');
        return of(null);
      })
    ).subscribe((loadedUser) => {
      if (loadedUser) {
        this.initDashboard(loadedUser);
      } else {
        this.loading = false;
        this.loadingService.hide();
      }
    });
  }

  private initDashboard(user: User): void {
    this.userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
    this.userRoles = user.roles;
    this.isAdmin = user.roles.includes('ROLE_ADMIN');
    this.isWoundExpert = user.roles.includes('ROLE_PFLEGE');
    this.isPatient = user.roles.includes('ROLE_PATIENT');
    this.permissions = this.authService.getPermissions();

    if (this.isPatient) {
      this.loadPatientDashboard();
    } else if (this.isAdmin) {
      this.loadStats();
    } else if (this.isWoundExpert) {
      this.loadPflegeDashboard();
    } else {
      this.loading = false;
      this.loadingService.hide();
    }
  }

  hasPermission(permission: string): boolean {
    return this.authorizationService.hasPermission(permission);
  }

  get visibleQuickActions(): QuickAction[] {
    return this.pflegeQuickActions.filter((a) =>
      this.authorizationService.hasAnyPermission(a.permissions)
    );
  }

  quickActionRoute(action: QuickAction): string {
    // "Material bestellen" should land on the create form only when the user
    // may actually create orders; otherwise fall back to the list view.
    if (action.route === '/orders/create' && !this.hasPermission('orders.create')) {
      return '/orders';
    }
    return action.route;
  }

  get pflegeKpiCards(): PflegeKpiCard[] {
    const openTasks = this.pflegeTasks.filter((t) => t.status !== 'Erledigt');
    const openEscalations = this.pflegeEscalations.filter((e) => e.isOpen !== false && e.priority !== 'Erledigt');
    const pendingCertificates = this.pflegeAppointments.filter(
      (a) => a.status === 'durchgeführt' && !a.recordedAt
    );

    const firstPatient = this.pflegePatients[0];
    const firstTask = openTasks[0];
    const firstCert = pendingCertificates[0];
    const firstEscalation = openEscalations[0];

    const cards: PflegeKpiCard[] = [
      {
        key: 'patients',
        title: 'MEINE PATIENT:INNEN',
        permission: 'patients.view',
        route: '/patients',
        linkLabel: 'Zu den Patient:innen →',
        value: this.pflegePatients.length,
        sub: firstPatient?.responsibleCareService || firstPatient?.facility || 'Keine Patient:innen',
      },
      {
        key: 'tasks',
        title: 'OFFENE AUFGABEN',
        permission: 'tasks.view',
        route: '/tasks',
        linkLabel: 'Zu den Aufgaben →',
        value: openTasks.length,
        sub: firstTask ? `${firstTask.title} – ${firstTask.patientName}` : 'Keine offenen Aufgaben',
      },
      {
        key: 'certificates',
        title: 'AUSSTEHENDER NACHWEIS',
        permission: 'appointments.view',
        route: '/appointments',
        linkLabel: 'Zu Termine & Nachweise →',
        value: pendingCertificates.length,
        sub: firstCert ? `${this.formatDate(firstCert.date)}, ${firstCert.patientName}` : 'Keine ausstehenden Nachweise',
        accent: 'orange',
      },
      {
        key: 'escalations',
        title: 'ESKALATION',
        permission: 'escalations.view',
        route: '/escalations',
        linkLabel: 'Zu den Eskalationen →',
        value: openEscalations.length,
        sub: firstEscalation ? `${firstEscalation.patientName} – ${firstEscalation.message}` : 'Keine Eskalationen',
        accent: 'orange',
      },
    ];

    return cards.filter((card) => this.hasPermission(card.permission));
  }

  get activityTasks(): Task[] {
    return [...this.pflegeTasks]
      .sort((a, b) => {
        const statusOrder = (s: string) => (s === 'Erledigt' ? 2 : s === 'In Bearbeitung' ? 1 : 0);
        const diff = statusOrder(a.status) - statusOrder(b.status);
        if (diff !== 0) {
          return diff;
        }
        const prioOrder = (p: string) => (p === 'Hoch' ? 0 : p === 'Mittel' ? 1 : 2);
        return prioOrder(a.priority) - prioOrder(b.priority);
      })
      .slice(0, 4);
  }

  taskBadge(task: Task): { label: string; css: string } {
    if (task.status === 'Erledigt') {
      return { label: 'erledigt', css: 'badge-done' };
    }
    if (task.priority === 'Hoch') {
      return { label: 'hohe Priorität', css: 'badge-priority' };
    }
    if (this.isDueToday(task.dueDate)) {
      return { label: 'fällig heute', css: 'badge-due' };
    }
    return { label: task.status === 'In Bearbeitung' ? 'in Bearbeitung' : 'offen', css: 'badge-due' };
  }

  private isDueToday(dueDate?: string): boolean {
    if (!dueDate) {
      return false;
    }
    const now = new Date();
    const today = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
    return dueDate === today;
  }

  private formatDate(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) {
      return iso;
    }
    return d.toLocaleDateString('de-DE');
  }

  loadPflegeDashboard(): void {
    this.pflegeLoading = true;
    forkJoin({
      patients: this.patientService.getPatients(),
      tasks: this.taskService.getTasks(),
      escalations: this.escalationService.getEscalations(),
      appointments: this.appointmentService.getAppointments(),
    }).pipe(
      timeout(8000),
      catchError(() => {
        console.warn('[DashboardPage] Pflege dashboard request failed or timed out');
        return of({ patients: [], tasks: [], escalations: [], appointments: [] });
      }),
      finalize(() => {
        this.pflegeLoading = false;
        this.loading = false;
        this.loadingService.hide();
      })
    ).subscribe({
      next: (data) => {
        this.pflegePatients = data.patients;
        this.pflegeTasks = data.tasks;
        this.pflegeEscalations = data.escalations;
        this.pflegeAppointments = data.appointments;
      },
    });
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

  onMenuItemClick(item: MenuItem, event: Event): void {
    const hasChildren = item.children && item.children.length > 0;
    if (hasChildren && !item.route) {
      this.toggleAccordion(item.id, event);
      return;
    }
    this.navigate(item.route);
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

  isExpanded(itemId: string): boolean {
    return this.expandedItemIds.has(itemId);
  }

  toggleAccordion(itemId: string, event?: Event): void {
    event?.stopPropagation();
    if (this.expandedItemIds.has(itemId)) {
      this.expandedItemIds.delete(itemId);
    } else {
      this.expandedItemIds.clear();
      this.expandedItemIds.add(itemId);
    }
  }

  private expandActive(): void {
    this.expandedItemIds.clear();
    for (const item of this.menuItems) {
      if (item.children?.length && (this.isActive(item.route) || item.children.some((child) => this.isActive(child.route)))) {
        this.expandedItemIds.add(item.id);
        break;
      }
    }
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
