import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Routes that DO NOT need Authorization header
 */
const PUBLIC_ROUTES: Array<string | RegExp> = [
  '/auth/login',
  '/auth/register',
  '/public/',
  '/health',
  /^https:\/\/cdn\./
];

function isPublicRoute(url: string): boolean {
  return PUBLIC_ROUTES.some(route =>
    typeof route === 'string'
      ? url.includes(route)
      : route.test(url)
  );
}

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  if (!token || isPublicRoute(req.url)) {
    return next(req);
  }

  const cloned = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });

  return next(cloned);
};
