import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardComponent } from '@/components/card/card.component';
import { ButtonComponent } from '@/components/button/button.component';
import { InputComponent } from '@/components/input/input.component';
import { AuthService } from '@/app/core/services/auth.service';
import { UserService, UserProfile } from '@/app/core/services/user.service';

interface SettingsSection {
  id: string;
  title: string;
  icon: string;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, CardComponent, ButtonComponent, InputComponent, FormsModule],
  template: `
    <div class="settings-page">
      <div class="settings-header">
        <h1 class="page-title">Settings</h1>
        <p class="page-subtitle">Manage your account preferences</p>
      </div>

      <div class="settings-layout">
        <!-- Sidebar Navigation -->
        <nav class="settings-nav">
          @for (section of sections; track section.id) {
            <button
              class="nav-item"
              [class.active]="activeSection() === section.id"
              (click)="activeSection.set(section.id)"
            >
              <span class="nav-icon">{{ section.icon }}</span>
              {{ section.title }}
            </button>
          }
        </nav>

        <!-- Settings Content -->
        <div class="settings-content">
          @switch (activeSection()) {
            @case ('general') {
              <ui-card variant="elevated" title="General Settings">
                <div class="settings-form">
                  <div class="form-group">
                    <label class="form-label">Username</label>
                    <ui-input
                      [ngModel]="settings().username"
                      (ngModelChange)="updateUsername($event)"
                      placeholder="Your username"
                    />
                    <span class="form-hint">This is your public display name.</span>
                  </div>

                  <div class="form-group">
                    <label class="form-label">Email</label>
                    <ui-input
                      type="email"
                      [ngModel]="settings().email"
                      [disabled]="true"
                      placeholder="your@email.com"
                    />
                    <span class="form-hint">Email cannot be changed</span>
                  </div>

                  <div class="form-group">
                    <label class="form-label">Timezone</label>
                    <select
                      class="form-select"
                      [ngModel]="settings().timezone"
                      (ngModelChange)="updateTimezone($event)"
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time (ET)</option>
                      <option value="America/Los_Angeles">Pacific Time (PT)</option>
                      <option value="Europe/London">London (GMT)</option>
                      <option value="Asia/Tokyo">Tokyo (JST)</option>
                      <option value="Asia/Singapore">Singapore (SGT)</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label class="form-label">Language</label>
                    <select
                      class="form-select"
                      [ngModel]="settings().language"
                      (ngModelChange)="updateLanguage($event)"
                    >
                      <option value="en">English</option>
                      <option value="zh">中文</option>
                      <option value="ja">日本語</option>
                      <option value="ko">한국어</option>
                      <option value="es">Español</option>
                    </select>
                  </div>
                </div>

                <div class="form-actions">
                  <ui-button variant="primary" (click)="saveSettings()" [disabled]="isSaving()">
                    {{ isSaving() ? 'Saving...' : 'Save Changes' }}
                  </ui-button>
                </div>
              </ui-card>
            }

            @case ('notifications') {
              <ui-card variant="elevated" title="Notification Preferences">
                <div class="notifications-list">
                  <div class="notification-item">
                    <div class="notification-info">
                      <span class="notification-title">Email Notifications</span>
                      <span class="notification-desc">Receive updates via email</span>
                    </div>
                    <label class="toggle">
                      <input
                        type="checkbox"
                        [ngModel]="settings().emailNotifications"
                        (ngModelChange)="updateEmailNotifications($event)"
                      />
                      <span class="toggle-slider"></span>
                    </label>
                  </div>

                  <div class="notification-item">
                    <div class="notification-info">
                      <span class="notification-title">Trade Confirmations</span>
                      <span class="notification-desc">Get notified when orders are filled</span>
                    </div>
                    <label class="toggle">
                      <input
                        type="checkbox"
                        [ngModel]="settings().tradeNotifications"
                        (ngModelChange)="updateTradeNotifications($event)"
                      />
                      <span class="toggle-slider"></span>
                    </label>
                  </div>

                  <div class="notification-item">
                    <div class="notification-info">
                      <span class="notification-title">Price Alerts</span>
                      <span class="notification-desc">Notifications for price movements</span>
                    </div>
                    <label class="toggle">
                      <input
                        type="checkbox"
                        [ngModel]="settings().priceAlerts"
                        (ngModelChange)="updatePriceAlerts($event)"
                      />
                      <span class="toggle-slider"></span>
                    </label>
                  </div>

                  <div class="notification-item">
                    <div class="notification-info">
                      <span class="notification-title">Security Alerts</span>
                      <span class="notification-desc">Login and security notifications</span>
                    </div>
                    <label class="toggle">
                      <input
                        type="checkbox"
                        [ngModel]="settings().securityAlerts"
                        (ngModelChange)="updateSecurityAlerts($event)"
                      />
                      <span class="toggle-slider"></span>
                    </label>
                  </div>

                  <div class="notification-item">
                    <div class="notification-info">
                      <span class="notification-title">Marketing Updates</span>
                      <span class="notification-desc">News, features, and promotions</span>
                    </div>
                    <label class="toggle">
                      <input
                        type="checkbox"
                        [ngModel]="settings().marketingEmails"
                        (ngModelChange)="updateMarketingEmails($event)"
                      />
                      <span class="toggle-slider"></span>
                    </label>
                  </div>
                </div>

                <div class="form-actions">
                  <ui-button variant="primary" (click)="saveSettings()">Save Preferences</ui-button>
                </div>
              </ui-card>
            }

            @case ('trading') {
              <ui-card variant="elevated" title="Trading Preferences">
                <div class="settings-form">
                  <div class="form-group">
                    <label class="form-label">Default Trading Pair</label>
                    <select
                      class="form-select"
                      [ngModel]="settings().defaultPair"
                      (ngModelChange)="updateDefaultPair($event)"
                    >
                      <option value="BTCUSDT">BTC/USDT</option>
                      <option value="ETHUSDT">ETH/USDT</option>
                      <option value="SOLUSDT">SOL/USDT</option>
                      <option value="BNBUSDT">BNB/USDT</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label class="form-label">Chart Type</label>
                    <select
                      class="form-select"
                      [ngModel]="settings().chartType"
                      (ngModelChange)="updateChartType($event)"
                    >
                      <option value="candlestick">Candlestick</option>
                      <option value="line">Line</option>
                      <option value="area">Area</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label class="form-label">Default Timeframe</label>
                    <select
                      class="form-select"
                      [ngModel]="settings().defaultTimeframe"
                      (ngModelChange)="updateDefaultTimeframe($event)"
                    >
                      <option value="1m">1 minute</option>
                      <option value="5m">5 minutes</option>
                      <option value="15m">15 minutes</option>
                      <option value="1H">1 hour</option>
                      <option value="4H">4 hours</option>
                      <option value="1D">1 day</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label class="form-label">Order Confirmation</label>
                    <div class="checkbox-group">
                      <label class="checkbox-label">
                        <input
                          type="checkbox"
                          [ngModel]="settings().confirmOrders"
                          (ngModelChange)="updateConfirmOrders($event)"
                        />
                        <span>Require confirmation before placing orders</span>
                      </label>
                    </div>
                  </div>

                  <div class="form-group">
                    <label class="form-label">Sound Effects</label>
                    <div class="checkbox-group">
                      <label class="checkbox-label">
                        <input
                          type="checkbox"
                          [ngModel]="settings().soundEffects"
                          (ngModelChange)="updateSoundEffects($event)"
                        />
                        <span>Play sounds on order execution</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div class="form-actions">
                  <ui-button variant="primary" (click)="saveSettings()">Save Preferences</ui-button>
                </div>
              </ui-card>
            }

            @case ('appearance') {
              <ui-card variant="elevated" title="Appearance">
                <div class="theme-selector">
                  <button
                    class="theme-option"
                    [class.active]="settings().theme === 'dark'"
                    (click)="updateTheme('dark')"
                  >
                    <div class="theme-preview dark">
                      <div class="preview-header"></div>
                      <div class="preview-content"></div>
                    </div>
                    <span class="theme-name">Dark</span>
                  </button>

                  <button
                    class="theme-option"
                    [class.active]="settings().theme === 'light'"
                    (click)="updateTheme('light')"
                  >
                    <div class="theme-preview light">
                      <div class="preview-header"></div>
                      <div class="preview-content"></div>
                    </div>
                    <span class="theme-name">Light</span>
                  </button>

                  <button
                    class="theme-option"
                    [class.active]="settings().theme === 'system'"
                    (click)="updateTheme('system')"
                  >
                    <div class="theme-preview system">
                      <div class="preview-header"></div>
                      <div class="preview-content"></div>
                    </div>
                    <span class="theme-name">System</span>
                  </button>
                </div>

                <div class="form-actions">
                  <ui-button variant="primary" (click)="saveSettings()">Apply Theme</ui-button>
                </div>
              </ui-card>
            }
          }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .settings-page {
        padding: var(--spacing-6);
        max-width: 1000px;
        margin: 0 auto;
      }

      .settings-header {
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

      .settings-layout {
        display: grid;
        grid-template-columns: 220px 1fr;
        gap: var(--spacing-6);
      }

      .settings-nav {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-1);
      }

      .nav-item {
        display: flex;
        align-items: center;
        gap: var(--spacing-3);
        padding: var(--spacing-3) var(--spacing-4);
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-secondary);
        background: transparent;
        border: none;
        border-radius: var(--radius-lg);
        cursor: pointer;
        transition: all var(--transition-fast);
        text-align: left;
      }

      .nav-item:hover {
        color: var(--color-text-primary);
        background: var(--color-bg-card);
      }

      .nav-item.active {
        color: var(--color-text-primary);
        background: var(--color-bg-card);
        border-left: 2px solid var(--color-accent-500);
      }

      .nav-icon {
        font-size: var(--font-size-base);
      }

      .settings-form {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-5);
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

      .form-hint {
        font-size: var(--font-size-xs);
        color: var(--color-text-tertiary);
      }

      .form-select {
        padding: var(--spacing-3);
        font-size: var(--font-size-sm);
        color: var(--color-text-primary);
        background: var(--color-bg-tertiary);
        border: 1px solid var(--color-border-primary);
        border-radius: var(--radius-lg);
        cursor: pointer;
      }

      .form-select:focus {
        outline: none;
        border-color: var(--color-accent-500);
      }

      .form-actions {
        margin-top: var(--spacing-6);
        padding-top: var(--spacing-6);
        border-top: 1px solid var(--color-border-primary);
      }

      .notifications-list {
        display: flex;
        flex-direction: column;
      }

      .notification-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--spacing-4) 0;
        border-bottom: 1px solid var(--color-border-primary);
      }

      .notification-item:last-child {
        border-bottom: none;
      }

      .notification-info {
        display: flex;
        flex-direction: column;
      }

      .notification-title {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-primary);
      }

      .notification-desc {
        font-size: var(--font-size-xs);
        color: var(--color-text-tertiary);
      }

      .toggle {
        position: relative;
        display: inline-block;
        width: 44px;
        height: 24px;
      }

      .toggle input {
        opacity: 0;
        width: 0;
        height: 0;
      }

      .toggle-slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: var(--color-bg-tertiary);
        border-radius: 24px;
        transition: all var(--transition-fast);
      }

      .toggle-slider:before {
        position: absolute;
        content: '';
        height: 18px;
        width: 18px;
        left: 3px;
        bottom: 3px;
        background: white;
        border-radius: 50%;
        transition: all var(--transition-fast);
      }

      .toggle input:checked + .toggle-slider {
        background: var(--color-accent-500);
      }

      .toggle input:checked + .toggle-slider:before {
        transform: translateX(20px);
      }

      .checkbox-group {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-2);
      }

      .checkbox-label {
        display: flex;
        align-items: center;
        gap: var(--spacing-2);
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        cursor: pointer;
      }

      .checkbox-label input {
        width: 16px;
        height: 16px;
        accent-color: var(--color-accent-500);
      }

      .theme-selector {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--spacing-4);
      }

      .theme-option {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--spacing-2);
        padding: var(--spacing-4);
        background: var(--color-bg-card);
        border: 2px solid var(--color-border-primary);
        border-radius: var(--radius-lg);
        cursor: pointer;
        transition: all var(--transition-fast);
      }

      .theme-option:hover {
        border-color: var(--color-border-secondary);
      }

      .theme-option.active {
        border-color: var(--color-accent-500);
      }

      .theme-preview {
        width: 100%;
        height: 80px;
        border-radius: var(--radius-md);
        overflow: hidden;
      }

      .theme-preview.dark {
        background: #0a0a0a;
      }

      .theme-preview.dark .preview-header {
        height: 20px;
        background: #121212;
      }

      .theme-preview.light {
        background: #f5f5f5;
      }

      .theme-preview.light .preview-header {
        height: 20px;
        background: #ffffff;
      }

      .theme-preview.system {
        background: linear-gradient(135deg, #0a0a0a 50%, #f5f5f5 50%);
      }

      .theme-name {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-primary);
      }

      @media (max-width: 768px) {
        .settings-layout {
          grid-template-columns: 1fr;
        }

        .settings-nav {
          flex-direction: row;
          overflow-x: auto;
          padding-bottom: var(--spacing-2);
        }

        .nav-item {
          white-space: nowrap;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent implements OnInit {
  activeSection = signal('general');
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);

  readonly user = computed(() => this.authService.user());
  readonly profile = signal<UserProfile | null>(null);
  readonly isSaving = signal(false);

  sections: SettingsSection[] = [
    { id: 'general', title: 'General', icon: '⚙️' },
    { id: 'notifications', title: 'Notifications', icon: '🔔' },
    { id: 'trading', title: 'Trading', icon: '📊' },
    { id: 'appearance', title: 'Appearance', icon: '🎨' },
  ];

  settings = signal({
    username: '',
    email: '',
    timezone: 'UTC',
    language: 'en',
    emailNotifications: true,
    tradeNotifications: true,
    priceAlerts: true,
    securityAlerts: true,
    marketingEmails: false,
    defaultPair: 'BTCUSDT',
    chartType: 'candlestick',
    defaultTimeframe: '1H',
    confirmOrders: true,
    soundEffects: true,
    theme: 'dark',
  });

  ngOnInit(): void {
    this.loadSettings();
  }

  private loadSettings(): void {
    const user = this.user();
    if (user) {
      this.settings.update((s) => ({
        ...s,
        username: user.username || '',
        email: user.email || '',
      }));
    }

    this.userService.getProfile().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        if (profile.preferences) {
          this.settings.update((s) => ({
            ...s,
            ...(profile.preferences as any),
          }));
        }
      },
      error: (error) => {
        console.error('Failed to load profile:', error);
      },
    });
  }

  // Helper methods for template updates
  updateUsername(value: string): void {
    this.settings.update((s) => ({ ...s, username: value }));
  }

  updateTimezone(value: string): void {
    this.settings.update((s) => ({ ...s, timezone: value }));
  }

  updateLanguage(value: string): void {
    this.settings.update((s) => ({ ...s, language: value }));
  }

  updateEmailNotifications(value: boolean): void {
    this.settings.update((s) => ({ ...s, emailNotifications: value }));
  }

  updateTradeNotifications(value: boolean): void {
    this.settings.update((s) => ({ ...s, tradeNotifications: value }));
  }

  updatePriceAlerts(value: boolean): void {
    this.settings.update((s) => ({ ...s, priceAlerts: value }));
  }

  updateSecurityAlerts(value: boolean): void {
    this.settings.update((s) => ({ ...s, securityAlerts: value }));
  }

  updateMarketingEmails(value: boolean): void {
    this.settings.update((s) => ({ ...s, marketingEmails: value }));
  }

  updateDefaultPair(value: string): void {
    this.settings.update((s) => ({ ...s, defaultPair: value }));
  }

  updateChartType(value: string): void {
    this.settings.update((s) => ({ ...s, chartType: value }));
  }

  updateDefaultTimeframe(value: string): void {
    this.settings.update((s) => ({ ...s, defaultTimeframe: value }));
  }

  updateConfirmOrders(value: boolean): void {
    this.settings.update((s) => ({ ...s, confirmOrders: value }));
  }

  updateSoundEffects(value: boolean): void {
    this.settings.update((s) => ({ ...s, soundEffects: value }));
  }

  updateTheme(value: string): void {
    this.settings.update((s) => ({ ...s, theme: value }));
  }

  saveSettings(): void {
    this.isSaving.set(true);
    const currentSettings = this.settings();

    // Update user
    this.userService
      .updateUser({
        username: currentSettings.username,
      })
      .subscribe({
        next: () => {
          // Update preferences
          this.userService
            .updatePreferences({
              timezone: currentSettings.timezone,
              language: currentSettings.language,
              emailNotifications: currentSettings.emailNotifications,
              tradeNotifications: currentSettings.tradeNotifications,
              priceAlerts: currentSettings.priceAlerts,
              securityAlerts: currentSettings.securityAlerts,
              marketingEmails: currentSettings.marketingEmails,
              defaultPair: currentSettings.defaultPair,
              chartType: currentSettings.chartType,
              defaultTimeframe: currentSettings.defaultTimeframe,
              confirmOrders: currentSettings.confirmOrders,
              soundEffects: currentSettings.soundEffects,
              theme: currentSettings.theme,
            })
            .subscribe({
              next: () => {
                this.isSaving.set(false);
                alert('Settings saved successfully!');
              },
              error: (error) => {
                console.error('Failed to save preferences:', error);
                this.isSaving.set(false);
                alert('Failed to save settings');
              },
            });
        },
        error: (error) => {
          console.error('Failed to update user:', error);
          this.isSaving.set(false);
          alert('Failed to save settings');
        },
      });
  }
}
