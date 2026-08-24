import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminShellComponent } from '../../components/admin-shell/admin-shell.component';
import { Patient } from '../../models/patient.model';
import { PatientService } from '../../services/patient.service';
import { LoadingService } from '../../services/loading.service';

type DetailTab = 'overview' | 'wound' | 'medication' | 'supplies' | 'tasks' | 'appointments' | 'chat' | 'documents';

@Component({
  selector: 'app-patient-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, AdminShellComponent],
  templateUrl: './patient-detail.page.v2.html',
  styleUrls: ['./patient-detail.page.v2.scss'],
})
export class PatientDetailPage implements OnInit {
  patient: Patient | null = null;
  loading = false;
  activeTab: DetailTab = 'overview';
  selectedStatus = 'Aktiv';

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
    private loadingService: LoadingService
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
    this.loadingService.show();
    console.log('[PatientDetail] loading id:', id, 'current patient:', this.patient);
    this.patientService.getPatient(id).subscribe({
      next: (p) => {
        console.log('[PatientDetail] loaded:', p);
        this.patient = p;
        this.loading = false;
        this.loadingService.hide();
      },
      error: (err) => {
        console.error('[PatientDetail] load error:', err);
        this.loading = false;
        this.loadingService.hide();
      },
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
