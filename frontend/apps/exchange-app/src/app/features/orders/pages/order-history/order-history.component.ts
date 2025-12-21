import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge.component';

interface Order {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'limit' | 'market';
  price: number;
  amount: number;
  filled: number;
  status: 'open' | 'filled' | 'cancelled' | 'partial';
  createdAt: Date;
}

@Component({
  selector: 'app-order-history',
  standalone: true,
  imports: [CommonModule, DecimalPipe, DatePipe, CardComponent, BadgeComponent],
  template: `
    <div class="orders-page">
      <div class="page-header">
        <h1 class="page-title">Orders</h1>
        <p class="page-subtitle">View and manage your trading orders</p>
      </div>

      <!-- Order Tabs -->
      <div class="order-tabs">
        @for (tab of tabs; track tab.key) {
          <button 
            class="tab-btn" 
            [class.active]="activeTab() === tab.key"
            (click)="activeTab.set(tab.key)"
          >
            {{ tab.label }}
            @if (tab.count > 0) {
              <span class="tab-count">{{ tab.count }}</span>
            }
          </button>
        }
      </div>

      <!-- Orders Table -->
      <ui-card variant="elevated" [noPadding]="true">
        <div class="table-container">
          <table class="orders-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Pair</th>
                <th>Type</th>
                <th>Side</th>
                <th class="text-right">Price</th>
                <th class="text-right">Amount</th>
                <th class="text-right">Filled</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (order of filteredOrders(); track order.id) {
                <tr class="order-row">
                  <td class="date">{{ order.createdAt | date:'yyyy-MM-dd HH:mm' }}</td>
                  <td class="pair">{{ order.symbol }}</td>
                  <td class="type">{{ order.type | titlecase }}</td>
                  <td>
                    <span class="side" [class.buy]="order.side === 'buy'" [class.sell]="order.side === 'sell'">
                      {{ order.side | titlecase }}
                    </span>
                  </td>
                  <td class="text-right mono">{{ order.price | number:'1.2-2' }}</td>
                  <td class="text-right mono">{{ order.amount | number:'1.4-4' }}</td>
                  <td class="text-right mono">{{ (order.filled / order.amount * 100) | number:'1.0-0' }}%</td>
                  <td>
                    <ui-badge [variant]="getStatusVariant(order.status)">{{ order.status | titlecase }}</ui-badge>
                  </td>
                  <td class="text-right">
                    @if (order.status === 'open') {
                      <button class="cancel-btn" (click)="cancelOrder(order.id)">Cancel</button>
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="9" class="empty-state">
                    <div class="empty-content">
                      <span class="empty-icon">📋</span>
                      <span class="empty-text">No orders found</span>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </ui-card>
    </div>
  `,
  styles: [`
    .orders-page {
      padding: var(--spacing-6);
      max-width: 1440px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: var(--spacing-6);
    }

    .page-title {
      font-size: var(--font-size-3xl);
      font-weight: var(--font-weight-bold);
      color: var(--color-text-primary);
      margin: 0 0 var(--spacing-2) 0;
    }

    .page-subtitle {
      font-size: var(--font-size-base);
      color: var(--color-text-secondary);
      margin: 0;
    }

    .order-tabs {
      display: flex;
      gap: var(--spacing-1);
      margin-bottom: var(--spacing-4);
      border-bottom: 1px solid var(--color-border-primary);
    }

    .tab-btn {
      display: flex;
      align-items: center;
      gap: var(--spacing-2);
      padding: var(--spacing-3) var(--spacing-4);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-tertiary);
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .tab-btn:hover {
      color: var(--color-text-secondary);
    }

    .tab-btn.active {
      color: var(--color-text-primary);
      border-bottom-color: var(--color-accent-500);
    }

    .tab-count {
      padding: 2px 6px;
      font-size: var(--font-size-xs);
      background: var(--color-bg-tertiary);
      border-radius: var(--radius-full);
    }

    .table-container {
      overflow-x: auto;
    }

    .orders-table {
      width: 100%;
      border-collapse: collapse;
    }

    .orders-table th {
      padding: var(--spacing-3) var(--spacing-4);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      text-align: left;
      border-bottom: 1px solid var(--color-border-primary);
      background: var(--color-bg-tertiary);
    }

    .orders-table td {
      padding: var(--spacing-3) var(--spacing-4);
      border-bottom: 1px solid var(--color-border-primary);
      font-size: var(--font-size-sm);
    }

    .order-row:hover {
      background: var(--color-bg-card-hover);
    }

    .text-right {
      text-align: right;
    }

    .mono {
      font-family: var(--font-family-mono);
    }

    .date {
      color: var(--color-text-secondary);
    }

    .pair {
      font-weight: var(--font-weight-medium);
      color: var(--color-text-primary);
    }

    .type {
      color: var(--color-text-secondary);
    }

    .side.buy {
      color: var(--color-success);
      font-weight: var(--font-weight-medium);
    }

    .side.sell {
      color: var(--color-danger);
      font-weight: var(--font-weight-medium);
    }

    .cancel-btn {
      padding: var(--spacing-1) var(--spacing-2);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-medium);
      color: var(--color-danger);
      background: var(--color-danger-soft);
      border: none;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .cancel-btn:hover {
      background: var(--color-danger);
      color: white;
    }

    .empty-state {
      padding: var(--spacing-12) !important;
    }

    .empty-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--spacing-2);
    }

    .empty-icon {
      font-size: var(--font-size-4xl);
    }

    .empty-text {
      font-size: var(--font-size-base);
      color: var(--color-text-tertiary);
    }

    @media (max-width: 768px) {
      .orders-page {
        padding: var(--spacing-4);
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrderHistoryComponent {
  activeTab = signal('open');
  
  tabs = [
    { key: 'open', label: 'Open Orders', count: 3 },
    { key: 'history', label: 'Order History', count: 0 },
    { key: 'trades', label: 'Trade History', count: 0 },
  ];

  orders = signal<Order[]>([
    { id: '1', symbol: 'BTC/USDT', side: 'buy', type: 'limit', price: 42500, amount: 0.5, filled: 0, status: 'open', createdAt: new Date() },
    { id: '2', symbol: 'ETH/USDT', side: 'sell', type: 'limit', price: 2300, amount: 2.0, filled: 1.5, status: 'partial', createdAt: new Date(Date.now() - 3600000) },
    { id: '3', symbol: 'SOL/USDT', side: 'buy', type: 'market', price: 98.5, amount: 10, filled: 10, status: 'filled', createdAt: new Date(Date.now() - 86400000) },
    { id: '4', symbol: 'BNB/USDT', side: 'sell', type: 'limit', price: 320, amount: 5, filled: 0, status: 'cancelled', createdAt: new Date(Date.now() - 172800000) },
  ]);

  filteredOrders = signal(this.orders());

  getStatusVariant(status: string): 'default' | 'success' | 'danger' | 'warning' | 'info' {
    const variants: Record<string, 'default' | 'success' | 'danger' | 'warning' | 'info'> = {
      'open': 'info',
      'filled': 'success',
      'partial': 'warning',
      'cancelled': 'danger',
    };
    return variants[status] || 'default';
  }

  cancelOrder(orderId: string): void {
    console.log('Cancel order:', orderId);
  }
}
