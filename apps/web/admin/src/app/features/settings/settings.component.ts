import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="settings-page">
      <div class="page-header">
        <h1>System Settings</h1>
      </div>
      
      <div class="settings-grid">
        <!-- Maintenance Mode -->
        <div class="card">
          <div class="card-header">
            <h2>Maintenance Mode</h2>
          </div>
          <div class="card-body">
            <div class="toggle-row">
              <div class="toggle-info">
                <span class="toggle-label">Enable Maintenance Mode</span>
                <span class="toggle-desc">Temporarily disable trading for system updates</span>
              </div>
              <label class="toggle">
                <input type="checkbox" [(ngModel)]="maintenanceMode" />
                <span class="slider"></span>
              </label>
            </div>
            @if (maintenanceMode) {
              <div class="maintenance-notice">
                <span class="warning-icon">⚠️</span>
                <div>
                  <strong>Maintenance mode is active</strong>
                  <p>Trading and withdrawals are disabled</p>
                </div>
              </div>
            }
          </div>
        </div>
        
        <!-- Trading Pairs -->
        <div class="card wide">
          <div class="card-header">
            <h2>Trading Pairs</h2>
            <button class="btn-primary">Add Pair</button>
          </div>
          <div class="card-body">
            <table>
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Base</th>
                  <th>Quote</th>
                  <th>Status</th>
                  <th>Min Order</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (pair of tradingPairs(); track pair.symbol) {
                  <tr>
                    <td class="mono">{{ pair.symbol }}</td>
                    <td>{{ pair.base }}</td>
                    <td>{{ pair.quote }}</td>
                    <td>
                      <span class="badge" [class]="pair.status === 'active' ? 'badge-success' : 'badge-warning'">
                        {{ pair.status }}
                      </span>
                    </td>
                    <td class="mono">{{ pair.minOrder }}</td>
                    <td>
                      <button class="action-btn" (click)="togglePair(pair)">
                        {{ pair.status === 'active' ? 'Disable' : 'Enable' }}
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
        
        <!-- Fee Configuration -->
        <div class="card">
          <div class="card-header">
            <h2>Fee Configuration</h2>
          </div>
          <div class="card-body">
            <div class="fee-row">
              <span class="fee-label">Maker Fee</span>
              <div class="fee-input">
                <input type="number" [(ngModel)]="makerFee" step="0.01" />
                <span>%</span>
              </div>
            </div>
            <div class="fee-row">
              <span class="fee-label">Taker Fee</span>
              <div class="fee-input">
                <input type="number" [(ngModel)]="takerFee" step="0.01" />
                <span>%</span>
              </div>
            </div>
            <div class="fee-row">
              <span class="fee-label">Withdrawal Fee (BTC)</span>
              <div class="fee-input">
                <input type="number" [(ngModel)]="withdrawalFee" step="0.0001" />
                <span>BTC</span>
              </div>
            </div>
            <button class="btn-primary" style="margin-top: 16px;">Save Fees</button>
          </div>
        </div>
        
        <!-- Announcements -->
        <div class="card">
          <div class="card-header">
            <h2>Announcements</h2>
          </div>
          <div class="card-body">
            <div class="form-group">
              <label>Banner Message</label>
              <input type="text" [(ngModel)]="announcement" placeholder="Enter announcement..." />
            </div>
            <div class="toggle-row" style="margin-top: 16px;">
              <span class="toggle-label">Show Banner</span>
              <label class="toggle">
                <input type="checkbox" [(ngModel)]="showBanner" />
                <span class="slider"></span>
              </label>
            </div>
            <button class="btn-primary" style="margin-top: 16px;">Update Banner</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .settings-page { max-width: 1200px; }
    
    .page-header {
      margin-bottom: 24px;
      h1 { font-size: 24px; }
    }
    
    .settings-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }
    
    .card {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 12px;
      
      &.wide { grid-column: span 2; }
    }
    
    .card-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--color-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      h2 { font-size: 16px; font-weight: 600; }
    }
    
    .card-body { padding: 20px; }
    
    .toggle-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .toggle-info {
      .toggle-label { font-weight: 500; display: block; }
      .toggle-desc { font-size: 13px; color: var(--color-text-secondary); }
    }
    
    .toggle {
      position: relative;
      width: 48px;
      height: 24px;
      
      input { opacity: 0; width: 0; height: 0; }
      
      .slider {
        position: absolute;
        inset: 0;
        background: var(--color-bg-tertiary);
        border-radius: 24px;
        cursor: pointer;
        transition: background 0.2s;
        
        &::before {
          content: '';
          position: absolute;
          width: 18px;
          height: 18px;
          left: 3px;
          top: 3px;
          background: white;
          border-radius: 50%;
          transition: transform 0.2s;
        }
      }
      
      input:checked + .slider {
        background: var(--color-accent);
        
        &::before { transform: translateX(24px); }
      }
    }
    
    .maintenance-notice {
      display: flex;
      gap: 12px;
      padding: 16px;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: 8px;
      margin-top: 16px;
      
      .warning-icon { font-size: 24px; }
      strong { color: var(--color-warning); }
      p { font-size: 13px; color: var(--color-text-secondary); margin-top: 4px; }
    }
    
    table { width: 100%; border-collapse: collapse; }
    
    th, td { padding: 12px 16px; text-align: left; }
    
    th {
      font-size: 12px;
      font-weight: 600;
      color: var(--color-text-secondary);
      text-transform: uppercase;
    }
    
    td {
      border-top: 1px solid var(--color-border);
      font-size: 14px;
    }
    
    .fee-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid var(--color-border);
      
      &:last-of-type { border-bottom: none; }
    }
    
    .fee-input {
      display: flex;
      align-items: center;
      gap: 8px;
      
      input {
        width: 100px;
        padding: 8px 12px;
        background: var(--color-bg-primary);
        border: 1px solid var(--color-border);
        border-radius: 6px;
        color: var(--color-text-primary);
        text-align: right;
      }
      
      span { color: var(--color-text-secondary); font-size: 13px; }
    }
    
    .form-group {
      label { display: block; margin-bottom: 8px; font-size: 13px; color: var(--color-text-secondary); }
      input {
        width: 100%;
        padding: 12px;
        background: var(--color-bg-primary);
        border: 1px solid var(--color-border);
        border-radius: 8px;
        color: var(--color-text-primary);
      }
    }
    
    .btn-primary {
      padding: 10px 20px;
      background: linear-gradient(135deg, var(--color-accent), #8b5cf6);
      border: none;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      cursor: pointer;
    }
    
    .action-btn {
      padding: 6px 12px;
      background: var(--color-bg-tertiary);
      border: 1px solid var(--color-border);
      border-radius: 6px;
      color: var(--color-text-secondary);
      font-size: 12px;
      cursor: pointer;
      
      &:hover { border-color: var(--color-accent); color: var(--color-accent); }
    }
  `],
})
export class SettingsComponent {
  maintenanceMode = false;
  makerFee = 0.1;
  takerFee = 0.15;
  withdrawalFee = 0.0005;
  announcement = '';
  showBanner = false;
  
  tradingPairs = signal([
    { symbol: 'BTCUSDT', base: 'BTC', quote: 'USDT', status: 'active', minOrder: '0.0001' },
    { symbol: 'ETHUSDT', base: 'ETH', quote: 'USDT', status: 'active', minOrder: '0.001' },
    { symbol: 'ETHBTC', base: 'ETH', quote: 'BTC', status: 'active', minOrder: '0.001' },
    { symbol: 'XRPUSDT', base: 'XRP', quote: 'USDT', status: 'disabled', minOrder: '1' },
  ]);
  
  togglePair(pair: any): void {
    pair.status = pair.status === 'active' ? 'disabled' : 'active';
  }
}
