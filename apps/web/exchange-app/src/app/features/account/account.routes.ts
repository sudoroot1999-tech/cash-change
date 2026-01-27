import { Routes } from '@angular/router';

export const ACCOUNT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => 
      import('./layouts/account-layout/account-layout.component').then(m => m.AccountLayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'profile',
        pathMatch: 'full'
      },
      {
        path: 'profile',
        loadComponent: () => 
          import('./pages/profile/profile.component').then(m => m.ProfileComponent)
      },
      {
        path: 'settings',
        loadComponent: () => 
          import('./pages/settings/settings.component').then(m => m.SettingsComponent)
      },
      {
        path: 'security',
        loadComponent: () => 
          import('./pages/security/security.component').then(m => m.SecurityComponent)
      },
      {
        path: 'api-keys',
        loadComponent: () => 
          import('./pages/api-keys/api-keys.component').then(m => m.ApiKeysComponent)
      },
      {
        path: 'verification',
        loadComponent: () => 
          import('./pages/verification/verification.component').then(m => m.VerificationComponent)
      }
    ]
  }
];
