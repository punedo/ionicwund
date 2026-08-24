import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminShellComponent } from '../../components/admin-shell/admin-shell.component';
import { AppointmentService, AppointmentCreateRequest } from '../../services/appointment.service';
import { PatientService } from '../../services/patient.service';
import { Patient } from '../../models/patient.model';
import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'app-appointment-create',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminShellComponent],
  templateUrl: './appointment-create.page.html',
  styleUrls: ['./appointment-create.page.scss'],
})
export class AppointmentCreatePage implements OnInit {
  appointment: AppointmentCreateRequest = {
    patientId: 0,
    date: '',
    startTime: '11:00',
    endTime: '11:45',
    serviceType: 'Verbandwechsel',
    address: '',
    tour: '',
    repetition: 'Einmalig',
  };

  patients: Patient[] = [];
  serviceTypes: string[] = ['Verbandwechsel', 'Wunddokumentation', 'Erstbesuch', 'Videosprechstunde'];
  tours: string[] = ['Tour 1', 'Tour 2', 'Tour 3', 'Tour 4', 'Tour 5'];
  repetitions: string[] = ['Einmalig', 'Täglich', 'Wöchentlich', 'Monatlich'];

  saving = false;
  submitted = false;
  errorMessage = '';

  constructor(
    private appointmentService: AppointmentService,
    private patientService: PatientService,
    private loadingService: LoadingService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadPatients();
    this.setDefaultDate();
  }

  loadPatients(): void {
    this.patientService.getPatients().subscribe({
      next: (data) => {
        this.patients = data;
        if (this.patients.length > 0 && this.appointment.patientId === 0) {
          this.appointment.patientId = this.patients[0].id;
          this.updateAddress();
        }
      },
      error: () => {
        this.patients = [];
      },
    });
  }

  setDefaultDate(): void {
    const today = new Date();
    const day = today.getDay();
    if (day === 0 || day === 6) {
      // If weekend, default to next Monday
      const diff = day === 0 ? 1 : 2;
      today.setDate(today.getDate() + diff);
    }
    this.appointment.date = this.formatISODate(today);
  }

  onPatientChange(): void {
    this.updateAddress();
  }

  updateAddress(): void {
    const patient = this.patients.find((p) => p.id === this.appointment.patientId);
    if (patient) {
      const parts = [patient.street, patient.houseNumber, patient.zip, patient.city].filter(Boolean);
      this.appointment.address = parts.join(', ');
    } else {
      this.appointment.address = '';
    }
  }

  onCancel(): void {
    this.router.navigate(['/appointments']);
  }

  onSubmit(form: NgForm): void {
    this.submitted = true;
    this.errorMessage = '';

    if (!form.valid) {
      this.errorMessage = 'Bitte füllen Sie alle Pflichtfelder aus.';
      return;
    }

    if (this.appointment.patientId <= 0) {
      this.errorMessage = 'Bitte wählen Sie einen Patienten aus.';
      return;
    }

    this.saving = true;
    this.loadingService.show('Termin wird angelegt...');

    this.appointmentService.createAppointment(this.appointment).subscribe({
      next: () => {
        this.saving = false;
        this.loadingService.hide();
        this.router.navigate(['/appointments']);
      },
      error: (err) => {
        this.saving = false;
        this.loadingService.hide();
        this.errorMessage = err.error?.error || 'Fehler beim Anlegen des Termins. Bitte versuchen Sie es erneut.';
      },
    });
  }

  private formatISODate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
