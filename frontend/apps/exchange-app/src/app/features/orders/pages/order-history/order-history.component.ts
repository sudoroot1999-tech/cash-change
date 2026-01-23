import { Component, ChangeDetectionStrategy, signal, inject, OnInit, effect } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { CardComponent } from '@/components/card/card.component';
import { BadgeComponent } from '@/components/badge/badge.component';
import { TradingService, Order, Trade } from '../../../../core/services/trading.service';

@Component({
  selector: 'app-order-history',
  standalone: true,
  imports: [CommonModule, DecimalPipe, DatePipe, CardComponent, BadgeComponent],
  templateUrl: './order-history.component.html',
  styleUrls: ['./order-history.component.css'],
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
