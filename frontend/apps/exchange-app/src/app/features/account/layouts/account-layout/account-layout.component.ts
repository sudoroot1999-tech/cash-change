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
  templateUrl: "./account-layout.component.html",
  styleUrls: ['./account-layout.component.css'],
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
