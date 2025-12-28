import { Component, ChangeDetectionStrategy, signal, inject, OnInit, effect } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { CardComponent } from '@/components/card/card.component';
import { BadgeComponent } from '@/components/badge/badge.component';
import { TradingService, Order, Trade } from '../../../../core/services/trading.service';

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
        @for (tab of tabs(); track tab.key) {
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
              @if (isLoading()) {
                <tr>
                  <td colspan="9" class="empty-state">
                    <div class="empty-content">
                      <span class="empty-text">Loading...</span>
                    </div>
                  </td>
                </tr>
              } @else {
                @if (activeTab() === 'trades') {
                  @for (trade of trades(); track trade.id) {
                    <tr class="order-row">
                      <td class="date">{{ trade.createdAt | date: 'yyyy-MM-dd HH:mm' }}</td>
                      <td class="pair">{{ trade.symbol }}</td>
                      <td class="type">Trade</td>
                      <td>
                        <span
                          class="side"
                          [class.buy]="trade.side === 'buy'"
                          [class.sell]="trade.side === 'sell'"
                        >
                          {{ trade.side | titlecase }}
                        </span>
                      </td>
                      <td class="text-right mono">{{ trade.price | number: '1.2-2' }}</td>
                      <td class="text-right mono">{{ trade.quantity | number: '1.4-4' }}</td>
                      <td class="text-right mono">100%</td>
                      <td>
                        <ui-badge variant="success">Filled</ui-badge>
                      </td>
                      <td></td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="9" class="empty-state">
                        <div class="empty-content">
                          <span class="empty-icon">📋</span>
                          <span class="empty-text">No trades found</span>
                        </div>
                      </td>
                    </tr>
                  }
                } @else {
                  @for (order of filteredOrders(); track order.id) {
                    <tr class="order-row">
                      <td class="date">{{ order.createdAt | date: 'yyyy-MM-dd HH:mm' }}</td>
                      <td class="pair">{{ order.symbol || 'N/A' }}</td>
                      <td class="type">{{ order.type | titlecase }}</td>
                      <td>
                        <span
                          class="side"
                          [class.buy]="order.side === 'buy'"
                          [class.sell]="order.side === 'sell'"
                        >
                          {{ order.side | titlecase }}
                        </span>
                      </td>
                      <td class="text-right mono">
                        {{ order.price ? (order.price | number: '1.2-2') : 'Market' }}
                      </td>
                      <td class="text-right mono">{{ order.quantity | number: '1.4-4' }}</td>
                       <td class="text-right mono">
                         {{
                           (Number(order.filledQuantity) / Number(order.quantity)) * 100
                             | number: '1.0-0'
                         }}%
                       </td>
                      <td>
                        <ui-badge [variant]="getStatusVariant(order.status)">{{
                          order.status | titlecase
                        }}</ui-badge>
                      </td>
                      <td class="text-right">
                        @if (order.status === 'OPEN' || order.status === 'PENDING') {
                          <button
                            class="cancel-btn"
                            (click)="cancelOrder(order.id, order.symbol || '')"
                          >
                            Cancel
                          </button>
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
                }
              }
            </tbody>
          </table>
        </div>
      </ui-card>
    </div>
  `,
  styles: [
    `
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
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderHistoryComponent implements OnInit {
  protected readonly Number = Number;
  private readonly tradingService = inject(TradingService);

  activeTab = signal('open');
  isLoading = signal(false);

  tabs = signal([
    { key: 'open', label: 'Open Orders', count: 0 },
    { key: 'history', label: 'Order History', count: 0 },
    { key: 'trades', label: 'Trade History', count: 0 },
  ]);

  orders = signal<Order[]>([]);
  trades = signal<Trade[]>([]);
  filteredOrders = signal<Order[]>([]);

  ngOnInit(): void {
    this.loadData();

    // Watch for tab changes
    effect(() => {
      this.activeTab();
      this.filterOrders();
    });
  }

  private loadData(): void {
    this.isLoading.set(true);

    // Load open orders
    this.tradingService.getOpenOrders().subscribe({
      next: (orders) => {
        this.orders.update((current) => {
          const openOrders = orders.filter((o) => o.status === 'OPEN' || o.status === 'PENDING');
          const allOrders = [...current, ...openOrders];
          this.tabs.update((tabs) => {
            tabs[0].count = openOrders.length;
            return tabs;
          });
          return allOrders;
        });
        this.isLoading.set(false);
        this.filterOrders();
      },
      error: (error) => {
        console.error('Failed to load open orders:', error);
        this.isLoading.set(false);
      },
    });

    // Load order history
    this.tradingService.getOrders({ page: 1, limit: 100 }).subscribe({
      next: (response) => {
        this.orders.set(response.data);
        this.tabs.update((tabs) => {
          tabs[1].count = response.meta.total;
          return tabs;
        });
        this.filterOrders();
      },
      error: (error) => {
        console.error('Failed to load order history:', error);
      },
    });

    // Load trade history
    this.tradingService.getTradeHistory({ page: 1, limit: 100 }).subscribe({
      next: (response) => {
        this.trades.set(response.data);
        this.tabs.update((tabs) => {
          tabs[2].count = response.meta.total;
          return tabs;
        });
      },
      error: (error) => {
        console.error('Failed to load trade history:', error);
      },
    });
  }

  private filterOrders(): void {
    const tab = this.activeTab();
    if (tab === 'open') {
      this.filteredOrders.set(
        this.orders().filter((o) => o.status === 'OPEN' || o.status === 'PENDING'),
      );
    } else if (tab === 'history') {
      this.filteredOrders.set(
        this.orders().filter((o) => o.status !== 'OPEN' && o.status !== 'PENDING'),
      );
    }
  }

  getStatusVariant(status: string): 'default' | 'success' | 'danger' | 'warning' | 'info' {
    const variants: Record<string, 'default' | 'success' | 'danger' | 'warning' | 'info'> = {
      OPEN: 'info',
      PENDING: 'info',
      FILLED: 'success',
      PARTIALLY_FILLED: 'warning',
      CANCELLED: 'danger',
    };
    return variants[status] || 'default';
  }

  cancelOrder(orderId: string, symbol: string): void {
    if (!symbol) {
      alert('Symbol is required to cancel order');
      return;
    }

    this.tradingService.cancelOrder(orderId, symbol).subscribe({
      next: () => {
        console.log('Order cancelled');
        this.loadData();
      },
      error: (error) => {
        console.error('Failed to cancel order:', error);
        alert(error.error?.message || 'Failed to cancel order');
      },
    });
  }
}
