import { Routes } from '@angular/router';

export const FINANCE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./transactions.component').then(m => m.TransactionsComponent),
  },
];
