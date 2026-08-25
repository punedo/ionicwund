import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize, timeout, catchError, of } from 'rxjs';
import { AdminShellComponent } from '../../../components/admin-shell/admin-shell.component';
import { PatientDashboardService } from '../../../services/patient-dashboard.service';
import { LoadingService } from '../../../services/loading.service';
import { PatientDashboard } from '../../../models/patient-dashboard.model';

@Component({
  selector: 'app-my-wound',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminShellComponent],
  templateUrl: './my-wound.page.html',
  styleUrls: ['./my-wound.page.scss'],
})
export class MyWoundPage implements OnInit {
  patientDashboard: PatientDashboard | null = null;
  loading = true;
  painValue = 3;

  constructor(
    private patientDashboardService: PatientDashboardService,
    private loadingService: LoadingService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadingService.show('Wunddaten werden geladen …');
    this.patientDashboardService.loadDashboard().pipe(
      timeout(8000),
      catchError(() => {
        console.warn('[MyWoundPage] Timeout or error - using fallback data');
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
  }

  navigate(route: string): void {
    this.router.navigateByUrl(route);
  }

  submitPain(): void {
    this.loadingService.show('Schmerzwert wird übermittelt …');
    setTimeout(() => {
      this.loadingService.hide();
    }, 1000);
  }

  get progressPercent(): number {
    return this.patientDashboard?.carePlan?.progressPercent ?? 0;
  }
}
