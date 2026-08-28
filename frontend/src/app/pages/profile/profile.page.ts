import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonItem,
  IonInput,
  IonButton,
  IonNote,
} from '@ionic/angular';
import { AdminShellComponent } from '../../components/admin-shell/admin-shell.component';
import { AuthService } from '../../services/auth.service';
import { LoadingService } from '../../services/loading.service';
import { User } from '../../models/auth.models';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonItem,
    IonInput,
    IonButton,
    IonNote,
    AdminShellComponent,
  ],
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
})
export class ProfilePage implements OnInit {
  user: User | null = null;

  firstName = '';
  lastName = '';
  email = '';
  profileError = '';
  profileSuccess = '';
  profileSaving = false;

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  passwordError = '';
  passwordSuccess = '';
  passwordSaving = false;

  constructor(
    private authService: AuthService,
    private loadingService: LoadingService
  ) {}

  ngOnInit(): void {
    const u = this.authService.getCurrentUser();
    if (u) {
      this.user = u;
      this.firstName = u.firstName ?? '';
      this.lastName = u.lastName ?? '';
      this.email = u.email;
    }
  }

  onSaveProfile(): void {
    this.profileError = '';
    this.profileSuccess = '';

    if (!this.email) {
      this.profileError = 'Bitte geben Sie eine E-Mail-Adresse ein.';
      return;
    }

    this.profileSaving = true;
    this.authService
      .updateProfile({
        firstName: this.firstName || null,
        lastName: this.lastName || null,
        email: this.email,
      })
      .subscribe({
        next: (response) => {
          this.profileSaving = false;
          if (response.status === 'success') {
            this.profileSuccess = 'Profil erfolgreich aktualisiert.';
            if (response.user) {
              this.user = response.user;
              this.authService.loadCurrentUser().subscribe();
            }
          } else {
            this.profileError = 'Profil konnte nicht aktualisiert werden.';
          }
        },
        error: (error) => {
          this.profileSaving = false;
          this.profileError =
            error.error?.message ||
            'Fehler beim Speichern des Profils.';
        },
      });
  }

  onChangePassword(): void {
    this.passwordError = '';
    this.passwordSuccess = '';

    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      this.passwordError = 'Bitte füllen Sie alle Passwortfelder aus.';
      return;
    }

    if (this.newPassword.length < 8) {
      this.passwordError = 'Das neue Passwort muss mindestens 8 Zeichen lang sein.';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.passwordError = 'Die Passwörter stimmen nicht überein.';
      return;
    }

    this.passwordSaving = true;
    this.authService
      .changePassword(this.currentPassword, this.newPassword)
      .subscribe({
        next: (response) => {
          this.passwordSaving = false;
          if (response.status === 'success') {
            this.passwordSuccess = 'Passwort erfolgreich geändert.';
            this.currentPassword = '';
            this.newPassword = '';
            this.confirmPassword = '';
            if (response.user) {
              this.authService.loadCurrentUser().subscribe();
            }
          } else {
            this.passwordError = 'Passwort konnte nicht geändert werden.';
          }
        },
        error: (error) => {
          this.passwordSaving = false;
          this.passwordError =
            error.error?.message ||
            'Fehler beim Ändern des Passworts.';
        },
      });
  }
}
