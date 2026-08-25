import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButton, IonInput, IonItem, IonNote } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { LoadingService } from '../../services/loading.service';
import { timeout, catchError, of } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonHeader, IonToolbar, IonTitle, IonButton, IonInput, IonItem, IonNote],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  email = '';
  password = '';
  errorMessage = '';
  loading = false;

  ngOnInit(): void {
    this.loadingService.hide();
  }

  constructor(
    private authService: AuthService,
    private router: Router,
    private loadingService: LoadingService
  ) {}

  onLogin(): void {
    if (!this.email || !this.password) {
      this.errorMessage = 'Please enter email and password.';
      return;
    }

    this.loadingService.show('Anmelden...');
    this.errorMessage = '';

    this.authService.login(this.email, this.password).pipe(
      timeout(10000),
      catchError((error) => {
        console.error('[LoginPage] Login error:', error);
        this.loadingService.hide();
        this.errorMessage = error.name === 'TimeoutError'
          ? 'Login timeout. Please check your connection and try again.'
          : (error.error?.message || 'Login failed. Please try again.');
        return of(null);
      })
    ).subscribe({
      next: (response) => {
        if (!response) {
          return;
        }

        if (response.status === '2fa_required' && response.challengeId) {
          this.loadingService.hide();
          this.router.navigate(['/2fa'], {
            state: {
              challengeId: response.challengeId,
              email: this.email,
              expiresIn: response.expiresIn,
            },
          });
        } else if (response.status === 'authenticated') {
          this.loadingService.show('Dashboard wird geladen...');
          this.router.navigate(['/dashboard']).then(() => {
            this.loadingService.hide();
          }).catch(() => {
            this.loadingService.hide();
          });
        } else {
          this.loadingService.hide();
          this.errorMessage = 'Unexpected login response. Please try again.';
        }
      },
      error: (error) => {
        console.error('[LoginPage] Unexpected login error:', error);
        this.loadingService.hide();
        this.errorMessage = 'An unexpected error occurred. Please try again.';
      },
    });
  }
}
