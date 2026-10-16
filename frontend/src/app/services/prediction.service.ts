import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { WoundPrediction } from '../models/wound-prediction.model';

@Injectable({
  providedIn: 'root',
})
export class PredictionService {
  private readonly apiUrl = environment.predictionApiUrl;

  constructor(private http: HttpClient) {}

  analyzeImage(file: File): Observable<WoundPrediction | null> {
    const formData = new FormData();
    formData.append('image', file);

    return this.http
      .post<WoundPrediction>(`${this.apiUrl}/analyze`, formData)
      .pipe(
        catchError((err) => {
          console.error('[PredictionService] analyzeImage error:', err);
          return of(null);
        })
      );
  }

  health(): Observable<{ status: string }> {
    return this.http.get<{ status: string }>(`${this.apiUrl}/health`).pipe(
      catchError((err) => {
        console.error('[PredictionService] health error:', err);
        return of({ status: 'error' });
      })
    );
  }
}
