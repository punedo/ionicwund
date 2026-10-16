import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Network } from '@capacitor/network';
import { Observable, of, from } from 'rxjs';
import { catchError, delay, map, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { DbService } from '../data/services/db.service';

export interface Task {
  id: number;
  patientId: number;
  patientName: string;
  title: string;
  description?: string;
  dueDate?: string;
  responsible?: string;
  priority: 'Niedrig' | 'Mittel' | 'Hoch';
  status: 'Offen' | 'In Bearbeitung' | 'Erledigt';
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTaskPayload {
  patientId: number;
  title: string;
  description?: string;
  dueDate?: string;
  responsible?: string;
  priority: 'Niedrig' | 'Mittel' | 'Hoch';
  status: 'Offen' | 'In Bearbeitung' | 'Erledigt';
}

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private readonly apiUrl = `${environment.apiUrl}/tasks`;

  constructor(
    private http: HttpClient,
    private db: DbService
  ) {}

  getTasks(): Observable<Task[]> {
    const cacheKey = 'iw_tasks';
    const local$ = from(this.db.getCacheItem<Task[]>(cacheKey));

    return local$.pipe(
      switchMap((cached) =>
        from(Network.getStatus()).pipe(
          switchMap((status) => {
            if (!status.connected) {
              return of(cached ?? this.getMockTasks());
            }

            return this.http.get<{ tasks: Task[] }>(this.apiUrl).pipe(
              map((res) => res.tasks ?? []),
              switchMap((tasks) => from(this.db.setCacheItem(cacheKey, tasks)).pipe(map(() => tasks))),
              catchError(() => (cached ? of(cached) : of(this.getMockTasks()).pipe(delay(200))))
            );
          })
        )
      )
    );
  }

  createTask(payload: CreateTaskPayload): Observable<Task> {
    return this.http
      .post<{ task: Task }>(this.apiUrl, payload)
      .pipe(map((res) => res.task));
  }

  updateTask(id: number, payload: Partial<CreateTaskPayload>): Observable<Task> {
    return this.http
      .put<{ task: Task }>(`${this.apiUrl}/${id}`, payload)
      .pipe(map((res) => res.task));
  }

  private getMockTasks(): Task[] {
    return [
      {
        id: 1,
        patientId: 1,
        patientName: 'Fischer, Maria',
        title: 'Neue Verordnung übernehmen',
        description: 'Verordnung 02.07, eingegangen: Versorgung aufnehmen',
        dueDate: '31.08.2026',
        responsible: 'Bei mir',
        priority: 'Mittel',
        status: 'Offen',
      },
      {
        id: 2,
        patientId: 1,
        patientName: 'Fischer, Maria',
        title: 'Débridement',
        description: 'fällig heute',
        dueDate: '31.08.2026',
        responsible: 'Bei mir',
        priority: 'Hoch',
        status: 'Offen',
      },
      {
        id: 3,
        patientId: 4,
        patientName: 'Novak, Jan',
        title: 'Anordnung bestätigen',
        description: 'fällig morgen',
        dueDate: '01.09.2026',
        responsible: 'Wartet auf Arztpraxis (Dr. Roth)',
        priority: 'Mittel',
        status: 'Offen',
      },
      {
        id: 4,
        patientId: 3,
        patientName: 'Yilmaz, Turan',
        title: 'Abweichung prüfen',
        description: 'gemeldet vor 2h',
        dueDate: '31.08.2026',
        responsible: 'Wartet auf Homecare (J. Kaiser)',
        priority: 'Hoch',
        status: 'Offen',
      },
      {
        id: 5,
        patientId: 3,
        patientName: 'Yilmaz, Turan',
        title: 'Kompressionstherapie anpassen',
        description: '',
        dueDate: '31.08.2026',
        responsible: 'Bei mir',
        priority: 'Mittel',
        status: 'In Bearbeitung',
      },
      {
        id: 6,
        patientId: 1,
        patientName: 'Fischer, Maria',
        title: 'Wechselintervall bestätigt',
        description: 'Wartet auf Arztpraxis (Dr. Roth - freigegeben)',
        dueDate: '30.08.2026',
        responsible: 'Wartet auf Arztpraxis (Dr. Roth - freigegeben)',
        priority: 'Niedrig',
        status: 'Erledigt',
      },
      {
        id: 7,
        patientId: 2,
        patientName: 'Berger, Anna',
        title: 'Entsorgung dokumentiert',
        description: 'Wartet auf Arztpraxis (Dr. Roth)',
        dueDate: '29.08.2026',
        responsible: 'Wartet auf Arztpraxis (Dr. Roth)',
        priority: 'Niedrig',
        status: 'Erledigt',
      },
    ];
  }
}
