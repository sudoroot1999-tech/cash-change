import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import {
  catchError,
  throwError,
  retry,
  timer,
  switchMap,
  finalize,
  tap,
  Observable
} from 'rxjs';
import { TokenPair } from '@/libs/types';

let isRefreshing = false;
let refreshQueue: Array<(success: boolean) => void> = [];

function waitForRefresh(): Observable<boolean> {
  return new Observable<boolean>(observer => {
    refreshQueue.push(success => {
      observer.next(success);
      observer.complete();
    });
  });
}

function resolveRefreshQueue(success: boolean) {
  refreshQueue.forEach(cb => cb(success));
  refreshQueue = [];
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  console.log(`[HTTP] ${req.method} ${req.url}`);
  const startTime = Date.now();

  return next(req).pipe(
    // Retry GET requests with exponential backoff
    retry({
      count: req.method === 'GET' ? 2 : 0,
      delay: (error, retryCount) => {
        if (error.status >= 400 && error.status < 500) {
          throw error;
        }
        const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 2000);
        console.log(`[HTTP] Retrying request (attempt ${retryCount}) after ${delay}ms...`);
        return timer(delay);
      }
    }),

    catchError((error: HttpErrorResponse) => {
      const duration = Date.now() - startTime;
      console.error(`[HTTP] ${req.method} ${req.url} failed after ${duration}ms`, error);

      // -------- 401 HANDLING --------
      if (error.status === 401) {
        // prevent refresh on refresh
        if (req.url.includes('/auth/refresh')) {
          authService.logoutAndKillSession?.();
          router.navigate(['/auth/login'], {
            queryParams: { returnUrl: router.url, reason: 'session_expired' }
          });
          return throwError(() => error);
        }

        // wait if refresh is runnig
        if (isRefreshing) {
          return waitForRefresh().pipe(
            switchMap(success => {
              if (!success) return throwError(() => error);
              return next(req); // main retry
            })
          );
        }

        // start refresh
        isRefreshing = true;

        return authService.refreshToken().pipe(
          // save new token without changing flow
          switchMap((tokenPair: TokenPair | null) => {
            if (!tokenPair) throw error;
            resolveRefreshQueue(true);
            return next(req); // main retry
          }),
          catchError(err => {
            resolveRefreshQueue(false);
            authService.logoutAndKillSession().subscribe({
              next: () => {
                router.navigate(['/auth/login'], {
                  queryParams: { returnUrl: router.url, reason: 'session_expired' }
                });
              },
              error: () => {
                router.navigate(['/auth/login'], {
                  queryParams: { returnUrl: router.url, reason: 'session_expired' }
                });
              }
            });
            return throwError(() => err);
          }),
          finalize(() => {
            isRefreshing = false;
          })
        );
      }

      // -------- OTHER ERRORS --------
      if (error.status === 403) console.warn('[HTTP] Forbidden');
      if (error.status === 404) console.warn('[HTTP] Not found:', req.url);
      if (error.status >= 500) console.error('[HTTP] Server error');
      if (error.status === 0) console.error('[HTTP] Network error');

      return throwError(() => error);
    })
  );
};
