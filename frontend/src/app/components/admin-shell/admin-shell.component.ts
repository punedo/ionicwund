import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { IonContent, IonIcon } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { LoadingService } from '../../services/loading.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

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
        { label: 'Termine & Nachweise', icon: 'calendar-outline', route: '/appointments' },
        { label: 'Wundtermine', icon: 'time-outline', route: '/appointments' },
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
        { label: 'Terminwünsche', icon: 'calendar-outline', route: '/admin/termin-wuensche' },
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

  pflegeNavSections: NavSection[] = [
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
        { label: 'Termine & Nachweise', icon: 'calendar-outline', route: '/appointments' },
        { label: 'Wundtermine', icon: 'time-outline', route: '/appointments' },
      ],
    },
  ];

  patientNavSections: NavSection[] = [
    {
      title: 'NAVIGATION',
      items: [
        { label: 'Dashboard', icon: 'square', route: '/dashboard' },
        { label: 'Termine & Nachweise', icon: 'calendar-outline', route: '/my-appointments' },
        { label: 'Meine Wunde', icon: 'bandage-outline', route: '/my-wound' },
        { label: 'Meine Dokumente', icon: 'document-text-outline', route: '/my-documents' },
        { label: 'Einwilligungen', icon: 'shield-checkmark-outline', route: '/consents' },
      ],
    },
  ];

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
  }

  get navSections(): NavSection[] {
    if (this.isAdmin) {
      return this.adminNavSections;
    }
    if (this.isWoundExpert) {
      return this.pflegeNavSections;
    }
    if (this.isPatient) {
      return this.patientNavSections;
    }
    return this.userNavSections;
  }

  isActive(route: string): boolean {
    if (!this.currentRoute) {
      return false;
    }
    return this.currentRoute === route || this.currentRoute.startsWith(route + '/');
  }

  navigate(route: string): void {
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
