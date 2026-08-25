import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminShellComponent } from '../../../components/admin-shell/admin-shell.component';

@Component({
  selector: 'app-consents',
  standalone: true,
  imports: [CommonModule, AdminShellComponent],
  templateUrl: './consents.page.html',
  styleUrls: ['./consents.page.scss'],
})
export class ConsentsPage {}
