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
  templateUrl: './security.component.html',
  styleUrls: ['./security.component.css'],
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
