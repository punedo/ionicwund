import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ViewWillEnter } from '@ionic/angular';
import { AdminShellComponent } from '../../components/admin-shell/admin-shell.component';
import {
  DynamicFormComponent,
  FormConfig,
} from '../../components/dynamic-form/dynamic-form.component';
import { DoctorCreateRequest } from '../../models/doctor.model';
import { DoctorService } from '../../services/doctor.service';
import { FacilityService } from '../../services/facility.service';
import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'app-doctor-create',
  standalone: true,
  imports: [CommonModule, AdminShellComponent, DynamicFormComponent],
  templateUrl: './doctor-create.page.html',
  styleUrls: ['./doctor-create.page.scss'],
})
export class DoctorCreatePage implements ViewWillEnter {
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
          {
            key: 'facilityId',
            label: 'Einrichtung',
            type: 'select',
            options: [{ value: '', label: 'Keine Einrichtung' }],
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
    facilityId: '',
  };

  saving = false;
  submitted = false;
  errorMessage = '';

  constructor(
    private doctorService: DoctorService,
    private facilityService: FacilityService,
    private loadingService: LoadingService,
    private router: Router
  ) {}

  ionViewWillEnter(): void {
    this.loadFacilities();
  }

  loadFacilities(): void {
    this.facilityService.getFacilities().subscribe({
      next: (facilities) => {
        const options = [
          { value: '', label: 'Keine Einrichtung' },
          ...facilities.map((f) => ({
            value: String(f.id),
            label: f.name,
          })),
        ];

        const section = this.config.sections[0];
        const field = section.fields.find((f) => f.key === 'facilityId');
        if (field) {
          field.options = options;
        }
      },
      error: (err) => {
        console.error('[DoctorCreatePage] loadFacilities error:', err);
      },
    });
  }

  onSubmit(values: Record<string, any>): void {
    this.submitted = true;
    this.errorMessage = '';

    if (!values['name'] || !values['name'].trim()) {
      this.errorMessage = 'Bitte geben Sie einen Namen ein.';
      return;
    }

    const facilityValue = values['facilityId'];

    const request: DoctorCreateRequest = {
      name: values['name'].trim(),
      type: values['type'] || undefined,
      city: values['city'] || undefined,
      phone: values['phone'] || undefined,
      email: values['email'] || undefined,
      status: values['status'] || undefined,
      facilityId: facilityValue ? Number(facilityValue) : null,
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
