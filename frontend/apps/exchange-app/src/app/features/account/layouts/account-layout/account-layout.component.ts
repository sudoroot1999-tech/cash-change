import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

interface AccountNavItem {
  label: string;
  path: string;
  icon: string;
}

@Component({
  selector: 'app-account-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="account-layout">
      <div class="account-container">
        <!-- Sidebar -->
        <aside class="account-sidebar">
          <div class="sidebar-header">
            <h2 class="sidebar-title">Account</h2>
          </div>
          <nav class="sidebar-nav">
            @for (item of navItems; track item.path) {
              <a 
                [routerLink]="item.path"
                routerLinkActive="active"
                class="sidebar-item"
              >
                <span class="sidebar-icon">{{ item.icon }}</span>
                <span class="sidebar-label">{{ item.label }}</span>
              </a>
            }
          </nav>
        </aside>

        <!-- Main Content -->
        <main class="account-main">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [`
    .account-layout {
      min-height: calc(100vh - 64px);
      background: var(--color-bg-primary);
      padding: var(--spacing-8) 0;
    }

    .account-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 var(--spacing-4);
      display: grid;
      grid-template-columns: 240px 1fr;
      gap: var(--spacing-8);
    }

    .account-sidebar {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-4);
    }

    .sidebar-header {
      padding: 0 var(--spacing-4);
    }

    .sidebar-title {
      font-size: var(--font-size-xl);
      font-weight: var(--font-weight-bold);
      color: var(--color-text-primary);
      margin: 0;
    }

    .sidebar-nav {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-1);
    }

    .sidebar-item {
      display: flex;
      align-items: center;
      gap: var(--spacing-3);
      padding: var(--spacing-3) var(--spacing-4);
      color: var(--color-text-secondary);
      text-decoration: none;
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      border-radius: var(--radius-lg);
      transition: all var(--transition-fast);
    }

    .sidebar-item:hover {
      color: var(--color-text-primary);
      background: var(--color-bg-card);
    }

    .sidebar-item.active {
      color: var(--color-text-primary);
      background: var(--color-bg-card);
      box-shadow: var(--shadow-sm);
      border-left: 3px solid var(--color-accent-500);
      padding-left: calc(var(--spacing-4) - 3px);
    }

    .sidebar-icon {
      font-size: var(--font-size-base);
    }

    .account-main {
      min-width: 0; /* Prevent grid breakout */
    }

    @media (max-width: 1024px) {
      .account-container {
        grid-template-columns: 200px 1fr;
        gap: var(--spacing-6);
      }
    }

    @media (max-width: 768px) {
      .account-container {
        grid-template-columns: 1fr;
        gap: var(--spacing-6);
      }

      .account-sidebar {
        position: sticky;
        top: 64px;
        z-index: var(--z-sticky);
        background: var(--color-bg-primary);
        padding: var(--spacing-2) 0;
        border-bottom: 1px solid var(--color-border-primary);
      }

      .sidebar-header {
        display: none;
      }

      .sidebar-nav {
        flex-direction: row;
        overflow-x: auto;
        padding-bottom: var(--spacing-2);
        -webkit-overflow-scrolling: touch;
      }

      .sidebar-item {
        white-space: nowrap;
      }

      .sidebar-item.active {
        border-left: none;
        border-bottom: 3px solid var(--color-accent-500);
        padding-left: var(--spacing-4);
        padding-bottom: calc(var(--spacing-3) - 3px);
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountLayoutComponent {
  navItems: AccountNavItem[] = [
    { label: 'Profile', path: 'profile', icon: '👤' },
    { label: 'Settings', path: 'settings', icon: '⚙️' },
    { label: 'Security', path: 'security', icon: '🔒' },
    { label: 'API Keys', path: 'api-keys', icon: '🔑' },
    { label: 'Verification', path: 'verification', icon: '✓' }
  ];
}
