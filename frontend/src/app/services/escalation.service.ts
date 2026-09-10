import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, delay, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Escalation {
  id: number;
  patientName: string;
  lastUpdate: string;
  message: string;
  priority: 'Mittel' | 'Hoch' | 'Erledigt' | null | '';
  patientId: number;
  isOpen?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class EscalationService {
  private readonly apiUrl = `${environment.apiUrl}/escalations`;

  constructor(private http: HttpClient) {}

  getEscalations(): Observable<Escalation[]> {
    return this.http.get<{ escalations: Escalation[] }>(this.apiUrl).pipe(
      map((res) => res.escalations ?? []),
      catchError((err) => {
        console.error('[EscalationService] getEscalations error:', err);
        // Fallback to prototype mock data if backend endpoint is not available yet
        return of(this.getMockEscalations()).pipe(delay(200));
      })
    );
  }

  private getMockEscalations(): Escalation[] {
    return [
      {
        id: 1,
        patientName: 'Fischer, Maria',
        lastUpdate: 'heute, 06:40',
        message: 'Wundrand zeigt beginnende Rötung – Rückmeldung ausstehend',
        priority: 'Mittel',
        patientId: 1,
      },
      {
        id: 2,
        patientName: 'Yilmaz, Turan',
        lastUpdate: 'gestern, 16:05',
        message: 'Infektionszeichen, Abstrich veranlasst – Befund ausstehend',
        priority: 'Hoch',
        patientId: 2,
      },
      {
        id: 3,
        patientName: 'Novak, Jan',
        lastUpdate: 'vor 2 Tagen',
        message: 'Rückfrage zur Verordnung – Antwort erhalten',
        priority: 'Erledigt',
        patientId: 3,
      },
    ];
  }
}
