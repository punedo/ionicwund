import { inject } from '@angular/core';
import {
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError, switchMap, catchError } from 'rxjs';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;

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
    request = request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isAuthEndpoint && !isRefreshing) {
        isRefreshing = true;
        return authService.refresh().pipe(
          switchMap((response) => {
            isRefreshing = false;
            if (response.accessToken) {
              request = request.clone({
                setHeaders: {
                  Authorization: `Bearer ${response.accessToken}`,
                },
              });
              return next(request);
            }
            authService.clearAuth();
            return throwError(() => error);
          }),
          catchError((refreshError) => {
            isRefreshing = false;
            authService.clearAuth();
            return throwError(() => refreshError);
          })
        );
      }
      return throwError(() => error);
    })
  );
}
