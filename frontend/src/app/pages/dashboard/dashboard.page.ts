import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonMenuButton, IonCard, IonCardHeader, IonCardTitle, IonCardContent } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonMenuButton, IonCard, IonCardHeader, IonCardTitle, IonCardContent],
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit {
  userName = '';
  userRoles: string[] = [];
  permissions: string[] = [];

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
      this.userRoles = user.roles;
    }
    this.permissions = this.authService.getPermissions();
  }
}
