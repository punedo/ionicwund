import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AdminShellComponent } from '../../components/admin-shell/admin-shell.component';
import {
  DynamicFormComponent,
  FormConfig,
} from '../../components/dynamic-form/dynamic-form.component';
import { FacilityCreateRequest } from '../../models/facility.model';
import { FacilityService } from '../../services/facility.service';
import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'app-facility-create',
  standalone: true,
  imports: [CommonModule, AdminShellComponent, DynamicFormComponent],
  templateUrl: './facility-create.page.html',
  styleUrls: ['./facility-create.page.scss'],
})
export class FacilityCreatePage {
  config: FormConfig = {
    submitLabel: 'Einrichtung anlegen & öffnen',
    cancelLabel: 'Abbrechen',
    sections: [
      {
        title: 'Stammdaten',
        fields: [
          {
            key: 'name',
            label: 'Name der Einrichtung',
            type: 'text',
            required: true,
            placeholder: 'z. B. Pflegeheim Nord',
            width: 'full',
          },
          {
            key: 'type',
            label: 'Typ',
            type: 'select',
            options: [
              { value: 'Pflegeheim (stationär)', label: 'Pflegeheim (stationär)' },
              { value: 'Betreutes Wohnen', label: 'Betreutes Wohnen' },
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
    status: 'aktiv',
  };

  saving = false;
  submitted = false;
  errorMessage = '';

  constructor(
    private facilityService: FacilityService,
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

    const request: FacilityCreateRequest = {
      name: values['name'].trim(),
      type: values['type'] || undefined,
      city: values['city'] || undefined,
      status: values['status'] || undefined,
    };

    this.saving = true;
    this.loadingService.show('Einrichtung wird angelegt...');

    this.facilityService.createFacility(request).subscribe({
      next: () => {
        this.saving = false;
        this.loadingService.hide();
        this.router.navigate(['/patients']);
      },
      error: () => {
        this.saving = false;
        this.loadingService.hide();
        this.errorMessage = 'Fehler beim Anlegen der Einrichtung. Bitte versuchen Sie es erneut.';
      },
    });
  }

  onCancel(): void {
    this.router.navigate(['/patients']);
  }
}
