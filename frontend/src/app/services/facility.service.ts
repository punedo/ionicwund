import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Facility, FacilityCreateRequest } from '../models/facility.model';

@Injectable({
  providedIn: 'root',
})
export class FacilityService {
  private readonly apiUrl = `${environment.apiUrl}/facilities`;

  constructor(private http: HttpClient) {}

  getFacilities(): Observable<Facility[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map((res) => Array.isArray(res) ? res : (res.facilities ?? [])),
      catchError((err) => {
        console.error('[FacilityService] getFacilities error:', err);
        return of([]);
      })
    );
  }

  getFacility(id: number): Observable<Facility> {
    return this.http.get<Facility>(`${this.apiUrl}/${id}`);
  }

  createFacility(request: FacilityCreateRequest): Observable<Facility> {
    return this.http.post<Facility>(this.apiUrl, request);
  }

  updateFacility(id: number, request: FacilityCreateRequest): Observable<Facility> {
    return this.http.put<Facility>(`${this.apiUrl}/${id}`, request);
  }

  deleteFacility(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
