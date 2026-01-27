import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApiService, Transaction } from '../../core/services/admin-api.service';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="transactions-page">
      <div class="page-header">
        <h1>Financial Operations</h1>
      </div>
      
      <!-- Tabs -->
      <div class="tabs">
        <button [class.active]="activeTab() === 'all'" (click)="activeTab.set('all')">All</button>
        <button [class.active]="activeTab() === 'deposits'" (click)="activeTab.set('deposits')">Deposits</button>
        <button [class.active]="activeTab() === 'withdrawals'" (click)="activeTab.set('withdrawals')">Withdrawals</button>
        <button [class.active]="activeTab() === 'pending'" (click)="activeTab.set('pending')">Pending Review</button>
      </div>
      
      <!-- Stats -->
      <div class="stats-row">
        <div class="stat-card">
          <span class="stat-label">Total Deposits (24h)</span>
          <span class="stat-value text-success">$1,284,920</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Total Withdrawals (24h)</span>
          <span class="stat-value text-error">$842,150</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Pending Withdrawals</span>
          <span class="stat-value text-warning">12</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Hot Wallet Balance</span>
          <span class="stat-value">$4.2M</span>
        </div>
      </div>
      
      <!-- Table -->
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Type</th>
              <th>Currency</th>
              <th>Amount</th>
              <th>Status</th>
              <th>TX Hash</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (tx of transactions(); track tx.id) {
              <tr>
                <td class="mono">{{ tx.id }}</td>
                <td class="mono">{{ tx.userId }}</td>
                <td>
                  <span [class]="tx.type">{{ tx.type }}</span>
                </td>
                <td>{{ tx.currency }}</td>
                <td class="mono">{{ tx.amount }}</td>
                <td>
                  <span class="badge badge-{{ tx.status }}">{{ tx.status }}</span>
                </td>
                <td class="mono truncate">{{ tx.txHash || '-' }}</td>
                <td class="mono">{{ tx.createdAt | date:'short' }}</td>
                <td>
                  @if (tx.status === 'pending') {
                    <button class="approve-btn" (click)="approveTransaction(tx)">Approve</button>
                    <button class="reject-btn" (click)="rejectTransaction(tx)">Reject</button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .transactions-page { max-width: 1600px; }
    
    .page-header {
      margin-bottom: 24px;
      h1 { font-size: 24px; }
    }
    
    .tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 24px;
      
      button {
        padding: 10px 20px;
        background: var(--color-bg-secondary);
        border: 1px solid var(--color-border);
        border-radius: 8px;
        color: var(--color-text-secondary);
        cursor: pointer;
        
        &.active {
          background: var(--color-accent-muted);
          border-color: var(--color-accent);
          color: var(--color-accent);
        }
      }
    }
    
    .stats-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    
    .stat-card {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      
      .stat-label { font-size: 13px; color: var(--color-text-secondary); }
      .stat-value { font-size: 24px; font-weight: 700; font-family: var(--font-mono); }
    }
    
    .table-container {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 12px;
      overflow-x: auto;
    }
    
    table { width: 100%; border-collapse: collapse; min-width: 1200px; }
    
    th, td { padding: 14px 16px; text-align: left; }
    
    th {
      background: var(--color-bg-tertiary);
      font-size: 12px;
      font-weight: 600;
      color: var(--color-text-secondary);
      text-transform: uppercase;
    }
    
    td {
      border-top: 1px solid var(--color-border);
      font-size: 13px;
    }
    
    tr:hover td { background: var(--color-bg-tertiary); }
    
    .deposit { color: var(--color-success); font-weight: 500; }
    .withdrawal { color: var(--color-error); font-weight: 500; }
    
    .truncate { max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    
    .badge-pending { background: rgba(245, 158, 11, 0.15); color: var(--color-warning); }
    .badge-confirmed { background: rgba(34, 197, 94, 0.15); color: var(--color-success); }
    .badge-completed { background: rgba(34, 197, 94, 0.15); color: var(--color-success); }
    .badge-failed { background: rgba(239, 68, 68, 0.15); color: var(--color-error); }
    
    .approve-btn, .reject-btn {
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
      margin-right: 8px;
    }
    
    .approve-btn {
      background: var(--color-success);
      border: none;
      color: white;
    }
    
    .reject-btn {
      background: transparent;
      border: 1px solid var(--color-border);
      color: var(--color-text-secondary);
      
      &:hover { background: var(--color-error); border-color: var(--color-error); color: white; }
    }
  `],
})
export class TransactionsComponent implements OnInit {
  private api = inject(AdminApiService);
  
  transactions = signal<Transaction[]>([]);
  activeTab = signal('all');
  
  ngOnInit(): void {
    this.loadTransactions();
  }
  
  loadTransactions(): void {
    this.transactions.set([
      { id: 'tx-001', userId: 'usr-001', type: 'deposit', currency: 'BTC', amount: '1.5', status: 'confirmed', txHash: '0xabc123...', createdAt: new Date().toISOString() },
      { id: 'tx-002', userId: 'usr-002', type: 'withdrawal', currency: 'ETH', amount: '10.0', status: 'pending', createdAt: new Date().toISOString() },
      { id: 'tx-003', userId: 'usr-003', type: 'withdrawal', currency: 'USDT', amount: '5000', status: 'pending', createdAt: new Date().toISOString() },
      { id: 'tx-004', userId: 'usr-001', type: 'deposit', currency: 'USDT', amount: '10000', status: 'confirmed', txHash: '0xdef456...', createdAt: new Date().toISOString() },
    ]);
  }
  
  approveTransaction(tx: Transaction): void {
    tx.status = 'completed';
  }
  
  rejectTransaction(tx: Transaction): void {
    tx.status = 'failed';
  }
}
