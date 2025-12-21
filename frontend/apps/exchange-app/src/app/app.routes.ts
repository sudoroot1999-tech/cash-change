import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layouts/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'trade',
        pathMatch: 'full'
      },
      {
        path: 'trade',
        loadComponent: () => import('./features/trading/pages/spot-trading/spot-trading.component').then(m => m.SpotTradingComponent),
        title: 'Spot Trading - CryptoX'
      },
      {
        path: 'trade/:pair',
        loadComponent: () => import('./features/trading/pages/spot-trading/spot-trading.component').then(m => m.SpotTradingComponent),
        title: 'Spot Trading - CryptoX'
      },
      {
        path: 'markets',
        loadComponent: () => import('./features/markets/pages/markets-overview/markets-overview.component').then(m => m.MarketsOverviewComponent),
        title: 'Markets - CryptoX'
      },
      {
        path: 'wallet',
        loadComponent: () => import('./features/wallet/pages/wallet-overview/wallet-overview.component').then(m => m.WalletOverviewComponent),
        canActivate: [authGuard],
        title: 'Wallet - CryptoX'
      },
      {
        path: 'orders',
        loadComponent: () => import('./features/orders/pages/order-history/order-history.component').then(m => m.OrderHistoryComponent),
        canActivate: [authGuard],
        title: 'Orders - CryptoX'
      }
    ]
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.authRoutes)
  },
  {
    path: '**',
    redirectTo: 'trade'
  }
];
