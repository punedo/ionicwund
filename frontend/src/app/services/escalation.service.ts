import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Network } from '@capacitor/network';
import { Observable, of, from } from 'rxjs';
import { catchError, delay, map, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { DbService } from '../data/services/db.service';

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

  constructor(
    private http: HttpClient,
    private db: DbService
  ) {}

  getEscalations(): Observable<Escalation[]> {
    const cacheKey = 'iw_escalations';
    const local$ = from(this.db.getCacheItem<Escalation[]>(cacheKey));

    return local$.pipe(
      switchMap((cached) =>
        from(Network.getStatus()).pipe(
          switchMap((status) => {
            if (!status.connected) {
              return of(cached ?? this.getMockEscalations());
            }

            return this.http.get<{ escalations: Escalation[] }>(this.apiUrl).pipe(
              map((res) => res.escalations ?? []),
              switchMap((escalations) => from(this.db.setCacheItem(cacheKey, escalations)).pipe(map(() => escalations))),
              catchError(() => (cached ? of(cached) : of(this.getMockEscalations()).pipe(delay(200))))
            );
          })
        )
      )
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
