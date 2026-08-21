import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButton, IonInput, IonItem, IonLabel, IonNote, IonSpinner } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-two-factor',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonHeader, IonToolbar, IonTitle, IonButton, IonInput, IonItem, IonLabel, IonNote, IonSpinner],
  templateUrl: './two-factor.page.html',
  styleUrls: ['./two-factor.page.scss'],
})
export class TwoFactorPage {
  challengeId: number | null = null;
  email: string = '';
  code = '';
  errorMessage = '';
  loading = false;
  resendDisabled = false;
  resendCountdown = 30;

  constructor(
    private authService: AuthService,
    private router: Router
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

    this.loading = true;
    this.errorMessage = '';

    this.authService.verifyTwoFactor(this.challengeId, this.code).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.status === 'authenticated') {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error.error?.message || 'Verification failed.';
      },
    });
  }

  onResend(): void {
    if (this.resendDisabled || !this.email) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService.resendTwoFactor(this.email).subscribe({
      next: (response) => {
        this.loading = false;
        this.challengeId = response.challengeId;
        this.startResendCountdown();
      },
      error: (error) => {
        this.loading = false;
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
