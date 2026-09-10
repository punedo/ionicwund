import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminShellComponent } from '../../components/admin-shell/admin-shell.component';
import { Patient } from '../../models/patient.model';
import { PatientService } from '../../services/patient.service';
import { CreateTaskPayload, TaskService } from '../../services/task.service';

@Component({
  selector: 'app-task-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AdminShellComponent],
  templateUrl: './task-create.page.html',
  styleUrls: ['./task-create.page.scss'],
})
export class TaskCreatePage implements OnInit {
  pageTitle = 'Aufgaben / Aufgabe anlegen';
  form: FormGroup;
  loading = false;
  patients: Patient[] = [];

  priorities = ['Niedrig', 'Mittel', 'Hoch'];
  statuses = ['Offen', 'In Bearbeitung', 'Erledigt'];
  responsibles = ['Bei mir', 'Pflegedienst Nord', 'Arztpraxis Dr. Roth', 'Homecare J. Kaiser'];

  constructor(
    private fb: FormBuilder,
    private taskService: TaskService,
    private patientService: PatientService,
    private router: Router
  ) {
    this.form = this.fb.group({
      patientId: [null, Validators.required],
      dueDate: [this.formatDate(new Date()), Validators.required],
      title: ['', Validators.required],
      description: [''],
      responsible: ['Bei mir', Validators.required],
      priority: ['Mittel', Validators.required],
      status: ['Offen', Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadPatients();
  }

  loadPatients(): void {
    this.patientService.getPatients().subscribe({
      next: (patients) => {
        this.patients = patients;
        if (patients.length > 0 && !this.form.value.patientId) {
          this.form.patchValue({ patientId: patients[0].id });
        }
      },
      error: () => {
        this.patients = [];
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const payload: CreateTaskPayload = {
      ...this.form.value,
      patientId: Number(this.form.value.patientId),
    };

    this.taskService.createTask(payload).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/tasks']);
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  onCancel(): void {
    this.router.navigate(['/tasks']);
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
