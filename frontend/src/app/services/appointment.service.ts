import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Appointment {
  id: number;
  patientId: number;
  patientName: string;
  date: string;
  startTime: string;
  endTime: string;
  serviceType: string;
  address?: string;
  tour?: string;
  repetition: string;
  status: string;
  recordedAt?: string;
  createdAt: string;
}

export interface Certificate {
  id: number;
  patientName: string;
  date: string;
  serviceType: string;
  recording: string;
  status: 'Offen' | 'Vollständig';
}

export interface AppointmentCreateRequest {
  patientId: number;
  date: string;
  startTime: string;
  endTime: string;
  serviceType: string;
  address?: string;
  tour?: string;
  repetition?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AppointmentService {
  private readonly apiUrl = `${environment.apiUrl}/appointments`;

  constructor(private http: HttpClient) {}

  getAppointments(weekStart?: string): Observable<Appointment[]> {
    const url = weekStart ? `${this.apiUrl}?weekStart=${weekStart}` : this.apiUrl;
    return this.http.get<any>(url).pipe(
      map((res) => (Array.isArray(res) ? res : (res.appointments ?? []))),
      catchError((err) => {
        console.error('[AppointmentService] getAppointments error:', err);
        return of([]);
      })
    );
  }

  createAppointment(request: AppointmentCreateRequest): Observable<Appointment> {
    return this.http.post<Appointment>(this.apiUrl, request);
  }

  updateAppointment(id: number, request: Partial<AppointmentCreateRequest>): Observable<Appointment> {
    return this.http.put<Appointment>(`${this.apiUrl}/${id}`, request);
  }

  deleteAppointment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  recordTime(id: number): Observable<Appointment> {
    return this.http.post<Appointment>(`${this.apiUrl}/${id}/record`, {});
  }

  getCertificates(): Observable<Certificate[]> {
    return this.getAppointments().pipe(
      map((appointments) =>
        appointments
          .filter((a) => a.recordedAt || a.status === 'durchgeführt')
          .map((a) => ({
            id: a.id,
            patientName: a.patientName,
            date: this.formatDate(a.date),
            serviceType: `${this.getDurationMinutes(a.startTime, a.endTime)} Min ${a.serviceType} ambulant`,
            recording: a.recordedAt ? 'Hochgeladen' : '—',
            status: a.recordedAt ? 'Vollständig' : 'Offen',
          }))
      )
    );
  }

  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private getDurationMinutes(start: string, end: string): number {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    return (endH * 60 + endM) - (startH * 60 + startM);
  }
}
