import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { CardComponent } from '@/core-components/card/card.component';
import { ButtonComponent } from '@/core-components/button/button.component';
import { BadgeComponent } from '@/core-components/badge/badge.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, CardComponent, ButtonComponent, BadgeComponent],
  template: `
    <div class="profile-page">
      <div class="profile-header">
        <h1 class="page-title">Profile</h1>
        <p class="page-subtitle">Manage your account information</p>
      </div>

      <div class="profile-content">
        <!-- Profile Card -->
        <ui-card variant="elevated" class="profile-card">
          <div class="profile-info">
            <div class="avatar-section">
              <div class="avatar">
                {{ userInitials() }}
              </div>
              <button class="avatar-edit-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </button>
            </div>

            <div class="user-details">
              <h2 class="user-name">{{ user()?.username || 'Anonymous User' }}</h2>
              <p class="user-email">{{ user()?.email || 'No email' }}</p>
              <div class="user-badges">
                <ui-badge [variant]="verificationStatus().variant">
                  {{ verificationStatus().label }}
                </ui-badge>
                @if (user()?.isTwoFactorEnabled) {
                  <ui-badge variant="success">2FA Enabled</ui-badge>
                }
              </div>
            </div>
          </div>

          <div class="profile-stats">
            <div class="stat">
              <span class="stat-value">{{ user()?.createdAt | date:'MMM yyyy' }}</span>
              <span class="stat-label">Member Since</span>
            </div>
            <div class="stat">
              <span class="stat-value">{{ tradingVolume() }}</span>
              <span class="stat-label">30d Volume</span>
            </div>
            <div class="stat">
              <span class="stat-value">{{ user()?.feeTier || 'Starter' }}</span>
              <span class="stat-label">Fee Tier</span>
            </div>
          </div>
        </ui-card>

        <!-- Quick Actions -->
        <div class="quick-actions">
          <a routerLink="/account/settings" class="action-card">
            <div class="action-icon">⚙️</div>
            <div class="action-info">
              <span class="action-title">Account Settings</span>
              <span class="action-desc">Update preferences</span>
            </div>
            <svg class="action-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </a>

          <a routerLink="/account/security" class="action-card">
            <div class="action-icon">🔒</div>
            <div class="action-info">
              <span class="action-title">Security</span>
              <span class="action-desc">Manage 2FA & sessions</span>
            </div>
            <svg class="action-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </a>

          <a routerLink="/account/verification" class="action-card">
            <div class="action-icon">✓</div>
            <div class="action-info">
              <span class="action-title">Verification</span>
              <span class="action-desc">Complete KYC</span>
            </div>
            <svg class="action-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </a>

          <a routerLink="/account/api-keys" class="action-card">
            <div class="action-icon">🔑</div>
            <div class="action-info">
              <span class="action-title">API Keys</span>
              <span class="action-desc">Manage API access</span>
            </div>
            <svg class="action-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </a>
        </div>

        <!-- Recent Activity -->
        <ui-card variant="elevated" title="Recent Activity">
          <div class="activity-list">
            @for (activity of recentActivity(); track activity.id) {
              <div class="activity-item">
                <div class="activity-icon" [class]="activity.type">
                  {{ activity.icon }}
                </div>
                <div class="activity-info">
                  <span class="activity-title">{{ activity.title }}</span>
                  <span class="activity-meta">{{ activity.description }}</span>
                </div>
                <span class="activity-time">{{ activity.time }}</span>
              </div>
            }
          </div>
        </ui-card>
      </div>
    </div>
  `,
  styles: [`
    .profile-page {
      padding: var(--spacing-6);
      max-width: 900px;
      margin: 0 auto;
    }

    .profile-header {
      margin-bottom: var(--spacing-8);
    }

    .page-title {
      font-size: var(--font-size-2xl);
      font-weight: var(--font-weight-bold);
      color: var(--color-text-primary);
      margin: 0 0 var(--spacing-2) 0;
    }

    .page-subtitle {
      font-size: var(--font-size-base);
      color: var(--color-text-secondary);
      margin: 0;
    }

    .profile-content {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-6);
    }

    .profile-card {
      padding: var(--spacing-6);
    }

    .profile-info {
      display: flex;
      gap: var(--spacing-6);
      padding-bottom: var(--spacing-6);
      border-bottom: 1px solid var(--color-border-primary);
      margin-bottom: var(--spacing-6);
    }

    .avatar-section {
      position: relative;
    }

    .avatar {
      width: 96px;
      height: 96px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--color-accent-500), var(--color-accent-600));
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--font-size-2xl);
      font-weight: var(--font-weight-bold);
      color: white;
    }

    .avatar-edit-btn {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--color-bg-elevated);
      border: 2px solid var(--color-border-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: var(--color-text-secondary);
    }

    .avatar-edit-btn:hover {
      background: var(--color-bg-card-hover);
      color: var(--color-text-primary);
    }

    .avatar-edit-btn svg {
      width: 14px;
      height: 14px;
    }

    .user-details {
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .user-name {
      font-size: var(--font-size-xl);
      font-weight: var(--font-weight-bold);
      color: var(--color-text-primary);
      margin: 0 0 var(--spacing-1) 0;
    }

    .user-email {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
      margin: 0 0 var(--spacing-3) 0;
    }

    .user-badges {
      display: flex;
      gap: var(--spacing-2);
    }

    .profile-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--spacing-4);
    }

    .stat {
      text-align: center;
      padding: var(--spacing-4);
      background: var(--color-bg-tertiary);
      border-radius: var(--radius-lg);
    }

    .stat-value {
      display: block;
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-bold);
      color: var(--color-text-primary);
      margin-bottom: var(--spacing-1);
    }

    .stat-label {
      font-size: var(--font-size-xs);
      color: var(--color-text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .quick-actions {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--spacing-4);
    }

    .action-card {
      display: flex;
      align-items: center;
      gap: var(--spacing-4);
      padding: var(--spacing-4);
      background: var(--color-bg-card);
      border: 1px solid var(--color-border-primary);
      border-radius: var(--radius-lg);
      text-decoration: none;
      transition: all var(--transition-fast);
    }

    .action-card:hover {
      background: var(--color-bg-card-hover);
      border-color: var(--color-border-secondary);
    }

    .action-icon {
      font-size: var(--font-size-2xl);
    }

    .action-info {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .action-title {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-primary);
    }

    .action-desc {
      font-size: var(--font-size-xs);
      color: var(--color-text-tertiary);
    }

    .action-arrow {
      width: 16px;
      height: 16px;
      color: var(--color-text-tertiary);
    }

    .activity-list {
      display: flex;
      flex-direction: column;
    }

    .activity-item {
      display: flex;
      align-items: center;
      gap: var(--spacing-3);
      padding: var(--spacing-3) 0;
      border-bottom: 1px solid var(--color-border-primary);
    }

    .activity-item:last-child {
      border-bottom: none;
    }

    .activity-icon {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--font-size-base);
      background: var(--color-bg-tertiary);
    }

    .activity-icon.login {
      background: var(--color-accent-500)/20;
    }

    .activity-icon.trade {
      background: var(--color-success)/20;
    }

    .activity-icon.withdrawal {
      background: var(--color-warning)/20;
    }

    .activity-info {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .activity-title {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-primary);
    }

    .activity-meta {
      font-size: var(--font-size-xs);
      color: var(--color-text-tertiary);
    }

    .activity-time {
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
    }

    @media (max-width: 640px) {
      .profile-info {
        flex-direction: column;
        align-items: center;
        text-align: center;
      }

      .user-badges {
        justify-content: center;
      }

      .profile-stats {
        grid-template-columns: 1fr;
      }

      .quick-actions {
        grid-template-columns: 1fr;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileComponent {
  private readonly authService = inject(AuthService);

  readonly user = computed(() => this.authService.user());
  
  readonly userInitials = computed(() => {
    const u = this.user();
    if (!u?.username) return '?';
    return u.username.slice(0, 2).toUpperCase();
  });

  readonly verificationStatus = computed(() => {
    const u = this.user();
    if (!u) return { label: 'Unverified', variant: 'default' as const };
    
    switch (u.kycStatus) {
      case 'verified': return { label: 'Verified', variant: 'success' as const };
      case 'pending': return { label: 'Pending', variant: 'warning' as const };
      case 'rejected': return { label: 'Rejected', variant: 'danger' as const };
      default: return { label: 'Unverified', variant: 'default' as const };
    }
  });

  readonly tradingVolume = signal('$12,450.00');

  readonly recentActivity = signal([
    { id: 1, type: 'login', icon: '🔐', title: 'Login', description: 'New login from Chrome on Windows', time: '2 mins ago' },
    { id: 2, type: 'trade', icon: '📈', title: 'Trade Executed', description: 'Bought 0.05 BTC @ $43,250', time: '1 hour ago' },
    { id: 3, type: 'withdrawal', icon: '💸', title: 'Withdrawal', description: 'Withdrew 500 USDT', time: '3 hours ago' },
    { id: 4, type: 'login', icon: '🔐', title: 'Login', description: 'New login from Safari on macOS', time: 'Yesterday' },
  ]);
}
