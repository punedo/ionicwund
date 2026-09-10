import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { AdminShellComponent } from '../../components/admin-shell/admin-shell.component';
import { Task, TaskService } from '../../services/task.service';

type TaskStatus = 'Offen' | 'In Bearbeitung' | 'Erledigt';

interface TaskColumn {
  status: TaskStatus;
  label: string;
  labelSuffix: string;
}

@Component({
  selector: 'app-tasks-list',
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon, AdminShellComponent],
  templateUrl: './tasks-list.page.html',
  styleUrls: ['./tasks-list.page.scss'],
})
export class TasksListPage implements OnInit {
  pageTitle = 'Aufgaben';
  loading = false;
  tasks: Task[] = [];

  patientFilter = 'all';
  statusFilter = 'all';
  mineOnly = false;

  columns: TaskColumn[] = [
    { status: 'Offen', label: 'OFFEN', labelSuffix: '' },
    { status: 'In Bearbeitung', label: 'IN BEARBEITUNG', labelSuffix: '' },
    { status: 'Erledigt', label: 'ERLEDIGT / ZUR FREIGABE', labelSuffix: '' },
  ];

  constructor(
    private taskService: TaskService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadTasks();
  }

  loadTasks(): void {
    this.loading = true;
    this.taskService.getTasks().subscribe({
      next: (tasks) => {
        this.tasks = tasks;
        this.loading = false;
      },
      error: () => {
        this.tasks = [];
        this.loading = false;
      },
    });
  }

  get filteredTasks(): Task[] {
    return this.tasks.filter((task) => {
      const matchesPatient =
        this.patientFilter === 'all' || String(task.patientId) === this.patientFilter;
      const matchesStatus =
        this.statusFilter === 'all' || task.status === this.statusFilter;
      const matchesMine = !this.mineOnly || task.responsible?.includes('Bei mir');

      return matchesPatient && matchesStatus && matchesMine;
    });
  }

  tasksInColumn(status: TaskStatus): Task[] {
    return this.filteredTasks.filter((task) => task.status === status);
  }

  columnCount(status: TaskStatus): number {
    return this.tasksInColumn(status).length;
  }

  uniquePatients(): { id: number; name: string }[] {
    const map = new Map<number, string>();
    for (const task of this.tasks) {
      if (!map.has(task.patientId)) {
        map.set(task.patientId, task.patientName);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }

  onCreate(): void {
    this.router.navigate(['/tasks/create']);
  }

  onCardClick(task: Task): void {
    // Later: open task detail or move between columns
    console.log('Task clicked', task);
  }
}
