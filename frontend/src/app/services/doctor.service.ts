import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Doctor, DoctorCreateRequest } from '../models/doctor.model';

@Injectable({
  providedIn: 'root',
})
export class DoctorService {
  private readonly apiUrl = `${environment.apiUrl}/doctors`;

  constructor(private http: HttpClient) {}

  getDoctors(): Observable<Doctor[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map((res) => Array.isArray(res) ? res : (res.doctors ?? [])),
      catchError((err) => {
        console.error('[DoctorService] getDoctors error:', err);
        return of([]);
      })
    );
  }

  getDoctor(id: number): Observable<Doctor> {
    return this.http.get<Doctor>(`${this.apiUrl}/${id}`);
  }

  createDoctor(request: DoctorCreateRequest): Observable<Doctor> {
    return this.http.post<Doctor>(this.apiUrl, request);
  }

  updateDoctor(id: number, request: DoctorCreateRequest): Observable<Doctor> {
    return this.http.put<Doctor>(`${this.apiUrl}/${id}`, request);
  }

  deleteDoctor(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
