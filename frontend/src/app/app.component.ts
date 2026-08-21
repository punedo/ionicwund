import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';
import { DynamicMenuComponent } from './components/dynamic-menu/dynamic-menu.component';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: true,
  imports: [IonApp, IonRouterOutlet, DynamicMenuComponent],
})
export class AppComponent implements OnInit {
  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.authService.loadCurrentUser().subscribe({
        error: () => {
          this.authService.clearAuth();
        },
      });
    }
  }
}
