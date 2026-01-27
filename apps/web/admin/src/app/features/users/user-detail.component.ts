import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AdminApiService } from '../../core/services/admin-api.service';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="user-detail">
      <div class="breadcrumb">
        <a routerLink="/users">← Back to Users</a>
      </div>
      
      @if (user()) {
        <div class="user-header">
          <div class="user-avatar">{{ user()?.email?.[0]?.toUpperCase() }}</div>
          <div class="user-info">
            <h1>{{ user()?.email }}</h1>
            <span class="user-id mono">{{ user()?.id }}</span>
          </div>
          <div class="user-actions">
            <button class="btn-secondary" (click)="resetPassword()">Reset Password</button>
            <button class="btn-danger" (click)="banUser()">Ban User</button>
          </div>
        </div>
        
        <div class="detail-grid">
          <!-- Profile Info -->
          <div class="card">
            <div class="card-header">
              <h2>Profile Information</h2>
            </div>
            <div class="card-body">
              <div class="info-row">
                <span class="label">Status</span>
                <span class="badge" [class]="'badge-' + user()?.status">{{ user()?.status }}</span>
              </div>
              <div class="info-row">
                <span class="label">KYC Level</span>
                <span>Level {{ user()?.kycLevel }}</span>
              </div>
              <div class="info-row">
                <span class="label">Account Tier</span>
                <span>{{ user()?.tier }}</span>
              </div>
              <div class="info-row">
                <span class="label">Registered</span>
                <span class="mono">{{ user()?.createdAt | date:'medium' }}</span>
              </div>
              <div class="info-row">
                <span class="label">Last Login</span>
                <span class="mono">{{ user()?.lastLoginAt | date:'medium' }}</span>
              </div>
            </div>
          </div>
          
          <!-- Wallet Balances -->
          <div class="card">
            <div class="card-header">
              <h2>Wallet Balances</h2>
            </div>
            <div class="card-body">
              @for (wallet of wallets(); track wallet.currency) {
                <div class="wallet-row">
                  <span class="currency">{{ wallet.currency }}</span>
                  <div class="balances">
                    <span class="available mono">{{ wallet.available }}</span>
                    <span class="locked mono text-muted">Locked: {{ wallet.locked }}</span>
                  </div>
                </div>
              }
            </div>
          </div>
          
          <!-- Recent Orders -->
          <div class="card wide">
            <div class="card-header">
              <h2>Recent Orders</h2>
            </div>
            <div class="card-body">
              <table>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Pair</th>
                    <th>Side</th>
                    <th>Type</th>
                    <th>Price</th>
                    <th>Quantity</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  @for (order of orders(); track order.id) {
                    <tr>
                      <td class="mono">{{ order.id }}</td>
                      <td>{{ order.symbol }}</td>
                      <td [class]="order.side">{{ order.side }}</td>
                      <td>{{ order.type }}</td>
                      <td class="mono">{{ order.price }}</td>
                      <td class="mono">{{ order.quantity }}</td>
                      <td>
                        <span class="badge badge-{{ order.status }}">{{ order.status }}</span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      } @else {
        <div class="loading">Loading user details...</div>
      }
    </div>
  `,
  styles: [`
    .user-detail {
      max-width: 1400px;
    }
    
    .breadcrumb {
      margin-bottom: 24px;
      
      a {
        color: var(--color-text-secondary);
        font-size: 14px;
        
        &:hover {
          color: var(--color-accent);
        }
      }
    }
    
    .user-header {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 32px;
      padding: 24px;
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 12px;
    }
    
    .user-avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--color-accent), #8b5cf6);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: 700;
    }
    
    .user-info {
      flex: 1;
      
      h1 {
        font-size: 24px;
        margin-bottom: 4px;
      }
      
      .user-id {
        color: var(--color-text-muted);
        font-size: 13px;
      }
    }
    
    .user-actions {
      display: flex;
      gap: 12px;
    }
    
    .btn-secondary {
      padding: 10px 20px;
      background: var(--color-bg-tertiary);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      color: var(--color-text-primary);
      cursor: pointer;
    }
    
    .btn-danger {
      padding: 10px 20px;
      background: var(--color-error);
      border: none;
      border-radius: 8px;
      color: white;
      cursor: pointer;
    }
    
    .detail-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }
    
    .card {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 12px;
      
      &.wide {
        grid-column: span 2;
      }
    }
    
    .card-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--color-border);
      
      h2 {
        font-size: 16px;
        font-weight: 600;
      }
    }
    
    .card-body {
      padding: 20px;
    }
    
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid var(--color-border);
      
      &:last-child {
        border-bottom: none;
      }
      
      .label {
        color: var(--color-text-secondary);
      }
    }
    
    .wallet-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid var(--color-border);
      
      .currency {
        font-weight: 600;
      }
      
      .balances {
        text-align: right;
        
        .available {
          display: block;
        }
        
        .locked {
          font-size: 12px;
        }
      }
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
    }
    
    th, td {
      padding: 12px;
      text-align: left;
      font-size: 13px;
    }
    
    th {
      color: var(--color-text-secondary);
      font-weight: 600;
    }
    
    td {
      border-top: 1px solid var(--color-border);
    }
    
    .buy { color: var(--color-success); }
    .sell { color: var(--color-error); }
    
    .badge-open { background: rgba(59, 130, 246, 0.15); color: var(--color-info); }
    .badge-filled { background: rgba(34, 197, 94, 0.15); color: var(--color-success); }
    .badge-cancelled { background: rgba(113, 113, 122, 0.15); color: var(--color-text-muted); }
  `],
})
export class UserDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(AdminApiService);
  
  user = signal<any>(null);
  wallets = signal<any[]>([]);
  orders = signal<any[]>([]);
  
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.loadUser(id!);
  }
  
  loadUser(id: string): void {
    // Mock data
    this.user.set({
      id,
      email: 'john@example.com',
      status: 'active',
      kycLevel: 2,
      tier: 'VIP',
      createdAt: '2024-01-15T10:30:00Z',
      lastLoginAt: '2024-12-28T09:15:00Z',
    });
    
    this.wallets.set([
      { currency: 'BTC', available: '1.25000000', locked: '0.50000000' },
      { currency: 'ETH', available: '15.80000000', locked: '0.00000000' },
      { currency: 'USDT', available: '25,420.50', locked: '5,000.00' },
    ]);
    
    this.orders.set([
      { id: 'ord-001', symbol: 'BTCUSDT', side: 'buy', type: 'limit', price: '45,000.00', quantity: '0.5', status: 'filled' },
      { id: 'ord-002', symbol: 'ETHUSDT', side: 'sell', type: 'market', price: '-', quantity: '2.0', status: 'filled' },
      { id: 'ord-003', symbol: 'BTCUSDT', side: 'buy', type: 'limit', price: '44,500.00', quantity: '0.25', status: 'open' },
    ]);
  }
  
  resetPassword(): void {
    console.log('Reset password');
  }
  
  banUser(): void {
    console.log('Ban user');
  }
}
