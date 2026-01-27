import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};

export const superAdminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.user()?.role === 'super_admin') {
    return true;
  }

  router.navigate(['/dashboard']);
  return false;
};

export const permissionGuard = (permission: string): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.hasPermission(permission)) {
      return true;
    }

    router.navigate(['/dashboard']);
    return false;
  };
};
