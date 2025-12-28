import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="admin-layout">
      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="sidebar-header">
          <div class="logo">
            <span class="logo-icon">⚡</span>
            <span class="logo-text">CryptoX</span>
          </div>
          <span class="logo-badge">Admin</span>
        </div>
        
        <nav class="sidebar-nav">
          @for (item of navItems; track item.path) {
            <a 
              [routerLink]="item.path" 
              routerLinkActive="active"
              class="nav-item"
            >
              <span class="nav-icon">{{ item.icon }}</span>
              <span class="nav-label">{{ item.label }}</span>
            </a>
          }
        </nav>
        
        <div class="sidebar-footer">
          <div class="user-info">
            <div class="user-avatar">{{ getInitials() }}</div>
            <div class="user-details">
              <span class="user-email">{{ authService.user()?.email }}</span>
              <span class="user-role">{{ authService.user()?.role }}</span>
            </div>
          </div>
          <button class="logout-btn" (click)="logout()">Logout</button>
        </div>
      </aside>
      
      <!-- Main Content -->
      <main class="main-content">
        <header class="top-bar">
          <div class="search-box">
            <input type="text" placeholder="Search users, orders, transactions..." />
          </div>
          <div class="top-bar-actions">
            <button class="notification-btn">
              🔔
              <span class="notification-badge">3</span>
            </button>
          </div>
        </header>
        
        <div class="page-content">
          <router-outlet />
        </div>
      </main>
    </div>
  `,
  styles: [`
    .admin-layout {
      display: flex;
      min-height: 100vh;
    }
    
    .sidebar {
      width: var(--sidebar-width);
      background: var(--color-bg-secondary);
      border-right: 1px solid var(--color-border);
      display: flex;
      flex-direction: column;
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
    }
    
    .sidebar-header {
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 8px;
      border-bottom: 1px solid var(--color-border);
    }
    
    .logo {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .logo-icon {
      font-size: 24px;
    }
    
    .logo-text {
      font-size: 20px;
      font-weight: 700;
      background: linear-gradient(135deg, var(--color-accent), #8b5cf6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    
    .logo-badge {
      background: var(--color-accent-muted);
      color: var(--color-accent);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }
    
    .sidebar-nav {
      flex: 1;
      padding: 16px 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 8px;
      color: var(--color-text-secondary);
      transition: all 0.2s;
      
      &:hover {
        background: var(--color-bg-tertiary);
        color: var(--color-text-primary);
      }
      
      &.active {
        background: var(--color-accent-muted);
        color: var(--color-accent);
      }
    }
    
    .nav-icon {
      font-size: 18px;
    }
    
    .nav-label {
      font-size: 14px;
      font-weight: 500;
    }
    
    .sidebar-footer {
      padding: 16px;
      border-top: 1px solid var(--color-border);
    }
    
    .user-info {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    
    .user-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--color-accent), #8b5cf6);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 14px;
    }
    
    .user-details {
      display: flex;
      flex-direction: column;
    }
    
    .user-email {
      font-size: 13px;
      font-weight: 500;
    }
    
    .user-role {
      font-size: 12px;
      color: var(--color-text-muted);
      text-transform: capitalize;
    }
    
    .logout-btn {
      width: 100%;
      padding: 10px;
      background: transparent;
      border: 1px solid var(--color-border);
      color: var(--color-text-secondary);
      border-radius: 8px;
      font-size: 14px;
      transition: all 0.2s;
      
      &:hover {
        background: var(--color-error);
        border-color: var(--color-error);
        color: white;
      }
    }
    
    .main-content {
      flex: 1;
      margin-left: var(--sidebar-width);
      display: flex;
      flex-direction: column;
    }
    
    .top-bar {
      height: var(--header-height);
      background: var(--color-bg-secondary);
      border-bottom: 1px solid var(--color-border);
      padding: 0 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    
    .search-box input {
      width: 400px;
      padding: 10px 16px;
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      color: var(--color-text-primary);
      font-size: 14px;
      
      &:focus {
        outline: none;
        border-color: var(--color-accent);
      }
      
      &::placeholder {
        color: var(--color-text-muted);
      }
    }
    
    .notification-btn {
      position: relative;
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
    }
    
    .notification-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: var(--color-error);
      color: white;
      font-size: 10px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .page-content {
      flex: 1;
      padding: 24px;
    }
  `],
})
export class AdminLayoutComponent {
  authService = inject(AuthService);
  
  navItems: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/users', label: 'Users', icon: '👥' },
    { path: '/kyc', label: 'KYC Review', icon: '📋' },
    { path: '/orders', label: 'Orders', icon: '📈' },
    { path: '/finance', label: 'Finance', icon: '💰' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
  ];
  
  getInitials(): string {
    const email = this.authService.user()?.email || '';
    return email.substring(0, 2).toUpperCase();
  }
  
  logout(): void {
    this.authService.logout();
  }
}
