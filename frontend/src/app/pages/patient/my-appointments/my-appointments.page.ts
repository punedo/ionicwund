import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { finalize, timeout, catchError, of } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AdminShellComponent } from '../../../components/admin-shell/admin-shell.component';
import { PatientDashboardService } from '../../../services/patient-dashboard.service';
import { LoadingService } from '../../../services/loading.service';
import { TerminWunschService, TerminWunschRequest } from '../../../services/termin-wunsch.service';
import { PatientService } from '../../../services/patient.service';
import { PatientDashboard } from '../../../models/patient-dashboard.model';
import { Patient } from '../../../models/patient.model';

interface AppointmentCard {
  date: string;
  time: string;
  address: string;
  service: string;
  provider: string;
  completed?: boolean;
}

interface CertificateRecord {
  date: string;
  service: string;
  status: 'Bestätigt' | 'Offen';
}

interface TerminWunsch {
  patientId: number;
  preferredDate: string;
  preferredTime: string;
  notes: string;
}

@Component({
  selector: 'app-my-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminShellComponent],
  templateUrl: './my-appointments.page.html',
  styleUrls: ['./my-appointments.page.scss'],
})
export class MyAppointmentsPage implements OnInit {
  patientDashboard: PatientDashboard | null = null;
  loading = true;
  activeTab: 'termine' | 'nachweise' = 'termine';
  showTerminWunschModal = false;
  patients: Patient[] = [];

  terminWunsch: TerminWunsch = {
    patientId: 0,
    preferredDate: '',
    preferredTime: '',
    notes: '',
  };

  upcomingAppointments: AppointmentCard[] = [
    {
      date: 'Mi. 01.07.2026',
      time: '11:00 – 11:45',
      address: 'Sesamstraße 2, 14601 Falkensee',
      service: '45 Min Verbandwechsel ambulant',
      provider: 'P. Meier',
    },
    {
      date: 'Di. 21.07.2026',
      time: '12:00 – 14:15',
      address: 'Sesamstraße 2, 14601 Falkensee',
      service: '45 Min Verbandwechsel ambulant',
      provider: 'P. Meier',
    },
  ];

  completedAppointments: AppointmentCard[] = [
    {
      date: 'Mi. 24.06.2026',
      time: '11:00 – 11:45',
      address: 'Sesamstraße 2, 14601 Falkensee',
      service: '45 Min Verbandwechsel ambulant',
      provider: 'P. Meier',
      completed: true,
    },
    {
      date: 'Mi. 10.06.2026',
      time: '11:00 – 11:45',
      address: 'Sesamstraße 2, 14601 Falkensee',
      service: '45 Min Verbandwechsel ambulant',
      provider: 'P. Meier',
      completed: true,
    },
  ];

  certificates: CertificateRecord[] = [
    { date: '15.07.2026', service: '45 + 90 Min Verbandwechsel', status: 'Bestätigt' },
    { date: '01.07.2026', service: '45 Min Verbandwechsel', status: 'Bestätigt' },
  ];

  constructor(
    private patientDashboardService: PatientDashboardService,
    private loadingService: LoadingService,
    private router: Router,
    private terminWunschService: TerminWunschService,
    private patientService: PatientService
  ) {}

  ngOnInit(): void {
    this.loadingService.show('Termine werden geladen …');
    this.patientDashboardService.loadDashboard().pipe(
      timeout(8000),
      catchError(() => {
        console.warn('[MyAppointmentsPage] Timeout or error - using fallback data');
        return of(this.patientDashboardService.getFallbackDashboard());
      }),
      finalize(() => {
        this.loading = false;
        this.loadingService.hide();
      })
    ).subscribe({
      next: (data) => {
        this.patientDashboard = data;
      },
    });

    // Load patients for selection
    this.patientService.getPatients().subscribe({
      next: (patients) => {
        this.patients = patients;
        if (patients.length > 0) {
          this.terminWunsch.patientId = patients[0].id;
        }
      },
    });
  }

  switchTab(tab: 'termine' | 'nachweise'): void {
    this.activeTab = tab;
  }

  openTerminWunschModal(): void {
    this.showTerminWunschModal = true;
  }

  closeTerminWunschModal(): void {
    this.showTerminWunschModal = false;
    this.terminWunsch = { patientId: this.patients.length > 0 ? this.patients[0].id : 0, preferredDate: '', preferredTime: '', notes: '' };
  }

  sendTerminWunsch(): void {
    if (!this.terminWunsch.preferredDate || !this.terminWunsch.preferredTime) {
      alert('Bitte geben Sie Datum und Uhrzeit ein.');
      return;
    }

    this.loadingService.show('Terminwunsch wird gesendet …');

    const request: TerminWunschRequest = {
      patientId: this.terminWunsch.patientId,
      preferredDate: this.terminWunsch.preferredDate,
      preferredTime: this.terminWunsch.preferredTime,
      notes: this.terminWunsch.notes,
    };

    this.terminWunschService.createTerminWunsch(request).pipe(
      finalize(() => {
        this.loadingService.hide();
      })
    ).subscribe({
      next: () => {
        this.closeTerminWunschModal();
        alert('Ihr Terminwunsch wurde an den Pflegedienst gesendet.');
      },
      error: (err) => {
        console.error('Error sending termin wunsch:', err);
        alert('Fehler beim Senden des Terminwunsches. Bitte versuchen Sie es erneut.');
      },
    });
  }

  requestChange(): void {
    alert('Demo: Anfrage zur Terminänderung an den Pflegedienst gesendet.');
  }

  confirmSignature(): void {
    alert('Demo: Nachweis mit Unterschrift bestätigt.');
  }
}
