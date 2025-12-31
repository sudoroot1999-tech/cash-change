import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, retry, timer } from 'rxjs';

/**
 * Error interceptor to handle HTTP errors globally
 * - Retry failed requests (with exponential backoff)
 * - Handle authentication errors
 * - Log errors for debugging
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  
  // Log the request
  console.log(`[HTTP] ${req.method} ${req.url}`);
  const startTime = Date.now();

  return next(req).pipe(
    // Retry logic with exponential backoff (only for GET requests)
 retry({
      count: req.method === 'GET' ? 2 : 0, // Only retry GET requests
      delay: (error, retryCount) => {
        // Don't retry on 4xx errors (including 429 rate limit)
        if (error.status >= 400 && error.status < 500) {
          throw error;
        }
        
        // Exponential backoff: 1s, 2s
        const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 2000);
        console.log(`[HTTP] Retrying request (attempt ${retryCount}) after ${delay}ms...`);
        return timer(delay);
      }
    }),
    
    // Error handling
    catchError((error: HttpErrorResponse) => {
      const duration = Date.now() - startTime;
      console.error(`[HTTP] ${req.method} ${req.url} failed after ${duration}ms:`, error);

      // Handle specific error types
      if (error.error instanceof ErrorEvent) {
        // Client-side or network error
        console.error('[HTTP] Client-side error:', error.error.message);
      } else {
        // Server-side error
        console.error(`[HTTP] Server error: ${error.status} ${error.statusText}`);
        
        // Handle authentication errors
        if (error.status === 401) {
          console.warn('[HTTP] Unauthorized - redirecting to login');
          localStorage.clear();
          router.navigate(['/auth/login'], {
            queryParams: { returnUrl: router.url, reason: 'session_expired' }
          });
        }
        
        // Handle forbidden errors
        if (error.status === 403) {
          console.warn('[HTTP] Forbidden - access denied');
        }
        
        // Handle not found errors
        if (error.status === 404) {
          console.warn('[HTTP] Not found:', req.url);
        }
        
        // Handle server errors
        if (error.status >= 500) {
          console.error('[HTTP] Server error - service may be down');
        }
        
        // Handle network errors
        if (error.status === 0) {
          console.error('[HTTP] Network error - unable to connect to server');
        }
      }

      return throwError(() => error);
    })
  );
};