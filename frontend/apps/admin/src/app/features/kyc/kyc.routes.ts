import { Routes } from '@angular/router';

export const KYC_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./kyc-queue.component').then(m => m.KycQueueComponent),
  },
];
