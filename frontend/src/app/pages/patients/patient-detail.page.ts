import { Component, OnInit, ChangeDetectorRef, ApplicationRef } from '@angular/core';
import { of } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminShellComponent } from '../../components/admin-shell/admin-shell.component';
import { Patient } from '../../models/patient.model';
import { PatientService } from '../../services/patient.service';
import { LoadingService } from '../../services/loading.service';
import { AuthService } from '../../services/auth.service';

type DetailTab = 'overview' | 'wound' | 'medication' | 'supplies' | 'tasks' | 'appointments' | 'chat' | 'documents';

@Component({
  selector: 'app-patient-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AdminShellComponent],
  templateUrl: './patient-detail.page.html',
  styleUrls: ['./patient-detail.page.v2.scss'],
})
export class PatientDetailPage implements OnInit {
  patient: Patient | null = null;
  loading = false;
  notFound = false;
  loadError: string | null = null;
  activeTab: DetailTab = 'overview';
  selectedStatus = 'Aktiv';
  expandedArtikel = new Set<string>();
  selectedDokFolder: 'anamnese' | 'kv' | 'genehmigungen' | 'verordnungen' | null = null;
  matWechsel = 2.33;
  matZeitraum = 4;
  trendAlert = false;
  trendPct = '+18% Flächenzunahme';

  tabs: { id: DetailTab; label: string; badge?: number }[] = [
    { id: 'overview', label: 'Übersicht' },
    { id: 'wound', label: 'Wundverlauf' },
    { id: 'medication', label: 'Medikation' },
    { id: 'supplies', label: 'Versorgungen' },
    { id: 'tasks', label: 'Aufgaben' },
    { id: 'appointments', label: 'Termine' },
    { id: 'chat', label: 'Chat', badge: 1 },
    { id: 'documents', label: 'Dokumente' },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private patientService: PatientService,
    private loadingService: LoadingService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private appRef: ApplicationRef
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.router.navigate(['/woundcare']);
      return;
    }

    const statePatient = (history.state as { patient?: Patient }).patient;
    if (statePatient) {
      this.patient = statePatient;
    }

    this.loadPatient(id);
  }

  loadPatient(id: number): void {
    this.loading = true;
    this.notFound = false;
    this.loadError = null;
    this.loadingService.show();
    this.patientService.getPatient(id).pipe(
      timeout(10000),
      catchError((err) => {
        console.error('[PatientDetail] load error:', err);
        return of(null);
      })
    ).subscribe((p) => {
      this.loading = false;
      this.loadingService.hide();
      if (p) {
        this.patient = p;
      } else {
        this.patient = null;
        this.notFound = true;
        this.loadError = 'Patient konnte nicht geladen werden (Timeout oder Fehler).';
      }
      this.cdr.detectChanges();
      this.appRef.tick();
    });
  }

  selectTab(tab: DetailTab): void {
    this.activeTab = tab;
  }

  fullName(p: Patient): string {
    return `${p.firstName} ${p.lastName}`;
  }

  displayName(): string {
    return this.patient ? this.fullName(this.patient) : 'Patient';
  }

  editPatient(): void {
    // Placeholder for edit navigation
    console.log('Edit patient', this.patient?.id);
  }

  handover(): void {
    console.log('Handover patient', this.patient?.id);
  }

  selectStatus(status: string): void {
    this.selectedStatus = status;
  }

  get isArzt(): boolean {
    return this.authService.getCurrentUser()?.roles.includes('ROLE_ARZT') ?? false;
  }

  get isHomecare(): boolean {
    return this.authService.getCurrentUser()?.roles.includes('ROLE_HOMECARE') ?? false;
  }

  navigate(path: string): void {
    this.router.navigate([path]);
  }

  toggleArtikel(key: string): void {
    if (this.expandedArtikel.has(key)) {
      this.expandedArtikel.delete(key);
    } else {
      this.expandedArtikel.add(key);
    }
  }

  isArtikelOpen(key: string): boolean {
    return this.expandedArtikel.has(key);
  }

  matResult(per: number): number {
    return Math.ceil(per * this.matWechsel * this.matZeitraum);
  }

  simulateTrend(): void {
    this.trendAlert = !this.trendAlert;
  }

  openDokFolder(folder: 'anamnese' | 'kv' | 'genehmigungen' | 'verordnungen'): void {
    this.selectedDokFolder = folder;
  }

  closeDokFolder(): void {
    this.selectedDokFolder = null;
  }

  dokFolderTitle(): string {
    const titles = {
      anamnese: 'Anamnese',
      kv: 'KV',
      genehmigungen: 'Genehmigungen',
      verordnungen: 'Verordnungen',
    } as const;
    return this.selectedDokFolder ? titles[this.selectedDokFolder] : 'Verordnungen';
  }

  deletePatient(): void {
    if (this.patient && confirm(`${this.displayName()} wirklich unwiderruflich löschen? Alle Daten gehen verloren.`)) {
      console.log('Delete patient', this.patient.id);
    }
  }

  alert(message: string): void {
    window.alert(message);
  }

  print(): void {
    window.print();
  }

  birthYear(dob?: string): string {
    if (!dob) {
      return '';
    }
    const parts = dob.split('-');
    return parts.length >= 3 ? `(*${parts[2]}.${parts[1]}.${parts[0]})` : `(*${dob})`;
  }
}
