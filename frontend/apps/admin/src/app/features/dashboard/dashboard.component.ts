import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminApiService, DashboardStats, SystemHealth } from '../../core/services/admin-api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dashboard">
      <div class="page-header">
        <h1>Dashboard</h1>
        <p>Welcome back! Here's what's happening today.</p>
      </div>
      
      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon blue">👥</div>
          <div class="stat-content">
            <span class="stat-value">{{ stats()?.totalUsers | number }}</span>
            <span class="stat-label">Total Users</span>
            <span class="stat-change positive">+{{ stats()?.newUsersToday }} today</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon orange">📋</div>
          <div class="stat-content">
            <span class="stat-value">{{ stats()?.pendingKyc }}</span>
            <span class="stat-label">Pending KYC</span>
            <a routerLink="/kyc" class="stat-link">Review →</a>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon green">📈</div>
          <div class="stat-content">
            <span class="stat-value">{{ stats()?.activeOrders | number }}</span>
            <span class="stat-label">Active Orders</span>
            <a routerLink="/orders" class="stat-link">View All →</a>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon purple">💰</div>
          <div class="stat-content">
            <span class="stat-value">\${{ formatVolume(stats()?.volume24h) }}</span>
            <span class="stat-label">24h Volume</span>
            <span class="stat-change positive">+12.5%</span>
          </div>
        </div>
      </div>
      
      <div class="dashboard-grid">
        <!-- System Health -->
        <div class="card">
          <div class="card-header">
            <h2>System Health</h2>
          </div>
          <div class="card-body">
            @if (health()) {
              <div class="health-list">
                @for (service of health()?.services; track service.name) {
                  <div class="health-item">
                    <span class="health-dot" [class]="service.status"></span>
                    <span class="health-name">{{ service.name }}</span>
                    <span class="health-status" [class]="service.status">{{ service.status }}</span>
                  </div>
                }
              </div>
              <div class="uptime">
                <span>Uptime:</span>
                <strong>{{ formatUptime(health()?.uptime) }}</strong>
              </div>
            } @else {
              <div class="loading">Loading...</div>
            }
          </div>
        </div>
        
        <!-- Recent Activity -->
        <div class="card wide">
          <div class="card-header">
            <h2>Recent Activity</h2>
            <a routerLink="/users">View All</a>
          </div>
          <div class="card-body">
            <div class="activity-list">
              @for (activity of recentActivity(); track $index) {
                <div class="activity-item">
                  <div class="activity-icon" [class]="activity.type">
                    {{ getActivityIcon(activity.type) }}
                  </div>
                  <div class="activity-content">
                    <span class="activity-text">{{ activity.message }}</span>
                    <span class="activity-time">{{ activity.time }}</span>
                  </div>
                </div>
              }
              @if (recentActivity().length === 0) {
                <div class="empty">No recent activity</div>
              }
            </div>
          </div>
        </div>
        
        <!-- Quick Actions -->
        <div class="card">
          <div class="card-header">
            <h2>Quick Actions</h2>
          </div>
          <div class="card-body">
            <div class="quick-actions">
              <a routerLink="/kyc" class="action-btn">
                <span>📋</span> Review KYC
              </a>
              <a routerLink="/users" class="action-btn">
                <span>👤</span> Add User
              </a>
              <a routerLink="/finance" class="action-btn">
                <span>💸</span> Withdrawals
              </a>
              <a routerLink="/settings" class="action-btn">
                <span>⚙️</span> Settings
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard {
      max-width: 1400px;
    }
    
    .page-header {
      margin-bottom: 32px;
      
      h1 {
        font-size: 28px;
        margin-bottom: 4px;
      }
      
      p {
        color: var(--color-text-secondary);
      }
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin-bottom: 32px;
    }
    
    .stat-card {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      gap: 16px;
    }
    
    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      
      &.blue { background: rgba(59, 130, 246, 0.15); }
      &.orange { background: rgba(245, 158, 11, 0.15); }
      &.green { background: rgba(34, 197, 94, 0.15); }
      &.purple { background: rgba(139, 92, 246, 0.15); }
    }
    
    .stat-content {
      display: flex;
      flex-direction: column;
    }
    
    .stat-value {
      font-size: 24px;
      font-weight: 700;
      font-family: var(--font-mono);
    }
    
    .stat-label {
      font-size: 13px;
      color: var(--color-text-secondary);
      margin-bottom: 4px;
    }
    
    .stat-change {
      font-size: 12px;
      
      &.positive { color: var(--color-success); }
      &.negative { color: var(--color-error); }
    }
    
    .stat-link {
      font-size: 12px;
      color: var(--color-accent);
    }
    
    .dashboard-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
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
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      h2 {
        font-size: 16px;
        font-weight: 600;
      }
      
      a {
        font-size: 13px;
        color: var(--color-accent);
      }
    }
    
    .card-body {
      padding: 20px;
    }
    
    .health-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .health-item {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .health-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      
      &.healthy { background: var(--color-success); }
      &.degraded { background: var(--color-warning); }
      &.down { background: var(--color-error); }
    }
    
    .health-name {
      flex: 1;
      font-size: 14px;
    }
    
    .health-status {
      font-size: 12px;
      text-transform: capitalize;
      
      &.healthy { color: var(--color-success); }
      &.degraded { color: var(--color-warning); }
      &.down { color: var(--color-error); }
    }
    
    .uptime {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--color-border);
      font-size: 13px;
      color: var(--color-text-secondary);
      
      strong {
        color: var(--color-success);
        margin-left: 8px;
      }
    }
    
    .activity-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    .activity-item {
      display: flex;
      gap: 12px;
    }
    
    .activity-icon {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      background: var(--color-bg-tertiary);
    }
    
    .activity-content {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    
    .activity-text {
      font-size: 14px;
    }
    
    .activity-time {
      font-size: 12px;
      color: var(--color-text-muted);
    }
    
    .quick-actions {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
    
    .action-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background: var(--color-bg-tertiary);
      border-radius: 8px;
      color: var(--color-text-primary);
      font-size: 14px;
      transition: background 0.2s;
      
      &:hover {
        background: var(--color-bg-elevated);
      }
    }
    
    .loading, .empty {
      text-align: center;
      color: var(--color-text-muted);
      padding: 20px;
    }
    
    @media (max-width: 1200px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      
      .dashboard-grid {
        grid-template-columns: 1fr;
        
        .card.wide {
          grid-column: span 1;
        }
      }
    }
  `],
})
export class DashboardComponent implements OnInit {
  private api = inject(AdminApiService);
  
  stats = signal<DashboardStats | null>(null);
  health = signal<SystemHealth | null>(null);
  recentActivity = signal<any[]>([]);
  
  ngOnInit(): void {
    this.loadDashboard();
  }
  
  loadDashboard(): void {
    // Mock data for now
    this.stats.set({
      totalUsers: 12847,
      newUsersToday: 142,
      pendingKyc: 23,
      activeOrders: 1284,
      volume24h: '4284921.50',
      revenue24h: '21424.60',
    });
    
    this.health.set({
      services: [
        { name: 'API Gateway', status: 'healthy' },
        { name: 'Auth Service', status: 'healthy' },
        { name: 'Trading Service', status: 'healthy' },
        { name: 'Matching Engine', status: 'healthy' },
        { name: 'Wallet Service', status: 'healthy' },
      ],
      uptime: 2592000, // 30 days
    });
    
    this.recentActivity.set([
      { type: 'user', message: 'New user registered: john@example.com', time: '2 minutes ago' },
      { type: 'kyc', message: 'KYC approved for user #12845', time: '5 minutes ago' },
      { type: 'order', message: 'Large order detected: 10 BTC sell', time: '12 minutes ago' },
      { type: 'withdrawal', message: 'Withdrawal requested: 5 ETH', time: '18 minutes ago' },
    ]);
  }
  
  formatVolume(volume?: string): string {
    if (!volume) return '0';
    const num = parseFloat(volume);
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
    return num.toFixed(2);
  }
  
  formatUptime(seconds?: number): string {
    if (!seconds) return '0';
    const days = Math.floor(seconds / 86400);
    return `${days} days`;
  }
  
  getActivityIcon(type: string): string {
    const icons: Record<string, string> = {
      user: '👤',
      kyc: '📋',
      order: '📈',
      withdrawal: '💸',
    };
    return icons[type] || '📌';
  }
}
