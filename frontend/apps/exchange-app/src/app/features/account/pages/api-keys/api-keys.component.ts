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
  template: `
    <div class="api-keys-page">
      <div class="page-header">
        <div class="header-info">
          <h1 class="page-title">API Keys</h1>
          <p class="page-subtitle">Manage API keys for programmatic trading access</p>
        </div>
        <ui-button variant="primary" (click)="showCreateModal.set(true)">
          + Create API Key
        </ui-button>
      </div>

      <!-- Warning Banner -->
      <div class="warning-banner">
        <div class="warning-icon">⚠️</div>
        <div class="warning-content">
          <strong>Never share your API keys</strong>
          <p>Your API secret is only shown once upon creation. Store it securely.</p>
        </div>
      </div>

      <!-- API Keys List -->
      <div class="keys-list">
        @for (key of apiKeys(); track key.id) {
          <ui-card variant="elevated" class="key-card">
            <div class="key-header">
              <div class="key-info">
                <h3 class="key-name">{{ key.name }}</h3>
                <div class="key-value">
                  <code>{{ key.key }}</code>
                  <button class="copy-btn" (click)="copyKey(key.key)" title="Copy">📋</button>
                </div>
              </div>
              <div class="key-actions">
                <ui-button variant="ghost" size="sm" (click)="editKey(key)">Edit</ui-button>
                <ui-button variant="danger" size="sm" (click)="deleteKey(key.id)">Delete</ui-button>
              </div>
            </div>

            <div class="key-details">
              <div class="detail-group">
                <span class="detail-label">Permissions</span>
                <div class="permissions-list">
                  @for (perm of key.permissions; track perm) {
                    <ui-badge [variant]="getPermissionVariant(perm)">{{ perm }}</ui-badge>
                  }
                </div>
              </div>

              <div class="detail-group">
                <span class="detail-label">IP Restrictions</span>
                <span class="detail-value">
                  @if (key.ipRestrictions.length > 0) {
                    {{ key.ipRestrictions.join(', ') }}
                  } @else {
                    <span class="no-restriction">No restrictions (less secure)</span>
                  }
                </span>
              </div>

              <div class="detail-row">
                <div class="detail-group">
                  <span class="detail-label">Created</span>
                  <span class="detail-value">{{ key.createdAt | date: 'medium' }}</span>
                </div>
                <div class="detail-group">
                  <span class="detail-label">Last Used</span>
                  <span class="detail-value">
                    {{ key.lastUsed ? (key.lastUsed | date: 'medium') : 'Never' }}
                  </span>
                </div>
              </div>
            </div>
          </ui-card>
        } @empty {
          <div class="empty-state">
            <div class="empty-icon">🔑</div>
            <h3 class="empty-title">No API Keys</h3>
            <p class="empty-desc">Create an API key to access the trading API programmatically.</p>
            <ui-button variant="primary" (click)="showCreateModal.set(true)">
              Create Your First API Key
            </ui-button>
          </div>
        }
      </div>

      <!-- Create Modal -->
      @if (showCreateModal()) {
        <div class="modal-overlay" (click)="showCreateModal.set(false)">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">Create API Key</h2>
              <button class="modal-close" (click)="showCreateModal.set(false)">×</button>
            </div>

            @if (!newKeyCreated()) {
              <div class="modal-body">
                <div class="form-group">
                  <label class="form-label">Key Name</label>
                  <ui-input
                    placeholder="e.g. Trading Bot"
                    [ngModel]="newKeyName()"
                    (ngModelChange)="newKeyName.set($event)"
                  />
                  <span class="form-hint">A descriptive name to identify this key</span>
                </div>

                <div class="form-group">
                  <label class="form-label">Permissions</label>
                  <div class="permissions-grid">
                    <label class="permission-option">
                      <input
                        type="checkbox"
                        [checked]="newKeyPermissions().includes('Read')"
                        (change)="togglePermission('Read')"
                      />
                      <span class="permission-name">Read</span>
                      <span class="permission-desc">View account and market data</span>
                    </label>
                    <label class="permission-option">
                      <input
                        type="checkbox"
                        [checked]="newKeyPermissions().includes('Trade')"
                        (change)="togglePermission('Trade')"
                      />
                      <span class="permission-name">Trade</span>
                      <span class="permission-desc">Place and cancel orders</span>
                    </label>
                    <label class="permission-option">
                      <input
                        type="checkbox"
                        [checked]="newKeyPermissions().includes('Withdraw')"
                        (change)="togglePermission('Withdraw')"
                      />
                      <span class="permission-name">Withdraw</span>
                      <span class="permission-desc">Withdraw funds (use with caution)</span>
                    </label>
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">IP Whitelist (Optional)</label>
                  <ui-input
                    placeholder="e.g. 192.168.1.1, 10.0.0.1"
                    [ngModel]="newKeyIPs()"
                    (ngModelChange)="newKeyIPs.set($event)"
                  />
                  <span class="form-hint">Comma-separated IP addresses that can use this key</span>
                </div>
              </div>

              <div class="modal-footer">
                <ui-button variant="secondary" (click)="showCreateModal.set(false)"
                  >Cancel</ui-button
                >
                <ui-button variant="primary" (click)="createKey()">Create API Key</ui-button>
              </div>
            } @else {
              <div class="modal-body">
                <div class="success-message">
                  <div class="success-icon">✅</div>
                  <h3>API Key Created Successfully</h3>
                  <p>Save your secret key now. You won't be able to see it again!</p>
                </div>

                <div class="key-display">
                  <div class="key-field">
                    <label>API Key</label>
                    <div class="key-value-large">
                      <code>{{ createdKey()?.key }}</code>
                      <button class="copy-btn" (click)="copyKey(createdKey()?.key || '')">
                        📋
                      </button>
                    </div>
                  </div>
                  <div class="key-field">
                    <label>Secret Key</label>
                    <div class="key-value-large secret">
                      <code>{{ createdKey()?.secret }}</code>
                      <button class="copy-btn" (click)="copyKey(createdKey()?.secret || '')">
                        📋
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="modal-footer">
                <ui-button variant="primary" (click)="closeCreateModal()">Done</ui-button>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .api-keys-page {
        padding: var(--spacing-6);
        max-width: 900px;
        margin: 0 auto;
      }

      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: var(--spacing-6);
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

      .warning-banner {
        display: flex;
        align-items: flex-start;
        gap: var(--spacing-3);
        padding: var(--spacing-4);
        background: var(--color-warning) / 10;
        border: 1px solid var(--color-warning) / 30;
        border-radius: var(--radius-lg);
        margin-bottom: var(--spacing-6);
      }

      .warning-icon {
        font-size: var(--font-size-xl);
      }

      .warning-content strong {
        display: block;
        color: var(--color-warning);
        margin-bottom: var(--spacing-1);
      }

      .warning-content p {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        margin: 0;
      }

      .keys-list {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-4);
      }

      .key-card {
        padding: var(--spacing-5);
      }

      .key-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding-bottom: var(--spacing-4);
        border-bottom: 1px solid var(--color-border-primary);
        margin-bottom: var(--spacing-4);
      }

      .key-name {
        font-size: var(--font-size-base);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text-primary);
        margin: 0 0 var(--spacing-2) 0;
      }

      .key-value {
        display: flex;
        align-items: center;
        gap: var(--spacing-2);
      }

      .key-value code {
        font-family: var(--font-family-mono);
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        background: var(--color-bg-tertiary);
        padding: var(--spacing-1) var(--spacing-2);
        border-radius: var(--radius-md);
      }

      .copy-btn {
        background: transparent;
        border: none;
        cursor: pointer;
        font-size: var(--font-size-base);
        opacity: 0.6;
        transition: opacity var(--transition-fast);
      }

      .copy-btn:hover {
        opacity: 1;
      }

      .key-actions {
        display: flex;
        gap: var(--spacing-2);
      }

      .key-details {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-4);
      }

      .detail-row {
        display: flex;
        gap: var(--spacing-8);
      }

      .detail-group {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-1);
      }

      .detail-label {
        font-size: var(--font-size-xs);
        color: var(--color-text-tertiary);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .detail-value {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
      }

      .no-restriction {
        color: var(--color-warning);
      }

      .permissions-list {
        display: flex;
        gap: var(--spacing-2);
      }

      .empty-state {
        text-align: center;
        padding: var(--spacing-12);
        background: var(--color-bg-card);
        border: 1px dashed var(--color-border-primary);
        border-radius: var(--radius-lg);
      }

      .empty-icon {
        font-size: 48px;
        margin-bottom: var(--spacing-4);
        opacity: 0.5;
      }

      .empty-title {
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text-primary);
        margin: 0 0 var(--spacing-2) 0;
      }

      .empty-desc {
        font-size: var(--font-size-sm);
        color: var(--color-text-tertiary);
        margin: 0 0 var(--spacing-6) 0;
      }

      .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.75);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: var(--spacing-4);
      }

      .modal {
        width: 100%;
        max-width: 500px;
        background: var(--color-bg-elevated);
        border: 1px solid var(--color-border-primary);
        border-radius: var(--radius-xl);
        overflow: hidden;
      }

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--spacing-4) var(--spacing-5);
        border-bottom: 1px solid var(--color-border-primary);
      }

      .modal-title {
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text-primary);
        margin: 0;
      }

      .modal-close {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: var(--font-size-xl);
        color: var(--color-text-tertiary);
        background: transparent;
        border: none;
        border-radius: var(--radius-md);
        cursor: pointer;
      }

      .modal-close:hover {
        background: var(--color-bg-tertiary);
        color: var(--color-text-primary);
      }

      .modal-body {
        padding: var(--spacing-5);
      }

      .modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: var(--spacing-3);
        padding: var(--spacing-4) var(--spacing-5);
        border-top: 1px solid var(--color-border-primary);
      }

      .form-group {
        margin-bottom: var(--spacing-5);
      }

      .form-group:last-child {
        margin-bottom: 0;
      }

      .form-label {
        display: block;
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-secondary);
        margin-bottom: var(--spacing-2);
      }

      .form-hint {
        display: block;
        font-size: var(--font-size-xs);
        color: var(--color-text-tertiary);
        margin-top: var(--spacing-1);
      }

      .permissions-grid {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-2);
      }

      .permission-option {
        display: flex;
        align-items: flex-start;
        gap: var(--spacing-3);
        padding: var(--spacing-3);
        background: var(--color-bg-tertiary);
        border-radius: var(--radius-lg);
        cursor: pointer;
      }

      .permission-option input {
        margin-top: 2px;
        accent-color: var(--color-accent-500);
      }

      .permission-name {
        display: block;
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-primary);
      }

      .permission-desc {
        display: block;
        font-size: var(--font-size-xs);
        color: var(--color-text-tertiary);
      }

      .success-message {
        text-align: center;
        margin-bottom: var(--spacing-6);
      }

      .success-icon {
        font-size: 48px;
        margin-bottom: var(--spacing-3);
      }

      .success-message h3 {
        font-size: var(--font-size-lg);
        color: var(--color-text-primary);
        margin: 0 0 var(--spacing-2) 0;
      }

      .success-message p {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        margin: 0;
      }

      .key-display {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-4);
      }

      .key-field label {
        display: block;
        font-size: var(--font-size-xs);
        color: var(--color-text-tertiary);
        margin-bottom: var(--spacing-2);
      }

      .key-value-large {
        display: flex;
        align-items: center;
        gap: var(--spacing-2);
        padding: var(--spacing-3);
        background: var(--color-bg-tertiary);
        border-radius: var(--radius-lg);
      }

      .key-value-large code {
        flex: 1;
        font-family: var(--font-family-mono);
        font-size: var(--font-size-sm);
        color: var(--color-text-primary);
        word-break: break-all;
      }

      .key-value-large.secret {
        background: var(--color-warning) / 10;
        border: 1px solid var(--color-warning) / 30;
      }
    `,
  ],
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
