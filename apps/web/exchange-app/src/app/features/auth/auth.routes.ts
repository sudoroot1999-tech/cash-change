import { Routes } from '@angular/router';

export const authRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
    title: 'Login - CryptoX'
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent),
    title: 'Create Account - CryptoX'
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  }
];
