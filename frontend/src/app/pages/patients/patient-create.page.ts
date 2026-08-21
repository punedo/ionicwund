import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { AdminShellComponent } from '../../components/admin-shell/admin-shell.component';
import { PatientCreateRequest, Gender, InsuranceType } from '../../models/patient.model';
import { PatientService } from '../../services/patient.service';
import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'app-patient-create',
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon, AdminShellComponent],
  templateUrl: './patient-create.page.html',
  styleUrls: ['./patient-create.page.scss'],
})
export class PatientCreatePage implements OnInit {
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
    facility: '— ambulant, keine Einrichtung —',
    woundType: '',
    score: '',
  };

  genders: Gender[] = ['weiblich', 'männlich', 'divers'];
  insuranceTypes: InsuranceType[] = ['GKV', 'PKV'];

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

  ngOnInit(): void {
    this.loadReferenceData();
  }

  loadReferenceData(): void {
    this.patientService.getDoctors().subscribe((data) => (this.doctors = data));
    this.patientService.getCareServices().subscribe((data) => (this.careServices = data));
    this.patientService.getWoundExperts().subscribe((data) => (this.woundExperts = data));
    this.patientService.getFacilities().subscribe((data) => (this.facilities = data));
    this.patientService.getInsuranceCompanies().subscribe((data) => (this.insuranceCompanies = data));
    this.patientService.getInsuranceClasses().subscribe((data) => (this.insuranceClasses = data));
    this.patientService.getAdditionalServices().subscribe((data) => (this.additionalServices = data));
    this.patientService.getWoundTypes().subscribe((data) => (this.woundTypes = data));
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
