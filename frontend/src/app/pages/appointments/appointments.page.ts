import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonIcon } from '@ionic/angular';
import { AdminShellComponent } from '../../components/admin-shell/admin-shell.component';
import {
  DataTableComponent,
  TableColumn,
  TableHeaderAction,
  TableRowAction,
} from '../../components/data-table/data-table.component';
import { AppointmentService, Appointment, Certificate } from '../../services/appointment.service';
import { PatientService } from '../../services/patient.service';
import { Patient } from '../../models/patient.model';
import { LoadingService } from '../../services/loading.service';

interface DayAppointments {
  date: Date;
  label: string;
  appointments: Appointment[];
}

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon, AdminShellComponent, DataTableComponent],
  templateUrl: './appointments.page.html',
  styleUrls: ['./appointments.page.scss'],
})
export class AppointmentsPage implements OnInit {
  activeTab: 'termine' | 'nachweise' = 'termine';
  weekStart = this.getWeekStart(new Date());
  appointments: Appointment[] = [];
  certificates: Certificate[] = [];
  patients: Patient[] = [];
  loading = false;

  serviceTypes: string[] = ['Verbandwechsel', 'Wunddokumentation', 'Erstbesuch', 'Videosprechstunde'];

  certificateColumns: TableColumn<Certificate>[] = [
    { key: 'patientName', label: 'PATIENT', sortable: true, width: '150px' },
    { key: 'date', label: 'DATUM', sortable: true, width: '120px' },
    { key: 'serviceType', label: 'LEISTUNG', sortable: true, width: '220px' },
    { key: 'recording', label: 'ERFASSUNG', sortable: true, width: '140px' },
    {
      key: 'status',
      label: 'STATUS',
      type: 'badge',
      sortable: true,
      width: '120px',
      cssClass: (c) => (c.status === 'Vollständig' ? 'status-vollstaendig' : 'status-offen'),
    },
  ];

  certificateHeaderActions: TableHeaderAction[] = [
    { label: 'Exportieren', icon: 'download-outline', cssClass: 'secondary' },
  ];

  certificateRowActions: TableRowAction<Certificate>[] = [
    {
      label: 'In Akte öffnen',
      icon: 'open-outline',
      onClick: (c) => this.onOpenCertificate(c),
    },
  ];

  constructor(
    private appointmentService: AppointmentService,
    private patientService: PatientService,
    private loadingService: LoadingService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.loadPatients();
  }

  get weekDays(): DayAppointments[] {
    const days: DayAppointments[] = [];
    for (let i = 0; i < 5; i++) {
      const date = new Date(this.weekStart);
      date.setDate(date.getDate() + i);
      const label = this.formatDayLabel(date);
      const dayAppointments = this.appointments.filter((a) => a.date === this.formatISODate(date));
      days.push({ date, label, appointments: dayAppointments });
    }
    return days;
  }

  get completedAppointments(): DayAppointments[] {
    const days: DayAppointments[] = [];
    for (let i = 0; i < 5; i++) {
      const date = new Date(this.weekStart);
      date.setDate(date.getDate() + i);
      const label = this.formatDayLabel(date);
      const dayAppointments = this.appointments
        .filter((a) => a.date === this.formatISODate(date) && (a.recordedAt || a.status === 'durchgeführt'));
      days.push({ date, label, appointments: dayAppointments });
    }
    return days;
  }

  loadData(): void {
    this.loading = true;
    this.appointmentService.getAppointments().subscribe({
      next: (data) => {
        this.appointments = data;
        this.loading = false;
      },
      error: () => {
        this.appointments = [];
        this.loading = false;
      },
    });

    this.appointmentService.getCertificates().subscribe({
      next: (data) => {
        this.certificates = data;
      },
      error: () => {
        this.certificates = [];
      },
    });
  }

  loadPatients(): void {
    this.patientService.getPatients().subscribe({
      next: (data) => {
        this.patients = data;
      },
      error: () => {
        this.patients = [];
      },
    });
  }

  setTab(tab: 'termine' | 'nachweise'): void {
    this.activeTab = tab;
  }

  previousWeek(): void {
    this.weekStart = this.addDays(this.weekStart, -7);
  }

  nextWeek(): void {
    this.weekStart = this.addDays(this.weekStart, 7);
  }

  goToToday(): void {
    this.weekStart = this.getWeekStart(new Date());
  }

  onCreate(): void {
    this.router.navigate(['/appointments/create']);
  }

  onEdit(appointment: Appointment): void {
    this.router.navigate(['/appointments/edit', appointment.id]);
  }

  onDelete(appointment: Appointment): void {
    if (!confirm(`Termin am ${appointment.date} wirklich löschen?`)) {
      return;
    }
    this.loadingService.show('Termin wird gelöscht...');
    this.appointmentService.deleteAppointment(appointment.id).subscribe({
      next: () => {
        this.loadingService.hide();
        this.loadData();
      },
      error: () => {
        this.loadingService.hide();
        alert('Fehler beim Löschen des Termins.');
      },
    });
  }

  onRecord(appointment: Appointment): void {
    this.loadingService.show('Zeit wird erfasst...');
    this.appointmentService.recordTime(appointment.id).subscribe({
      next: () => {
        this.loadingService.hide();
        this.loadData();
      },
      error: () => {
        this.loadingService.hide();
        alert('Fehler bei der Zeiterfassung.');
      },
    });
  }

  onOpenCertificate(certificate: Certificate): void {
    console.log('Open certificate:', certificate);
  }

  onOpenCertificateForAppointment(appointment: Appointment): void {
    this.onOpenCertificate({
      id: appointment.id,
      patientName: appointment.patientName,
      date: this.formatDayLabel(new Date(appointment.date)),
      serviceType: this.getServiceLabel(appointment.serviceType),
      recording: 'Hochgeladen',
      status: 'Vollständig',
    });
  }

  getPatientAddress(appointment: Appointment): string {
    const patient = this.patients.find((p) => p.id === appointment.patientId);
    if (!patient) {
      return appointment.address || '—';
    }
    const parts = [patient.street, patient.houseNumber, patient.zip, patient.city].filter(Boolean);
    return parts.length ? parts.join(' ') : (appointment.address || '—');
  }

  getServiceLabel(type: string | undefined): string {
    return type || 'Verbandwechsel';
  }

  getDuration(startTime: string, endTime: string): number {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    return endH * 60 + endM - (startH * 60 + startM);
  }

  getServiceDisplay(appointment: Appointment): string {
    const duration = this.getDuration(appointment.startTime, appointment.endTime);
    const type = this.getServiceLabel(appointment.serviceType);
    return `${duration} Min ${type} ambulant`;
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d;
  }

  private addDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  formatDayLabel(date: Date): string {
    const weekdays = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    const weekday = weekdays[date.getDay()];
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${weekday}. ${day}.${month}.${year}`;
  }

  private formatISODate(date: Date): string {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
