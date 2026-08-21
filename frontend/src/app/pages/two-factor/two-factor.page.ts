import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButton, IonInput, IonItem, IonNote, IonIcon } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'app-two-factor',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonHeader, IonToolbar, IonTitle, IonButton, IonInput, IonItem, IonNote, IonIcon],
  templateUrl: './two-factor.page.html',
  styleUrls: ['./two-factor.page.scss'],
})
export class TwoFactorPage implements OnInit {
  challengeId: number | null = null;
  email: string = '';
  code = '';
  errorMessage = '';
  resendDisabled = false;
  resendCountdown = 30;

  ngOnInit(): void {
    this.loadingService.hide();
  }

  constructor(
    private authService: AuthService,
    private router: Router,
    private loadingService: LoadingService
  ) {
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state as {
      challengeId?: number;
      email?: string;
      expiresIn?: number;
    };

    if (state?.challengeId) {
      this.challengeId = state.challengeId;
      this.email = state.email || '';
    } else {
      this.router.navigate(['/login']);
    }
  }

  onVerify(): void {
    if (!this.code || this.code.length !== 6 || !this.challengeId) {
      this.errorMessage = 'Please enter the 6-digit code.';
      return;
    }

    this.loadingService.show('Code wird überprüft...');
    this.errorMessage = '';

    this.authService.verifyTwoFactor(this.challengeId, this.code).subscribe({
      next: (response) => {
        if (response.status === 'authenticated') {
          this.loadingService.show('Dashboard wird geladen...');
          this.router.navigate(['/dashboard']);
        } else {
          this.loadingService.hide();
        }
      },
      error: (error) => {
        this.loadingService.hide();
        this.errorMessage = error.error?.message || 'Verification failed.';
      },
    });
  }

  onResend(): void {
    if (this.resendDisabled || !this.email) {
      return;
    }

    this.loadingService.show('Code wird gesendet...');
    this.errorMessage = '';

    this.authService.resendTwoFactor(this.email).subscribe({
      next: (response) => {
        this.loadingService.hide();
        this.challengeId = response.challengeId;
        this.startResendCountdown();
      },
      error: (error) => {
        this.loadingService.hide();
        this.errorMessage = error.error?.message || 'Could not resend code.';
      },
    });
  }

  private startResendCountdown(): void {
    this.resendDisabled = true;
    this.resendCountdown = 30;
    const interval = setInterval(() => {
      this.resendCountdown--;
      if (this.resendCountdown <= 0) {
        this.resendDisabled = false;
        clearInterval(interval);
      }
    }, 1000);
  }
}
