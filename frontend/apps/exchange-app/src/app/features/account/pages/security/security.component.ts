import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardComponent } from '@/components/card/card.component';
import { ButtonComponent } from '@/components/button/button.component';
import { InputComponent } from '@/components/input/input.component';
import { BadgeComponent } from '@/components/badge/badge.component';
import { AuthService } from '../../../../core/services/auth.service';

interface Session {
  id: string;
  device: string;
  browser: string;
  location: string;
  ip: string;
  lastActive: string;
  current: boolean;
}

@Component({
  selector: 'app-security',
  standalone: true,
  imports: [
    CommonModule,
    CardComponent,
    ButtonComponent,
    InputComponent,
    BadgeComponent,
    FormsModule,
  ],
  template: `
    <div class="security-page">
      <div class="security-header">
        <h1 class="page-title">Security</h1>
        <p class="page-subtitle">Manage your account security settings</p>
      </div>

      <div class="security-content">
        <!-- Two-Factor Authentication -->
        <ui-card variant="elevated">
          <div class="security-section">
            <div class="section-header">
              <div class="section-icon">🔐</div>
              <div class="section-info">
                <h3 class="section-title">Two-Factor Authentication</h3>
                <p class="section-desc">Add an extra layer of security to your account</p>
              </div>
              <ui-badge [variant]="twoFactorEnabled() ? 'success' : 'warning'">
                {{ twoFactorEnabled() ? 'Enabled' : 'Disabled' }}
              </ui-badge>
            </div>

            @if (!twoFactorEnabled()) {
              <div class="section-content">
                <p class="setup-text">
                  Protect your account with TOTP-based two-factor authentication. Use an
                  authenticator app like Google Authenticator or Authy.
                </p>
                <ui-button variant="primary" (click)="setupTwoFactor()"> Enable 2FA </ui-button>
              </div>
            } @else {
              <div class="section-content">
                <div class="two-fa-methods">
                  <div class="method-item">
                    <span class="method-icon">📱</span>
                    <div class="method-info">
                      <span class="method-name">Authenticator App</span>
                      <span class="method-status">Active</span>
                    </div>
                    <ui-button variant="ghost" size="sm">Change</ui-button>
                  </div>
                </div>
                <ui-button variant="danger" (click)="disableTwoFactor()"> Disable 2FA </ui-button>
              </div>
            }
          </div>
        </ui-card>

        <!-- Change Password -->
        <ui-card variant="elevated" title="Change Password">
          <form class="password-form" (ngSubmit)="changePassword()">
            <div class="form-group">
              <label class="form-label">Current Password</label>
              <ui-input
                type="password"
                placeholder="Enter current password"
                [ngModel]="passwordForm.current"
                (ngModelChange)="passwordForm.current = $event"
                [ngModelOptions]="{ standalone: true }"
              />
            </div>

            <div class="form-group">
              <label class="form-label">New Password</label>
              <ui-input
                type="password"
                placeholder="Enter new password"
                [ngModel]="passwordForm.new"
                (ngModelChange)="passwordForm.new = $event"
                [ngModelOptions]="{ standalone: true }"
              />
              <div class="password-strength">
                <div class="strength-bar">
                  <div class="strength-fill" [style.width.%]="passwordStrength()"></div>
                </div>
                <span class="strength-label">{{ passwordStrengthLabel() }}</span>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Confirm New Password</label>
              <ui-input
                type="password"
                placeholder="Confirm new password"
                [ngModel]="passwordForm.confirm"
                (ngModelChange)="passwordForm.confirm = $event"
                [ngModelOptions]="{ standalone: true }"
              />
            </div>

            <ui-button type="submit" variant="primary">Update Password</ui-button>
          </form>
        </ui-card>

        <!-- Anti-Phishing Code -->
        <ui-card variant="elevated">
          <div class="security-section">
            <div class="section-header">
              <div class="section-icon">🛡️</div>
              <div class="section-info">
                <h3 class="section-title">Anti-Phishing Code</h3>
                <p class="section-desc">Add a code to identify official CryptoX emails</p>
              </div>
              <ui-badge [variant]="antiPhishingEnabled() ? 'success' : 'default'">
                {{ antiPhishingEnabled() ? 'Active' : 'Not Set' }}
              </ui-badge>
            </div>

            <div class="section-content">
              @if (antiPhishingEnabled()) {
                <p class="phishing-info">
                  Your anti-phishing code: <strong>{{ antiPhishingCode() }}</strong>
                </p>
              }
              <ui-button variant="secondary" (click)="setupAntiPhishing()">
                {{ antiPhishingEnabled() ? 'Change Code' : 'Set Anti-Phishing Code' }}
              </ui-button>
            </div>
          </div>
        </ui-card>

        <!-- Active Sessions -->
        <ui-card variant="elevated" title="Active Sessions">
          <div class="sessions-list">
            @for (session of sessions(); track session.id) {
              <div class="session-item" [class.current]="session.current">
                <div class="session-icon">
                  @if (session.device.includes('Mobile')) {
                    📱
                  } @else {
                    💻
                  }
                </div>
                <div class="session-info">
                  <span class="session-device">{{ session.browser }} on {{ session.device }}</span>
                  <span class="session-meta">{{ session.location }} · {{ session.ip }}</span>
                  <span class="session-time">{{ session.lastActive }}</span>
                </div>
                <div class="session-actions">
                  @if (session.current) {
                    <ui-badge variant="success">Current</ui-badge>
                  } @else {
                    <ui-button variant="ghost" size="sm" (click)="revokeSession(session.id)">
                      Revoke
                    </ui-button>
                  }
                </div>
              </div>
            }
          </div>

          <div class="sessions-footer">
            <ui-button variant="danger" (click)="revokeAllSessions()">
              Revoke All Other Sessions
            </ui-button>
          </div>
        </ui-card>

        <!-- Account Deletion -->
        <ui-card variant="elevated">
          <div class="danger-zone">
            <div class="danger-icon">⚠️</div>
            <div class="danger-info">
              <h3 class="danger-title">Delete Account</h3>
              <p class="danger-desc">
                Permanently delete your account and all associated data. This action cannot be
                undone.
              </p>
            </div>
            <ui-button variant="danger" (click)="deleteAccount()">Delete Account</ui-button>
          </div>
        </ui-card>
      </div>
    </div>
  `,
  styles: [
    `
      .security-page {
        padding: var(--spacing-6);
        max-width: 800px;
        margin: 0 auto;
      }

      .security-header {
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

      .security-content {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-6);
      }

      .security-section {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-4);
      }

      .section-header {
        display: flex;
        align-items: flex-start;
        gap: var(--spacing-4);
      }

      .section-icon {
        font-size: var(--font-size-2xl);
      }

      .section-info {
        flex: 1;
      }

      .section-title {
        font-size: var(--font-size-base);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text-primary);
        margin: 0 0 var(--spacing-1) 0;
      }

      .section-desc {
        font-size: var(--font-size-sm);
        color: var(--color-text-tertiary);
        margin: 0;
      }

      .section-content {
        padding-left: calc(var(--font-size-2xl) + var(--spacing-4));
      }

      .setup-text {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        margin: 0 0 var(--spacing-4) 0;
      }

      .two-fa-methods {
        margin-bottom: var(--spacing-4);
      }

      .method-item {
        display: flex;
        align-items: center;
        gap: var(--spacing-3);
        padding: var(--spacing-3);
        background: var(--color-bg-tertiary);
        border-radius: var(--radius-lg);
      }

      .method-icon {
        font-size: var(--font-size-xl);
      }

      .method-info {
        flex: 1;
        display: flex;
        flex-direction: column;
      }

      .method-name {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-primary);
      }

      .method-status {
        font-size: var(--font-size-xs);
        color: var(--color-success);
      }

      .password-form {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-4);
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-2);
      }

      .form-label {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-secondary);
      }

      .password-strength {
        display: flex;
        align-items: center;
        gap: var(--spacing-2);
      }

      .strength-bar {
        flex: 1;
        height: 4px;
        background: var(--color-bg-tertiary);
        border-radius: 2px;
        overflow: hidden;
      }

      .strength-fill {
        height: 100%;
        background: var(--color-accent-500);
        transition: width var(--transition-base);
      }

      .strength-label {
        font-size: var(--font-size-xs);
        color: var(--color-text-tertiary);
      }

      .phishing-info {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        margin: 0 0 var(--spacing-4) 0;
      }

      .phishing-info strong {
        color: var(--color-accent-400);
        font-family: var(--font-family-mono);
      }

      .sessions-list {
        display: flex;
        flex-direction: column;
      }

      .session-item {
        display: flex;
        align-items: center;
        gap: var(--spacing-3);
        padding: var(--spacing-4) 0;
        border-bottom: 1px solid var(--color-border-primary);
      }

      .session-item:last-child {
        border-bottom: none;
      }

      .session-item.current {
        background: var(--color-success) / 5;
        margin: 0 calc(-1 * var(--spacing-4));
        padding-left: var(--spacing-4);
        padding-right: var(--spacing-4);
        border-radius: var(--radius-lg);
      }

      .session-icon {
        font-size: var(--font-size-xl);
      }

      .session-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .session-device {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-primary);
      }

      .session-meta {
        font-size: var(--font-size-xs);
        color: var(--color-text-tertiary);
      }

      .session-time {
        font-size: var(--font-size-xs);
        color: var(--color-text-muted);
      }

      .sessions-footer {
        margin-top: var(--spacing-4);
        padding-top: var(--spacing-4);
        border-top: 1px solid var(--color-border-primary);
      }

      .danger-zone {
        display: flex;
        align-items: center;
        gap: var(--spacing-4);
        padding: var(--spacing-4);
        background: var(--color-danger) / 10;
        border: 1px solid var(--color-danger) / 30;
        border-radius: var(--radius-lg);
      }

      .danger-icon {
        font-size: var(--font-size-2xl);
      }

      .danger-info {
        flex: 1;
      }

      .danger-title {
        font-size: var(--font-size-base);
        font-weight: var(--font-weight-semibold);
        color: var(--color-danger);
        margin: 0 0 var(--spacing-1) 0;
      }

      .danger-desc {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        margin: 0;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecurityComponent {
  private readonly authService = inject(AuthService);

  twoFactorEnabled = signal(false);
  antiPhishingEnabled = signal(true);
  antiPhishingCode = signal('CRYPTO2024');

  passwordForm = {
    current: '',
    new: '',
    confirm: '',
  };

  sessions = signal<Session[]>([
    {
      id: '1',
      device: 'Windows',
      browser: 'Chrome 120',
      location: 'New York, US',
      ip: '192.168.1.1',
      lastActive: 'Now',
      current: true,
    },
    {
      id: '2',
      device: 'macOS',
      browser: 'Safari 17',
      location: 'London, UK',
      ip: '10.0.0.2',
      lastActive: '2 hours ago',
      current: false,
    },
    {
      id: '3',
      device: 'Mobile (iOS)',
      browser: 'CryptoX App',
      location: 'Tokyo, JP',
      ip: '172.16.0.3',
      lastActive: 'Yesterday',
      current: false,
    },
  ]);

  passwordStrength = signal(0);
  passwordStrengthLabel = signal('Enter password');

  setupTwoFactor(): void {
    console.log('Setup 2FA');
    this.twoFactorEnabled.set(true);
  }

  disableTwoFactor(): void {
    console.log('Disable 2FA');
    this.twoFactorEnabled.set(false);
  }

  changePassword(): void {
    console.log('Change password');
  }

  setupAntiPhishing(): void {
    const code = prompt('Enter your anti-phishing code:');
    if (code) {
      this.antiPhishingCode.set(code);
      this.antiPhishingEnabled.set(true);
    }
  }

  revokeSession(id: string): void {
    this.sessions.update((sessions) => sessions.filter((s) => s.id !== id));
  }

  revokeAllSessions(): void {
    this.sessions.update((sessions) => sessions.filter((s) => s.current));
  }

  deleteAccount(): void {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      console.log('Delete account');
    }
  }
}
