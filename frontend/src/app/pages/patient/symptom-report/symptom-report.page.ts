import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminShellComponent } from '../../../components/admin-shell/admin-shell.component';

@Component({
  selector: 'app-symptom-report',
  standalone: true,
  imports: [CommonModule, AdminShellComponent],
  templateUrl: './symptom-report.page.html',
  styleUrls: ['./symptom-report.page.scss'],
})
export class SymptomReportPage {}
