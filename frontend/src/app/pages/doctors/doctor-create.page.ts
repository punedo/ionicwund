import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AdminShellComponent } from '../../components/admin-shell/admin-shell.component';
import {
  DynamicFormComponent,
  FormConfig,
} from '../../components/dynamic-form/dynamic-form.component';
import { DoctorCreateRequest } from '../../models/doctor.model';
import { DoctorService } from '../../services/doctor.service';
import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'app-doctor-create',
  standalone: true,
  imports: [CommonModule, AdminShellComponent, DynamicFormComponent],
  templateUrl: './doctor-create.page.html',
  styleUrls: ['./doctor-create.page.scss'],
})
export class DoctorCreatePage {
  config: FormConfig = {
    submitLabel: 'Arzt anlegen & öffnen',
    cancelLabel: 'Abbrechen',
    sections: [
      {
        title: 'Stammdaten',
        fields: [
          {
            key: 'name',
            label: 'Name / Praxis',
            type: 'text',
            required: true,
            placeholder: 'z. B. Dr. med. S. Roth - Hausarztpraxis Roth',
            width: 'full',
          },
          {
            key: 'type',
            label: 'Fachgebiet',
            type: 'select',
            options: [
              { value: 'Hausarzt / Hausärztin', label: 'Hausarzt / Hausärztin' },
              { value: 'Facharzt Chirurgie', label: 'Facharzt Chirurgie' },
              { value: 'Facharzt Dermatologie', label: 'Facharzt Dermatologie' },
              { value: 'Facharzt Innere Medizin', label: 'Facharzt Innere Medizin' },
              { value: 'Wundambulanz', label: 'Wundambulanz' },
              { value: 'Klinik / Krankenhaus', label: 'Klinik / Krankenhaus' },
            ],
          },
          {
            key: 'city',
            label: 'Ort',
            type: 'text',
            placeholder: 'z. B. Berlin',
          },
          {
            key: 'phone',
            label: 'Telefon',
            type: 'tel',
            placeholder: '+49 ...',
          },
          {
            key: 'email',
            label: 'E-Mail',
            type: 'email',
            placeholder: 'praxis@beispiel.de',
          },
          {
            key: 'status',
            label: 'Status',
            type: 'select',
            options: [
              { value: 'aktiv', label: 'aktiv' },
              { value: 'inaktiv', label: 'inaktiv' },
            ],
          },
        ],
      },
    ],
  };

  model: Record<string, any> = {
    name: '',
    type: '',
    city: '',
    phone: '',
    email: '',
    status: 'aktiv',
  };

  saving = false;
  submitted = false;
  errorMessage = '';

  constructor(
    private doctorService: DoctorService,
    private loadingService: LoadingService,
    private router: Router
  ) {}

  onSubmit(values: Record<string, any>): void {
    this.submitted = true;
    this.errorMessage = '';

    if (!values['name'] || !values['name'].trim()) {
      this.errorMessage = 'Bitte geben Sie einen Namen ein.';
      return;
    }

    const request: DoctorCreateRequest = {
      name: values['name'].trim(),
      type: values['type'] || undefined,
      city: values['city'] || undefined,
      phone: values['phone'] || undefined,
      email: values['email'] || undefined,
      status: values['status'] || undefined,
    };

    this.saving = true;
    this.loadingService.show('Arzt wird angelegt...');

    this.doctorService.createDoctor(request).subscribe({
      next: () => {
        this.saving = false;
        this.loadingService.hide();
        this.router.navigate(['/patients']);
      },
      error: () => {
        this.saving = false;
        this.loadingService.hide();
        this.errorMessage = 'Fehler beim Anlegen des Arztes. Bitte versuchen Sie es erneut.';
      },
    });
  }

  onCancel(): void {
    this.router.navigate(['/patients']);
  }
}
