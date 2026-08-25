import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminShellComponent } from '../../../components/admin-shell/admin-shell.component';

@Component({
  selector: 'app-my-documents',
  standalone: true,
  imports: [CommonModule, AdminShellComponent],
  templateUrl: './my-documents.page.html',
  styleUrls: ['./my-documents.page.scss'],
})
export class MyDocumentsPage {}
