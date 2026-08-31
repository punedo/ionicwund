import { Component } from '@angular/core';
import { ViewWillEnter } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { AdminShellComponent } from '../../components/admin-shell/admin-shell.component';
import { PatientCreateRequest } from '../../models/patient.model';
import { PatientService } from '../../services/patient.service';
import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'app-patient-create',
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon, AdminShellComponent],
  templateUrl: './patient-create.page.html',
  styleUrls: ['./patient-create.page.scss'],
})
export class PatientCreatePage implements ViewWillEnter {
  patient: PatientCreateRequest = {
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'weiblich',
    street: '',
    houseNumber: '',
    zip: '',
    city: '',
    phone: '',
    insuranceNumber: '',
    insuranceType: 'GKV',
    insuranceCompany: '',
    insuranceClass: '',
    treatingDoctor: '',
    additionalService: '',
    responsibleCareService: '',
    responsibleWoundExpert: '',
    facility: '',
    woundType: '',
    score: '',
  };

  genders: string[] = [];
  insuranceTypes: string[] = [];

  doctors: string[] = [];
  careServices: string[] = [];
  woundExperts: string[] = [];
  facilities: string[] = [];
  insuranceCompanies: string[] = [];
  insuranceClasses: string[] = [];
  additionalServices: string[] = [];
  woundTypes: string[] = [];

  saving = false;
  submitted = false;
  errorMessage = '';

  constructor(
    private patientService: PatientService,
    private loadingService: LoadingService,
    private router: Router
  ) {}

  ionViewWillEnter(): void {
    this.loadReferenceData();
  }

  loadReferenceData(): void {
    this.patientService.getGenders().subscribe((data) => (this.genders = data));
    this.patientService.getInsuranceTypes().subscribe((data) => (this.insuranceTypes = data));
    this.patientService.getDoctors().subscribe((data) => (this.doctors = data));
    this.patientService.getCareServices().subscribe((data) => (this.careServices = data));
    this.patientService.getWoundExperts().subscribe((data) => (this.woundExperts = data));
    this.patientService.getFacilities().subscribe((data) => (this.facilities = data));
    this.loadInsuranceCompanies(this.patient.insuranceType);
    this.patientService.getInsuranceClasses().subscribe((data) => (this.insuranceClasses = data));
    this.patientService.getAdditionalServices().subscribe((data) => (this.additionalServices = data));
    this.patientService.getWoundTypes().subscribe((data) => (this.woundTypes = data));
  }

  loadInsuranceCompanies(type?: string): void {
    this.patient.insuranceCompany = '';
    this.patientService.getInsuranceCompanies(type).subscribe((data) => (this.insuranceCompanies = data));
  }

  onCancel(): void {
    this.router.navigate(['/patients']);
  }

  onSubmit(form: NgForm): void {
    this.submitted = true;
    this.errorMessage = '';

    if (!form.valid) {
      this.errorMessage = 'Bitte füllen Sie alle Pflichtfelder aus.';
      return;
    }

    this.saving = true;
    this.loadingService.show('Patient wird angelegt...');

    this.patientService.createPatient(this.patient).subscribe({
      next: () => {
        this.saving = false;
        this.loadingService.hide();
        this.router.navigate(['/patients']);
      },
      error: () => {
        this.saving = false;
        this.loadingService.hide();
        this.errorMessage = 'Fehler beim Anlegen des Patienten. Bitte versuchen Sie es erneut.';
      },
    });
  }
}
