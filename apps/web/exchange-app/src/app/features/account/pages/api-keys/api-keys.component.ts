import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardComponent } from '@/components/card/card.component';
import { ButtonComponent } from '@/components/button/button.component';
import { BadgeComponent } from '@/components/badge/badge.component';
import { InputComponent } from '@/components/input/input.component';
import { FormsModule } from '@angular/forms';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  secret?: string;
  permissions: string[];
  ipRestrictions: string[];
  createdAt: Date;
  lastUsed: Date | null;
}

@Component({
  selector: 'app-api-keys',
  standalone: true,
  imports: [
    CommonModule,
    CardComponent,
    ButtonComponent,
    BadgeComponent,
    InputComponent,
    FormsModule,
  ],
  templateUrl: './api-keys.component.html',
  styleUrls: ['./api-keys.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApiKeysComponent {
  showCreateModal = signal(false);
  newKeyCreated = signal(false);
  createdKey = signal<{ key: string; secret: string } | null>(null);

  newKeyName = signal('');
  newKeyPermissions = signal<string[]>(['Read']);
  newKeyIPs = signal('');

  apiKeys = signal<ApiKey[]>([
    {
      id: '1',
      name: 'Trading Bot',
      key: 'cx_live_abc123...xyz789',
      permissions: ['Read', 'Trade'],
      ipRestrictions: ['192.168.1.1'],
      createdAt: new Date('2024-01-15'),
      lastUsed: new Date('2024-12-20'),
    },
    {
      id: '2',
      name: 'Portfolio Tracker',
      key: 'cx_live_def456...uvw012',
      permissions: ['Read'],
      ipRestrictions: [],
      createdAt: new Date('2024-03-20'),
      lastUsed: null,
    },
  ]);

  getPermissionVariant(perm: string): 'success' | 'warning' | 'default' {
    switch (perm) {
      case 'Read':
        return 'success';
      case 'Trade':
        return 'warning';
      case 'Withdraw':
        return 'default';
      default:
        return 'default';
    }
  }

  togglePermission(perm: string): void {
    this.newKeyPermissions.update((perms: string[]) => {
      if (perms.includes(perm)) {
        return perms.filter((p: string) => p !== perm);
      }
      return [...perms, perm];
    });
  }

  createKey(): void {
    const newKey = {
      key: `cx_live_${this.generateRandomString(32)}`,
      secret: `cx_secret_${this.generateRandomString(64)}`,
    };

    this.apiKeys.update((keys: ApiKey[]) => [
      {
        id: Math.random().toString(36).substr(2, 9),
        name: this.newKeyName(),
        key: newKey.key,
        permissions: this.newKeyPermissions(),
        ipRestrictions: this.newKeyIPs()
          .split(',')
          .map((ip: string) => ip.trim())
          .filter((ip: string) => ip),
        createdAt: new Date(),
        lastUsed: null,
      },
      ...keys,
    ]);

    this.createdKey.set(newKey);
    this.newKeyCreated.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.newKeyCreated.set(false);
    this.createdKey.set(null);
    this.newKeyName.set('');
    this.newKeyPermissions.set(['Read']);
    this.newKeyIPs.set('');
  }

  editKey(key: ApiKey): void {
    console.log('Edit key:', key);
  }

  deleteKey(id: string): void {
    if (confirm('Are you sure you want to delete this API key?')) {
      this.apiKeys.update((keys: ApiKey[]) => keys.filter((k: ApiKey) => k.id !== id));
    }
  }

  copyKey(value: string): void {
    navigator.clipboard.writeText(value);
    // Show toast notification
  }

  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }
}
