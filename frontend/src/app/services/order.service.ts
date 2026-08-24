import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Order, OrderCreateRequest } from '../models/order.model';

export interface ProductOption {
  name: string;
  unit: string;
}

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private readonly apiUrl = `${environment.apiUrl}/orders`;

  constructor(private http: HttpClient) {}

  getOrders(): Observable<Order[]> {
    return this.http.get<{ orders: Order[] }>(this.apiUrl).pipe(
      map((res) => res.orders ?? []),
      catchError((err) => {
        console.error('[OrderService] getOrders error:', err);
        return of([]);
      })
    );
  }

  createOrder(request: OrderCreateRequest): Observable<Order> {
    return this.http.post<Order>(this.apiUrl, request);
  }

  getFacilities(): Observable<string[]> {
    return this.http.get<{ facilities: { name: string }[] }>(`${environment.apiUrl}/facilities`).pipe(
      map((res) => (res.facilities ?? []).map((f) => f.name)),
      catchError((err) => {
        console.error('[OrderService] getFacilities error:', err);
        return of([]);
      })
    );
  }

  getPatients(): Observable<string[]> {
    return this.http.get<{ patients: { firstName: string; lastName: string }[] }>(`${environment.apiUrl}/patients`).pipe(
      map((res) => (res.patients ?? []).map((p) => `${p.lastName}, ${p.firstName}`)),
      catchError((err) => {
        console.error('[OrderService] getPatients error:', err);
        return of([]);
      })
    );
  }

  getProducts(): Observable<ProductOption[]> {
    return this.http.get<{ products: ProductOption[] }>(`${environment.apiUrl}/products`).pipe(
      map((res) => res.products ?? []),
      catchError((err) => {
        console.error('[OrderService] getProducts error:', err);
        return of([]);
      })
    );
  }
}
