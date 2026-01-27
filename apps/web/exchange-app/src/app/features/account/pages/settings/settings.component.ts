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
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css'],
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
