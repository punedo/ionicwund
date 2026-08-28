import { inject } from '@angular/core';
import {
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError, switchMap, catchError, take } from 'rxjs';
import { ReplaySubject } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { AuthResponse } from '../models/auth.models';

let isRefreshing = false;
let refreshResult$: ReplaySubject<AuthResponse | null> | null = null;

function addAuthHeader(
  request: HttpRequest<unknown>,
  token: string
): HttpRequest<unknown> {
  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function authInterceptor(
  request: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  const authService = inject(AuthService);
  const token = authService.getAccessToken();
  const isAuthEndpoint =
    request.url.includes('/auth/login') ||
    request.url.includes('/auth/2fa') ||
    request.url.includes('/auth/refresh');

  if (token && !isAuthEndpoint) {
    request = addAuthHeader(request, token);
  }

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || isAuthEndpoint) {
        return throwError(() => error);
      }

      if (!isRefreshing) {
        isRefreshing = true;
        refreshResult$ = new ReplaySubject<AuthResponse | null>(1);

        return authService.refresh().pipe(
          switchMap((response) => {
            isRefreshing = false;
            refreshResult$?.next(response);
            refreshResult$?.complete();
            refreshResult$ = null;

            if (response.accessToken) {
              return next(addAuthHeader(request, response.accessToken));
            }

            authService.clearAuth();
            return throwError(() => error);
          }),
          catchError((refreshError) => {
            isRefreshing = false;
            refreshResult$?.error(refreshError);
            refreshResult$ = null;
            authService.clearAuth();
            return throwError(() => refreshError);
          })
        );
      }

      if (!refreshResult$) {
        return throwError(() => error);
      }

      return refreshResult$.pipe(
        take(1),
        switchMap((response) => {
          if (response?.accessToken) {
            return next(addAuthHeader(request, response.accessToken));
          }
          authService.clearAuth();
          return throwError(() => error);
        }),
        catchError(() => throwError(() => error))
      );
    })
  );
}
