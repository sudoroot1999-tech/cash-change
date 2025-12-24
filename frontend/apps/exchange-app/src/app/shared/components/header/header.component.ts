import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ButtonComponent } from '@/components/button/button.component';

interface NavItem {
  label: string;
  path: string;
  icon?: string;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, ButtonComponent],
  template: `
    <header class="header">
      <div class="header-container">
        <!-- Logo -->
        <a routerLink="/" class="logo">
          <span class="logo-icon">CX</span>
          <span class="logo-text">CryptoX</span>
          <span class="version-badge">V2.0</span>
        </a>

        <!-- Desktop Navigation -->
        <nav class="nav-desktop">
          @for (item of navItems; track item.path) {
            <a [routerLink]="item.path" routerLinkActive="active" class="nav-link">
              {{ item.label }}
            </a>
          }
        </nav>

        <!-- Right Section -->
        <div class="header-actions">
          <!-- Market Ticker Mini -->
          <div class="ticker-mini">
            <span class="ticker-symbol">BTC</span>
            <span class="ticker-price">$43,256.78</span>
            <span class="ticker-change positive">+2.34%</span>
          </div>

          @if (authService.isAuthenticated()) {
            <div class="user-menu">
              <button class="user-button" (click)="toggleUserMenu()">
                <span class="user-avatar">{{
                  authService.username().charAt(0).toUpperCase()
                }}</span>
                <span class="user-name">{{ authService.username() }}</span>
                <svg class="dropdown-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fill-rule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>

              @if (userMenuOpen()) {
                <div class="user-dropdown">
                  <a routerLink="/wallet" class="dropdown-item">
                    <svg
                      class="dropdown-item-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path
                        d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"
                      />
                    </svg>
                    Wallet
                  </a>
                  <a routerLink="/orders" class="dropdown-item">
                    <svg
                      class="dropdown-item-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path
                        d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2"
                      />
                    </svg>
                    Orders
                  </a>
                  <div class="dropdown-divider"></div>
                  <a routerLink="/account/profile" class="dropdown-item">
                    <svg
                      class="dropdown-item-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    Profile
                  </a>
                  <a routerLink="/account/settings" class="dropdown-item">
                    <svg
                      class="dropdown-item-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <circle cx="12" cy="12" r="3" />
                      <path
                        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
                      />
                    </svg>
                    Settings
                  </a>
                  <div class="dropdown-divider"></div>
                  <button class="dropdown-item text-danger" (click)="logout()">
                    <svg
                      class="dropdown-item-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9" />
                    </svg>
                    Logout
                  </button>
                </div>
              }
            </div>
          } @else {
            <div class="auth-buttons">
              <ui-button variant="ghost" routerLink="/auth/login">Login</ui-button>
              <ui-button variant="primary" routerLink="/auth/register">Get Started</ui-button>
            </div>
          }
        </div>

        <!-- Mobile Menu Button -->
        <button class="mobile-menu-btn" (click)="toggleMobileMenu()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            @if (mobileMenuOpen()) {
              <path d="M6 18L18 6M6 6l12 12" />
            } @else {
              <path d="M3 12h18M3 6h18M3 18h18" />
            }
          </svg>
        </button>
      </div>

      <!-- Mobile Menu -->
      @if (mobileMenuOpen()) {
        <div class="mobile-menu">
          @for (item of navItems; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="active"
              class="mobile-nav-link"
              (click)="closeMobileMenu()"
            >
              {{ item.label }}
            </a>
          }
        </div>
      }
    </header>
  `,
  styles: [
    `
      .header {
        background: var(--color-bg-secondary);
        border-bottom: 1px solid var(--color-border-primary);
        position: sticky;
        top: 0;
        z-index: var(--z-sticky);
      }

      .header-container {
        max-width: 1440px;
        margin: 0 auto;
        padding: 0 var(--spacing-4);
        height: 64px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--spacing-6);
      }

      .logo {
        display: flex;
        align-items: center;
        gap: var(--spacing-2);
        text-decoration: none;
      }

      .logo-icon {
        width: 32px;
        height: 32px;
        background: var(--gradient-primary);
        border-radius: var(--radius-md);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-bold);
        color: white;
      }

      .logo-text {
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-bold);
        color: var(--color-text-primary);
      }

      .version-badge {
        background: var(--color-bg-tertiary);
        padding: 2px 6px;
        border-radius: var(--radius-sm);
        font-size: 10px;
        font-weight: var(--font-weight-medium);
        color: var(--color-text-tertiary);
      }

      .nav-desktop {
        display: none;
        align-items: center;
        gap: var(--spacing-1);
      }

      @media (min-width: 768px) {
        .nav-desktop {
          display: flex;
        }
      }

      .nav-link {
        padding: var(--spacing-2) var(--spacing-3);
        color: var(--color-text-secondary);
        text-decoration: none;
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        border-radius: var(--radius-md);
        transition: all var(--transition-fast);
      }

      .nav-link:hover {
        color: var(--color-text-primary);
        background: var(--color-bg-card);
      }

      .nav-link.active {
        color: var(--color-text-primary);
        background: var(--color-bg-tertiary);
      }

      .header-actions {
        display: flex;
        align-items: center;
        gap: var(--spacing-4);
      }

      .ticker-mini {
        display: none;
        align-items: center;
        gap: var(--spacing-2);
        padding: var(--spacing-2) var(--spacing-3);
        background: var(--color-bg-card);
        border-radius: var(--radius-md);
        font-size: var(--font-size-sm);
      }

      @media (min-width: 1024px) {
        .ticker-mini {
          display: flex;
        }
      }

      .ticker-symbol {
        font-weight: var(--font-weight-semibold);
        color: var(--color-text-primary);
      }

      .ticker-price {
        color: var(--color-text-primary);
        font-family: var(--font-family-mono);
      }

      .ticker-change {
        font-weight: var(--font-weight-medium);
      }

      .ticker-change.positive {
        color: var(--color-success);
      }

      .ticker-change.negative {
        color: var(--color-danger);
      }

      .user-menu {
        position: relative;
      }

      .user-button {
        display: flex;
        align-items: center;
        gap: var(--spacing-2);
        padding: var(--spacing-1) var(--spacing-2);
        background: var(--color-bg-card);
        border: 1px solid var(--color-border-primary);
        border-radius: var(--radius-lg);
        cursor: pointer;
        transition: all var(--transition-fast);
      }

      .user-button:hover {
        background: var(--color-bg-card-hover);
        border-color: var(--color-border-secondary);
      }

      .user-avatar {
        width: 28px;
        height: 28px;
        background: var(--gradient-primary);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-semibold);
        color: white;
      }

      .user-name {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-primary);
      }

      .dropdown-icon {
        width: 16px;
        height: 16px;
        color: var(--color-text-tertiary);
      }

      .user-dropdown {
        position: absolute;
        top: calc(100% + 8px);
        right: 0;
        min-width: 180px;
        background: var(--color-bg-elevated);
        border: 1px solid var(--color-border-primary);
        border-radius: var(--radius-lg);
        padding: var(--spacing-2);
        box-shadow: var(--shadow-lg);
        z-index: var(--z-dropdown);
      }

      .dropdown-item {
        display: flex;
        align-items: center;
        gap: var(--spacing-2);
        padding: var(--spacing-2) var(--spacing-3);
        color: var(--color-text-secondary);
        text-decoration: none;
        font-size: var(--font-size-sm);
        border-radius: var(--radius-md);
        cursor: pointer;
        background: transparent;
        border: none;
        width: 100%;
        text-align: left;
        transition: all var(--transition-fast);
      }

      .dropdown-item:hover {
        background: var(--color-bg-card);
        color: var(--color-text-primary);
      }

      .dropdown-item.text-danger:hover {
        background: var(--color-danger-soft);
        color: var(--color-danger);
      }

      .dropdown-item-icon {
        width: 16px;
        height: 16px;
      }

      .dropdown-divider {
        height: 1px;
        background: var(--color-border-primary);
        margin: var(--spacing-2) 0;
      }

      .auth-buttons {
        display: none;
        align-items: center;
        gap: var(--spacing-2);
      }

      @media (min-width: 640px) {
        .auth-buttons {
          display: flex;
        }
      }

      .mobile-menu-btn {
        display: flex;
        padding: var(--spacing-2);
        background: transparent;
        border: none;
        color: var(--color-text-primary);
        cursor: pointer;
      }

      .mobile-menu-btn svg {
        width: 24px;
        height: 24px;
      }

      @media (min-width: 768px) {
        .mobile-menu-btn {
          display: none;
        }
      }

      .mobile-menu {
        padding: var(--spacing-4);
        border-top: 1px solid var(--color-border-primary);
        display: flex;
        flex-direction: column;
        gap: var(--spacing-2);
      }

      .mobile-nav-link {
        padding: var(--spacing-3);
        color: var(--color-text-secondary);
        text-decoration: none;
        font-size: var(--font-size-base);
        font-weight: var(--font-weight-medium);
        border-radius: var(--radius-md);
        transition: all var(--transition-fast);
      }

      .mobile-nav-link:hover,
      .mobile-nav-link.active {
        color: var(--color-text-primary);
        background: var(--color-bg-card);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  readonly authService = inject(AuthService);

  mobileMenuOpen = signal(false);
  userMenuOpen = signal(false);

  navItems: NavItem[] = [
    { label: 'Trade', path: '/trade' },
    { label: 'Markets', path: '/markets' },
    { label: 'Wallet', path: '/wallet' },
    { label: 'Orders', path: '/orders' },
  ];

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((v) => !v);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  toggleUserMenu(): void {
    this.userMenuOpen.update((v) => !v);
  }

  logout(): void {
    this.userMenuOpen.set(false);
    this.authService.logout();
  }
}
