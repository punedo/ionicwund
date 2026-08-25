import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TerminWunsch {
  id: number;
  patientId: number;
  patientName: string;
  preferredDate: string;
  preferredTime: string;
  notes: string | null;
  status: 'ausstehend' | 'angenommen' | 'abgelehnt';
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
  convertedAppointmentId: number | null;
}

export interface TerminWunschRequest {
  patientId: number;
  preferredDate: string;
  preferredTime: string;
  notes?: string;
}

@Injectable({
  providedIn: 'root',
})
export class TerminWunschService {
  private readonly apiUrl = `${environment.apiUrl}/termin-wuensche`;

  constructor(private http: HttpClient) {}

  getTerminWuensche(): Observable<{ wuensche: TerminWunsch[] }> {
    return this.http.get<{ wuensche: TerminWunsch[] }>(this.apiUrl);
  }

  createTerminWunsch(request: TerminWunschRequest): Observable<TerminWunsch> {
    return this.http.post<TerminWunsch>(this.apiUrl, request);
  }

  acceptTerminWunsch(id: number): Observable<TerminWunsch> {
    return this.http.post<TerminWunsch>(`${this.apiUrl}/${id}/accept`, {});
  }

  rejectTerminWunsch(id: number, reviewNotes?: string): Observable<TerminWunsch> {
    return this.http.post<TerminWunsch>(`${this.apiUrl}/${id}/reject`, { reviewNotes });
  }
}
