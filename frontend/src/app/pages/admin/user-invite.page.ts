import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminShellComponent } from '../../components/admin-shell/admin-shell.component';
import { LoadingService } from '../../services/loading.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { FacilityService } from '../../services/facility.service';
import { Facility } from '../../models/facility.model';

interface UserInviteRequest {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  qualification?: string;
  organization?: string;
}

@Component({
  selector: 'app-user-invite',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminShellComponent],
  templateUrl: './user-invite.page.html',
  styleUrls: ['./user-invite.page.scss'],
})
export class UserInvitePage implements OnInit {
  invite: UserInviteRequest = {
    email: '',
    firstName: '',
    lastName: '',
    role: '',
    qualification: '',
    organization: '',
  };

  roles: string[] = [
    'Arztpraxis/Klinik',
    'Pflegedienst/Wundexperte',
    'Homecare/Anbieter',
    'Admin',
  ];

  qualifications: string[] = [
    'Zertifizierte Wundexpertin (ICW)',
    'Pflegefachkraft',
    'Arzt/Ärztin',
    'Wundmanager',
    'Sonstige',
  ];

  organizations: Facility[] = [];

  saving = false;
  submitted = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private http: HttpClient,
    private facilityService: FacilityService,
    private loadingService: LoadingService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadOrganizations();
  }

  loadOrganizations(): void {
    this.facilityService.getFacilities().subscribe({
      next: (data) => {
        this.organizations = data;
      },
      error: () => {
        this.organizations = [];
      },
    });
  }

  onCancel(): void {
    this.router.navigate(['/admin/users']);
  }

  onSubmit(form: NgForm): void {
    this.submitted = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (!form.valid) {
      this.errorMessage = 'Bitte füllen Sie alle Pflichtfelder aus.';
      return;
    }

    this.saving = true;
    this.loadingService.show('Einladung wird gesendet...');

    this.http.post(`${environment.apiUrl}/admin/users/invite`, this.invite).subscribe({
      next: () => {
        this.saving = false;
        this.loadingService.hide();
        this.successMessage = 'Einladung erfolgreich gesendet!';
        setTimeout(() => {
          this.router.navigate(['/admin/users']);
        }, 2000);
      },
      error: () => {
        this.saving = false;
        this.loadingService.hide();
        this.errorMessage = 'Fehler beim Senden der Einladung. Bitte versuchen Sie es erneut.';
      },
    });
  }
}
